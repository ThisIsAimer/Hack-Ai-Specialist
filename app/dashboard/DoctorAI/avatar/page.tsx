'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRM, VRMUtils, VRMExpressionManager } from '@pixiv/three-vrm';

type Message = {
  id: number;
  sender: 'user' | 'bot';
  content: string;
};

const AvatarChat = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [listening, setListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const vrmRef = useRef<VRM | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());

  // Create a programmatic idle animation with broader bone targeting to avoid T-pose
  const createIdleAnimation = (scene: THREE.Object3D, vrm?: VRM): THREE.AnimationClip => {
    const duration = 4.0;
    const times = [0, duration / 4, duration / 2, (3 * duration) / 4, duration];

    // Try to find bones using VRM humanoid or scene traversal with common naming conventions
    const head = vrm?.humanoid?.getBoneNode('head') || findBone(scene, 'head') || findBone(scene, 'neck') || findBone(scene, 'J_Bip_C_Head');
    const leftArm = vrm?.humanoid?.getBoneNode('leftUpperArm') || findBone(scene, 'leftupperarm') || findBone(scene, 'leftarm') || findBone(scene, 'J_Bip_L_UpperArm');
    const rightArm = vrm?.humanoid?.getBoneNode('rightUpperArm') || findBone(scene, 'rightupperarm') || findBone(scene, 'rightarm') || findBone(scene, 'J_Bip_R_UpperArm');
    const leftForeArm = findBone(scene, 'leftlowerarm') || findBone(scene, 'leftforearm') || findBone(scene, 'J_Bip_L_LowerArm');
    const rightForeArm = findBone(scene, 'rightlowerarm') || findBone(scene, 'rightforearm') || findBone(scene, 'J_Bip_R_LowerArm');
    const leftLeg = vrm?.humanoid?.getBoneNode('leftUpperLeg') || findBone(scene, 'leftupperleg') || findBone(scene, 'leftleg') || findBone(scene, 'J_Bip_L_UpperLeg');
    const rightLeg = vrm?.humanoid?.getBoneNode('rightUpperLeg') || findBone(scene, 'rightupperleg') || findBone(scene, 'rightleg') || findBone(scene, 'J_Bip_R_UpperLeg');
    const spine = vrm?.humanoid?.getBoneNode('spine') || findBone(scene, 'spine') || findBone(scene, 'chest') || findBone(scene, 'J_Bip_C_Spine');
    const hips = vrm?.humanoid?.getBoneNode('hips') || findBone(scene, 'hips') || findBone(scene, 'pelvis') || findBone(scene, 'J_Bip_C_Hips');

    console.log('Detected bones:', {
      head: head?.name,
      leftArm: leftArm?.name,
      rightArm: rightArm?.name,
      leftForeArm: leftForeArm?.name,
      rightForeArm: rightForeArm?.name,
      leftLeg: leftLeg?.name,
      rightLeg: rightLeg?.name,
      spine: spine?.name,
      hips: hips?.name,
    });

    // Define animation values for subtle, natural movements to avoid T-pose
    const headValues = [
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0.1, 0.05, 0)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.1, -0.05, 0)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),
    ].map((q) => [q.x, q.y, q.z, q.w]).flat();

    const armValues = [
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.3, 0, 0.1)), // Slight bend to avoid T-pose
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.3, 0, -0.1)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),
    ].map((q) => [q.x, q.y, q.z, q.w]).flat();

    const foreArmValues = [
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.2, 0, 0)), // Bend elbow
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.2, 0, 0)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),
    ].map((q) => [q.x, q.y, q.z, q.w]).flat();

    const legValues = [
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0.05, 0, 0)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.05, 0, 0)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),
    ].map((q) => [q.x, q.y, q.z, q.w]).flat();

    const spineValues = [
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.05, 0)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -0.05, 0)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),
    ].map((q) => [q.x, q.y, q.z, q.w]).flat();

    const hipsValues = [
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.03, 0)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -0.03, 0)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),
    ].map((q) => [q.x, q.y, q.z, q.w]).flat();

    const tracks: THREE.KeyframeTrack[] = [];
    if (head) {
      tracks.push(new THREE.QuaternionKeyframeTrack(`${head.name}.quaternion`, times, headValues));
    }
    if (leftArm) {
      tracks.push(new THREE.QuaternionKeyframeTrack(`${leftArm.name}.quaternion`, times, armValues));
    }
    if (rightArm) {
      tracks.push(new THREE.QuaternionKeyframeTrack(`${rightArm.name}.quaternion`, times, armValues));
    }
    if (leftForeArm) {
      tracks.push(new THREE.QuaternionKeyframeTrack(`${leftForeArm.name}.quaternion`, times, foreArmValues));
    }
    if (rightForeArm) {
      tracks.push(new THREE.QuaternionKeyframeTrack(`${rightForeArm.name}.quaternion`, times, foreArmValues));
    }
    if (leftLeg) {
      tracks.push(new THREE.QuaternionKeyframeTrack(`${leftLeg.name}.quaternion`, times, legValues));
    }
    if (rightLeg) {
      tracks.push(new THREE.QuaternionKeyframeTrack(`${rightLeg.name}.quaternion`, times, legValues));
    }
    if (spine) {
      tracks.push(new THREE.QuaternionKeyframeTrack(`${spine.name}.quaternion`, times, spineValues));
    }
    if (hips) {
      tracks.push(new THREE.QuaternionKeyframeTrack(`${hips.name}.quaternion`, times, hipsValues));
    }

    if (tracks.length === 0) {
      console.warn('No bones found for idle animation, creating empty track');
      const fallbackTrack = new THREE.VectorKeyframeTrack(
        '.position',
        [0, duration],
        [0, 0, 0, 0, 0, 0]
      );
      tracks.push(fallbackTrack);
    }

    return new THREE.AnimationClip('IdleAnimation', duration, tracks);
  };

  // Helper to find bones by partial name (case-insensitive)
  const findBone = (scene: THREE.Object3D, namePart: string): THREE.Object3D | undefined => {
    let found: THREE.Object3D | undefined;
    scene.traverse((object) => {
      if (object instanceof THREE.Bone && object.name.toLowerCase().includes(namePart.toLowerCase())) {
        found = object;
      }
    });
    return found;
  };

  // Set up Three.js scene and load VRM model
  useEffect(() => {
    if (!canvasRef.current) return;
  
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1, 2);
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
  
    const loader = new GLTFLoader();
    loader.load(
      '/models/doctor_vrm1.vrm',
      async (gltf: GLTF) => {
        console.log('GLTF loaded:', gltf);
        console.log('gltf.userData:', gltf.userData); // Log metadata for debugging
  
        // Attempt VRM initialization
        let vrm: VRM | undefined = undefined; // Changed to VRM | undefined
        try {
          // Check if VRM metadata exists, provide fallback
          const vrmMeta = gltf.userData?.vrmMeta || {};
          const vrmHumanoid = gltf.userData?.vrmHumanoid || null;
          const vrmExpressionManager = gltf.userData?.vrmExpressionManager || undefined;
  
          if (!vrmHumanoid) {
            console.warn('No VRM humanoid data found, treating as generic GLTF model');
          } else {
            vrm = new VRM({
              scene: gltf.scene,
              meta: vrmMeta,
              humanoid: vrmHumanoid,
              expressionManager: vrmExpressionManager,
            });
            console.log('VRM initialized:', vrm);
            VRMUtils.removeUnnecessaryJoints(gltf.scene);
            vrmRef.current = vrm; // vrmRef.current accepts VRM | null, so this is fine
          }
        } catch (error: unknown) {
          console.error('VRM initialization failed:', error);
          vrm = undefined; // Set to undefined on failure
        }
  
        // Add scene to renderer (VRM or raw GLTF)
        const modelScene = vrm ? vrm.scene : gltf.scene;
        modelScene.rotation.y = 0; // Face forward
        scene.add(modelScene);
  
        // Create and play idle animation
        const idleClip = createIdleAnimation(modelScene, vrm); // vrm is VRM | undefined
        mixerRef.current = new THREE.AnimationMixer(modelScene);
        const idleAction = mixerRef.current.clipAction(idleClip);
        idleAction.play();
        console.log('Playing idle animation');
  
        // Play any existing animations
        if (gltf.animations && gltf.animations.length > 0) {
          gltf.animations.forEach((clip: THREE.AnimationClip) => {
            const action = mixerRef.current!.clipAction(clip);
            action.play();
            console.log(`Playing animation: ${clip.name}`);
          });
        } else {
          console.warn('No animations found in model');
        }
  
        // Log expression manager details
        if (vrm?.expressionManager) {
          const expressions = vrm.expressionManager.expressions.map((exp: { expressionName: string }) => exp.expressionName);
          console.log('Available expressions:', expressions);
          const defaultExpression = expressions.includes('neutral') ? 'neutral' : expressions[0] || null;
          if (defaultExpression) {
            vrm.expressionManager.setValue(defaultExpression, 0);
          }
        } else {
          console.warn('No expressionManager available');
        }
      },
      (progress: ProgressEvent) => console.log(`Loading VRM: ${(progress.loaded / progress.total * 100).toFixed(2)}%`),
      (error: unknown) => {
        console.error('VRM load error:', error);
        vrmRef.current = null;
      }
    );
  
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1).normalize();
    scene.add(light);
  
    const animate = () => {
      try {
        requestAnimationFrame(animate);
        const delta = clockRef.current.getDelta();
  
        if (vrmRef.current && vrmRef.current.update) {
          if (isSpeaking && vrmRef.current.expressionManager) {
            const time = clockRef.current.getElapsedTime();
            const mouthValue = Math.abs(Math.sin(time * 5));
            const expressions = vrmRef.current.expressionManager.expressions.map((exp: { expressionName: string }) => exp.expressionName);
            const expressionName = expressions.includes('neutral') ? 'neutral' : expressions[0] || null;
            if (expressionName) {
              vrmRef.current.expressionManager.setValue(expressionName, mouthValue);
            }
          } else if (vrmRef.current.expressionManager) {
            const expressions = vrmRef.current.expressionManager.expressions.map((exp: { expressionName: string }) => exp.expressionName);
            const expressionName = expressions.includes('neutral') ? 'neutral' : expressions[0] || null;
            if (expressionName) {
              vrmRef.current.expressionManager.setValue(expressionName, 0);
            }
          }
          vrmRef.current.update(delta);
        } else {
          console.log('Skipping VRM update (vrmRef.current is null or no update method)');
        }
  
        if (mixerRef.current) {
          mixerRef.current.update(delta);
        }
  
        renderer.render(scene, camera);
      } catch (error: unknown) {
        console.error('Animation loop error:', error);
      }
    };
    animate();
  
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
  
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      vrmRef.current = null;
    };
  }, [isSpeaking]);

  // Set up speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        sendMessage(transcript);
      };
      recognitionRef.current.onend = () => setListening(false);
      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setListening(false);
      };
    } else {
      console.error('Speech recognition not supported in this browser.');
    }
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !listening) {
      recognitionRef.current.start();
      setListening(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && listening) {
      recognitionRef.current.stop();
      setListening(false);
    }
  };

  const stopTalking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const sendMessage = async (text: string) => {
    const userMessage: Message = { id: Date.now(), sender: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await fetch('/api/doctor-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: { content: [{ type: 'text', text }] },
          conversation: messages.map((msg) => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.content,
          })),
        }),
      });
      const data = await response.json();
      if (response.ok) {
        const botMessage: Message = { id: Date.now() + 1, sender: 'bot', content: data.response };
        setMessages((prev) => [...prev, botMessage]);
        speakResponse(data.response);
      } else {
        console.error('API error:', data);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      console.error('Speech synthesis not supported in this browser.');
    }
  };

  return (
    <div className="relative h-screen">
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/80 max-h-[50%] overflow-y-auto">
        {messages.map((msg) => (
          <div key={msg.id} className={`mb-2 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
            <span
              className={`inline-block p-2 rounded ${
                msg.sender === 'user' ? 'bg-indigo-500 text-white' : 'bg-gray-200'
              }`}
            >
              {msg.content}
            </span>
          </div>
        ))}
        <div className="flex space-x-2">
          <button
            onClick={listening ? stopListening : startListening}
            className="mt-2 p-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
          >
            {listening ? 'Stop Listening' : 'Start Listening'}
          </button>
          <button
            onClick={stopTalking}
            className="mt-2 p-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Stop Talking
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarChat;