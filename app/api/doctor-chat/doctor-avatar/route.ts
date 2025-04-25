import { NextResponse } from 'next/server';
<<<<<<< HEAD
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import { writeFile } from 'fs/promises';
import { join } from 'path';

const GROQ_API_KEY = process.env.GROQ_API_KEY!;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY!;
const AZURE_REGION = process.env.AZURE_REGION!;

const visemeToBlendShapes: { [key: number]: { index: number; weight: number }[] } = {
  0: [],
  1: [{ index: 0, weight: 0.8 }],
  2: [{ index: 0, weight: 0.5 }, { index: 16, weight: 0.4 }],
  3: [{ index: 19, weight: 0.6 }, { index: 0, weight: 0.3 }],
  4: [{ index: 0, weight: 0.6 }, { index: 26, weight: 0.7 }],
  5: [{ index: 26, weight: 0.9 }, { index: 21, weight: 0.5 }],
  6: [{ index: 21, weight: 0.6 }, { index: 0, weight: 0.4 }],
  7: [{ index: 0, weight: 0.5 }, { index: 27, weight: 0.4 }],
};

export async function POST(req: import('next/server').NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch (error) {
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

    const message = (body as { message: string }).message;

    if (message.length > 1000) {
      return NextResponse.json(
        { error: 'Invalid request body: "message" must be a string with max 1000 characters' },
        { status: 400 }
      );
    }

    if (!GROQ_API_KEY || !AZURE_SPEECH_KEY || !AZURE_REGION) {
      return NextResponse.json(
        { error: 'Server configuration error: Missing API credentials' },
        { status: 500 }
      );
    }

    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        messages: [{ role: 'user', content: message }],
        max_tokens: 500,
=======

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 });
    }

    const groqResponse = await fetch('https://api.groq.com/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        prompt: message,
        max_tokens: 150,
>>>>>>> e23e2edba33c3a32b0c8fae5b643fabcd571a0ac
      }),
    });

    if (!groqResponse.ok) {
<<<<<<< HEAD
      const errorText = await groqResponse.text();
      return NextResponse.json(
        { error: `Groq API error: ${errorText}` },
        { status: groqResponse.status }
      );
    }

    const groqData = await groqResponse.json();
    const responseText = groqData.choices?.[0]?.message?.content;
    if (!responseText) {
      return NextResponse.json({ error: 'Invalid response from Groq API' }, { status: 500 });
    }

    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(AZURE_SPEECH_KEY, AZURE_REGION);
    speechConfig.speechSynthesisOutputFormat =
      SpeechSDK.SpeechSynthesisOutputFormat.Audio24Khz160KBitRateMonoMp3;
    const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig);

    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
        <voice name="en-US-JennyNeural">
          ${responseText.replace(/[<>&]/g, '')}
        </voice>
      </speak>
    `;

    const blendShapes: number[][] = [];
    synthesizer.visemeReceived = (_s, e) => {
      const timeMs = e.audioOffset / 10000;
      const frame = Math.floor(timeMs / (1000 / 60));
      if (!blendShapes[frame]) blendShapes[frame] = new Array(52).fill(0);
      const mappings = visemeToBlendShapes[e.visemeId] || [];
      mappings.forEach(({ index, weight }) => {
        blendShapes[frame][index] = weight;
      });
    };

    return new Promise((resolve) => {
      synthesizer.speakSsmlAsync(
        ssml,
        async (result) => {
          if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
            const audioFileName = `audio-${Date.now()}.mp3`;
            const audioPath = join(process.cwd(), 'public', 'temp', audioFileName);
            try {
              await writeFile(audioPath, Buffer.from(result.audioData));
              synthesizer.close();
              resolve(NextResponse.json({ audioUrl: `/temp/${audioFileName}`, blendShapes }));
            } catch (error) {
              synthesizer.close();
              resolve(
                NextResponse.json(
                  { error: `Failed to save audio: ${(error as Error).message}` },
                  { status: 500 }
                )
              );
            }
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
=======
      throw new Error(`Groq API error: ${groqResponse.statusText}`);
    }

    const data = await groqResponse.json();
    if (!data.choices || !data.choices[0].text) {
      throw new Error('Invalid response from Groq API');
    }

    return NextResponse.json({ response: data.choices[0].text.trim() });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
>>>>>>> e23e2edba33c3a32b0c8fae5b643fabcd571a0ac
