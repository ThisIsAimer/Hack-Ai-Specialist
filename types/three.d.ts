/// <reference types="three" />

declare module 'three/examples/jsm/loaders/GLTFLoader' {
    import * as THREE from 'three';
    export class GLTFLoader {
      constructor();
      load(
        url: string,
        onLoad: (gltf: GLTF) => void,
        onProgress?: (progress: ProgressEvent) => void,
        onError?: (error: ErrorEvent) => void
      ): void;
    }
    export interface GLTF {
      scene: THREE.Group;
      animations: THREE.AnimationClip[];
      userData?: any;
      [key: string]: any;
    }
  }