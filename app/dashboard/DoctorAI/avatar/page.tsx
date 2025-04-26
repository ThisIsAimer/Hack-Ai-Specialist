'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface BlendShapeFrame extends Array<number> {
  length: 68; // 52 ARKit + 16 Oculus Visemes
}

// Helper function to convert base64 to Blob
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

// Linear interpolation between two blend shape frames
function lerpBlendShapes(frameA: number[], frameB: number[], alpha: number): number[] {
  return frameA.map((a, i) => a + (frameB[i] - a) * alpha);
}

interface AvatarProps {
  blendShapes: BlendShapeFrame[];
  isSpeaking: boolean;
}

const Avatar = ({ blendShapes, isSpeaking }: AvatarProps) => {
  const { scene, animations } = useGLTF('/models/doctors/doctor.glb');
  const meshRef = useRef<THREE.Mesh>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const prevBlendShape = useRef<number[]>(new Array(68).fill(0));
  const currentBlendShape = useRef<number[]>(new Array(68).fill(0));
  const transitionToNeutral = useRef(false);
  const transitionAlpha = useRef(0);
  const FPS = 60;
  const maxWeight = 0.2; // Reduced to limit stretching

  // Memoize blend shapes to prevent unnecessary recalculations
  const memoizedBlendShapes = useMemo(() => {
    return blendShapes.map(frame => [...frame]);
  }, [blendShapes]);

  // Find the Wolf3D_Head mesh with morph targets
  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name === 'Wolf3D_Head' && child.morphTargetInfluences) {
        meshRef.current = child;
      }
    });
    if (meshRef.current) {
      console.log('Wolf3D_Head morph targets:', meshRef.current.morphTargetDictionary);
      console.log('Morph target influences length:', meshRef.current.morphTargetInfluences?.length);
    } else {
      console.warn('Wolf3D_Head mesh with morph targets not found in doctor.glb');
    }
  }, [scene]);

  // Initialize idle animation if available
  useEffect(() => {
    if (animations && animations.length > 0) {
      mixerRef.current = new THREE.AnimationMixer(scene);
      const action = mixerRef.current.clipAction(animations[0]);
      action.play();
    }
  }, [animations, scene]);

  // Animate blend shapes for lip-sync with smooth transitions
  useFrame((state, delta) => {
    if (meshRef.current) {
      console.log('isSpeaking:', isSpeaking, 'blendShapes length:', memoizedBlendShapes.length);

      if (isSpeaking && memoizedBlendShapes.length > 0) {
        const audio = document.getElementById('avatar-audio') as HTMLAudioElement;
        if (audio && !audio.paused) {
          const currentTimeMs = audio.currentTime * 1000;
          const frame = Math.floor(currentTimeMs / (1000 / FPS));
          const frameFraction = (currentTimeMs % (1000 / FPS)) / (1000 / FPS);

          console.log('Audio currentTime (ms):', currentTimeMs, 'Frame:', frame, 'Fraction:', frameFraction);

          const duration = audio.duration * 1000;
          const timeRemaining = duration - currentTimeMs;
          const transitionDuration = 250;
          if (timeRemaining <= transitionDuration && !transitionToNeutral.current) {
            transitionToNeutral.current = true;
            transitionAlpha.current = 0;
            console.log('Starting transition to neutral, time remaining:', timeRemaining);
          }

          if (transitionToNeutral.current) {
            transitionAlpha.current += delta / (transitionDuration / 1000);
            transitionAlpha.current = Math.min(transitionAlpha.current, 1);
            const neutralFrame = new Array(68).fill(0);
            currentBlendShape.current = lerpBlendShapes(
              currentBlendShape.current,
              neutralFrame,
              transitionAlpha.current
            );
          } else {
            const currentFrameBlendShape = memoizedBlendShapes[frame] || new Array(68).fill(0);
            const nextFrameBlendShape = memoizedBlendShapes[frame + 1] || currentFrameBlendShape;

            prevBlendShape.current = [...currentBlendShape.current];
            const targetBlendShape = lerpBlendShapes(currentFrameBlendShape, nextFrameBlendShape, frameFraction);

            // Cap weights to prevent stretching
            const cappedBlendShape = targetBlendShape.map(w => 
              w > 0 ? Math.min(w, maxWeight) : Math.max(prevBlendShape.current[prevBlendShape.current.indexOf(Math.max(...prevBlendShape.current))] - 0.1, 0)
            );
            currentBlendShape.current = lerpBlendShapes(
              currentBlendShape.current,
              cappedBlendShape,
              Math.min(delta * 5, 1)
            );
          }

          meshRef.current.morphTargetInfluences = currentBlendShape.current;

          const activeInfluences = currentBlendShape.current
            .map((weight, index) => (weight > 0 ? { index, weight } : null))
            .filter(Boolean);
          console.log('Applying interpolated blendShapes for frame:', frame, 'Active influences:', activeInfluences);
        } else {
          meshRef.current.morphTargetInfluences = new Array(68).fill(0);
          prevBlendShape.current = new Array(68).fill(0);
          currentBlendShape.current = new Array(68).fill(0);
          transitionToNeutral.current = false;
          console.log('Audio paused or not playing, resetting to neutral');
        }
      } else {
        meshRef.current.morphTargetInfluences = new Array(68).fill(0);
        prevBlendShape.current = new Array(68).fill(0);
        currentBlendShape.current = new Array(68).fill(0);
        transitionToNeutral.current = false;
        console.log('Not speaking, resetting to neutral');
      }

      if (!animations || animations.length === 0) {
        meshRef.current.rotation.y = Math.sin(state.clock.getElapsedTime()) * 0.3;
        meshRef.current.rotation.x = Math.cos(state.clock.getElapsedTime() * 0.5) * 0.1;
        meshRef.current.position.y = -1 + Math.sin(state.clock.getElapsedTime()) * 0.03;
      }
    }

    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }
  });

  return <primitive object={scene} scale={1.5} position={[0, -1, 0]} />;
};

