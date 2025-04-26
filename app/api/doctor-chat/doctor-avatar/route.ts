import { NextResponse } from 'next/server';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import { cleanEnv, str } from 'envalid';
import sanitizeHtml from 'sanitize-html';

// Validate environment variables
const env = cleanEnv(process.env, {
  GROQ_API_KEY: str(),
  AZURE_SPEECH_KEY: str(),
  AZURE_REGION: str(),
});

// Constants
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const FPS = 60; // Reverted to 60 FPS

// Mapping of Azure viseme IDs to Wolf3D_Head Oculus Visemes
const visemeToBlendShapes: { [key: number]: { index: number; weight: number }[] } = {
  0: [{ index: 64, weight: 1.0 }], // Silence (viseme_sil)
  1: [{ index: 53, weight: 0.8 }], // 'a' (viseme_aa)
  2: [{ index: 56, weight: 0.8 }], // 'e' (viseme_E)
  3: [{ index: 58, weight: 0.8 }], // 'i' (viseme_I)
  4: [{ index: 61, weight: 0.8 }], // 'o' (viseme_O)
  5: [{ index: 67, weight: 0.8 }], // 'u' (viseme_U)
  6: [{ index: 57, weight: 0.7 }], // 'f,v' (viseme_FF)
  7: [{ index: 65, weight: 0.6 }, { index: 55, weight: 0.4 }], // 's,t' (viseme_SS, viseme_DD)
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
    // Parse request body safely
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate body
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

    const message = (body as { message: string }).message;

    // Validate message length
    if (message.length > 1000) {
      return NextResponse.json(
        { error: 'Invalid request body: "message" must be a string with max 1000 characters' },
        { status: 400 }
      );
    }

    // Call Groq API for chat completion
    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [{ role: 'user', content: message }],
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

    // Initialize Azure Speech Synthesizer
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(env.AZURE_SPEECH_KEY, env.AZURE_REGION);
    speechConfig.speechSynthesisOutputFormat =
      SpeechSDK.SpeechSynthesisOutputFormat.Audio24Khz160KBitRateMonoMp3;
    const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig);

    // Generate SSML with sanitized text
    const sanitizedText = sanitizeHtml(responseText, { allowedTags: [] });
    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
        <voice name="en-US-JennyNeural">
          ${sanitizedText}
        </voice>
      </speak>
    `;

    // Capture blend shapes for lip-sync
    const blendShapes: number[][] = [];
    let lastFrame = -1;
    let lastBlendShape: number[] = new Array(68).fill(0); // Default to neutral
    const decayRate = 0.1; // Decay factor per frame (adjust as needed)

    synthesizer.visemeReceived = (_s, e) => {
      const timeMs = e.audioOffset / 10000; // Convert 100ns to ms
      const frame = Math.floor(timeMs / (1000 / FPS)); // Frame based on FPS
      console.log(`Viseme timing - audioOffset: ${e.audioOffset / 10000}ms, frame: ${frame}`);

      // Fill gaps between the last frame and current frame with decayed blend shapes
      for (let i = lastFrame + 1; i <= frame; i++) {
        if (!blendShapes[i]) {
          blendShapes[i] = lastBlendShape.map(w => Math.max(w - decayRate, 0)); // Decay weights
        }
      }

      // Update the current frame
      if (!blendShapes[frame]) {
        blendShapes[frame] = new Array(68).fill(0); // 52 ARKit + 16 Oculus Visemes
      }
      const mappings = visemeToBlendShapes[e.visemeId] || [];
      if (mappings.length === 0) {
        console.log(`No mapping for visemeId: ${e.visemeId}, using silence (viseme_sil)`);
        blendShapes[frame][64] = 1.0; // Default to viseme_sil
      } else {
        // Apply new weights and reset others to decayed values
        const newBlendShape = new Array(68).fill(0);
        mappings.forEach(({ index, weight }) => {
          newBlendShape[index] = weight;
          console.log(`Setting index ${index} to weight ${weight} for visemeId ${e.visemeId}`);
        });
        // Blend with decayed previous shape to avoid abrupt jumps
        blendShapes[frame] = newBlendShape.map((w, i) => 
          w > 0 ? w : Math.max(lastBlendShape[i] - decayRate, 0)
        );
      }
      lastFrame = frame;
      lastBlendShape = [...blendShapes[frame]]; // Update the last blend shape

      console.log('Viseme received:', {
        visemeId: e.visemeId,
        frame,
        blendShapes: blendShapes[frame],
      });
    };

    // Synthesize speech and return audio data in memory
    return new Promise<Response>((resolve) => {
      synthesizer.speakSsmlAsync(
        ssml,
        (result) => {
          if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
            // Fill remaining frames up to audio duration with decay
            const audioDurationMs = result.audioDuration / 10000; // Convert to ms
            const maxFrame = Math.ceil(audioDurationMs / (1000 / FPS));
            const transitionFrames = FPS / 4; // 250ms transition to neutral
            for (let i = lastFrame + 1; i <= maxFrame; i++) {
              if (i >= maxFrame - transitionFrames) {
                // Transition to neutral in the last 250ms
                const alpha = (i - (maxFrame - transitionFrames)) / transitionFrames;
                blendShapes[i] = new Array(68).fill(0);
                blendShapes[i][64] = 1.0 * (1 - alpha); // Fade out viseme_sil
              } else {
                blendShapes[i] = lastBlendShape.map(w => Math.max(w - decayRate, 0)); // Decay
              }
            }
            // Remove undefined entries and ensure contiguous frames
            const finalBlendShapes = Array.from({ length: maxFrame + 1 }, (_, i) =>
              blendShapes[i] || new Array(68).fill(0)
            );
            // Log the last few frames for debugging
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