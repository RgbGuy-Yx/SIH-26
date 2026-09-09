import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import RailwayScene from '../components/landing/RailwayScene';
import HeroOverlay from '../components/landing/HeroOverlay';
import LandingNavbar from '../components/landing/LandingNavbar';
import LoadingScreen from '../components/landing/LoadingScreen';
import WebGLFallback from '../components/landing/WebGLFallback';
import LandingFeatures from '../components/landing/LandingFeatures';
import textureManager from '../components/landing/TextureManager';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import './landing.css';

gsap.registerPlugin(ScrollTrigger);

/*
 * RailSenseLandingPage — Cinematic 240-frame sequence + rich landing experience.
 *
 * Smooth Scrolling & Performance Engine:
 *  - Lenis smooth inertial scrolling synchronized with GSAP ScrollTrigger via gsap.ticker
 *  - requestAnimationFrame state throttling eliminates touch-scroll stutter
 *  - Dynamic viewport height handling
 *  - Pure 60fps WebGL scrubbing with decoupled React UI rendering
 */

function detectWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
}

export default function RailSenseLandingPage() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [webglAvailable, setWebglAvailable] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [assetsReady, setAssetsReady] = useState(false);
  const scrollContainerRef = useRef(null);
  const progressRef = useRef({ value: 0 });

  // Detect WebGL
  useEffect(() => {
    setWebglAvailable(detectWebGL());
  }, []);

  // Initialize Lenis smooth scroll engine
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      syncTouch: false, // native touch on mobile for zero-lag responsiveness
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
    });

    // Synchronize Lenis scroll position with GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    // Drive Lenis raf through GSAP's ticker for lockstep frame alignment
    const updateTicker = (time) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateTicker);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(updateTicker);
      lenis.destroy();
    };
  }, []);

  // Initialize texture manager
  useEffect(() => {
    if (!webglAvailable) return;

    textureManager.init();
    textureManager.onReady((count, ready) => {
      setLoadingProgress(textureManager.getProgress());
      if (ready && !assetsReady) {
        setTimeout(() => setAssetsReady(true), 250);
      }
    });

    return () => {
      textureManager.dispose();
    };
  }, [webglAvailable]);

  // ScrollTrigger setup with RAF throttling for silky scrubbing
  useEffect(() => {
    if (!scrollContainerRef.current || !webglAvailable) return;

    let lastProgress = 0;
    let rafId = null;

    const trigger = ScrollTrigger.create({
      trigger: scrollContainerRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true, // Lenis provides the smooth inertia; scrub: true tracks it 1:1
      onUpdate: (self) => {
        progressRef.current.value = self.progress;

        // Throttle React DOM re-renders to requestAnimationFrame
        if (Math.abs(self.progress - lastProgress) > 0.003) {
          lastProgress = self.progress;
          if (!rafId) {
            rafId = requestAnimationFrame(() => {
              setScrollProgress(self.progress);
              rafId = null;
            });
          }
        }
      },
    });

    ScrollTrigger.refresh();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      trigger.kill();
    };
  }, [webglAvailable, assetsReady]);

  if (!webglAvailable) {
    return (
      <div className="landing-page">
        <LandingNavbar />
        <WebGLFallback />
      </div>
    );
  }

  return (
    <div className="landing-page">
      {/* Loading Screen */}
      <LoadingScreen progress={loadingProgress} ready={assetsReady} />

      {/* Fixed WebGL canvas */}
      <RailwayScene scrollProgress={scrollProgress} />

      {/* Fixed HTML overlay layer for the 5-stage cinematic narrative */}
      <div
        className="landing-overlay"
        style={{
          opacity: scrollProgress > 0.98 ? Math.max(0, 1 - (scrollProgress - 0.98) * 15) : 1,
        }}
      >
        <LandingNavbar />
        <HeroOverlay scrollProgress={scrollProgress} />
      </div>

      {/* Scroll container for the 240-frame timeline */}
      <div ref={scrollContainerRef} className="landing-scroll-container">
        <div className="landing-scroll-section" id="stage-train" />
        <div className="landing-scroll-section" id="stage-network" />
        <div className="landing-scroll-section" id="stage-disruption" />
        <div className="landing-scroll-section" id="stage-railsense" />
        <div className="landing-scroll-section" id="stage-answer" />
      </div>

      {/* Full-scale rich landing page sections flowing seamlessly below */}
      <LandingFeatures />
    </div>
  );
}
