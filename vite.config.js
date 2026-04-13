import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  root: '.',
  build: {
    assetsDir: 'assets',
    sourcemap: true,
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/pdfjs-dist')) {
            return 'pdfjs';
          }

          if (id.includes('node_modules/jspdf')) {
            return 'jspdf';
          }

          if (id.includes('node_modules/html2canvas')) {
            return 'html2canvas';
          }

          if (id.includes('node_modules/three')) {
            return 'three';
          }
        }
      }
    }
  },
  server: {
    port: 8001,
    host: true
  },
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11']
    })
  ],
  optimizeDeps: {
    include: ['pdfjs-dist', 'jspdf', 'html2canvas']
  }
});
