'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface BlendShapeFrame extends Array<number> {
  length: 52;
}

function Avatar({ blendShapes }: { blendShapes: BlendShapeFrame[] }) {
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
  const [blendShapes, setBlendShapes] = useState<BlendShapeFrame[]>([]);
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
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setAudioUrl(data.audioUrl);
      setBlendShapes(data.blendShapes);
    } catch (error) {
      console.error('Error processing voice input:', error);
      const message = (error as Error).message;
      if (message.includes('API error: 500')) {
        setError('Server configuration issue. Please contact support.');
      } else {
        setError(`Failed to process your request: ${message}`);
      }
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
    }
  };

  // Handle audio playback
  useEffect(() => {
    if (audioUrl) {
      const audio = document.getElementById('avatar-audio') as HTMLAudioElement;
      audio.src = audioUrl;
      audio.play().catch((e) => {
        console.error('Audio playback error:', e);
        setError('Failed to play audio response.');
      });
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
      </div>
      <div className="mt-6 flex space-x-4">
        <button
          onClick={startListening}
          disabled={isListening || isLoading}
          aria-label={isListening ? 'Listening for speech' : 'Start speaking to avatar'}
          className={`px-6 py-3 rounded-full text-white transition-colors duration-200 ${
            isListening || isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isListening ? 'Listening...' : 'Speak to Avatar'}
        </button>
        {transcript && (
          <button
            onClick={() => setTranscript('')}
            aria-label="Clear transcript"
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
}