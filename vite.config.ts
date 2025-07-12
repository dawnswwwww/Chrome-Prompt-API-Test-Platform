import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES ? '/chrome-prompt-api-test/' : '/',
  server: {
    https: true,
    host: true,
    port: 5173,
    strictPort: false,
    allowedHosts: 'all',
    proxy: {
      '/api': {
        target: 'https://localhost:5173',
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    https: true,
    host: true,
    port: 4173,
    strictPort: false,
    allowedHosts: 'all'
  }
})