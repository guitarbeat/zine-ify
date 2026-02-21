import '../styles/index.css';
import { PDFProcessor } from './pdf-processor.js';
import { UIManager } from './zine-ui.js';
import { toast } from './toast.js';
import { formatFileSize } from './utils.js';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Import assets
import referenceImageUrl from '../assets/reference-back-side.jpg';

class PDFZineMaker {
  constructor() {
    this.pdfProcessor = new PDFProcessor();
    this.ui = new UIManager();
    this.referenceImageUrl = referenceImageUrl;
    this.allPageImages = new Array(16).fill(null);
    this._blankPageUrl = null; // Cache for blank page blob URL
    this.pageFlips = {}; // Track individual page flips: { pageIndex: true/false }
    this.gridSize = { rows: 2, cols: 4 }; // Default grid size
    this.init();
  }

  /**
   * Revoke all page blob URLs to prevent memory leaks
   */
  revokeAllPages() {
    if (!this.allPageImages) { return; }
    for (const url of this.allPageImages) {
      if (url && url !== this._blankPageUrl) {
        this.pdfProcessor.revokeBlobUrl(url);
      }
    }
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      await this.pdfProcessor.initialize();
      this.setupEventListeners();
      this.ui.generateLayout(8); // Default to 8 pages
      this.ui.setStatus('Upload a PDF file to get started', 'info');
    } catch (error) {
      console.error('Initialization error:', error);
      this.ui.setStatus('Failed to initialize. Please refresh the page.', 'error');
      toast.error('Initialization Error', 'Failed to load required libraries.');
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // UI Events
    this.ui.on('fileSelected', (file) => this.handleFileSelected(file));
    this.ui.on('print', () => this.handlePrint());
    this.ui.on('export', () => this.handleExport());
    this.ui.on('paperSizeChanged', (data) => this.updatePaperSettings(data));
    this.ui.on('orientationChanged', (data) => this.updatePaperSettings(data));
    this.ui.on('pagesSwapped', (data) => this.handlePagesSwapped(data));
    this.ui.on('pageFlipped', (pageIndex) => this.handlePageFlipped(pageIndex));
    this.ui.on('gridSizeChanged', (data) => this.handleGridSizeChanged(data));
  }

  /**
   * Handle individual page flip
   */
  handlePageFlipped(pageIndex) {
    this.pageFlips[pageIndex] = !this.pageFlips[pageIndex];
    this.ui.setPageFlip(pageIndex, this.pageFlips[pageIndex]);
  }

  /**
   * Handle grid size change
   */
  handleGridSizeChanged({ rows, cols }) {
    this.gridSize = { rows, cols };
    const totalPages = rows * cols;

    // Generate a custom grid layout
    this.ui.generateCustomGrid(rows, cols, this.allPageImages.length);

    // Re-apply existing page images
    for (let i = 0; i < Math.min(totalPages, this.allPageImages.length); i++) {
      if (this.allPageImages[i]) {
        this.ui.updatePagePreview(i, this.allPageImages[i]);
      }
    }
  }



  handleFileSelected(file) {
    this.selectedFile = file;
    this.ui.setStatus(`File selected: ${file.name} (${formatFileSize(file.size)})`, 'success');
    // Start processing immediately on selection for better UX
    this.processPDF(file);
  }

