import React from 'react'

function App() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
      <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600/20 text-blue-400 mb-2">
          🚆
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Indian Railways ETA Engine
        </h1>
        <p className="text-slate-400 text-sm">
          Real-Time Network-Aware ETA Forecasting & Conflict Resolution Engine
        </p>
        <div className="inline-block px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
          Foundation Setup Ready
        </div>
      </div>
    </div>
  )
}

export default App
