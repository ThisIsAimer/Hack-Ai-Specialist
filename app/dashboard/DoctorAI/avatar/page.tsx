'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRM, VRMUtils, VRMExpression } from '@pixiv/three-vrm';
import BgGradient from '@/components/common/bg-gradient';

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

interface ChatResponse {
  response: string;
}

const AvatarChat = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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

  const handleResize = () => {
    if (containerRef.current && canvasRef.current && cameraRef.current && rendererRef.current) {
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      canvasRef.current.style.width = `${width}px`;
      canvasRef.current.style.height = `${height}px`;
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    }
  };

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1, 2);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    handleResize();

    const loadModel = (url: string): Promise<GLTF> => {
      return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();
        loader.load(url, resolve, undefined, reject);
      });
    };

    const loadModels = async () => {
      try {
        const [gltfIdle, gltfListen, gltfTalk] = await Promise.all([
          loadModel('/models/doctors/idle.vrm'),
          loadModel('/models/doctors/listen.vrm'),
          loadModel('/models/doctors/talk.vrm'),
        ]);

        gltfMapRef.current = { idle: gltfIdle, listen: gltfListen, talk: gltfTalk };

        const initializeVRM = (gltf: GLTF): VRM | null => {
          try {
            if (!gltf.userData.vrmHumanoid) {
              return null;
            }
            const vrm = new VRM({
              scene: gltf.scene,
              meta: gltf.userData?.vrmMeta || {},
              humanoid: gltf.userData?.vrmHumanoid || null,
              expressionManager: gltf.userData?.vrmExpressionManager || undefined,
            });
            VRMUtils.removeUnnecessaryJoints(gltf.scene);
            return vrm;
          } catch {
            return null;
          }
        };

        modelsRef.current.idle = initializeVRM(gltfIdle);
        modelsRef.current.listen = initializeVRM(gltfListen);
        modelsRef.current.talk = initializeVRM(gltfTalk);

        const scaleFactor = 3;
        const yOffset = -3.2;

        const centerModel = (model: THREE.Object3D) => {
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          model.position.x = -center.x;
          model.position.z = -center.z;
        };

        const idleModel = modelsRef.current.idle ? modelsRef.current.idle.scene : gltfIdle.scene;
        idleModel.scale.set(scaleFactor, scaleFactor, scaleFactor);
        centerModel(idleModel);
        idleModel.position.y = yOffset;
        scene.add(idleModel);

        const listenModel = modelsRef.current.listen ? modelsRef.current.listen.scene : gltfListen.scene;
        listenModel.scale.set(scaleFactor, scaleFactor, scaleFactor);
        centerModel(listenModel);
        listenModel.position.y = yOffset;
        scene.add(listenModel);

        const talkModel = modelsRef.current.talk ? modelsRef.current.talk.scene : gltfTalk.scene;
        talkModel.scale.set(scaleFactor, scaleFactor, scaleFactor);
        centerModel(talkModel);
        talkModel.position.y = yOffset;
        scene.add(talkModel);

        idleModel.visible = true;
        listenModel.visible = false;
        talkModel.visible = false;

        modelObjectsRef.current = { idle: idleModel, listen: listenModel, talk: talkModel };

        const mixerIdle = new THREE.AnimationMixer(idleModel);
        const idleAnimation = gltfIdle.animations[0] || createIdleAnimation(idleModel, modelsRef.current.idle);
        mixerIdle.clipAction(idleAnimation).play();

        const mixerListen = new THREE.AnimationMixer(listenModel);
        const listenAnimation = gltfListen.animations[0] || createIdleAnimation(listenModel, modelsRef.current.listen);
        mixerListen.clipAction(listenAnimation).play();

        const mixerTalk = new THREE.AnimationMixer(talkModel);
        const talkAnimation = gltfTalk.animations[0] || createIdleAnimation(talkModel, modelsRef.current.talk);
        mixerTalk.clipAction(talkAnimation).play();

        mixersRef.current = { idle: mixerIdle, listen: mixerListen, talk: mixerTalk };

        setModelsLoaded(true);
      } catch {
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
          const expressions = currentVRM.expressionManager.expressions.map((exp: VRMExpression) => exp.expressionName);
          const expressionName = expressions.includes('aa') ? 'aa' : expressions[0] || null;
          if (expressionName) {
            currentVRM.expressionManager.setValue(expressionName, mouthValue);
          }
        } else {
          const expressions = currentVRM.expressionManager.expressions.map((exp: VRMExpression) => exp.expressionName);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelsLoaded]);

  useEffect(() => {
    if (!sceneRef.current || !modelsLoaded || !modelObjectsRef.current) return;
    const { idle, listen, talk } = modelObjectsRef.current;
    if (idle) idle.visible = avatarState === 'idle';
    if (listen) listen.visible = avatarState === 'listen';
    if (talk) talk.visible = avatarState === 'talk';
  }, [avatarState, modelsLoaded]);

  const sendMessage = useCallback(async (text: string) => {
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
      const data: ChatResponse = await response.json();
      if (response.ok) {
        const botMessage: Message = { id: Date.now() + 1, sender: 'bot', content: data.response };
        setMessages((prev) => [...prev, botMessage]);
        setAvatarState('talk');
        speakResponse(data.response);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  }, [messages]);

  useEffect(() => {
    // Use the SpeechRecognition type defined in speech.d.ts
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
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
        recognitionRef.current.onerror = () => {
          setListening(false);
          setAvatarState('idle');
        };
      }
    }
  }, [sendMessage]);

  const startListening = () => {
    if (recognitionRef.current && !listening) {
      recognitionRef.current.start();
      setListening(true);
      setAvatarState('listen');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && listening) {
      recognitionRef.current.stop();
      setListening(false);
      setAvatarState('idle');
    }
  };

  const stopTalking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setAvatarState('idle');
    }
  };

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        setAvatarState('idle');
      };
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div>
      <BgGradient />
      <div ref={containerRef} className="relative w-full h-screen overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        <div className="absolute bottom-4 mb-20 left-1/2 transform -translate-x-1/2 flex space-x-2">
          <button
            onClick={listening ? stopListening : startListening}
            className="p-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
          >
            {listening ? 'Stop Listening' : 'Start Listening'}
          </button>
          <button
            onClick={stopTalking}
            className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Stop Talking
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarChat;