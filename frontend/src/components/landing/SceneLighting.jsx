import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export default function SceneLighting() {
  const dirLightRef = useRef();

  return (
    <>
      {/* Deep navy atmospheric fog — increased far distance for visibility */}
      <fog attach="fog" args={['#090d18', 60, 280]} />

      {/* Key directional light — bright warm sun, higher intensity */}
      <directionalLight
        ref={dirLightRef}
        position={[50, 80, 40]}
        intensity={3.5}
        color="#ffecd2"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
        shadow-camera-near={1}
        shadow-camera-far={250}
        shadow-bias={-0.002}
      />

      {/* Strong fill light from opposite side — cool tone */}
      <directionalLight
        position={[-40, 40, -30]}
        intensity={1.2}
        color="#a0b8e0"
      />

      {/* Back/rim light to highlight train silhouette */}
      <directionalLight
        position={[-10, 20, -60]}
        intensity={0.8}
        color="#c0d0f0"
      />

      {/* Hemisphere light for natural sky/ground color blending */}
      <hemisphereLight
        args={['#2a3a5c', '#0e0e0e', 1.0]}
      />

      {/* Ambient baseline — slightly higher for visibility */}
      <ambientLight intensity={0.35} color="#d0daf0" />

      {/* Subtle blue point light near the train for tech accent */}
      <pointLight
        position={[5, 3, 8]}
        intensity={0.5}
        color="#3b8beb"
        distance={25}
        decay={2}
      />
    </>
  );
}