export default function AvatarPage() {
  const [transcript, setTranscript] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [blendShapes, setBlendShapes] = useState<BlendShapeFrame[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognition = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

      console.log('Blend shapes received:', data.blendShapes);

      const audioBlob = base64ToBlob(data.audio, 'audio/mpeg');
      const newAudioUrl = URL.createObjectURL(audioBlob);
      setAudioUrl(newAudioUrl);
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

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsSpeaking(false);
      setBlendShapes([]);
    }
  };

  const stopConversation = () => {
    stopSpeaking();
    setTranscript('');
  };

  const startListening = () => {
    if (recognition.current && !isListening) {
      if (isSpeaking) {
        stopSpeaking();
      }
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

  useEffect(() => {
    audioRef.current = document.getElementById('avatar-audio') as HTMLAudioElement;
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play().then(() => {
        setIsSpeaking(true);
        console.log('Audio duration:', audioRef.current?.duration);
      }).catch((e) => {
        console.error('Audio playback error:', e);
        setError('Failed to play audio response.');
        setIsSpeaking(false);
      });

      const handleAudioEnd = () => {
        setIsSpeaking(false);
        setBlendShapes([]);
      };
      audioRef.current.addEventListener('ended', handleAudioEnd);

      return () => {
        audioRef.current?.removeEventListener('ended', handleAudioEnd);
      };
    }
  }, [audioUrl]);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
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
          <Avatar blendShapes={blendShapes} isSpeaking={isSpeaking} />
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
        {(transcript || isSpeaking) && (
          <button
            onClick={stopConversation}
            aria-label="Stop conversation and clear transcript"
            className="px-6 py-3 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors duration-200"
          >
            Stop Convo
          </button>
        )}
      </div>
      {transcript && <p className="mt-4 text-lg text-gray-600">Transcript: {transcript}</p>}
      {error && <p className="mt-4 text-lg text-red-600">{error}</p>}
      <audio id="avatar-audio" className="hidden" />
    </div>
  );
}