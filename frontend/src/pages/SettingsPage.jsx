import React, { useState } from 'react';

export function SettingsPage() {
  const [simulationSpeed, setSimulationSpeed] = useState('4x');
  const [weatherSyncInterval, setWeatherSyncInterval] = useState('15');
  const [headwayBuffer, setHeadwayBuffer] = useState('3.0');
  const [geminiExplanationEnabled, setGeminiExplanationEnabled] = useState(true);

  return (
    <div className="flex flex-col w-full p-6 space-y-6 text-slate-800 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-md border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0284C7] text-[20px]">tune</span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Control Room System Settings</h1>
            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px] font-mono font-bold uppercase">
              SYS-CFG // VER 4.12
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Configure simulation parameters, real-time alert thresholds, GIS display overlays, and external telemetry microservices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3.5 py-1.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            Reset Defaults
          </button>
          <button
            type="button"
            className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-xs"
          >
            Save Configuration
          </button>
        </div>
      </div>

      {/* Grid: System Controls & Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Simulation Clock & Engine Parameters */}
        <div className="bg-white rounded-md p-5 border border-slate-200 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="material-symbols-outlined text-[#0284C7] text-[18px]">speed</span>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Simulation Engine Parameters</h2>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-slate-700 font-medium">Virtual Clock Speed Multiplier</label>
              <div className="flex items-center gap-1.5">
                {['1x', '2x', '4x', '8x', '16x'].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setSimulationSpeed(speed)}
                    className={`px-3 py-1 rounded border font-mono font-bold transition-all text-xs ${simulationSpeed === speed
                      ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                  >
                    {speed}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-700 font-medium">Minimum Safety Headway Buffer (km)</label>
              <input
                type="number"
                step="0.5"
                value={headwayBuffer}
                onChange={(e) => setHeadwayBuffer(e.target.value)}
                className="w-full px-3 py-1.5 rounded bg-slate-50 border border-slate-200 text-slate-800 font-mono focus:outline-none focus:border-slate-400"
              />
              <p className="text-[11px] text-slate-400">
                Minimum distance required between consecutive train blocks before triggering conflict alert.
              </p>
            </div>
          </div>
        </div>

        {/* AI & Integration Microservices */}
        <div className="bg-white rounded-md p-5 border border-slate-200 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="material-symbols-outlined text-[#0284C7] text-[18px]">psychology</span>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">AI & External Microservices</h2>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded bg-slate-50 border border-slate-200">
              <div className="space-y-0.5">
                <span className="font-semibold text-slate-900">Gemini AI Operational Insights</span>
                <p className="text-[11px] text-slate-500">Generate natural language explanations for delays & precedence.</p>
              </div>
              <button
                type="button"
                onClick={() => setGeminiExplanationEnabled(!geminiExplanationEnabled)}
                className={`w-10 h-5 rounded-full transition-colors relative ${geminiExplanationEnabled ? 'bg-[#0284C7]' : 'bg-slate-300'
                  }`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${geminiExplanationEnabled ? 'left-5.5' : 'left-1'
                    }`}
                />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-700 font-medium">Open-Meteo Weather Refresh Rate (mins)</label>
              <select
                value={weatherSyncInterval}
                onChange={(e) => setWeatherSyncInterval(e.target.value)}
                className="w-full px-3 py-1.5 rounded bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-slate-400"
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
