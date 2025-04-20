'use client'

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMUtils, VRMLoaderPlugin } from '@pixiv/three-vrm';

const AvatarPage = () => {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vrmRef = useRef<VRM | null>(null);
  const clock = useRef(new THREE.Clock());

  useEffect(() => {
    const initVRM = async () => {
      // Initialize Three.js scene
      const scene = new THREE.Scene();
      const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current!, antialias: true, alpha: true });
      renderer.setSize(800, 600);
      renderer.setPixelRatio(window.devicePixelRatio);

      // Camera
      const camera = new THREE.PerspectiveCamera(30, 800 / 600, 0.1, 100);
      camera.position.set(0, 1.2, 5);
      camera.lookAt(0, 1.2, 0);

      // Lighting
      const light = new THREE.DirectionalLight(0xffffff, 0.6);
      light.position.set(1, 1, 1).normalize();
      scene.add(light);
      scene.add(new THREE.AmbientLight(0x404040));

      // Load VRM model using GLTFLoader with VRMLoaderPlugin
      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));
      const gltf = await loader.loadAsync('/models/doctor/doctor.vrm');
      const vrm = gltf.userData.vrm as VRM;
      scene.add(vrm.scene);
      vrmRef.current = vrm;

      // Ensure VRM is properly oriented (for VRM 0.0 compatibility)
      VRMUtils.rotateVRM0(vrm);
      vrm.scene.position.set(0, -0.5, 0); // Adjust position if needed

      // Animation loop
      const animate = () => {
        requestAnimationFrame(animate);
        const deltaTime = clock.current.getDelta();
        if (vrm) {
          vrm.update(deltaTime);
          // Basic lip-sync: toggle mouth when speaking
          if (speaking) {
            vrm.expressionManager?.setValue('a', 0.5); // Mouth open
          } else {
            vrm.expressionManager?.setValue('a', 0); // Mouth closed
          }
        }
        renderer.render(scene, camera);
      };
      animate();
    };

    initVRM().catch((error) => {
      console.error('Failed to initialize VRM:', error);
    });

    // Setup Speech Recognition
    const recognition = new ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = async (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      console.log('User said:', transcript);

      // Send to API
      const response = await fetch('/api/doctor-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: { content: [{ type: 'text', text: transcript }] },
          conversation: [], // Add previous conversation if needed
        }),
      });
      const data = await response.json();
      const responseText = data.response;

      // Speak the response
      const utterance = new SpeechSynthesisUtterance(responseText);
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setListening(false);
    };

    if (listening) {
      recognition.start();
    }

    return () => {
      recognition.stop();
      window.speechSynthesis.cancel();
    };
  }, [listening]);

  const toggleListening = () => {
    setListening((prev) => !prev);
  };

  return (
    <div className="flex flex-col items-center p-4">
      <h1 className="text-3xl font-semibold mb-4">Doctor AI Avatar</h1>
      <canvas ref={canvasRef} className="mb-4" />
      <button
        onClick={toggleListening}
        className={`px-4 py-2 rounded text-white transition-all duration-200 ${
          listening ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
        }`}
      >
        {listening ? 'Stop Listening' : 'Start Listening'}
      </button>
    </div>
  );
};

export default AvatarPage;