  async processPDF(file) {
    try {
      toast.info('Reading PDF...', 'Please wait');
      this.ui.showProgress(true, 'Reading PDF...', '0%');

      const result = await this.pdfProcessor.loadPDF(file, (progress) => {
        this.ui.updateProgress(progress);
      });

      const { numPages } = result;
      this.selectedLayout = numPages; // Allow any number of pages
      const maxPages = numPages;

      let rows, cols;

      if (numPages === 16) {
        // Special case for 16-page zine (accordion fold on single sheet)
        rows = 4;
        cols = 4;
        this.gridSize = { rows, cols };
        this.ui.generateLayout(16, 'accordion-16');
      } else {
        // Determine grid size based on page count
        // Try to find a square-ish grid that fits all pages
        const sqrt = Math.ceil(Math.sqrt(numPages));
        // Default to at least 2x4 for small docs, otherwise square-ish
        rows = numPages <= 8 ? 2 : (sqrt > 2 ? sqrt : 2);
        cols = numPages <= 8 ? 4 : Math.ceil(numPages / rows);

        // Ensure we don't exceed max grid input (10x10)
        rows = Math.min(rows, 10);
        cols = Math.min(cols, 10);

        this.gridSize = { rows, cols }; // Update internal state

        // Revoke old pages to prevent memory leak
        this.revokeAllPages();

        this.allPageImages = new Array(Math.max(rows * cols, numPages)).fill(null);
        this.ui.generateCustomGrid(rows, cols, this.allPageImages.length);
      }

      // Update grid inputs to match
      if (this.ui.elements.gridRows) {
        this.ui.elements.gridRows.value = rows;
      }
      if (this.ui.elements.gridCols) {
        this.ui.elements.gridCols.value = cols;
      }
      if (this.ui.elements.gridTotal) {
        this.ui.elements.gridTotal.textContent = `(${rows * cols} pages)`;
      }

      const description = `PDF arranged into a ${rows}×${cols} grid (${rows * cols} pages)`;
      this.ui.setReady(true, description);



      // Process pages in parallel
      const batchSize = 2; // Concurrency limit
      let completedPages = 0;

      const processPage = async (pageNum) => {
        const canvas = await this.pdfProcessor.renderPage(pageNum);
        const url = await this.pdfProcessor.canvasToBlob(canvas);

        // Revoke old URL if it exists
        if (this.allPageImages[pageNum - 1] && this.allPageImages[pageNum - 1] !== this._blankPageUrl) {
          this.pdfProcessor.revokeBlobUrl(this.allPageImages[pageNum - 1]);
        }

        this.allPageImages[pageNum - 1] = url;
        this.ui.updatePagePreview(pageNum - 1, url);

        completedPages++;
        const percent = Math.round((completedPages / maxPages) * 100);
        this.ui.showProgress(true, 'Processing Pages...', `${percent}%`);
        this.ui.updateProgress(percent);
      };

      for (let i = 1; i <= maxPages; i += batchSize) {
        const batch = [];
        for (let j = 0; j < batchSize && (i + j) <= maxPages; j++) {
          batch.push(processPage(i + j));
        }
        await Promise.all(batch);
      }

      // Fill blanks - using the same blank page logic
      for (let i = maxPages + 1; i <= (this.selectedLayout); i++) {
        await this.createBlankPage(i);
      }

      this.ui.showProgress(false);
      this.ui.setStatus(`Successfully processed ${numPages} pages`, 'success');
      toast.success('Done!', 'Your zine is ready to print.');

    } catch (error) {
      console.error('PDF Error:', error);
      this.ui.showProgress(false);
      toast.error('Error', error.message || 'Failed to process PDF.');
    }
  }

  async createBlankPage(pageNum) {
    let url = this._blankPageUrl;

    if (!url) {
      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 1400;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 1000, 1400);
      ctx.fillStyle = '#f3f4f6';
      ctx.font = 'bold 80px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BLANK', 500, 700);

