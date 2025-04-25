"use client";

import { useRef, useState, useEffect } from 'react';
import Script from 'next/script';

interface TalkingHeadInstance {
  speak: (text: string) => Promise<void>;
}

export default function AvatarPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [th, setTh] = useState<TalkingHeadInstance | null>(null);
  const [status, setStatus] = useState<string>('Loading script...');
  const [error, setError] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Initialize TalkingHead after script loads
  useEffect(() => {
    if (containerRef.current && scriptLoaded && !th) {
      try {
        if (!window.TalkingHead) {
          throw new Error('TalkingHead is not defined on window');
        }
        const talkingHead = new window.TalkingHead('/models/doctors/doctor.glb', containerRef.current, {
          ttsEndpoint: 'https://texttospeech.googleapis.com/v1/text:synthesize',
          ttsApikey: process.env.NEXT_PUBLIC_GOOGLE_TTS_API_KEY,
          ttsVoice: 'en-US-Wavenet-F',
          ttsMarks: true
        });
        setTh(talkingHead);
        setStatus('Avatar loaded');
      } catch (err) {
        console.error('TalkingHead initialization failed:', err);
        setError('Failed to load avatar');
        setStatus('Error');
      }
    }
  }, [scriptLoaded, th]);

  // Handle voice input
  const startListening = () => {
    if (isSpeaking || isListening || !th) {
      setError(isSpeaking ? 'Please wait until speaking finishes' : !th ? 'Avatar not ready' : null);
      return;
    }

    setIsListening(true);
    setStatus('Listening...');
    setError(null);

    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      setStatus('Processing...');

      try {
        const response = await getResponseFromGroq(transcript);
        setIsSpeaking(true);
        setStatus('Speaking...');
        await th.speak(response);
        setIsSpeaking(false);
        setStatus('Ready to talk');
      } catch (err) {
        console.error('Speech processing error:', err);
        setError('Failed to process your request');
        setIsSpeaking(false);
        setStatus('Ready to talk');
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setError('Could not understand your speech');
      setIsListening(false);
      setStatus('Ready to talk');
    };

    recognition.onend = () => {
      if (isListening) {
        setIsListening(false);
        setStatus('Ready to talk');
      }
    };

    recognition.start();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <Script
        src="/scripts/talkinghead.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log('TalkingHead script loaded:', window.TalkingHead);
          // Debug playback-worklet.js
          fetch('/scripts/playback-worklet.js')
            .then(() => console.log('playback-worklet.js fetched successfully'))
            .catch((err) => console.error('Failed to fetch playback-worklet.js:', err));
          setScriptLoaded(true);
        }}
        onError={(err) => {
          console.error('Failed to load TalkingHead script:', err);
          setError('Failed to load TalkingHead script');
          setStatus('Error');
        }}
      />
      <div
        ref={containerRef}
        className="w-full max-w-4xl h-[80vh] border-2 border-gray-300 rounded-lg overflow-hidden"
      />
      <div className="mt-4 text-center">
        <button
          onClick={startListening}
          disabled={isListening || isSpeaking || !th}
          className={`px-6 py-2 rounded-full text-white font-semibold ${
            isListening || isSpeaking || !th
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : 'Talk to Doctor'}
        </button>
        <p className="mt-2 text-gray-700">{status}</p>
        {error && <p className="mt-2 text-red-500">{error}</p>}
      </div>
    </div>
  );
}

// Fetch response from Groq API
async function getResponseFromGroq(message: string): Promise<string> {
  const res = await fetch('/api/doctor-chat/doctor-avatar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    throw new Error(`API request failed: ${res.statusText}`);
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error);
  }

  return data.response;
}