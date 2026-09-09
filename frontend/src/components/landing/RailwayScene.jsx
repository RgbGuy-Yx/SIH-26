import React, { Suspense, useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import CinematicCamera from './CinematicCamera';
import CinematicFramePlane from './CinematicFramePlane';

/*
 * RailwayScene — Full-screen R3F Canvas for the cinematic frame-sequence experience.
 *
 * Mobile & Desktop Performance Optimizations:
 *  - Mobile DPR capped at 1.3 (eliminates mobile GPU fillrate bottleneck)
 *  - Antialiasing disabled (zero polygon aliasing needed for full-screen video, saves 4x fillrate)
 *  - High-performance WebGL context with sRGB color space
 */

function SceneContent({ scrollProgress, reducedMotion }) {
  return (
    <>
      <CinematicCamera scrollProgress={scrollProgress} reducedMotion={reducedMotion} />
      <CinematicFramePlane scrollProgress={scrollProgress} />
    </>
  );
}

export default function RailwayScene({ scrollProgress = 0 }) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const dpr = useMemo(() => {
    if (typeof window === 'undefined') return 1;
    const isMobile = window.innerWidth < 768;
    const raw = window.devicePixelRatio || 1;
    // Cap at 1.25 on mobile for smooth 60fps; up to 2 on desktop
    return isMobile ? Math.min(raw, 1.25) : Math.min(raw, 2);
  }, []);

  return (
    <Canvas
      dpr={dpr}
      gl={{
        antialias: false,
        toneMapping: THREE.NoToneMapping,
        outputColorSpace: THREE.SRGBColorSpace,
        powerPreference: 'high-performance',
        alpha: false,
      }}
      camera={{
        fov: 50,
        near: 0.1,
        far: 50,
        position: [0, 0, 5],
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        background: '#060a12',
      }}
    >
      <Suspense fallback={null}>
        <SceneContent scrollProgress={scrollProgress} reducedMotion={reducedMotion} />
      </Suspense>
    </Canvas>
  );
}
