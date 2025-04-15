import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy /api requests to the backend server
      '/api': {
        target: 'http://localhost:3001', // Your backend server address
        changeOrigin: true, // Needed for virtual hosted sites
        // Optional: rewrite path if needed, but likely not required if backend routes match
        // rewrite: (path) => path.replace(/^\/api/, ''), 
      },
    },
  },
})
