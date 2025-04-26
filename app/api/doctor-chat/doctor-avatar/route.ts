import { NextResponse } from 'next/server';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import { cleanEnv, str } from 'envalid';
import sanitizeHtml from 'sanitize-html';

// Validate environment variables
const env = cleanEnv(process.env, {
  GROQ_API_KEY: str(),
  AZURE_SPEECH_KEY: str(),
  AZURE_REGION: str(),
  DOCTOR_AVATAR: str(),
});

// Constants
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const FPS = 60;

// Mapping of Azure viseme IDs to Wolf3D_Head Oculus Visemes (jawOpen removed)
const visemeToBlendShapes: { [key: number]: { index: number; weight: number }[] } = {
  0: [{ index: 64, weight: 1.0 }], // Silence (viseme_sil)
  1: [{ index: 53, weight: 0.8 }], // 'a' (viseme_aa)
  2: [{ index: 56, weight: 0.8 }], // 'e' (viseme_E)
  3: [{ index: 58, weight: 0.8 }], // 'i' (viseme_I)
  4: [{ index: 61, weight: 0.8 }], // 'o' (viseme_O)
  5: [{ index: 67, weight: 0.8 }], // 'u' (viseme_U)
  6: [{ index: 57, weight: 0.7 }], // 'f,v' (viseme_FF)
  7: [
    { index: 65, weight: 0.6 }, // 's,t' (viseme_SS)
    { index: 55, weight: 0.4 }, // (viseme_DD)
  ],
  8: [{ index: 62, weight: 0.7 }], // 'p,b,m' (viseme_pp)
  9: [{ index: 66, weight: 0.6 }], // 'θ,ð' (viseme_TH)
  10: [{ index: 55, weight: 0.6 }], // 'd,t' (viseme_DD)
  11: [{ index: 59, weight: 0.6 }], // 'k,g' (viseme_kk)
  12: [{ index: 54, weight: 0.6 }], // 'tʃ,dʒ,ʃ' (viseme_CH)
  13: [{ index: 65, weight: 0.6 }], // 's,z' (viseme_SS)
  14: [{ index: 60, weight: 0.6 }], // 'n,l' (viseme_nn)
  15: [{ index: 63, weight: 0.6 }], // 'r' (viseme_RR)
};

interface GroqResponse {
  choices: { message: { content: string } }[];
}

export async function POST(req: import('next/server').NextRequest): Promise<Response> {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    if (
      typeof body !== 'object' ||
      body === null ||
      !('message' in body) ||
      typeof (body as { message: unknown }).message !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Invalid request body: Expected an object with a "message" string property' },
        { status: 400 }
      );
    }

    const { message } = body as { message: string };

    if (message.length > 1000) {
      return NextResponse.json(
        { error: 'Invalid request body: "message" must be a string with max 1000 characters' },
        { status: 400 }
      );
    }

    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          { role: 'system', content: env.DOCTOR_AVATAR },
          { role: 'user', content: message }
        ],
        max_tokens: 500,
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      return NextResponse.json(
        { error: `Groq API error: ${errorText}` },
        { status: groqResponse.status }
      );
    }

    const groqData = (await groqResponse.json()) as GroqResponse;
    const responseText = groqData.choices?.[0]?.message?.content;
    if (!responseText) {
      return NextResponse.json({ error: 'Invalid response from Groq API' }, { status: 500 });
    }

    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(env.AZURE_SPEECH_KEY, env.AZURE_REGION);
    speechConfig.speechSynthesisOutputFormat =
      SpeechSDK.SpeechSynthesisOutputFormat.Audio24Khz160KBitRateMonoMp3;
    const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig);

    const sanitizedText = sanitizeHtml(responseText, { allowedTags: [] });
    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
        <voice name="en-US-JennyNeural">
          ${sanitizedText}
        </voice>
      </speak>
    `;

    const blendShapes: number[][] = [];
    let lastFrame = -1;
    let lastBlendShape: number[] = new Array(68).fill(0);
    const decayRate = 0.1;

    synthesizer.visemeReceived = (_s, e) => {
      const timeMs = e.audioOffset / 10000;
      const frame = Math.floor(timeMs / (1000 / FPS));
      console.log(`Viseme timing - audioOffset: ${e.audioOffset / 10000}ms, frame: ${frame}`);

      for (let i = lastFrame + 1; i <= frame; i++) {
        if (!blendShapes[i]) {
          blendShapes[i] = lastBlendShape.map(w => Math.max(w - decayRate, 0));
        }
      }

      if (!blendShapes[frame]) {
        blendShapes[frame] = new Array(68).fill(0);
      }
      const mappings = visemeToBlendShapes[e.visemeId] || [];
      if (mappings.length === 0) {
        console.log(`No mapping for visemeId: ${e.visemeId}, using silence (viseme_sil)`);
        blendShapes[frame] = new Array(68).fill(0); // Reset all weights
        blendShapes[frame][64] = 1.0; // Apply viseme_sil
      } else {
        // Reset all weights before applying new ones to prevent stacking
        blendShapes[frame] = new Array(68).fill(0);
        mappings.forEach(({ index, weight }) => {
          blendShapes[frame][index] = weight;
          console.log(`Setting index ${index} to weight ${weight} for visemeId ${e.visemeId}`);
        });
      }
      lastFrame = frame;
      lastBlendShape = [...blendShapes[frame]];

      console.log('Viseme received:', {
        visemeId: e.visemeId,
        frame,
        blendShapes: blendShapes[frame],
      });
    };

    return new Promise<Response>((resolve) => {
      synthesizer.speakSsmlAsync(
        ssml,
        (result) => {
          if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
            const audioDurationMs = result.audioDuration / 10000;
            const maxFrame = Math.ceil(audioDurationMs / (1000 / FPS));
            const transitionFrames = FPS / 4;
            for (let i = lastFrame + 1; i <= maxFrame; i++) {
              if (i >= maxFrame - transitionFrames) {
                const alpha = (i - (maxFrame - transitionFrames)) / transitionFrames;
                blendShapes[i] = new Array(68).fill(0);
                blendShapes[i][64] = 1.0 * (1 - alpha);
              } else {
                blendShapes[i] = lastBlendShape.map(w => Math.max(w - decayRate, 0));
              }
            }
            const finalBlendShapes = Array.from({ length: maxFrame + 1 }, (_, i) =>
              blendShapes[i] || new Array(68).fill(0)
            );
            const lastFewFrames = finalBlendShapes.slice(-Math.min(10, finalBlendShapes.length));
            console.log('Last few blend shapes:', lastFewFrames);
            console.log('Generated blend shapes:', finalBlendShapes);
            console.log('Audio duration (ms):', audioDurationMs, 'Max frame:', maxFrame);
            synthesizer.close();
            resolve(
              NextResponse.json({
                audio: Buffer.from(result.audioData).toString('base64'),
                blendShapes: finalBlendShapes,
              })
            );
          } else {
            synthesizer.close();
            resolve(
              NextResponse.json(
                { error: `Speech synthesis failed: ${result.errorDetails}` },
                { status: 500 }
              )
            );
          }
        },
        (rawError: unknown) => {
          synthesizer.close();
          let errMsg: string;
          if (rawError instanceof Error) {
            errMsg = rawError.message;
          } else if (typeof rawError === 'string') {
            errMsg = rawError;
          } else {
            errMsg = 'Unknown speech synthesis error';
          }
          resolve(
            NextResponse.json(
              { error: `Speech synthesis error: ${errMsg}` },
              { status: 500 }
            )
          );
        }
      );
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Internal server error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}