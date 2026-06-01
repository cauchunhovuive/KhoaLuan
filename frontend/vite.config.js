import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split heavy charting library into its own chunk
          'vendor-charts': ['recharts'],
          // Split icon library into its own cacheable chunk
          'vendor-icons': ['react-icons'],
        },
      },
    },
    // Increase chunk size warning limit (icons + charts legitimately exceed 500KB)
    chunkSizeWarningLimit: 600,
  },
});
