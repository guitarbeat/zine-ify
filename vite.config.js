import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
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
        manualChunks: {
          pdfjs: ['pdfjs-dist'],
          jspdf: ['jspdf'],
          html2canvas: ['html2canvas']
        }
      }
    }
  },
  server: {
    port: 8000,
    host: true
  },
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11']
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Octovo Zine Maker',
        short_name: 'Octovo',
        description: 'Convert PDFs into printable 8-page zine layouts',
        theme_color: '#2563eb',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg}']
      }
    })
  ],
  optimizeDeps: {
    include: ['pdfjs-dist', 'jspdf', 'html2canvas']
  }
});