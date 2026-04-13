import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  root: '.',
  base: './', // Use relative paths for GitHub Pages
  build: {
    outDir: 'docs', // Build to docs folder for GitHub Pages support
    assetsDir: 'assets',
    sourcemap: true,
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
