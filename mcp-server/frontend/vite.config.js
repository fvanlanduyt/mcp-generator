import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: process.env.API_URL || 'http://localhost:8800',
        changeOrigin: true,
      },
      '/mcp': {
        target: process.env.API_URL || 'http://localhost:8800',
        changeOrigin: true,
      },
    },
  },
})
