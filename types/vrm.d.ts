/// <reference types="three" />

declare module '@pixiv/three-vrm' {
    import * as THREE from 'three';
  
    interface VRMExpression {
      expressionName: string;
    }
  
    interface VRMExpressionManager {
      expressions: VRMExpression[];
      setValue(name: string, value: number): void;
    }
  
    interface VRMMeta {
      version?: string;
      name?: string;
      [key: string]: any;
    }
  
    interface VRM {
      scene: THREE.Group;
      expressionManager?: VRMExpressionManager;
      humanoid?: any;
      meta?: VRMMeta;
      update(delta: number): void;
    }
  
    class VRM {
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
  
    namespace VRMUtils {
      function removeUnnecessaryJoints(scene: THREE.Object3D): void;
    }
  
    export { VRM, VRMUtils, VRMExpressionManager };
  }