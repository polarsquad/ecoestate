import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables based on the mode (development, production)
  // The third argument '' ensures all variables are loaded, regardless of VITE_ prefix
  const env = loadEnv(mode, process.cwd(), '');

  // Determine the proxy target
  // Default to localhost:3001 for local dev, use env var if set (e.g., by Docker Compose)
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:3001';

  console.log(`Vite proxy target set to: ${proxyTarget}`); // Add logging for clarity

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Proxy /api requests to the backend container/server
        '/api': {
          target: proxyTarget,
          changeOrigin: true, // Needed for virtual hosted sites
          // Optional: rewrite path if needed, but likely not required if backend routes match
          // rewrite: (path) => path.replace(/^\/api/, ''), 
        },
      },
    },
  }
});
