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

## Design System

- **Aesthetic**: Modern minimalist — clean, functional, no ornamentation
- **Font**: Inter (400/500/600/700)
- **Background**: `#f4f4f5` (zinc-100)
- **Surfaces**: White with `1px rgba(0,0,0,0.07)` borders + soft box shadows
- **Accent / CTA**: Amber `#f59e0b` (primary vibrant) — logo, Print button, toggles
- **Text**: `#18181b` primary, `#71717a` muted
- **Shadows**: Soft Gaussian (no hard offset)
- **Border radius**: `0.875rem` panels, `0.625rem` buttons/fields
- **No** dot-grid backgrounds, no neo-brutalist thick borders, no hard shadows
- **Dark mode**: Full dark-navy theme (`[data-theme="dark"]`) toggled via header button, persisted in `localStorage`. Instantly applied via inline `<script>` in `<head>` to prevent flash.

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
