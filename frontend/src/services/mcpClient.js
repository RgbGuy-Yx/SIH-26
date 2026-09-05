import axios from 'axios';

/**
 * Model Context Protocol (MCP) Client for Google Stitch
 */
class StitchMcpClient {
  constructor() {
    this.apiKey = import.meta.env.VITE_STITCH_API_KEY || '';
    this.rawUrl = import.meta.env.VITE_STITCH_MCP_URL || 'https://stitch.googleapis.com/mcp';
    // Use Vite proxy in development to avoid CORS issues in browser
    this.useProxy = import.meta.env.VITE_USE_PROXY !== 'false';
    this.endpoint = this.useProxy ? '/mcp-stitch' : this.rawUrl;
    this.requestId = 1;
    this.initialized = false;
    this.capabilities = null;
  }

  /**
   * Helper to execute JSON-RPC 2.0 requests over HTTP
   */
  async sendJsonRpc(method, params = {}) {
    const payload = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method,
      params
    };

    const headers = {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': this.apiKey
    };

    try {
      const response = await axios.post(this.endpoint, payload, {
        headers,
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      console.warn(`[Stitch MCP] Call to ${method} failed:`, error?.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Initialize the MCP session with Google Stitch server
   */
  async initialize() {
    try {
      const res = await this.sendJsonRpc('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {
          roots: { listChanged: true },
          sampling: {}
        },
        clientInfo: {
          name: 'railway-eta-frontend',
          version: '0.1.0'
        }
      });
      this.initialized = true;
      this.capabilities = res.result?.capabilities || {};
      return { success: true, data: res.result };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message || 'Failed to initialize Stitch MCP'
      };
    }
  }

  /**
   * List available tools on Google Stitch MCP server
   */
  async listTools() {
    try {
      const res = await this.sendJsonRpc('tools/list');
      return { success: true, tools: res.result?.tools || [] };
    } catch (error) {
      return {
        success: false,
        tools: [],
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Call a tool provided by Google Stitch MCP server
   */
  async callTool(name, args = {}) {
    try {
      const res = await this.sendJsonRpc('tools/call', { name, arguments: args });
      return { success: true, result: res.result };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Check connection status & health of Google Stitch MCP endpoint
   */
  async checkConnection() {
    try {
      // Send lightweight initialize or HTTP ping
      const res = await this.sendJsonRpc('initialize', {
        protocolVersion: '2024-11-05',
        clientInfo: { name: 'health-check', version: '1.0' }
      });
      return {
        connected: true,
        endpoint: this.rawUrl,
        proxyEndpoint: this.endpoint,
        serverInfo: res.result?.serverInfo || { name: 'Google Stitch MCP', version: '1.0' },
        apiKeyMasked: `${this.apiKey.substring(0, 6)}...${this.apiKey.substring(this.apiKey.length - 4)}`
      };
    } catch (error) {
      return {
        connected: false,
        endpoint: this.rawUrl,
        proxyEndpoint: this.endpoint,
        apiKeyMasked: `${this.apiKey.substring(0, 6)}...${this.apiKey.substring(this.apiKey.length - 4)}`,
        error: error.response?.status ? `HTTP ${error.response.status}: ${error.message}` : error.message
      };
    }
  }
}

export const stitchMcpClient = new StitchMcpClient();
export default stitchMcpClient;
