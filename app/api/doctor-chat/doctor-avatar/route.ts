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

// Mapping of Azure viseme IDs to Wolf3D_Head blend shape indices
const visemeToBlendShapes: { [key: number]: { index: number; weight: number }[] } = {
  0: [{ index: 1, weight: 1.0 }], // viseme_sil
  1: [{ index: 11, weight: 0.8 }], // viseme_aa
  2: [{ index: 12, weight: 0.8 }], // viseme_E
  3: [{ index: 13, weight: 0.8 }], // viseme_I
  4: [{ index: 14, weight: 0.8 }], // viseme_O
  5: [{ index: 15, weight: 0.8 }], // viseme_U
  6: [{ index: 3, weight: 0.7 }], // viseme_FF ('f,v')
  7: [{ index: 8, weight: 0.6 }, { index: 5, weight: 0.4 }], // viseme_SS, viseme_DD ('s,t')
  8: [{ index: 2, weight: 0.7 }], // viseme_PP ('p,b,m')
  9: [{ index: 4, weight: 0.6 }], // viseme_TH ('θ,ð')
  10: [{ index: 5, weight: 0.6 }], // viseme_DD ('d,t')
  11: [{ index: 6, weight: 0.6 }], // viseme_kk ('k,g')
  12: [{ index: 7, weight: 0.6 }], // viseme_CH ('tʃ,dʒ,ʃ')
  13: [{ index: 8, weight: 0.6 }], // viseme_SS ('s,z')
  14: [{ index: 9, weight: 0.6 }], // viseme_nn ('n,l')
  15: [{ index: 10, weight: 0.6 }], // viseme_RR ('r')
  16: [{ index: 14, weight: 0.6 }], // viseme_C ('w')
  17: [{ index: 14, weight: 0.6 }], // viseme_G ('h')
  18: [{ index: 14, weight: 0.6 }], // viseme_N ('ŋ')
  19: [{ index: 5, weight: 0.6 }], // viseme_T ('l')
  20: [{ index: 10, weight: 0.6 }], // viseme_A ('æ')
  21: [{ index: 12, weight: 0.6 }], // viseme_H ('j')
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
        messages: [
          { role: 'system', content: env.DOCTOR_AVATAR },
          { role: 'user', content: message },
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
    synthesizer.visemeReceived = (_s, e) => {
      const timeMs = e.audioOffset / 10000; // Convert 100ns to ms
      const frame = Math.floor(timeMs / (1000 / 60)); // 60 FPS
      if (!blendShapes[frame]) blendShapes[frame] = new Array(68).fill(0); // 52 ARKit + 16 Oculus Visemes
      const mappings = visemeToBlendShapes[e.visemeId] || [];
      mappings.forEach(({ index, weight }) => {
        blendShapes[frame][index] = weight;
      });
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
            // Convert ArrayBuffer to base64
            const audioBase64 = Buffer.from(result.audioData).toString('base64');
            console.log('Generated blend shapes:', blendShapes); // Log final blendShapes
            synthesizer.close();
            resolve(
              NextResponse.json({
                audio: audioBase64,
                blendShapes,
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