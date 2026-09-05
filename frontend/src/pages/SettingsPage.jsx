import React, { useState } from 'react';

export function SettingsPage() {
  const [simulationSpeed, setSimulationSpeed] = useState('4x');
  const [weatherSyncInterval, setWeatherSyncInterval] = useState('15');
  const [headwayBuffer, setHeadwayBuffer] = useState('3.0');
  const [geminiExplanationEnabled, setGeminiExplanationEnabled] = useState(true);

  return (
    <div className="flex flex-col w-full p-6 space-y-6 text-on-surface max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-low p-6 rounded-xl border border-slate-800/60 shadow-md">
        <div className="flex flex-col space-y-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">tune</span>
            <h1 className="text-2xl font-bold text-white tracking-tight">Control Room System Settings</h1>
            <span className="px-2 py-0.5 rounded bg-surface-container-highest text-secondary text-xs font-mono font-semibold uppercase">
              SYS-CFG // VER 4.12
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Configure simulation parameters, real-time alert thresholds, GIS display overlays, and external telemetry microservices.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-surface-container-high hover:bg-surface-bright text-white text-xs font-semibold transition-colors"
          >
            Reset Defaults
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors shadow-[0_0_12px_rgba(46,92,230,0.4)]"
          >
            Save Configuration
          </button>
        </div>
      </div>

      {/* Grid: System Controls & Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Simulation Clock & Engine Parameters */}
        <div className="bg-surface-container-lowest rounded-xl p-5 border border-slate-800/80 space-y-4 shadow-lg">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <span className="material-symbols-outlined text-primary text-[20px]">speed</span>
            <h2 className="text-sm font-bold text-white uppercase tracking-tight">Simulation Engine Parameters</h2>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">Virtual Clock Speed Multiplier</label>
              <div className="flex items-center gap-2">
                {['1x', '2x', '4x', '8x', '16x'].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setSimulationSpeed(speed)}
                    className={`px-3 py-1.5 rounded-lg border font-mono font-bold transition-all ${
                      simulationSpeed === speed
                        ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(46,92,230,0.4)]'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {speed}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">Minimum Safety Headway Buffer (km)</label>
              <input
                type="number"
                step="0.5"
                value={headwayBuffer}
                onChange={(e) => setHeadwayBuffer(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-800 text-white font-mono focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-500">
                Minimum distance required between consecutive train blocks before triggering conflict alert.
              </p>
            </div>
          </div>
        </div>

        {/* AI & Integration Microservices */}
        <div className="bg-surface-container-lowest rounded-xl p-5 border border-slate-800/80 space-y-4 shadow-lg">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <span className="material-symbols-outlined text-primary text-[20px]">psychology</span>
            <h2 className="text-sm font-bold text-white uppercase tracking-tight">AI & External Microservices</h2>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="space-y-0.5">
                <span className="font-semibold text-white">Gemini AI Operational Insights</span>
                <p className="text-[11px] text-slate-400">Generate natural language explanations for delays & precedence.</p>
              </div>
              <button
                type="button"
                onClick={() => setGeminiExplanationEnabled(!geminiExplanationEnabled)}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  geminiExplanationEnabled ? 'bg-blue-600' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    geminiExplanationEnabled ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">Open-Meteo Weather Refresh Rate (mins)</label>
              <select
                value={weatherSyncInterval}
                onChange={(e) => setWeatherSyncInterval(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="5">Every 5 minutes (Real-Time)</option>
                <option value="15">Every 15 minutes (Standard)</option>
                <option value="30">Every 30 minutes</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
