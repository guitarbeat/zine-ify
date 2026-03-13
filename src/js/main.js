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
    this._blankPageUrl = null;
    this.pageFlips = {}; // Track individual page flips: { pageIndex: true/false }
    this.pageZooms = {}; // Track individual page zooms/crops
    this.gridSize = { rows: 2, cols: 4 }; // Default grid size
    this.uploadedFiles = []; // Track uploaded PDF files
    this.totalPages = 0; // Track total pages across all PDFs
    this.init();
  }


  /**
   * Initialize the application
   */
  async init() {
    try {
      await this.pdfProcessor.initialize();
      this.setupEventListeners();
      this.ui.generateLayout(8); // Default to 8 pages
      this.ui.setStatus('Upload PDF files to get started', 'info');
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
    this.ui.on('pageZoomed', (pageIndex) => this.handlePageZoomed(pageIndex));
    this.ui.on('pageCropToggled', (pageIndex) => this.handlePageCropToggled(pageIndex));
    this.ui.on('pageRemoved', (pageIndex) => this.handlePageRemoved(pageIndex));
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
   * Handle individual page zoom preview
   */
  handlePageZoomed(pageIndex) {
    const imageUrl = this.allPageImages[pageIndex];
    if (imageUrl && imageUrl !== this._blankPageUrl) {
      this.ui.showZoomModal(imageUrl);
    } else {
      toast.info('No Content', 'This page is currently empty.');
    }
  }

  /**
   * Handle individual page crop/zoom toggle
   */
  handlePageCropToggled(pageIndex) {
    const imageUrl = this.allPageImages[pageIndex];
    if (!imageUrl || imageUrl === this._blankPageUrl) {
      toast.info('No Content', 'This page is currently empty.');
      return;
    }

    this.pageZooms[pageIndex] = !this.pageZooms[pageIndex];
    this.ui.setPageZoom(pageIndex, this.pageZooms[pageIndex]);

    if (this.pageZooms[pageIndex]) {
      toast.success('Page Cropped', 'Margins removed (Fill mode)');
    } else {
      toast.info('Normal Fit', 'Full page visible (Contain mode)');
    }
  }

  /**
   * Handle individual page removal
   */
  handlePageRemoved(pageIndex) {
    const oldUrl = this.allPageImages[pageIndex];

    // Revoke old blob URL to prevent memory leaks
    if (oldUrl && oldUrl !== this._blankPageUrl && oldUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(oldUrl);
      } catch (e) {
        console.warn('Failed to revoke URL:', e);
      }
    }

    this.allPageImages[pageIndex] = this._blankPageUrl;
    this.pageFlips[pageIndex] = false;
    this.pageZooms[pageIndex] = false;
    this.ui.setPageFlip(pageIndex, false);
    this.ui.setPageZoom(pageIndex, false);
    this.ui.updatePagePreview(pageIndex, this._blankPageUrl);
    toast.success('Page Removed', `Page ${pageIndex + 1} has been cleared.`);
  }

  /**
   * Handle grid size change
   */
  handleGridSizeChanged({ rows, cols }) {
    this.gridSize = { rows, cols };
    const totalPages = rows * cols;

    // Generate a custom grid layout
    this.ui.generateCustomGrid(rows, cols, this.allPageImages.length);

    // Re-apply existing page images and states
    for (let i = 0; i < Math.min(totalPages, this.allPageImages.length); i++) {
      if (this.allPageImages[i]) {
        this.ui.updatePagePreview(i, this.allPageImages[i]);
        this.ui.setPageFlip(i, !!this.pageFlips[i]);
        this.ui.setPageZoom(i, !!this.pageZooms[i]);
      }
    }
  }



  handleFileSelected(file) {
    // Add file to uploaded files list
    this.uploadedFiles.push({
      file,
      name: file.name,
      size: file.size,
      uploadedAt: new Date()
    });

    this.ui.setStatus(`Adding: ${file.name} (${formatFileSize(file.size)})`, 'success');
    this.ui.updateUploadedFilesList(this.uploadedFiles);

    // Start processing immediately on selection for better UX
    this.processAdditionalPDF(file);
  }

  async processAdditionalPDF(file) {
    try {
      toast.info('Reading PDF...', 'Please wait');
      this.ui.showProgress(true, 'Reading PDF...', '0%');

      const result = await this.pdfProcessor.loadPDF(file, (progress) => {
        this.ui.updateProgress(progress);
      });

      const { numPages } = result;

      // Find the current filled pages
      let currentFilledPages = 0;
      for (let i = 0; i < this.allPageImages.length; i++) {
        if (this.allPageImages[i] && this.allPageImages[i] !== this._blankPageUrl) {
          currentFilledPages = Math.max(currentFilledPages, i + 1);
        }
      }

      this.totalPages = currentFilledPages + numPages;
      this.selectedLayout = this.totalPages;
      const maxPages = numPages;

      let rows, cols;
      if (this.totalPages === 16 && currentFilledPages === 0) {
        rows = 4;
        cols = 4;
        this.gridSize = { rows, cols };
        this.ui.generateLayout(16, 'accordion-16');

        // Ensure array size
        if (this.allPageImages.length < 16) {
          this.allPageImages = new Array(16).fill(null);
        }
      } else {
        const sqrt = Math.ceil(Math.sqrt(this.totalPages));
        rows = this.totalPages <= 8 ? 2 : (sqrt > 2 ? sqrt : 2);
        cols = this.totalPages <= 8 ? 4 : Math.ceil(this.totalPages / rows);

        rows = Math.min(rows, 10);
        cols = Math.min(cols, 10);

        this.gridSize = { rows, cols };

        const requiredLength = Math.max(rows * cols, this.totalPages);

        // Resize array
        const newArray = new Array(requiredLength).fill(null);
        for (let i = 0; i < this.allPageImages.length; i++) {
          if (i < newArray.length) {
            newArray[i] = this.allPageImages[i];
          }
        }
        this.allPageImages = newArray;

        this.ui.generateCustomGrid(rows, cols, this.allPageImages.length);

        // Restore existing images
        for (let i = 0; i < this.allPageImages.length; i++) {
          if (this.allPageImages[i]) {
            this.ui.updatePagePreview(i, this.allPageImages[i]);
          }
        }
      }

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

      const concurrencyLimit = 4;
      let completedPages = 0;
      const activePromises = new Set();
      let poolError = null;

      const processPage = async (pageNum) => {
        const targetIndex = currentFilledPages + pageNum - 1;
        const canvas = await this.pdfProcessor.renderPage(pageNum);
        const url = await this.pdfProcessor.canvasToBlob(canvas);

        const oldUrl = this.allPageImages[targetIndex];
        if (oldUrl && oldUrl !== this._blankPageUrl) {
          this.pdfProcessor.revokeBlobUrl(oldUrl);
        }

        this.allPageImages[targetIndex] = url;
        this.ui.updatePagePreview(targetIndex, url);

        completedPages++;
        const percent = Math.round((completedPages / maxPages) * 100);
        this.ui.showProgress(true, 'Processing Pages...', `${percent}%`);
        this.ui.updateProgress(percent);
      };

      for (let i = 1; i <= maxPages; i++) {
        if (poolError) {throw poolError;}

        const promise = processPage(i).catch(err => {
          poolError = poolError || err;
          throw err;
        }).finally(() => {
          activePromises.delete(promise);
        });

        // Prevent unhandled rejection warning, error is caught via poolError or Promise.race/all
        promise.catch(() => {});
        activePromises.add(promise);

        if (activePromises.size >= concurrencyLimit) {
          await Promise.race(activePromises).catch(err => {
            throw poolError || err;
          });
        }
      }

      if (poolError) {throw poolError;}
      await Promise.all(activePromises);

      // Fill blanks
      for (let i = this.totalPages; i < rows * cols; i++) {
        await this.createBlankPage(i + 1);
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
    const oldUrl = this.allPageImages[pageNum - 1];
    if (oldUrl && oldUrl !== this._blankPageUrl) {
      this.pdfProcessor.revokeBlobUrl(oldUrl);
    }

    this.allPageImages[pageNum - 1] = url;
    this.ui.updatePagePreview(pageNum - 1, url);
  }

  /**
   * Revoke all existing blob URLs to prevent memory leaks
   */
  cleanupOldImages() {
    if (this.allPageImages) {
      this.allPageImages.forEach(url => {
        if (url && url !== this._blankPageUrl) {
          this.pdfProcessor.revokeBlobUrl(url);
        }
      });
      // Reset array to avoid double-revocation or using invalid URLs
      for (let i = 0; i < this.allPageImages.length; i++) {
        this.allPageImages[i] = null;
      }
    }
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

    // Swap zoom states
    const tempZoom = this.pageZooms[fromIndex];
    this.pageZooms[fromIndex] = this.pageZooms[toIndex];
    this.pageZooms[toIndex] = tempZoom;

    // Update previews
    this.ui.updatePagePreview(fromIndex, this.allPageImages[fromIndex]);
    this.ui.updatePagePreview(toIndex, this.allPageImages[toIndex]);

    // Update flip/zoom UI
    this.ui.setPageFlip(fromIndex, !!this.pageFlips[fromIndex]);
    this.ui.setPageFlip(toIndex, !!this.pageFlips[toIndex]);
    this.ui.setPageZoom(fromIndex, !!this.pageZooms[fromIndex]);
    this.ui.setPageZoom(toIndex, !!this.pageZooms[toIndex]);


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

    // Build a clean print-only copy of each sheet.
    document.querySelectorAll('.zine-grid').forEach((grid) => {
      const gridClone = grid.cloneNode(true);

      // Remove all interactive/UI-only elements from the print output.
      gridClone.querySelectorAll('button, .page-label, .page-placeholder, .guidelines').forEach((el) => {
        el.remove();
      });

      // Force print-safe layout styles without relying on Tailwind classes.
      gridClone.querySelectorAll('.page-cell').forEach((cell) => {
        cell.style.position = 'relative';
        cell.style.display = 'flex';
        cell.style.alignItems = 'center';
        cell.style.justifyContent = 'center';
        cell.style.overflow = 'hidden';
        cell.style.border = 'none';
      });

      gridClone.querySelectorAll('.page-content-img').forEach((img) => {
        img.style.display = 'block';
        img.style.width = '100%';
        img.style.height = '100%';
      });

      zineSheets.push(gridClone.outerHTML);
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
        ${content}
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
          .page-zoomed .page-content-img {
            object-fit: cover;
            transform: scale(1.1);
          }

          .page-label, .page-placeholder { display: none; }

          /* Always hide interactive controls – Tailwind is not loaded here */
          .zoom-btn, .crop-btn, .remove-btn, .flip-btn { display: none !important; }
          
          .back-side {
            width: 100%; height: 100%;
            background-image: url('${this.referenceImageUrl}');
            background-size: contain;
            background-position: center;
            background-repeat: no-repeat;
            transform: rotate(180deg);
          }
          
          /* Extra safeguard: hide controls when printing */
          @media print {
            .zoom-btn, .crop-btn, .remove-btn, .flip-btn, .page-label, .guidelines, .page-placeholder, .page-cell::before, .page-cell::after { 
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

    const waitForImagesToLoad = () => {
      const images = printWindow.document.querySelectorAll('img');

      if (images.length === 0) {
        return Promise.resolve();
      }

      const loadingPromises = Array.from(images).map((img) => {
        if (img.complete && img.naturalWidth > 0) {
          return Promise.resolve();
        }

        return new Promise((resolve) => {
          const complete = () => {
            img.removeEventListener('load', complete);
            img.removeEventListener('error', complete);
            resolve();
          };

          img.addEventListener('load', complete, { once: true });
          img.addEventListener('error', complete, { once: true });
        });
      });

      // Never block forever if a source fails to resolve.
      const timeout = new Promise((resolve) => setTimeout(resolve, 2500));
      return Promise.race([Promise.all(loadingPromises), timeout]);
    };

    waitForImagesToLoad().finally(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    });
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
          allowTaint: true,
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
        await new Promise((resolve, reject) => {
          refImg.onload = resolve;
          refImg.onerror = reject;
          refImg.src = this.referenceImageUrl;
        });

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

  /**
   * Remove an uploaded file and its pages from the zine
   */
  removeUploadedFile(index) {
    if (index < 0 || index >= this.uploadedFiles.length) { return; }

    const removedFile = this.uploadedFiles[index];

    // For now, we'll just remove it from the list and show a message
    // In a full implementation, we'd need to track which pages belong to which file
    this.uploadedFiles.splice(index, 1);
    this.ui.updateUploadedFilesList(this.uploadedFiles);

    toast.info('File Removed', `${removedFile.name} removed from list. Note: Pages remain in zine.`);

  }
}

// Initialize the app
window.zineMaker = new PDFZineMaker();
