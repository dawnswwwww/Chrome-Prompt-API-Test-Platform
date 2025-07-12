import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES ? '/Chrome-Prompt-API-Test-Platform/' : '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    open: true,
    cors: true
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: false,
    cors: true
  }
})