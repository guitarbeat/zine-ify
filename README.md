# Octovo Zine Maker

A modern, progressive web application that converts PDF files into printable 8-page mini zines with proper folding and cutting instructions. Built with modern JavaScript, ES6 modules, and optimized for performance.

## Features

- **Modern UI**: Clean, responsive design with dark/light mode support
- **Drag & Drop**: Drag PDF files directly onto the upload area
- **PDF Upload**: Upload any PDF file (up to 8 pages, 50MB max)
- **Real-time Preview**: See your zine layout update as pages are processed
- **Progress Feedback**: Visual progress indicators and toast notifications
- **Automatic Conversion**: High-quality PDF rendering with HiDPI support
- **Correct Layout**: Proper 8-page mini zine arrangement for printing
- **Print Ready**: Optimized for A4 landscape printing
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
2. **Preview**: Watch as your PDF pages are converted and arranged in the correct zine layout
3. **Adjust Scale**: Use the scale slider to adjust the size (50%-200%) for optimal printing
4. **Print or Export**:
   - Click "Print Zine" (Ctrl+P) to print on A4 landscape paper
   - Click "Export PDF" (Ctrl+S) to download the zine layout as a PDF file
5. **Fold & Cut**: Follow the dashed line to fold and cut your zine

## Keyboard Shortcuts

- **Ctrl+O**: Open file picker
- **Ctrl+P**: Print zine
- **Ctrl+S**: Export PDF
- **Space**: Toggle dark/light mode

## 8-Page Mini Zine Layout

The zine uses the standard 8-page mini zine layout:

```
Page 8 | Page 1 | Page 2 | Page 7
Page 6 | Page 3 | Page 4 | Page 5
```

- **Top Row**: Pages 8, 1, 2, 7 (rotated 180° for proper folding)
- **Bottom Row**: Pages 6, 3, 4, 5 (normal orientation)
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
- **Progressive Enhancement**: Works with or without JavaScript
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
├── js/
│   ├── app.js           # Main application entry point
│   ├── pdf-processor.js # PDF processing logic
│   ├── ui-manager.js    # UI interaction management
│   ├── toast.js         # Notification system
│   └── utils.js         # Utility functions
├── css/
│   └── styles.css       # Application styles
└── assets/
    └── reference-back-side.jpg # Folding reference image
```

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## License

MIT License - feel free to use and modify!
