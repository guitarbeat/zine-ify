# Zine-ify

A modern web application that converts PDFs into printable 8-page mini zine layouts.

## Architecture

- **Type**: Pure frontend SPA (no backend)
- **Build tool**: Vite 7
- **Package manager**: pnpm
- **Language**: Vanilla JavaScript (ES6 modules, class-based)
- **Styling**: Tailwind CSS v4 + custom CSS

## Key Libraries

- **pdfjs-dist**: PDF rendering/processing
- **jsPDF**: PDF generation/export
- **html2canvas**: DOM-to-canvas for PDF export
- **three.js**: 3D zine viewer
- **lucide**: Icons
- **mitt**: Event emitter

## Project Structure

```
src/
├── assets/           - Static assets (reference images)
├── components/       - UI components (Toast, Zine3DViewer, UI/)
├── core/             - App controller and state (AppController, StateStore, main.js)
├── services/         - Business logic (PDFProcessor, ExportService, MediaProcessor)
├── styles/           - CSS files (index.css, theme.css, layout.css, etc.)
└── utils/            - Helpers (config, helpers, fileValidation, miniZineLayout, etc.)
```

## Dev Server

- Port: 5000
- Host: 0.0.0.0
- All hosts allowed (Replit proxy compatible)

## Scripts

- `pnpm run dev` - Start dev server on port 5000
- `pnpm run build` - Production build
- `pnpm run preview` - Preview production build
- `pnpm run lint` - ESLint
- `pnpm test` - Playwright e2e tests
