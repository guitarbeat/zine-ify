import { defineConfig } from 'vite';

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
    // Ask the OS for an available port. This avoids startup failures when a
    // previous preview process is still holding the usual development port.
    // Vite prints the selected port and the preview proxy discovers it.
    port: 0,
    host: '0.0.0.0',
    allowedHosts: true,
    strictPort: false,
    watch: {
      ignored: ['**/.local/**', '**/node_modules/**']
    }
  },
  optimizeDeps: {
    include: ['pdfjs-dist', 'jspdf', 'html2canvas', '@khmyznikov/pwa-install']
  }
});
