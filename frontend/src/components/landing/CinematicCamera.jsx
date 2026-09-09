import { useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/*
 * CinematicCamera — Subtle scroll-driven camera for the frame-sequence scene.
 *
 * Mobile & Desktop Optimization:
 *  - Mobile: Locks position directly at [0, 0, 5] looking at [0, 0, 0] for zero jitter & rock-solid framing.
 *  - Desktop: Subtle parallax drift that gives depth to the physical world.
 */

export default function CinematicCamera({ scrollProgress = 0, reducedMotion = false }) {
  const { camera, size } = useThree();
  const targetRef = useRef(new THREE.Vector3(0, 0, 5));
  const isMobile = size.width < 768;

  useFrame(() => {
    if (reducedMotion || isMobile) {
      camera.position.set(0, 0, 5);
      camera.lookAt(0, 0, 0);
      return;
    }

    const t = Math.max(0, Math.min(1, scrollProgress));

    // Subtle desktop parallax
    const zBase = 5;
    const zOffset = Math.sin(t * Math.PI * 2) * 0.05;
    const yOffset = Math.sin(t * Math.PI) * 0.03 - 0.01;
    const xOffset = Math.sin(t * Math.PI * 1.5) * 0.03;

    targetRef.current.set(xOffset, yOffset, zBase + zOffset);
    camera.position.lerp(targetRef.current, 0.06);
    camera.lookAt(0, 0, 0);
  });

  return null;
}
