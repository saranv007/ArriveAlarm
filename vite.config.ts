import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('maplibre-gl')) {
            return 'vendor-map';
          }
          if (id.includes('react') || id.includes('react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }
        },
      },
    },
  },
})

