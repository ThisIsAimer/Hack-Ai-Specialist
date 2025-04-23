'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRM, VRMUtils } from '@pixiv/three-vrm';

type Message = {
  id: number;
  sender: 'user' | 'bot';
  content: string;
};

interface Models {
  idle: VRM | null;
  listen: VRM | null;
  talk: VRM | null;
}

interface GLTFMap {
  idle: GLTF;
  listen: GLTF;
  talk: GLTF;
}

interface ModelObjects {
  idle: THREE.Object3D;
  listen: THREE.Object3D;
  talk: THREE.Object3D;
}

interface Mixers {
  idle: THREE.AnimationMixer;
  listen: THREE.AnimationMixer;
  talk: THREE.AnimationMixer;
}

const AvatarChat = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [listening, setListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [avatarState, setAvatarState] = useState<'idle' | 'listen' | 'talk'>('idle');
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const modelsRef = useRef<Models>({ idle: null, listen: null, talk: null });
  const gltfMapRef = useRef<GLTFMap | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const mixersRef = useRef<Mixers | null>(null);
  const modelObjectsRef = useRef<ModelObjects | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  const createIdleAnimation = (scene: THREE.Object3D, vrm: VRM | null = null): THREE.AnimationClip => {
    const duration = 4.0;
    const times = [0, duration / 4, duration / 2, (3 * duration) / 4, duration];

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

    const headValues = [
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0.1, 0.05, 0)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.1, -0.05, 0)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),
    ].map((q) => [q.x, q.y, q.z, q.w]).flat();

    const armValues = [
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.3, 0, 0.1)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.3, 0, -0.1)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),
    ].map((q) => [q.x, q.y, q.z, q.w]).flat();

    const foreArmValues = [
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.2, 0, 0)),
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
    if (head) tracks.push(new THREE.QuaternionKeyframeTrack(`${head.name}.quaternion`, times, headValues));
    if (leftArm) tracks.push(new THREE.QuaternionKeyframeTrack(`${leftArm.name}.quaternion`, times, armValues));
    if (rightArm) tracks.push(new THREE.QuaternionKeyframeTrack(`${rightArm.name}.quaternion`, times, armValues));
    if (leftForeArm) tracks.push(new THREE.QuaternionKeyframeTrack(`${leftForeArm.name}.quaternion`, times, foreArmValues));
    if (rightForeArm) tracks.push(new THREE.QuaternionKeyframeTrack(`${rightForeArm.name}.quaternion`, times, foreArmValues));
    if (leftLeg) tracks.push(new THREE.QuaternionKeyframeTrack(`${leftLeg.name}.quaternion`, times, legValues));
    if (rightLeg) tracks.push(new THREE.QuaternionKeyframeTrack(`${rightLeg.name}.quaternion`, times, legValues));
    if (spine) tracks.push(new THREE.QuaternionKeyframeTrack(`${spine.name}.quaternion`, times, spineValues));
    if (hips) tracks.push(new THREE.QuaternionKeyframeTrack(`${hips.name}.quaternion`, times, hipsValues));

    if (tracks.length === 0) {
      console.warn('No bones found for idle animation, creating empty track');
      const fallbackTrack = new THREE.VectorKeyframeTrack('.position', [0, duration], [0, 0, 0, 0, 0, 0]);
      tracks.push(fallbackTrack);
    }

    return new THREE.AnimationClip('IdleAnimation', duration, tracks);
  };

  const findBone = (scene: THREE.Object3D, namePart: string): THREE.Object3D | undefined => {
    let found: THREE.Object3D | undefined;
    scene.traverse((object) => {
      if (object instanceof THREE.Bone && object.name.toLowerCase().includes(namePart.toLowerCase())) {
        found = object;
      }
    });
    return found;
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1, 2);
    cameraRef.current = camera;
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    rendererRef.current = renderer;

    const loadModel = (url: string): Promise<GLTF> => {
      return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();
        loader.load(
          url,
          (gltf) => resolve(gltf),
          undefined,
          (error) => reject(error)
        );
      });
    };

    const loadModels = async () => {
      try {
        const [gltfIdle, gltfListen, gltfTalk] = await Promise.all([
          loadModel('/models/doctors/idle.vrm'),
          loadModel('/models/doctors/listen.vrm'),
          loadModel('/models/doctors/talk.vrm'),
        ]);

        console.log('Models loaded successfully:', { idle: !!gltfIdle, listen: !!gltfListen, talk: !!gltfTalk });

        gltfMapRef.current = { idle: gltfIdle, listen: gltfListen, talk: gltfTalk };

        const initializeVRM = (gltf: GLTF, modelName: string): VRM | null => {
          try {
            if (!gltf.userData.vrmHumanoid) {
              console.warn(`VRM humanoid data missing in ${modelName}. Falling back to raw scene.`);
              return null;
            }
            const vrm = new VRM({
              scene: gltf.scene,
              meta: gltf.userData?.vrmMeta || {},
              humanoid: gltf.userData?.vrmHumanoid || null,
              expressionManager: gltf.userData?.vrmExpressionManager || undefined,
            });
            VRMUtils.removeUnnecessaryJoints(gltf.scene);
            console.log(`VRM initialized successfully for ${modelName}`);
            return vrm;
          } catch (error) {
            console.error(`Failed to initialize VRM for ${modelName}:`, error);
            return null;
          }
        };

        modelsRef.current.idle = initializeVRM(gltfIdle, 'idle.vrm');
        modelsRef.current.listen = initializeVRM(gltfListen, 'listen.vrm');
        modelsRef.current.talk = initializeVRM(gltfTalk, 'talk.vrm');

        const idleModel = modelsRef.current.idle ? modelsRef.current.idle.scene : gltfIdle.scene;
        const listenModel = modelsRef.current.listen ? modelsRef.current.listen.scene : gltfListen.scene;
        const talkModel = modelsRef.current.talk ? modelsRef.current.talk.scene : gltfTalk.scene;

        scene.add(idleModel);
        scene.add(listenModel);
        scene.add(talkModel);

        idleModel.visible = true;
        listenModel.visible = false;
        talkModel.visible = false;

        modelObjectsRef.current = {
          idle: idleModel,
          listen: listenModel,
          talk: talkModel,
        };

        const mixerIdle = new THREE.AnimationMixer(idleModel);
        const idleAnimation = gltfIdle.animations[0] || createIdleAnimation(idleModel, modelsRef.current.idle);
        mixerIdle.clipAction(idleAnimation).play();

        const mixerListen = new THREE.AnimationMixer(listenModel);
        const listenAnimation = gltfListen.animations[0] || createIdleAnimation(listenModel, modelsRef.current.listen);
        mixerListen.clipAction(listenAnimation).play();

        const mixerTalk = new THREE.AnimationMixer(talkModel);
        const talkAnimation = gltfTalk.animations[0] || createIdleAnimation(talkModel, modelsRef.current.talk);
        mixerTalk.clipAction(talkAnimation).play();

        mixersRef.current = {
          idle: mixerIdle,
          listen: mixerListen,
          talk: mixerTalk,
        };

        setModelsLoaded(true);
        console.log('All models loaded and added to scene');
      } catch (error) {
        console.error('Error loading models:', error);
        setModelsLoaded(false);
      }
    };

    loadModels();

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1).normalize();
    scene.add(light);

    const animate = () => {
      requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();

      if (mixersRef.current) {
        mixersRef.current.idle.update(delta);
        mixersRef.current.listen.update(delta);
        mixersRef.current.talk.update(delta);
      }

      const currentVRM = modelsRef.current[avatarState];
      if (currentVRM && currentVRM.expressionManager) {
        if (isSpeaking) {
          const time = clockRef.current.getElapsedTime();
          const mouthValue = Math.abs(Math.sin(time * 5));
          const expressions = currentVRM.expressionManager.expressions.map((exp: any) => exp.expressionName);
          const expressionName = expressions.includes('aa') ? 'aa' : expressions[0] || null;
          if (expressionName) {
            currentVRM.expressionManager.setValue(expressionName, mouthValue);
          }
        } else {
          const expressions = currentVRM.expressionManager.expressions.map((exp: any) => exp.expressionName);
          const expressionName = expressions.includes('neutral') ? 'neutral' : expressions[0] || null;
          if (expressionName) {
            currentVRM.expressionManager.setValue(expressionName, 0);
          }
        }
        currentVRM.update(delta);
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    if (modelsLoaded) {
      animate();
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [modelsLoaded]);

  useEffect(() => {
    if (!sceneRef.current || !modelsLoaded || !modelObjectsRef.current) {
      console.log('Cannot update visibility: scene, models, or model objects not ready');
      return;
    }

    console.log('Updating visibility for state:', avatarState, {
      idle: avatarState === 'idle',
      listen: avatarState === 'listen',
      talk: avatarState === 'talk',
    });

    const { idle, listen, talk } = modelObjectsRef.current;
    if (idle) idle.visible = avatarState === 'idle';
    if (listen) listen.visible = avatarState === 'listen';
    if (talk) talk.visible = avatarState === 'talk';
  }, [avatarState, modelsLoaded]);

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
      recognitionRef.current.onend = () => {
        setListening(false);
        setAvatarState('idle');
      };
      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setListening(false);
        setAvatarState('idle');
      };
    } else {
      console.error('Speech recognition not supported in this browser.');
    }
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !listening) {
      recognitionRef.current.start();
      setListening(true);
      setAvatarState('listen');
      console.log('Started listening, avatarState set to listen');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && listening) {
      recognitionRef.current.stop();
      setListening(false);
      setAvatarState('idle');
      console.log('Stopped listening, avatarState set to idle');
    }
  };

  const SelectVoice = () => {
    if ('speechSynthesis' in window) {
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find((voice) => voice.name === 'Google UK English Female') || voices[0];
      return selectedVoice;
    }
    return null;
  };

  const stopTalking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setAvatarState('idle');
      console.log('Stopped talking, avatarState set to idle');
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
        setAvatarState('talk');
        console.log('API responded, avatarState set to talk');
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
      utterance.onstart = () => {
        setIsSpeaking(true);
        console.log('Speech started, isSpeaking set to true');
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        setAvatarState('idle');
        console.log('Speech ended, avatarState set to idle');
      };
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
        setIsSpeaking(false);
        setAvatarState('idle');
      };
      const selectedVoice = SelectVoice();
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
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