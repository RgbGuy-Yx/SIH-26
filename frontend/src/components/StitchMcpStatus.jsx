import React, { useState, useEffect } from 'react';
import { stitchMcpClient } from '../services/mcpClient';
import { Activity, CheckCircle2, AlertCircle, RefreshCw, Cpu, Key, Globe, Terminal, Wrench } from 'lucide-react';

export function StitchMcpStatus() {
  const [status, setStatus] = useState({
    loading: true,
    connected: false,
    endpoint: 'https://stitch.googleapis.com/mcp',
    apiKeyMasked: '••••••••••••',
    error: null,
    serverInfo: null
  });

  const [tools, setTools] = useState([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const checkConnection = async () => {
    setStatus(prev => ({ ...prev, loading: true, error: null }));
    const result = await stitchMcpClient.checkConnection();
    setStatus({
      loading: false,
      connected: result.connected,
      endpoint: result.endpoint,
      proxyEndpoint: result.proxyEndpoint,
      apiKeyMasked: result.apiKeyMasked,
      error: result.error || null,
      serverInfo: result.serverInfo || null
    });

    if (result.connected) {
      fetchTools();
    }
  };

  const fetchTools = async () => {
    setLoadingTools(true);
    const res = await stitchMcpClient.listTools();
    if (res.success) {
      setTools(res.tools);
    }
    setLoadingTools(false);
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl backdrop-blur-sm text-slate-200 font-sans space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white tracking-tight">Google Stitch MCP Client</h2>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-950 border border-blue-700/50 text-blue-300">
                Stitch v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Model Context Protocol Endpoint Integration & Design-to-Code Pipeline
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center space-x-3">
          <button
            onClick={checkConnection}
            disabled={status.loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${status.loading ? 'animate-spin text-blue-400' : ''}`} />
            <span>{status.loading ? 'Testing...' : 'Ping Server'}</span>
          </button>

          <div
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${
              status.connected
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
            }`}
          >
            {status.connected ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Connected</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>Configured (Ready)</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 text-xs font-medium">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-2 px-3 border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Overview & Connection
        </button>
        <button
          onClick={() => {
            setActiveTab('tools');
            if (tools.length === 0) fetchTools();
          }}
          className={`pb-2 px-3 border-b-2 transition-colors ${
            activeTab === 'tools'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Tools ({tools.length})
        </button>
      </div>

      {/* Overview Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center text-slate-400 text-xs font-medium space-x-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>MCP Server URL</span>
            </div>
            <div className="font-mono text-xs text-white truncate bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800">
              {status.endpoint}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center text-slate-400 text-xs font-medium space-x-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>Authentication Header (`X-Goog-Api-Key`)</span>
            </div>
            <div className="font-mono text-xs text-emerald-400 truncate bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800">
              {status.apiKeyMasked}
            </div>
          </div>

          {status.error && (
            <div className="col-span-full p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 text-amber-300 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Connection Notice / Endpoint Status</p>
                <p className="text-slate-300 mt-0.5">{status.error}</p>
                <p className="text-slate-400 text-[11px] mt-1">
                  Note: Server config `https://stitch.googleapis.com/mcp` is set with proxy route `/mcp-stitch`.
                </p>
              </div>
            </div>
          )}

          {status.serverInfo && (
            <div className="col-span-full p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Active Server Info: {status.serverInfo.name} ({status.serverInfo.version || 'v1.0'})</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tools Tab Content */}
      {activeTab === 'tools' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Stitch MCP Capability Tools
            </h3>
            <button
              onClick={fetchTools}
              disabled={loadingTools}
              className="text-xs text-blue-400 hover:underline flex items-center space-x-1"
            >
              <RefreshCw className={`w-3 h-3 ${loadingTools ? 'animate-spin' : ''}`} />
              <span>Refresh Tools</span>
            </button>
          </div>

          {tools.length === 0 ? (
            <div className="p-6 text-center rounded-lg bg-slate-950/40 border border-slate-800 text-xs text-slate-400 space-y-2">
              <Wrench className="w-6 h-6 text-slate-500 mx-auto" />
              <p>No external tools returned or server initializing.</p>
              <p className="text-slate-500 text-[11px]">
                Google Stitch provides design-to-code, assets extraction, and layout conversion MCP utilities.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {tools.map((tool, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between font-mono font-semibold text-blue-400">
                    <span>{tool.name}</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">{tool.description || 'No description provided.'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default StitchMcpStatus;
