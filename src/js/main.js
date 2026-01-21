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
    this.pageFlips = {}; // Track individual page flips: { pageIndex: true/false }
    this.init();
  }


  /**
   * Initialize the application
   */
  async init() {
    try {
      await this.pdfProcessor.initialize();
      this.setupEventListeners();
      this.checkLibraries();
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
    this.ui.on('processAndPreview', () => this.handleProcessAndPreview());
    this.ui.on('print', () => this.handlePrint());
    this.ui.on('export', () => this.handleExport());
    this.ui.on('paperSizeChanged', (data) => this.updatePaperSettings(data));
    this.ui.on('orientationChanged', (data) => this.updatePaperSettings(data));
    this.ui.on('pagesSwapped', (data) => this.handlePagesSwapped(data));
    this.ui.on('pageFlipped', (pageIndex) => this.handlePageFlipped(pageIndex));
    this.ui.on('gridSizeChanged', (data) => this.handleGridSizeChanged(data));

    // Direct element listeners if needed (already handled by UIManager)
    this.ui.elements.printBtn?.addEventListener('click', () => this.handlePrint());
    this.ui.elements.exportPdfBtn?.addEventListener('click', () => this.handleExport());
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
    this.ui.generateCustomGrid(rows, cols);

    // Re-apply existing page images
    for (let i = 0; i < Math.min(totalPages, this.allPageImages.length); i++) {
      if (this.allPageImages[i]) {
        this.ui.updatePagePreview(i, this.allPageImages[i]);
      }
    }
  }



  setupInteractiveTicks() {
    // Ported from palette-interactive-ticks
    // This allows clicking labels or specific areas to jump to values

    // We could add visual ticks in HTML, but for now we'll just ensure 
    // the sliders themselves feel robust.
  }

  checkLibraries() {
    // Basic connectivity check
    if (!window.jspdf) {
      console.warn('PDF library not yet loaded...');
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
      this.ui.showProgress(true, 'Reading PDF...', '0%');

      const result = await this.pdfProcessor.loadPDF(file, (progress) => {
        this.ui.updateProgress(progress);
      });

      const { numPages } = result;
      this.selectedLayout = Math.min(numPages, 16);
      const maxPages = this.selectedLayout;

      // Determine grid size based on page count
      let rows = 2, cols = 4; // Default 8-page (2x4)
      if (numPages > 8) {
        rows = 4; cols = 4; // 16-page (4x4)
      }
      if (numPages <= 4) {
        rows = 2; cols = 2; // 4-page (2x2)
      }
      if (numPages <= 2) {
        rows = 1; cols = 2; // 2-page (1x2)
      }

      this.gridSize = { rows, cols };
      this.ui.generateCustomGrid(rows, cols);

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
      this.allPageImages = new Array(16).fill(null);



      // Process pages
      for (let i = 1; i <= maxPages; i++) {
        const canvas = await this.pdfProcessor.renderPage(i);
        const url = await this.pdfProcessor.canvasToBlob(canvas);

        // Revoke old URL if it exists
        if (this.allPageImages[i - 1]) {
          this.pdfProcessor.revokeBlobUrl(this.allPageImages[i - 1]);
        }

        this.allPageImages[i - 1] = url;
        this.ui.updatePagePreview(i - 1, url);

        const percent = Math.round((i / maxPages) * 100);
        this.ui.showProgress(true, `Processing Page ${i} of ${maxPages}`, `${percent}%`);
        this.ui.updateProgress(percent);
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
      toast.error('Error', 'Failed to process PDF.');
    }
  }

  async createBlankPage(pageNum) {
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

    const url = await this.pdfProcessor.canvasToBlob(canvas);

    // Revoke old URL if it exists
    if (this.allPageImages[pageNum - 1]) {
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

    // Update previews
    this.ui.updatePagePreview(fromIndex, this.allPageImages[fromIndex]);
    this.ui.updatePagePreview(toIndex, this.allPageImages[toIndex]);

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
    if (!this.ui.hasContent()) { return; }
    this.createPrintLayout();
  }

  createPrintLayout() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Blocked', 'Please allow popups.');
      return;
    }

    const isAccordion = this.currentTemplate === 'accordion-16';
    const zineSheets = [];

    // Get HTML for all sheets
    document.querySelectorAll('.zine-grid').forEach(grid => {
      zineSheets.push(grid.innerHTML);
    });

    const dimensions = this.ui.getPaperDimensions(this.paperSize || 'a4', this.orientation || 'landscape');
    const scale = this.ui.elements.scaleSlider?.value / 100 || 1;
    const margin = this.ui.elements.marginSlider?.value || 0;

    // Different grid CSS for accordion vs mini-8
    const gridCss = isAccordion ? `
      grid-template-areas:
        "page4 page3 page2 page1"
        "page5 page6 page7 page8"
        "page12 page11 page10 page9"
        "page13 page14 page15 page16";
      grid-template-rows: repeat(4, 1fr);
    ` : `
      grid-template-areas:
        "page5 page4 page3 page2"
        "page6 page7 page8 page1";
      grid-template-rows: repeat(2, 1fr);
    `;

    // Page area CSS for accordion includes pages 9-16
    const accordionPageAreas = isAccordion ? `
      .page-cell[data-page="9"] { grid-area: page9; }
      .page-cell[data-page="10"] { grid-area: page10; }
      .page-cell[data-page="11"] { grid-area: page11; }
      .page-cell[data-page="12"] { grid-area: page12; }
      .page-cell[data-page="13"] { grid-area: page13; }
      .page-cell[data-page="14"] { grid-area: page14; }
      .page-cell[data-page="15"] { grid-area: page15; }
      .page-cell[data-page="16"] { grid-area: page16; }
    ` : '';

    // Rotation CSS for upside-down pages
    const rotationCss = isAccordion ? `
      .page-cell[data-page="1"], .page-cell[data-page="2"],
      .page-cell[data-page="3"], .page-cell[data-page="4"],
      .page-cell[data-page="9"], .page-cell[data-page="10"],
      .page-cell[data-page="11"], .page-cell[data-page="12"] {
        transform: rotate(180deg);
      }
    ` : `
      .page-cell[data-page="2"], .page-cell[data-page="3"], 
      .page-cell[data-page="4"], .page-cell[data-page="5"] {
        transform: rotate(180deg);
      }
    `;

    // Cut lines for accordion template
    const cutLinesCss = isAccordion ? `
      .cut-line {
        position: absolute;
        z-index: 30;
        pointer-events: none;
      }
      .cut-line-left {
        left: 0;
        top: 0;
        height: 75%;
        width: 1mm;
        border-left: 1mm dashed #ef4444;
      }
      .cut-line-right {
        right: 0;
        top: 0;
        height: 75%;
        width: 1mm;
        border-right: 1mm dashed #ef4444;
      }
    ` : '';

    const cutLinesHtml = isAccordion ? `
      <div class="cut-line cut-line-left"></div>
      <div class="cut-line cut-line-right"></div>
    ` : '';

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
            grid-template-columns: repeat(4, 1fr);
            height: ${dimensions.height}mm;
            width: ${dimensions.width}mm;
          }
          .page-cell {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            border: 0.1mm dashed #eee;
          }
          .page-cell[data-page="1"] { grid-area: page1; }
          .page-cell[data-page="2"] { grid-area: page2; }
          .page-cell[data-page="3"] { grid-area: page3; }
          .page-cell[data-page="4"] { grid-area: page4; }
          .page-cell[data-page="5"] { grid-area: page5; }
          .page-cell[data-page="6"] { grid-area: page6; }
          .page-cell[data-page="7"] { grid-area: page7; }
          .page-cell[data-page="8"] { grid-area: page8; }
          ${accordionPageAreas}
          
          ${rotationCss}
          
          .page-content-img { 
            width: 100%; 
            height: 100%; 
            object-fit: contain; 
            transform: scale(${scale});
            padding: ${margin}px;
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

        await new Promise(r => setTimeout(r, 100));

        const canvas = await html2canvas(grid, {
          scale: 3,
          useCORS: true,
          backgroundColor: '#ffffff'
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
      toast.success('Downloaded!');
    } catch (e) {
      console.error(e);
      toast.error('Export Failed');
    } finally {
      this.ui.elements.exportPdfBtn.disabled = false;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PDFZineMaker();
});