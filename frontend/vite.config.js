import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      proxy: {
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
