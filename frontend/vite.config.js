import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.js',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/clusters': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/timeline': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/ingest': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
