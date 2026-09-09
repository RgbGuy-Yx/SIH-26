import React from 'react';

/*
 * WebGLFallback — Shown when WebGL is unavailable.
 * Displays a high-quality static image with the hero copy.
 */

export default function WebGLFallback() {
  return (
    <div className="webgl-fallback">
      <div className="webgl-fallback-bg"></div>
      <div className="webgl-fallback-content">
        <h1 className="landing-hero-title">
          KNOW YOUR<br />JOURNEY.
        </h1>
        <p className="landing-hero-sub">
          RailSense turns railway complexity into clarity.
        </p>
        <p className="webgl-fallback-note">
          Enable WebGL in your browser for the full interactive experience.
        </p>
      </div>
    </div>
  );
}
