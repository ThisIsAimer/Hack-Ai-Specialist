"use client";

<<<<<<< HEAD
import { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

function Avatar({ blendShapes }: { blendShapes: number[][] }) {
  const { scene, animations } = useGLTF('/models/doctors/doctor.glb');
  const meshRef = useRef<THREE.Mesh>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);

  // Memoize blend shapes to prevent unnecessary updates
  const memoizedBlendShapes = useMemo(() => blendShapes, [blendShapes]);

  // Initialize idle animation
  useEffect(() => {
    if (animations && animations.length > 0) {
      mixerRef.current = new THREE.AnimationMixer(scene);
      const action = mixerRef.current.clipAction(animations[0]);
      action.play();
    }
  }, [animations, scene]);

  // Update lip sync and idle animation
  useFrame((state, delta) => {
    // Lip sync
    if (meshRef.current && memoizedBlendShapes.length > 0) {
      const audio = document.getElementById('avatar-audio') as HTMLAudioElement;
      if (audio && !audio.paused) {
        const currentTimeMs = audio.currentTime * 1000;
        const frame = Math.floor(currentTimeMs / (1000 / 60));
        if (memoizedBlendShapes[frame]) {
          meshRef.current.morphTargetInfluences = memoizedBlendShapes[frame];
        } else {
          meshRef.current.morphTargetInfluences = new Array(52).fill(0);
        }
      }
    }

    // Idle animation (programmatic if no GLB animations)
    if (!animations || animations.length === 0) {
      if (meshRef.current) {
        meshRef.current.rotation.y = Math.sin(state.clock.getElapsedTime()) * 0.3;
        meshRef.current.rotation.x = Math.cos(state.clock.getElapsedTime() * 0.5) * 0.1;
        meshRef.current.position.y = -1 + Math.sin(state.clock.getElapsedTime()) * 0.03;
      }
    }

    // Update mixer for GLB animations
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }
  });

  return <primitive ref={meshRef} object={scene} scale={1.5} position={[0, -1, 0]} />;
}

export default function AvatarPage() {
  const [transcript, setTranscript] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [blendShapes, setBlendShapes] = useState<number[][]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognition = useRef<SpeechRecognition | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition.current = new SpeechRecognition();
      recognition.current.lang = 'en-US';
      recognition.current.interimResults = false;
      recognition.current.maxAlternatives = 1;

      recognition.current.onresult = async (event) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        setIsListening(false);
        setError(null);
        await processVoiceInput(text);
      };

      recognition.current.onend = () => {
        setIsListening(false);
      };

      recognition.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setError('Speech recognition failed. Please try again.');
      };

      recognition.current.onspeechend = () => {
        recognition.current?.stop();
      };
    } else {
      setError('Speech recognition not supported in this browser.');
    }

    return () => {
      recognition.current?.stop();
    };
  }, []);

  // Process voice input
  const processVoiceInput = async (text: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/doctor-chat/doctor-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setAudioUrl(data.audioUrl);
      setBlendShapes(data.blendShapes);
    } catch (error) {
      console.error('Error processing voice input:', error);
      setError(`Failed to process your request: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Start speech recognition
  const startListening = () => {
    if (recognition.current && !isListening) {
      setIsListening(true);
      setError(null);
      recognition.current.start();
      setTimeout(() => {
        if (isListening) {
          recognition.current?.stop();
          setError('No speech detected. Please try again.');
        }
      }, 10000);
=======
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
>>>>>>> e23e2edba33c3a32b0c8fae5b643fabcd571a0ac
    }

<<<<<<< HEAD
  // Handle audio playback
  useEffect(() => {
    if (audioUrl) {
      const audio = document.getElementById('avatar-audio') as HTMLAudioElement;
      audio.src = audioUrl;
      audio.play().catch((e) => console.error('Audio playback error:', e));
    }
  }, [audioUrl]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">DoctorAI Avatar</h1>
      <div className="w-full max-w-4xl h-[500px] bg-white rounded-lg shadow-lg overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        )}
        <Canvas>
          <ambientLight intensity={0.3} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} />
          <pointLight position={[10, 10, 10]} intensity={0.5} />
          <Avatar blendShapes={blendShapes} />
          <OrbitControls enablePan={false} minDistance={2} maxDistance={5} />
        </Canvas>
=======
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
>>>>>>> e23e2edba33c3a32b0c8fae5b643fabcd571a0ac
      </div>
      <div className="mt-6 flex space-x-4">
        <button
          onClick={startListening}
          disabled={isListening || isLoading}
          className={`px-6 py-3 rounded-full text-white transition-colors duration-200 ${
            isListening || isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isListening ? 'Listening...' : 'Speak to Avatar'}
        </button>
        {transcript && (
          <button
            onClick={() => setTranscript('')}
            className="px-6 py-3 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors duration-200"
          >
            Clear Transcript
          </button>
        )}
      </div>
      {transcript && <p className="mt-4 text-lg text-gray-600">Transcript: {transcript}</p>}
      {error && <p className="mt-4 text-lg text-red-600">{error}</p>}
      <audio id="avatar-audio" className="hidden" />
    </div>
  );
<<<<<<< HEAD
=======
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
>>>>>>> e23e2edba33c3a32b0c8fae5b643fabcd571a0ac
}