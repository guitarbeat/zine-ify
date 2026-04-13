import '../styles/index.css';
import { PDFProcessor } from '../services/PDFProcessor.js';
import { UIManager } from '../components/UI/Manager.js';
import { BookletPreview } from '../components/BookletPreview.js';
import { toast } from '../components/Toast.js';
import { formatFileSize } from '../utils/helpers.js';
import { classifyFileKind, getFileTypeLabel } from '../utils/fileValidation.js';
import { buildMiniZineSlotPages } from '../utils/miniZineLayout.js';

// Import assets
import referenceImageUrl from '../assets/reference-back-side.jpg';

class PDFZineMaker {
  constructor() {
    this.pdfProcessor = new PDFProcessor();
    this.ui = new UIManager();
    this.referenceImageUrl = referenceImageUrl;
    this.allPageImages = new Array(8).fill(null);
    this._blankPageUrl = null;
    this.pageFlips = {}; // Track individual page flips: { pageIndex: true/false }
    this.pageZooms = {}; // Track individual page zooms/crops
    this.gridSize = { rows: 2, cols: 4 }; // Default grid size
    this.uploadedFiles = []; // Track uploaded files
    this.totalPages = 0; // Track total pages across all imports
    this.fileQueue = [];
    this.isProcessingQueue = false;
    this.viewer3d = null;
    this.bookletPreview = null;
    this.exportDependenciesPromise = null;
    this.zine3dViewerClassPromise = null;
    this.workflowPreviewed = false;
    this.workflowExported = false;
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
      this.ui.setStatus('Upload PDF or image files to get started', 'info');
      this.syncWorkflow();
    } catch {
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
    this.ui.on('view3d', () => this.handleView3d());
    this.ui.on('foldProgress', (val) => this.handleFoldProgress(val));
  }

  getWorkflowSnapshot() {
    const totalSlots = this.gridSize.rows * this.gridSize.cols;
    const filledPages = this.getFilledPageCount();
    const sheetCount = Math.max(1, Math.ceil(Math.max(this.allPageImages.length, 1) / totalSlots));
    const isMiniZineLayout = this.isMiniZineLayout();
    const layoutLabel = isMiniZineLayout
      ? '8-page mini-zine'
      : `${this.gridSize.rows}×${this.gridSize.cols} grid${sheetCount > 1 ? ` • ${sheetCount} sheets` : ''}`;

    return {
      totalSlots,
      filledPages,
      sheetCount,
      isMiniZineLayout,
      layoutLabel
    };
  }

  getNextWorkflowHint({ afterPreview = false, afterExport = false } = {}) {
    if (!this.getFilledPageCount()) {
      return 'Next: add pages to start the layout.';
    }

    if (afterExport) {
      return 'Adjust anything that still feels off, then export again.';
    }

    if (afterPreview) {
      return 'Next: export the sheet as a PDF or print it.';
    }

    if (this.isMiniZineLayout()) {
      return 'Next: arrange pages, then open Fold + Read to confirm the booklet order.';
    }

    return 'Next: arrange pages, then export the sheet or print it.';
  }

  loadPreviewImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Failed to load preview source: ${url}`));
      image.src = url;
    });
  }

  async buildPreviewPage(pageIndex) {
    const sourceUrl = this.allPageImages[pageIndex] || this._blankPageUrl || null;
    const flipped = !!this.pageFlips[pageIndex];
    const zoomed = !!this.pageZooms[pageIndex];

    if (!sourceUrl) {
      return { sourceUrl: null, previewUrl: null, flipped, zoomed };
    }

    if (!flipped && !zoomed) {
      return { sourceUrl, previewUrl: sourceUrl, flipped, zoomed };
    }

    const image = await this.loadPreviewImage(sourceUrl);
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 1414;

    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      return { sourceUrl, previewUrl: sourceUrl, flipped, zoomed };
    }

    const imageWidth = image.naturalWidth || image.width || canvas.width;
    const imageHeight = image.naturalHeight || image.height || canvas.height;
    const fitScale = zoomed
      ? Math.max(canvas.width / imageWidth, canvas.height / imageHeight)
      : Math.min(canvas.width / imageWidth, canvas.height / imageHeight);
    const drawScale = fitScale * (zoomed ? 1.1 : 1);
    const drawWidth = imageWidth * drawScale;
    const drawHeight = imageHeight * drawScale;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.translate(canvas.width / 2, canvas.height / 2);
    if (flipped) {
      context.rotate(Math.PI);
    }
    context.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    context.restore();

    return {
      sourceUrl,
      previewUrl: canvas.toDataURL('image/png'),
      flipped,
      zoomed
    };
  }

  async buildPreviewPages() {
    return Promise.all(
      Array.from({ length: 8 }, (_, pageIndex) => this.buildPreviewPage(pageIndex))
    );
  }

  buildMiniZineSlotPreviewPages(previewPages) {
    const cellPageIndexes = Array.from(
      document.querySelectorAll('#zine-grid-sheet-1 .page-cell'),
      (cell) => Number.parseInt(cell.getAttribute('data-page-index'), 10)
    ).filter((pageIndex) => !Number.isNaN(pageIndex));

    if (cellPageIndexes.length !== 8) {
      return previewPages.map((page, slotIndex) => ({
        ...page,
        pageIndex: slotIndex,
        pageNumber: slotIndex + 1,
        slotIndex
      }));
    }

    return buildMiniZineSlotPages(previewPages, cellPageIndexes);
  }

  /**
   * Handle View 3D request
   */
  async handleView3d() {
      const isMiniZineLayout = this.isMiniZineLayout();

      if (!isMiniZineLayout) {
          toast.warning('Fold + Read Unavailable', 'Switch back to the 8-page mini-zine layout to use the 3D preview.');
          return;
      }

      try {
          if (!this.viewer3d) {
              const container = document.getElementById('zine-3d-container');
              if (container) {
                  const Zine3DViewer = await this.getZine3DViewerClass();
                  this.viewer3d = new Zine3DViewer(container);
              }
          }

          if (!this.bookletPreview && this.ui.elements.bookletPreviewContainer) {
              this.bookletPreview = new BookletPreview({
                  container: this.ui.elements.bookletPreviewContainer,
                  prevButton: this.ui.elements.bookletPrevBtn,
                  nextButton: this.ui.elements.bookletNextBtn,
                  statusElement: this.ui.elements.bookletStatus
              });
          }

          if (this.viewer3d) {
              const slider = document.getElementById('fold-slider');
              if (slider) {slider.value = 0;}
              this.ui.updateFoldUI(0);

              const previewPages = await this.buildPreviewPages();
              const slotPreviewPages = this.buildMiniZineSlotPreviewPages(previewPages);

              this.ui.toggle3DModal(true);
              this.workflowPreviewed = true;
              this.workflowExported = false;
              this.syncWorkflow();
              requestAnimationFrame(() => {
                this.viewer3d.refreshLayout();
                this.viewer3d.loadPages(previewPages);
                this.bookletPreview?.loadPages(slotPreviewPages);
              });
              toast.success('Fold + Read Ready', this.getNextWorkflowHint({ afterPreview: true }));
          }
      } catch {
          toast.error('Preview Could Not Open', 'Fold + Read failed to load. Try again in a moment.');
      }
  }

  /**
   * Handle standard fold progress update
   */
  handleFoldProgress(val) {
      if (this.viewer3d) {
          this.viewer3d.setFoldProgress(val);
      }
  }

  /**
   * Handle individual page flip
   */
  handlePageFlipped(pageIndex) {
    this.pageFlips[pageIndex] = !this.pageFlips[pageIndex];
    this.ui.setPageFlip(pageIndex, this.pageFlips[pageIndex]);
    this.markWorkflowDirty();
  }

  /**
   * Handle individual page zoom preview
   */
  handlePageZoomed(pageIndex) {
    const imageUrl = this.allPageImages[pageIndex];
    if (imageUrl && imageUrl !== this._blankPageUrl) {
      this.ui.showZoomModal(imageUrl);
    } else {
      toast.info('Page Slot Is Empty', `Add artwork to slot ${pageIndex + 1} before opening a preview.`);
    }
  }

  /**
   * Handle individual page crop/zoom toggle
   */
  handlePageCropToggled(pageIndex) {
    const imageUrl = this.allPageImages[pageIndex];
    if (!imageUrl || imageUrl === this._blankPageUrl) {
      toast.info('Page Slot Is Empty', `Add artwork to slot ${pageIndex + 1} before changing its crop mode.`);
      return;
    }

    this.pageZooms[pageIndex] = !this.pageZooms[pageIndex];
    this.ui.setPageZoom(pageIndex, this.pageZooms[pageIndex]);
    this.markWorkflowDirty();

    if (this.pageZooms[pageIndex]) {
      toast.success('Page Fills The Panel', `Slot ${pageIndex + 1} now crops to the panel edges.`);
    } else {
      toast.info('Full Page Visible', `Slot ${pageIndex + 1} now shows the full page inside the panel.`);
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
      } catch (error) {
        void error;
      }
    }

    this.allPageImages[pageIndex] = this._blankPageUrl;
    this.pageFlips[pageIndex] = false;
    this.pageZooms[pageIndex] = false;
    this.totalPages = this.getFilledPageCount();
    this.ui.setPageFlip(pageIndex, false);
    this.ui.setPageZoom(pageIndex, false);
    this.ui.updatePagePreview(pageIndex, this._blankPageUrl);
    this.ui.setReady(this.getFilledPageCount() > 0);
    this.markWorkflowDirty();
    toast.success('Page Cleared', `Slot ${pageIndex + 1} is empty again. ${this.getNextWorkflowHint()}`);
  }

  /**
   * Handle grid size change
   */
  handleGridSizeChanged({ rows, cols }) {
    this.gridSize = { rows, cols };
    this.workflowPreviewed = false;
    this.workflowExported = false;
    this.renderCurrentLayout();
  }

  async getSelectedPagesForImport(fileName, numPages) {
    const selectionLimit = Math.max(1, this.gridSize.rows * this.gridSize.cols);

    if (numPages <= selectionLimit) {
      return Array.from({ length: numPages }, (_, index) => index + 1);
    }

    toast.info('Choose Pages To Import', `${fileName} has ${numPages} pages. Pick up to ${selectionLimit} to place on the sheet.`);
    this.ui.showProgress(true, 'Preparing Page Picker...', 'Rendering thumbnails');

    const thumbnails = [];

    try {
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const canvas = await this.pdfProcessor.renderPageThumbnail(pageNum);
        const thumbnailUrl = await this.pdfProcessor.canvasToBlob(canvas);
        thumbnails.push({ pageNumber: pageNum, thumbnailUrl });

        const percent = Math.round((pageNum / numPages) * 100);
        this.ui.updateProgress(percent);
        this.ui.showProgress(true, 'Preparing Page Picker...', `${percent}%`);
      }
    } finally {
      this.ui.showProgress(false);
    }

    try {
      const selectedPages = await this.ui.showPagePicker({
        fileName,
        totalPages: numPages,
        selectionLimit,
        thumbnails
      });

      return selectedPages;
    } finally {
      thumbnails.forEach(({ thumbnailUrl }) => {
        this.pdfProcessor.revokeBlobUrl(thumbnailUrl);
      });
    }
  }



  handleFileSelected(file) {
    const kind = classifyFileKind(file);

    // Add file to uploaded files list
    this.uploadedFiles.push({
      file,
      name: file.name,
      kind,
      typeLabel: getFileTypeLabel(kind),
      size: file.size,
      uploadedAt: new Date()
    });

    this.ui.setStatus(`Adding: ${file.name} (${formatFileSize(file.size)})`, 'success');
    this.ui.updateUploadedFilesList(this.uploadedFiles);
    this.syncWorkflow();

    this.fileQueue.push(file);
    this.processFileQueue();
  }

  async processFileQueue() {
    if (this.isProcessingQueue) {
      return;
    }

    this.isProcessingQueue = true;
    while (this.fileQueue.length > 0) {
      const nextFile = this.fileQueue.shift();
      await this.processQueuedFile(nextFile);
    }
    this.isProcessingQueue = false;
  }

  async processQueuedFile(file) {
    const kind = classifyFileKind(file);

    if (kind === 'pdf') {
      await this.processAdditionalPDF(file);
      return;
    }

    if (kind === 'image') {
      await this.processAdditionalImage(file);
      return;
    }

    toast.error('Unsupported Upload', 'Add PDFs or image files only.');
  }

  getCurrentFilledPages() {
    let currentFilledPages = 0;
    for (let i = 0; i < this.allPageImages.length; i++) {
      if (this.allPageImages[i] && this.allPageImages[i] !== this._blankPageUrl) {
        currentFilledPages = Math.max(currentFilledPages, i + 1);
      }
    }

    return currentFilledPages;
  }

  prepareLayoutForAdditionalPages(pageCount) {
    const currentFilledPages = this.getCurrentFilledPages();
    this.totalPages = currentFilledPages + pageCount;
    this.selectedLayout = this.totalPages;
    this.workflowPreviewed = false;
    this.workflowExported = false;

    const requiredLength = this.getRequiredPageCapacity(this.totalPages);
    const newArray = new Array(requiredLength).fill(null);
    for (let i = 0; i < this.allPageImages.length; i++) {
      if (i < newArray.length) {
        newArray[i] = this.allPageImages[i];
      }
    }
    this.allPageImages = newArray;

    this.renderCurrentLayout();

    this.ui.setReady(true);
    this.syncWorkflow();

    return { currentFilledPages, requiredLength };
  }

  async fillRemainingBlanks(requiredLength) {
    for (let i = this.totalPages; i < requiredLength; i++) {
      await this.createBlankPage(i + 1);
    }
  }

  async processAdditionalPDF(file) {
    try {
      toast.info('Importing PDF', `${file.name} is being decoded and placed on the sheet.`);
      this.ui.showProgress(true, 'Reading PDF...', '0%');

      const result = await this.pdfProcessor.loadPDF(file, (progress) => {
        this.ui.updateProgress(progress);
      });

      const { numPages } = result;
      const selectedPages = await this.getSelectedPagesForImport(file.name, numPages);

      if (!selectedPages || selectedPages.length === 0) {
        this.ui.setStatus(`Skipped: ${file.name}`, 'info');
        toast.info('PDF Skipped', `No pages from ${file.name} were added to the layout.`);
        return;
      }

      const { currentFilledPages, requiredLength } = this.prepareLayoutForAdditionalPages(selectedPages.length);
      const maxPages = selectedPages.length;

      const concurrencyLimit = 4;
      let completedPages = 0;
      let poolError = null;

      const processPage = async (pageNum, selectedIndex) => {
        try {
          const targetIndex = currentFilledPages + selectedIndex;
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
        } catch (error) {
          poolError = error;
          throw error;
        }
      };

      const activePromises = new Set();

      for (const [selectedIndex, pageNum] of selectedPages.entries()) {
        if (poolError) { throw poolError; }

        const promise = processPage(pageNum, selectedIndex).catch(err => {
          poolError = err;
        });
        activePromises.add(promise);

        promise.finally(() => {
          activePromises.delete(promise);
        });

        if (activePromises.size >= concurrencyLimit) {
          await Promise.race(activePromises);
        }
      }

      await Promise.all(activePromises);

      if (poolError) { throw poolError; }

      await this.fillRemainingBlanks(requiredLength);

      this.ui.showProgress(false);
      this.ui.setStatus(`Imported ${selectedPages.length} of ${numPages} pages from ${file.name}`, 'success');
      this.syncWorkflow();
      toast.success(
        'PDF Added To Layout',
        `Imported ${selectedPages.length} of ${numPages} pages from ${file.name}. ${this.getNextWorkflowHint()}`
      );

    } catch (error) {
      this.ui.showProgress(false);
      toast.error('PDF Import Failed', error.message || `Couldn't import ${file.name}.`);
    }
  }

  async processAdditionalImage(file) {
    try {
      toast.info('Adding Image', `${file.name} is being placed on the next open slot.`);
      this.ui.showProgress(true, 'Reading image...', '0%');

      const { currentFilledPages, requiredLength } = this.prepareLayoutForAdditionalPages(1);
      const targetIndex = currentFilledPages;

      this.ui.updateProgress(35);
      const canvas = await this.pdfProcessor.renderImageFile(file);
      this.ui.showProgress(true, 'Processing image...', '70%');
      this.ui.updateProgress(70);

      const url = await this.pdfProcessor.canvasToBlob(canvas);
      const oldUrl = this.allPageImages[targetIndex];
      if (oldUrl && oldUrl !== this._blankPageUrl) {
        this.pdfProcessor.revokeBlobUrl(oldUrl);
      }

      this.allPageImages[targetIndex] = url;
      this.ui.updatePagePreview(targetIndex, url);

      await this.fillRemainingBlanks(requiredLength);

      this.ui.showProgress(true, 'Processing image...', '100%');
      this.ui.updateProgress(100);
      this.ui.showProgress(false);
      this.ui.setStatus(`Imported image: ${file.name}`, 'success');
      this.syncWorkflow();
      toast.success('Image Added To Layout', `${file.name} is ready. ${this.getNextWorkflowHint()}`);
    } catch (error) {
      this.ui.showProgress(false);
      toast.error('Image Import Failed', error.message || `Couldn't import ${file.name}.`);
    }
  }

  getFilledPageCount() {
    let count = 0;

    for (let i = 0; i < this.allPageImages.length; i++) {
      if (this.allPageImages[i] && this.allPageImages[i] !== this._blankPageUrl) {
        count = i + 1;
      }
    }

    return count;
  }

  getRequiredPageCapacity(totalPages = this.totalPages) {
    const { rows, cols } = this.gridSize;
    const slotsPerSheet = rows * cols;
    return Math.max(slotsPerSheet, Math.ceil(Math.max(totalPages, 1) / slotsPerSheet) * slotsPerSheet);
  }

  renderCurrentLayout() {
    const requiredLength = this.getRequiredPageCapacity(this.totalPages);

    if (this.allPageImages.length !== requiredLength) {
      const resized = new Array(requiredLength).fill(null);
      for (let i = 0; i < Math.min(this.allPageImages.length, resized.length); i++) {
        resized[i] = this.allPageImages[i];
      }
      this.allPageImages = resized;
    }

    const { rows, cols } = this.gridSize;
    if (rows === 2 && cols === 4) {
      this.ui.generateLayout(requiredLength, 'mini-8');
    } else {
      this.ui.generateCustomGrid(rows, cols, requiredLength);
    }

    for (let i = 0; i < this.allPageImages.length; i++) {
      if (this.allPageImages[i]) {
        this.ui.updatePagePreview(i, this.allPageImages[i]);
      }
      this.ui.setPageFlip(i, !!this.pageFlips[i]);
      this.ui.setPageZoom(i, !!this.pageZooms[i]);
    }

    if (this.ui.elements.gridRows) {
      this.ui.elements.gridRows.value = rows;
    }
    if (this.ui.elements.gridCols) {
      this.ui.elements.gridCols.value = cols;
    }
    if (this.ui.elements.gridTotal) {
      this.ui.elements.gridTotal.textContent = `(${rows * cols} pages/sheet)`;
    }

    this.syncWorkflow();
  }

  async createBlankPage(pageNum) {
    let url = this._blankPageUrl;

    if (!url) {
      // ⚡ Bolt: Use OffscreenCanvas if available for background blank page generation
      let canvas, ctx;
      if (typeof OffscreenCanvas !== 'undefined') {
        canvas = new OffscreenCanvas(1000, 1400);
        ctx = canvas.getContext('2d');
      } else {
        canvas = document.createElement('canvas');
        canvas.width = 1000;
        canvas.height = 1400;
        ctx = canvas.getContext('2d');
      }

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
    this.markWorkflowDirty();

    toast.info('Pages Reordered', `Swapped slots ${fromIndex + 1} and ${toIndex + 1}. ${this.getNextWorkflowHint()}`);
  }

  updatePaperSettings(settings) {
    this.paperSize = settings.paperSize;
    this.orientation = settings.orientation;
  }

  handlePrint() {
    if (!this.ui.hasContent()) {
      toast.warning('Nothing To Print', 'Add pages to the sheet before printing.');
      return;
    }

    // Audit check: Are all pages filled?
    // We won't block it, but we could warn if it's empty.

    const printOpened = this.createPrintLayout();
    if (printOpened) {
      this.workflowExported = true;
      this.syncWorkflow();
    }
  }

  createPrintLayout() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Print Window Blocked', 'Allow pop-ups for this site, then try Print Sheet again.');
      return false;
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

    const dimensions = this.ui.getPaperDimensions(this.paperSize || 'letter', this.orientation || 'landscape');


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
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data: blob:; object-src 'none'; base-uri 'none'; form-action 'none';">
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
            --page-image-rotation: 0deg;
            --page-image-scale: 1;
            transform: rotate(var(--page-image-rotation)) scale(var(--page-image-scale));
          }
          .page-zoomed .page-content-img {
            object-fit: cover;
            --page-image-scale: 1.1;
          }
          .page-cell.is-flipped .page-content-img {
            --page-image-rotation: 180deg;
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

    return true;
  }

  async getExportDependencies() {
    if (!this.exportDependenciesPromise) {
      this.exportDependenciesPromise = Promise.all([
        import('jspdf'),
        import('html2canvas')
      ]).then(([jspdfModule, html2canvasModule]) => ({
        jsPDF: jspdfModule.jsPDF,
        html2canvas: html2canvasModule.default
      }));
    }

    return this.exportDependenciesPromise;
  }

  async getZine3DViewerClass() {
    if (!this.zine3dViewerClassPromise) {
      this.zine3dViewerClassPromise = import('../components/Zine3DViewer.js')
        .then((module) => module.Zine3DViewer);
    }

    return this.zine3dViewerClassPromise;
  }


  async handleExport() {
    if (!this.ui.hasContent()) { return; }
    if (this.ui.elements.exportPdfBtn.disabled) { return; } // Active-state lock

    // Save original button content
    const originalBtnHTML = this.ui.elements.exportPdfBtn.innerHTML;

    try {
      this.ui.elements.exportPdfBtn.disabled = true;
      this.ui.elements.exportPdfBtn.setAttribute('aria-busy', 'true');
      this.ui.elements.exportPdfBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        GENERATING...
      `;
      document.body.classList.add('is-exporting'); // Hide UI controls
      toast.info('Exporting PDF', 'Building the printable sheet and back side now.');
      const { jsPDF, html2canvas } = await this.getExportDependencies();

      const doc = new jsPDF({
        orientation: this.orientation || 'landscape',
        unit: 'mm',
        format: this.paperSize || 'letter'
      });

      const dimensions = this.ui.getPaperDimensions(this.paperSize || 'letter', this.orientation || 'landscape');

      let cachedBackSideUrl = null;

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

        // ⚡ Bolt: Cache the expensive back cover DataURL to avoid redundant canvas rendering
        // and string encoding when capturing multiple sheets.
        if (!cachedBackSideUrl) {
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
          cachedBackSideUrl = backCanvas.toDataURL('image/jpeg', 0.9);
        }

        doc.addImage(cachedBackSideUrl, 'JPEG', 0, 0, dimensions.width, dimensions.height);
      };

      const grids = Array.from(document.querySelectorAll('.zine-grid'));
      for (let i = 0; i < grids.length; i++) {
        await captureZine(i + 1);
      }

      doc.save(`zine-${Date.now()}.pdf`);
      this.workflowExported = true;
      this.syncWorkflow();
      toast.success('PDF Download Started', `Your export is ready. ${this.getNextWorkflowHint({ afterExport: true })}`);
    } catch (error) {
      toast.error('Export Failed', error?.message || 'The PDF could not be generated. Try again.');
    } finally {
      this.ui.elements.exportPdfBtn.disabled = false;
      this.ui.elements.exportPdfBtn.removeAttribute('aria-busy');
      this.ui.elements.exportPdfBtn.innerHTML = originalBtnHTML;
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
    this.syncWorkflow();

    toast.info('Removed From Upload List', `${removedFile.name} was removed from the queue. Any pages already placed stay on the sheet.`);

  }

  isMiniZineLayout() {
    return this.ui.currentTemplate === 'mini-8'
      || (this.gridSize.rows === 2 && this.gridSize.cols === 4);
  }

  markWorkflowDirty() {
    this.workflowPreviewed = false;
    this.workflowExported = false;
    this.syncWorkflow();
  }

  syncWorkflow() {
    const {
      totalSlots,
      filledPages,
      layoutLabel,
      isMiniZineLayout
    } = this.getWorkflowSnapshot();

    this.ui.updateWorkflow({
      uploadedFiles: this.uploadedFiles.length,
      filledPages,
      totalSlots,
      layoutLabel,
      isMiniZineLayout,
      previewOpened: this.workflowPreviewed,
      exportCompleted: this.workflowExported
    });
  }
}

// Initialize the app
window.zineMaker = new PDFZineMaker();
