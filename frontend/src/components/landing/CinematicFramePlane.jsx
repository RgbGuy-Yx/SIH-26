import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import textureManager from './TextureManager';

/*
 * CinematicFramePlane — Maps the sequential 240-frame cinematic video onto a 3D plane.
 *
 * Responsive & Mobile Intelligent Framing:
 *  - Desktop: Full-bleed edge-to-edge coverage across widescreen monitors
 *  - Mobile: Intelligent horizontal centering brings the train (on right half of 16:9 frame)
 *    directly into the center of the mobile viewport, keeping locomotive and tracks fully visible.
 *  - Mobile Performance: Reduced preload radius (3 frames) prevents network and thread congestion.
 *  - Zero Ghosting: Exact integer frame mapping (Math.round) delivers crisp 24 FPS photographic clarity.
 */

export default function CinematicFramePlane({ scrollProgress = 0 }) {
  const { viewport } = useThree();
  const meshRef = useRef();
  const progressRef = useRef(scrollProgress);
  const lastFrameIdx = useRef(-1);
  const [totalFrames, setTotalFrames] = useState(() => textureManager.getFrameCount());

  useEffect(() => {
    const unsub = textureManager.onCountChange((count) => {
      setTotalFrames(count);
    });
    setTotalFrames(textureManager.getFrameCount());
    return unsub;
  }, []);

  progressRef.current = scrollProgress;

  // Calculate plane dimensions and intelligent mobile cropping offset
  const { planeSize, planePos } = useMemo(() => {
    const distance = 7;
    const vFovRad = (50 * Math.PI) / 180;
    const frustumH = 2 * distance * Math.tan(vFovRad / 2);
    const aspect = viewport.width / viewport.height;
    const frustumW = frustumH * aspect;
    const frameAspect = 16 / 9;
    const isMobile = aspect < 1.0;

    let w, h;
    let x = 0;

    if (aspect >= frameAspect) {
      // Widescreen: fill width, slight vertical overflow
      w = frustumW;
      h = w / frameAspect;
      x = 0;
    } else if (isMobile) {
      // Mobile portrait: fit height with 8% safe bleed so camera drift never exposes gaps
      h = frustumH * 1.08;
      w = h * frameAspect;
      // In the 16:9 frame, train travels on the right track -> shift plane left so train is centered
      x = -(w - frustumW) * 0.40;
    } else {
      // Tablet / squarish: fit height with 5% safe bleed
      h = frustumH * 1.05;
      w = h * frameAspect;
      x = -(w - frustumW) * 0.20;
    }

    return {
      planeSize: [w, h],
      planePos: [x, 0, -2],
    };
  }, [viewport.width, viewport.height]);

  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: false,
    toneMapped: false,
    depthWrite: true,
  }), []);

  useFrame(() => {
    const n = totalFrames || textureManager.getFrameCount();
    if (n < 2 || !meshRef.current) return;

    const progress = Math.max(0, Math.min(1, progressRef.current));
    const framePosition = progress * (n - 1);
    const currentFrame = Math.round(framePosition);

    if (currentFrame !== lastFrameIdx.current) {
      const isMob = viewport.width / viewport.height < 1.0;
      textureManager.preloadAround(currentFrame, isMob ? 3 : 10);
      lastFrameIdx.current = currentFrame;
    }

    const tex = textureManager.getFrame(currentFrame);
    if (tex && meshRef.current.material.map !== tex) {
      meshRef.current.material.map = tex;
      meshRef.current.material.needsUpdate = true;
    }
  });

  return (
    <group position={planePos}>
      <mesh ref={meshRef}>
        <planeGeometry args={planeSize} />
        <primitive object={material} attach="material" />
      </mesh>
    </group>
  );
}
