import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['maplibre-gl']
    },
    build: {
      chunkSizeWarningLimit: 2000
    },
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
        '/v1': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
        '/ws': {
          target: 'ws://127.0.0.1:8000',
          ws: true,
        },
        '/mcp-stitch': {
          target: 'https://stitch.googleapis.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/mcp-stitch/, '/mcp'),
          headers: {
            'X-Goog-Api-Key': env.VITE_STITCH_API_KEY || ''
          }
        }
      }
    }
  };
})
