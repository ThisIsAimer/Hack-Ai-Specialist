'use client';

import { useState, useRef, useEffect } from 'react';
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

function Avatar({ blendShapes, isSpeaking }: { blendShapes: BlendShapeFrame[]; isSpeaking: boolean }) {
  const { scene, animations } = useGLTF('/models/doctors/doctor.glb');
  const meshRef = useRef<THREE.Mesh>(null);
  const teethMeshRef = useRef<THREE.Mesh>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const prevInfluences = useRef<number[]>(new Array(68).fill(0)); // Track previous frame's influences
  const lastValidFrame = useRef<BlendShapeFrame | null>(null); // Store last valid frame
  const blinkIndices = useRef<{ left: number; right: number }>({ left: -1, right: -1 }); // Store blink morph target indices
  const nextBlinkTime = useRef<number>(0); // Time for next blink
  const teethVisemeIndices = useRef<number[]>([]); // Store viseme-related morph target indices for teeth

  // Find and validate meshes, get morph target indices
  useEffect(() => {
    let headFound = false;
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.morphTargetInfluences) {
        if (child.name === 'Wolf3D_Head') {
          headFound = true;
          meshRef.current = child;
          // Disable frustum culling to prevent erroneous culling
          child.frustumCulled = false;
          console.log('Wolf3D_Head found:', {
            name: child.name,
            morphTargets: child.morphTargetDictionary,
            morphTargetCount: child.morphTargetInfluences?.length,
            material: child.material ? (child.material as THREE.Material).name : 'No material',
            visible: child.visible,
            frustumCulled: child.frustumCulled,
            geometry: child.geometry ? {
              vertexCount: child.geometry.attributes.position?.count,
              hasNormals: !!child.geometry.attributes.normal,
              boundingBox: child.geometry.boundingBox
            } : 'No geometry'
          });
          const dict = child.morphTargetDictionary;
          if (dict) {
            blinkIndices.current = {
              left: dict['eyeBlinkLeft'] !== undefined ? dict['eyeBlinkLeft'] : -1,
              right: dict['eyeBlinkRight'] !== undefined ? dict['eyeBlinkRight'] : -1,
            };
            console.log('Blink indices:', blinkIndices.current);
          } else {
            console.warn('No morphTargetDictionary for Wolf3D_Head');
          }
        } else if (child.name === 'Wolf3D_Teeth') {
          teethMeshRef.current = child;
          console.log('Wolf3D_Teeth found:', {
            name: child.name,
            morphTargets: child.morphTargetDictionary,
            morphTargetCount: child.morphTargetInfluences?.length,
            material: child.material ? (child.material as THREE.Material).name : 'No material',
            visible: child.visible
          });
          const dict = child.morphTargetDictionary;
          if (dict) {
            teethVisemeIndices.current = [
              'viseme_sil', 'viseme_PP', 'viseme_FF', 'viseme_TH', 'viseme_DD', 'viseme_kk', 'viseme_CH',
              'viseme_SS', 'viseme_nn', 'viseme_RR', 'viseme_aa', 'viseme_E', 'viseme_I', 'viseme_O', 'viseme_U',
              'mouthLowerDownLeft', 'mouthLowerDownRight', 'mouthLeft', 'mouthRight', 'mouthOpen'
            ].map((name) => dict[name] !== undefined ? dict[name] : -1).filter((index) => index !== -1);
            console.log('Teeth viseme indices:', teethVisemeIndices.current);
            if (teethVisemeIndices.current.length === 0) {
              console.warn('No viseme or mouth-related morph targets found in Wolf3D_Teeth');
            }
          }
        }
      }
    });
    if (!headFound) {
      console.error('Wolf3D_Head mesh with morph targets not found in doctor.glb');
    }
    if (!teethMeshRef.current) {
      console.warn('Wolf3D_Teeth mesh with morph targets not found in doctor.glb');
    }
    if (blinkIndices.current.left === -1 || blinkIndices.current.right === -1) {
      console.warn('eyeBlinkLeft or eyeBlinkRight not found in morphTargetDictionary');
    }
    // Ensure head is visible and compute bounding box
    if (meshRef.current && meshRef.current.geometry) {
      meshRef.current.visible = true;
      meshRef.current.geometry.computeBoundingBox();
      console.log('Initial head bounding box:', meshRef.current.geometry.boundingBox);
      if (!meshRef.current.geometry || !meshRef.current.material) {
        console.error('Wolf3D_Head missing geometry or material:', {
          geometry: !!meshRef.current.geometry,
          material: !!meshRef.current.material
        });
      }
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

  // Animate blend shapes for lip-sync, blinking, and handle idle animation
  useFrame((state, delta) => {
    if (meshRef.current && meshRef.current.morphTargetInfluences && meshRef.current.geometry) {
      // Ensure head is visible and check bounding box
      if (!meshRef.current.visible) {
        console.warn('Wolf3D_Head not visible, attempting to restore');
        meshRef.current.visible = true;
        meshRef.current.morphTargetInfluences = new Array(68).fill(0); // Reset influences
      }

      // Log camera position and bounding box for debugging
      const cameraPos = state.camera.position;
      const boundingBox = meshRef.current.geometry.boundingBox;
      console.log('Camera position:', cameraPos.toArray(), 'Head bounding box:', boundingBox);

      let finalInfluences: number[];

      // Lip-sync animation when speaking
      if (isSpeaking && blendShapes.length > 0) {
        const audio = document.getElementById('avatar-audio') as HTMLAudioElement;
        if (audio && !audio.paused) {
          const currentTimeMs = audio.currentTime * 1000; // Audio time in milliseconds
          const frame = Math.floor(currentTimeMs / (1000 / 60)); // 60 FPS
          console.log('Audio currentTime (ms):', currentTimeMs, 'Frame:', frame);

          let targetInfluences: BlendShapeFrame;
          if (blendShapes[frame]) {
            targetInfluences = blendShapes[frame];
            lastValidFrame.current = targetInfluences;
          } else if (lastValidFrame.current) {
            targetInfluences = lastValidFrame.current; // Use last valid frame if current is undefined
            console.log('Using last valid frame for frame:', frame);
          } else {
            targetInfluences = new Array(68).fill(0) as BlendShapeFrame;
            console.log('No blendShapes for frame:', frame, 'Using neutral');
          }

          // Adjust weights for more realistic movement and clamp to prevent extreme deformations
          const adjustedInfluences = targetInfluences.map((weight, index) => {
            // Visemes (0-15): sil, pp, ff, th, dd, kk, ch, ss, nn, rr, aa, e, ih, oh, ou
            if (index >= 0 && index <= 15) {
              return Math.min(Math.max(weight * 0.7, 0), 1); // Reduce by 30%, clamp 0-1
            }
            // Boost lower lip movements (e.g., mouthLowerDown)
            if (index === 16 || index === 17) {
              return Math.min(Math.max(weight * 1.2, 0), 1); // Increase by 20%, clamp 0-1
            }
            // Reduce lateral twitching (e.g., mouthLeft, mouthRight)
            if (index === 18 || index === 19) {
              return Math.min(Math.max(weight * 0.5, 0), 1); // Reduce by 50%, clamp 0-1
            }
            return Math.min(Math.max(weight, 0), 1); // Clamp all weights 0-1
          }) as BlendShapeFrame;

          // Interpolate for smooth transitions
          const lerpFactor = Math.min(delta * 10, 1); // Adjust speed (10 = fast, lower = slower)
          finalInfluences = prevInfluences.current.map((prev, i) =>
            THREE.MathUtils.lerp(prev, adjustedInfluences[i], lerpFactor)
          );
          prevInfluences.current = finalInfluences;

          // Log non-zero influences for debugging
          const activeInfluences = finalInfluences
            .map((weight, index) => (weight > 0.01 ? { index, weight } : null))
            .filter(Boolean);
          console.log('Applying smoothed blendShapes for frame:', frame, 'Active influences:', activeInfluences);
        } else {
          // Reset to neutral if audio is paused
          finalInfluences = new Array(68).fill(0);
          prevInfluences.current = finalInfluences;
          console.log('Audio paused or not playing, resetting to neutral');
        }
      } else {
        // Idle animation: blinking
        finalInfluences = new Array(68).fill(0);
        const time = state.clock.getElapsedTime();

        // Randomized blinking
        if (time >= nextBlinkTime.current && blinkIndices.current.left !== -1 && blinkIndices.current.right !== -1) {
          const blinkDuration = 0.2; // Duration of each blink
          const blinkProgress = (time - nextBlinkTime.current) / blinkDuration;
          if (blinkProgress < 1) {
            const blinkWeight = Math.sin(blinkProgress * Math.PI); // Smooth blink curve
            finalInfluences[blinkIndices.current.left] = blinkWeight * 0.8; // Subtle blink
            finalInfluences[blinkIndices.current.right] = blinkWeight * 0.8;
            console.log('Blinking, weight:', blinkWeight, 'Indices:', blinkIndices.current);
          } else {
            // Schedule next blink (3-6 seconds)
            nextBlinkTime.current = time + 3 + Math.random() * 3;
            console.log('Next blink scheduled at:', nextBlinkTime.current);
          }
        }

        console.log('Not speaking, applying idle animation');
      }

      // Apply final influences to head
      if (meshRef.current.morphTargetInfluences) {
        meshRef.current.morphTargetInfluences = finalInfluences;
        // Recompute bounding box after applying morph influences
        meshRef.current.geometry.computeBoundingBox();
      }

      // Apply relevant influences to teeth
      if (teethMeshRef.current && teethMeshRef.current.morphTargetInfluences) {
        const teethInfluences = new Array(teethMeshRef.current.morphTargetInfluences.length).fill(0);
        // Map head viseme/mouth influences (indices 0-19) to teeth morph targets
        teethVisemeIndices.current.forEach((teethIndex, i) => {
          if (teethIndex !== -1 && i < 20) {
            teethInfluences[teethIndex] = finalInfluences[i];
          }
        });
        teethMeshRef.current.morphTargetInfluences = teethInfluences;
        console.log('Applied teeth influences:', teethInfluences.filter((w) => w > 0.01));
      }

      // Fallback idle animation if no GLB animations
      if (!animations || animations.length === 0) {
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

  return <primitive object={scene} scale={7} position={[0, -11, 0]} />;
}

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

      // Log blend shapes for debugging
      console.log('Blend shapes received:', data.blendShapes);

      // Convert base64 audio to Blob and create URL
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

  // Stop audio playback and reset avatar
  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsSpeaking(false);
      // Reset blend shapes to neutral
      setBlendShapes([]);
    }
  };

  // Stop conversation (stop speaking and clear transcript)
  const stopConversation = () => {
    stopSpeaking();
    setTranscript('');
  };

  // Start speech recognition
  const startListening = () => {
    if (recognition.current && !isListening) {
      // If avatar is speaking, stop it
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

  // Handle audio playback and track speaking state
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

      // Listen for audio end to reset speaking state
      const handleAudioEnd = () => {
        setIsSpeaking(false);
        setBlendShapes([]);
      };
      audioRef.current.addEventListener('ended', handleAudioEnd);

      // Cleanup event listener
      return () => {
        audioRef.current?.removeEventListener('ended', handleAudioEnd);
      };
    }
  }, [audioUrl]);

  // Clean up previous Blob URL when audioUrl changes
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
          <OrbitControls enablePan={false} minDistance={1} maxDistance={4} />
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