      url = await this.pdfProcessor.canvasToBlob(canvas);
      this._blankPageUrl = url;
    }

    // Revoke old URL if it exists
    if (this.allPageImages[pageNum - 1] && this.allPageImages[pageNum - 1] !== this._blankPageUrl) {
      this.pdfProcessor.revokeBlobUrl(this.allPageImages[pageNum - 1]);
    }

    this.allPageImages[pageNum - 1] = url;
    this.ui.updatePagePreview(pageNum - 1, url);
  }

  handlePagesSwapped({ fromIndex, toIndex }) {
    // Swap images in array
    const temp = this.allPageImages[fromIndex];
    this.allPageImages[fromIndex] = this.allPageImages[toIndex];
    this.allPageImages[toIndex] = temp;

    // Swap flip states
    const tempFlip = this.pageFlips[fromIndex];
    this.pageFlips[fromIndex] = this.pageFlips[toIndex];
    this.pageFlips[toIndex] = tempFlip;

    // Update previews
    this.ui.updatePagePreview(fromIndex, this.allPageImages[fromIndex]);
    this.ui.updatePagePreview(toIndex, this.allPageImages[toIndex]);

    // Update flip UI
    this.ui.setPageFlip(fromIndex, !!this.pageFlips[fromIndex]);
    this.ui.setPageFlip(toIndex, !!this.pageFlips[toIndex]);


    toast.info('Pages swapped');
  }

  updateZineView(zineNum) {
    // Update the UI to show the correct 8 pages for the selected zine (1 or 2)
    const startPageIndex = (zineNum - 1) * 8;
    for (let i = 0; i < 8; i++) {
      const globalPageIndex = startPageIndex + i;
      const imageUrl = this.allPageImages[globalPageIndex];
      this.ui.updatePagePreview(i, imageUrl); // Update the 8 visible cells
    }
  }

  updatePaperSettings(settings) {
    this.paperSize = settings.paperSize;
    this.orientation = settings.orientation;
  }

  handlePrint() {
    if (!this.ui.hasContent()) {
      toast.warning('No Content', 'Upload a PDF to print!');
      return;
    }

    // Audit check: Are all pages filled?
    // We won't block it, but we could warn if it's empty.

    this.createPrintLayout();
  }

  createPrintLayout() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Blocked', 'Please allow popups.');
      return;
    }


    const zineSheets = [];

    // Get HTML for all sheets
    document.querySelectorAll('.zine-grid').forEach(grid => {
      zineSheets.push(grid.innerHTML);
    });

    const dimensions = this.ui.getPaperDimensions(this.paperSize || 'a4', this.orientation || 'landscape');


    // Dynamic grid CSS based on current settings
    const { rows, cols } = this.gridSize;
    const gridCss = `
      grid-template-columns: repeat(${cols}, 1fr);
      grid-template-rows: repeat(${rows}, 1fr);
      grid-template-areas: none !important;
      /* Generate grid areas if needed, but simple flow usually works for generic grids */
    `;

    // We rely on the DOM's inline styles for rotation now, 
    // so we don't need hardcoded rotation CSS.
    // The cut lines are also specific to the old layout, so we'll omit them for generic grids
    // or maybe add them later if we implement smart cut lines.
    const cutLinesCss = '';


    const cutLinesHtml = '';

    const sheetsHtml = zineSheets.map((content) => `
      <div class="sheet">
        <div class="zine-grid">${content}</div>
        ${cutLinesHtml}
      </div>
      <div class="sheet"><div class="back-side"></div></div>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Zine</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { size: ${dimensions.width}mm ${dimensions.height}mm; margin: 0; }
          body { background: white; width: ${dimensions.width}mm; height: ${dimensions.height}mm; overflow: hidden; }
          .sheet { width: 100%; height: 100%; page-break-after: always; display: block; overflow: hidden; position: relative; }
          .zine-grid {
            display: grid;
            ${gridCss}
            height: ${dimensions.height}mm;
            width: ${dimensions.width}mm;
            /* Ensure grid fills the page */
            justify-content: stretch;
            align-content: stretch;
          }
          .page-cell {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            border: none;
          }
          /* Generic page areas fallback if needed */
          
          .page-content-img { 
            width: 100%; 
            height: 100%; 
            object-fit: contain; 
            /* Rely on DOM transform for rotation */
          }
          .page-label, .page-placeholder { display: none; }
          
          .back-side {
            width: 100%; height: 100%;
            background-image: url('${this.referenceImageUrl}');
            background-size: contain;
            background-position: center;
            background-repeat: no-repeat;
            transform: rotate(180deg);
          }
          
          /* CRITICAL: Hide controls in print */
          @media print {
            .flip-btn, .page-label, .guidelines, .page-placeholder, .page-cell::before, .page-cell::after { 
                display: none !important; 
            }
            .page-cell { border: none !important; }
          }
          
          ${cutLinesCss}
        </style>
      </head>
      <body>
        ${sheetsHtml}
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }


  async handleExport() {
    if (!this.ui.hasContent()) { return; }
    try {
      this.ui.elements.exportPdfBtn.disabled = true;
      document.body.classList.add('is-exporting'); // Hide UI controls
      toast.info('Generating PDF...');

      const doc = new jsPDF({
        orientation: this.orientation || 'landscape',
        unit: 'mm',
        format: this.paperSize || 'a4'
      });

      const dimensions = this.ui.getPaperDimensions(this.paperSize || 'a4', this.orientation || 'landscape');

      const captureZine = async (sheetNum) => {
        const grid = document.querySelector(`#zine-grid-sheet-${sheetNum}`);
        if (!grid) { return; }

        await new Promise(r => setTimeout(r, 100)); // Allow DOM to update

        const canvas = await html2canvas(grid, {
          scale: 2, // Reduced from 3 for performance
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false
        });

        if (sheetNum > 1) { doc.addPage(); }
        doc.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, dimensions.width, dimensions.height);

        // Add back side
        doc.addPage();
        const backCanvas = document.createElement('canvas');
        backCanvas.width = canvas.width;
        backCanvas.height = canvas.height;
        const bctx = backCanvas.getContext('2d');
        const refImg = new Image();
        refImg.src = this.referenceImageUrl;
        await new Promise(r => { refImg.onload = r; });

        bctx.translate(backCanvas.width / 2, backCanvas.height / 2);
        bctx.rotate(Math.PI);
        bctx.drawImage(refImg, -backCanvas.width / 2, -backCanvas.height / 2, backCanvas.width, backCanvas.height);
        doc.addImage(backCanvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, dimensions.width, dimensions.height);
      };

      await captureZine(1);
      // Only capture second sheet for dual-16 template (not accordion-16 which is single sheet)
      if (this.currentTemplate !== 'accordion-16' && this.selectedLayout > 8) {
        await captureZine(2);
      }

      doc.save(`zine-${Date.now()}.pdf`);
      toast.success('Downloaded!', 'Your PDF is ready.');
    } catch (e) {
      console.error(e);
      toast.error('Export Failed', 'Something went wrong.');
    } finally {
      this.ui.elements.exportPdfBtn.disabled = false;
      document.body.classList.remove('is-exporting'); // Restore UI controls
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PDFZineMaker();
});