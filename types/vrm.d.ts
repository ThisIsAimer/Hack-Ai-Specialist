/// <reference types="three" />

declare module '@pixiv/three-vrm' {
  import * as THREE from 'three';

  export interface VRMExpression {
    expressionName: string;
  }

  export interface VRMExpressionManager {
    expressions: VRMExpression[];
    setValue(name: string, value: number): void;
  }

  export interface VRMMeta {
    version?: string;
    name?: string;
    [key: string]: any;
  }

  export interface VRM {
    scene: THREE.Group;
    expressionManager?: VRMExpressionManager;
    humanoid?: any;
    meta?: VRMMeta;
    update(delta: number): void;
  }

  export class VRM {
    constructor(params: {
      scene: THREE.Group;
      meta?: VRMMeta;
      humanoid?: any;
      expressionManager?: VRMExpressionManager;
    });
    scene: THREE.Group;
    expressionManager?: VRMExpressionManager;
    humanoid?: any;
    meta?: VRMMeta;
    update(delta: number): void;
  }

  export namespace VRMUtils {
    function removeUnnecessaryJoints(scene: THREE.Object3D): void;
  }
}