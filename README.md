# Zine-ify

A modern, progressive web application that converts PDF files into printable 8-page mini zines with proper folding and cutting instructions. Built with modern JavaScript, ES6 modules, and optimized for performance.

## Features

- **Modern UI**: Clean, responsive design for desktop and mobile
- **Drag & Drop**: Drag PDF files directly onto the upload area
- **PDF Upload**: Queue up to 10 PDF files, 50MB max per file
- **Flexible Layouts**: Standard mini-zine ordering for 8-up sheets plus custom grids
- **Real-time Preview**: See your zine layout update as pages are processed
- **Progress Feedback**: Visual progress indicators and toast notifications
- **Automatic Conversion**: High-quality PDF rendering with HiDPI support
- **Correct Layout**: Proper 8-page mini zine arrangement for printing
- **Print Ready**: Supports multi-sheet print and export output
- **PDF Export**: Download the assembled zine layout as a PDF file
- **Folding Guide**: Visual cut line shows where to fold and cut
- **Keyboard Shortcuts**: Ctrl+O (upload), Ctrl+P (print), Ctrl+S (export)
- **PWA Ready**: Installable as a progressive web app
- **Offline Capable**: Service worker for offline functionality

## How to Use

1. **Upload PDF**:
   - Drag and drop a PDF file onto the upload area, or
   - Click the upload area or "browse files" link, or
   - Press Ctrl+O to open the file picker
2. **Preview**: Watch as your PDF pages are converted and arranged in the current grid
3. **Adjust Layout**: Change the grid size if you want a custom sheet layout
4. **Print or Export**:
   - Click "Print Zine" (Ctrl+P) to print on A4 landscape paper
   - Click "Export PDF" (Ctrl+S) to download the zine layout as a PDF file
5. **Fold & Cut**: Use the printable guide on the back side after export or print

## Keyboard Shortcuts

- **Ctrl+O**: Open file picker
- **Ctrl+P**: Print zine
- **Ctrl+S**: Export PDF
- **R / Z / C / Delete**: Rotate, preview, crop, or clear the selected page

## 8-Page Mini Zine Layout

The zine uses the standard 8-page mini zine layout:

```
Page 5 | Page 4 | Page 3 | Page 2
Page 6 | Page 7 | Page 8 | Page 1
```

- **Top Row**: Pages 5, 4, 3, 2 (rotated 180° for proper folding)
- **Bottom Row**: Pages 6, 7, 8, 1 (normal orientation)
- **Cut Line**: Dashed line in the middle shows where to cut

## Folding Instructions

1. Print the zine on A4 landscape paper
2. Fold the paper in half horizontally (top to bottom)
3. Unfold and fold in half vertically (left to right)
4. Unfold and fold each half in half again
5. Cut along the dashed line in the middle
6. Refold to create your 8-page mini zine

## Technical Details

### Architecture
- **ES6 Modules**: Modern JavaScript with import/export
- **Class-based**: Object-oriented design with dedicated classes
- **PWA Features**: Service worker, web app manifest, installable

### Libraries
- **PDF.js**: High-quality PDF rendering and processing
- **jsPDF**: PDF generation and export functionality
- **html2canvas**: DOM-to-canvas conversion for PDF export
- **Vite**: Fast development server and build tool
- **ESLint**: Code quality and consistency

### Features
- **CSS Grid & Flexbox**: Modern layout system
- **CSS Custom Properties**: Dynamic theming and responsive design
- **HiDPI Support**: Optimized for high-resolution displays
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support
- **Performance**: Lazy loading, memory management, optimized rendering
- **PDF Limits**: 50MB per file, up to 128 pages per PDF

## Development

### Prerequisites
- Node.js 18+ and npm
- Modern web browser with ES6 module support

### Setup
```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build for production
pnpm run build

# Preview production build
pnpm run preview
```

### Project Structure
```
src/
├── assets/
│   └── reference-back-side.jpg # Folding reference image
├── components/
│   ├── Toast.js
│   ├── Zine3DViewer.js
│   └── UI/Manager.js
├── core/
│   └── main.js
├── services/
│   └── PDFProcessor.js
├── styles/
│   └── index.css
└── utils/
    ├── config.js
    └── helpers.js
```

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## License

MIT License - feel free to use and modify!
