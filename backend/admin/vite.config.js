import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backendPort = process.env.FARMLINK_BACKEND_PORT || '8000'
const backendTarget = `http://localhost:${backendPort}`

export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/uploads': {
        target: backendTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
