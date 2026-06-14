import { PDFProcessor } from '../services/PDFProcessor.js';
import { UIManager } from '../components/UI/UIManager.js';
import { StateStore } from './StateStore.js';
import { UndoManager } from './UndoManager.js';
import { ExportService } from '../services/ExportService.js';
import { toast } from '../components/Toast.js';
import { GRID_DIMENSION_MAX, GRID_DIMENSION_MIN } from '../utils/config.js';
import { parseBoundedInteger } from '../utils/helpers.js';
import { classifyFileKind, SUPPORTED_UPLOAD_MESSAGE, UNSUPPORTED_UPLOAD_TITLE } from '../utils/fileValidation.js';
import { BookletPreview } from '../components/BookletPreview.js';

export class AppController {
  constructor() {
    this.state = new StateStore();
    this.undoManager = new UndoManager();
    this.pdfProcessor = new PDFProcessor();
    this.ui = new UIManager();
    this.exportService = new ExportService(this.ui, this.state, this.pdfProcessor);
    this.viewer3d = null;
    this.bookletPreview = null;
    this.zine3dViewerClassPromise = null;
    this.previewAssetUrls = [];

    this.init();
  }

  async init() {
    try {
      await this.pdfProcessor.initialize();
      this.setupEventListeners();
      this.ui.syncPaperSettings({
        paperSize: this.state.paperSize,
        orientation: this.state.orientation
      });
      this.renderCurrentLayout();
      this.ui.setStatus('Choose files or drop them here');
    } catch (error) {
      toast.error('Initialization Failed', 'Check console for details.');
      // eslint-disable-next-line no-console
      console.error(error.message || 'An error occurred');
    }
  }

  setupEventListeners() {
    this.ui.on('fileSelected', (file) => this.handleFileSelected(file));
    this.ui.on('gridSizeChanged', (data) => this.handleGridSizeChanged(data));
    this.ui.on('pageNumbersToggled', () => this.renderCurrentLayout());
    this.ui.on('pageFlipped', (i) => this.handlePageFlipped(i));
    this.ui.on('pageCropToggled', (i) => this.handlePageCropToggled(i));
    this.ui.on('pageRemoved', (i) => this.handlePageRemoved(i));
    this.ui.on('pagesSwapped', (data) => this.handlePagesSwapped(data));
    this.ui.on('export', () => this.handleExport());
    this.ui.on('view3d', () => this.handleView3d());
    this.ui.on('clearAll', () => this.handleClearAll());
    this.ui.on('foldProgress', (value) => this.handleFoldProgress(value));
    this.ui.on('paperSizeChanged', (data) => this.handlePaperSettingsChanged(data));
    this.ui.on('orientationChanged', (data) => this.handlePaperSettingsChanged(data));
    this.ui.on('marginChanged', (data) => { this.state.margin = data.margin; this.state.resetWorkflowStatus(); });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.handleUndo();
      }
    });
  }

  /** Capture a snapshot of page state onto the undo stack. */
  _pushSnapshot(description, { onPrune = null } = {}) {
    this.undoManager.push({
      description,
      allPageImages: [...this.state.allPageImages],
      pageFlips: { ...this.state.pageFlips },
      pageZooms: { ...this.state.pageZooms },
      onPrune
    });
  }

  handleUndo() {
    if (this.undoManager.isEmpty) {
      toast.info('Nothing to Undo', 'No recent actions to undo.');
      return;
    }

    const snapshot = this.undoManager.pop();
    this.state.allPageImages = snapshot.allPageImages;
    this.state.pageFlips = snapshot.pageFlips;
    this.state.pageZooms = snapshot.pageZooms;
    this.state.totalPages = this.state.getFilledPageCount();
    this.state.resetWorkflowStatus();
    this.renderCurrentLayout();
    toast.info('Undone', snapshot.description);
  }

  handleFileSelected(file) {
    const kind = classifyFileKind(file);
    if (!kind) {
      toast.error(UNSUPPORTED_UPLOAD_TITLE, SUPPORTED_UPLOAD_MESSAGE);
      return;
    }

    const record = {
      file,
      kind,
      name: file.name,
      size: file.size,
      status: 'Queued'
    };

    this.state.uploadedFiles.push(record);
    this.state.resetWorkflowStatus();
    this.ui.updateUploadedFilesList(this.state.uploadedFiles);
    this.ui.setStatus(`Adding: ${file.name}`);

    this.state.fileQueue.push(record);
    void this.processFileQueue();
  }

  async processFileQueue() {
    if (this.state.isProcessingQueue) {
      return;
    }

    this.state.isProcessingQueue = true;

    while (this.state.fileQueue.length > 0) {
      const nextRecord = this.state.fileQueue.shift();
      if (!nextRecord) {
        continue;
      }

      try {
        this.updateUploadedFileRecord(nextRecord, { status: 'Processing' });

        if (nextRecord.kind === 'image') {
          await this.processImageUpload(nextRecord);
        } else {
          await this.processPdfUpload(nextRecord);
        }
      } catch (error) {
        this.updateUploadedFileRecord(nextRecord, { status: 'Failed' });
        this.ui.setStatus(`Failed: ${nextRecord.name}`, 'error');
        toast.error('Import Failed', error.message);
      } finally {
        this.ui.modal.showProgress(false);
      }
    }

    this.state.isProcessingQueue = false;
  }

  updateUploadedFileRecord(record, updates) {
    Object.assign(record, updates);
    this.ui.updateUploadedFilesList(this.state.uploadedFiles);
  }

  async processImageUpload(record) {
    this.ui.modal.showProgress(true, `Reading ${record.name}...`);
    this.ui.modal.setProgressCopy('Rendering image...');

    const targetIndex = this.getNextInsertionIndex();
    const currentFilledPages = this.state.getFilledPageCount();
    this.prepareLayoutForTotalPages(Math.max(currentFilledPages, targetIndex + 1));

    const existingUrl = this.state.allPageImages[targetIndex];
    const canvas = await this.pdfProcessor.renderImageFile(record.file);
    const imageUrl = await this.pdfProcessor.canvasToBlob(canvas);

    if (existingUrl && existingUrl !== this.state._blankPageUrl) {
      this.pdfProcessor.revokeBlobUrl(existingUrl);
    }

    this.state.allPageImages[targetIndex] = imageUrl;
    this.state.totalPages = this.state.getFilledPageCount();
    this.state.resetWorkflowStatus();
    await this.fillBlankSlots();
    this.renderCurrentLayout();

    const status = `Imported image: ${record.name}`;
    this.updateUploadedFileRecord(record, { status });
    this.ui.setStatus(status, 'success');
    toast.success('Import Complete', status);
  }

  async processPdfUpload(record) {
    this.ui.modal.showProgress(true, `Reading ${record.name}...`);

    const result = await this.pdfProcessor.loadPDF(record.file, (message) => {
      this.ui.modal.setProgressCopy(message);
    });

    const selectedPages = await this.getSelectedPagesForImport(record.name, result.numPages);
    if (!selectedPages || selectedPages.length === 0) {
      const status = `Skipped: ${record.name}`;
      this.updateUploadedFileRecord(record, { status });
      this.ui.setStatus(status);
      toast.info('Import Cancelled', 'No pages were added from that PDF.');
      return;
    }

    const startIndex = this.state.getFilledPageCount();
    this.prepareLayoutForTotalPages(startIndex + selectedPages.length);
    this.ui.modal.showProgress(true, 'Rendering pages...', '0%');

    for (const [selectedIndex, pageNumber] of selectedPages.entries()) {
      const targetIndex = startIndex + selectedIndex;
      const canvas = await this.pdfProcessor.renderPage(pageNumber);
      const pageUrl = await this.pdfProcessor.canvasToBlob(canvas);
      const existingUrl = this.state.allPageImages[targetIndex];

      if (existingUrl && existingUrl !== this.state._blankPageUrl) {
        this.pdfProcessor.revokeBlobUrl(existingUrl);
      }

      this.state.allPageImages[targetIndex] = pageUrl;
      this.ui.updatePagePreview(targetIndex, pageUrl);

      const percent = Math.round(((selectedIndex + 1) / selectedPages.length) * 100);
      this.ui.modal.setProgressCopy('Rendering pages...', `${percent}%`);
      this.ui.modal.updateProgress(percent);
    }

    this.state.totalPages = this.state.getFilledPageCount();
    this.state.resetWorkflowStatus();
    await this.fillBlankSlots();
    this.renderCurrentLayout();

    const status = `Imported ${selectedPages.length} of ${result.numPages} pages from ${record.name}`;
    this.updateUploadedFileRecord(record, { status });
    this.ui.setStatus(status, 'success');
    toast.success('Import Complete', status);
  }

  async getSelectedPagesForImport(fileName, numPages) {
    const selectionLimit = Math.max(1, this.state.gridSize.rows * this.state.gridSize.cols);

    if (numPages <= selectionLimit) {
      return Array.from({ length: numPages }, (_, index) => index + 1);
    }

    const thumbnails = [];
    this.ui.modal.showProgress(true, 'Preparing page picker...', '0%');
    this.ui.modal.updateProgress(0);

    try {
      // ⚡ Bolt: Sliding window worker pool for faster thumbnail generation
      // This maintains a constant stream of processing instead of waiting for batched promises,
      // avoiding UI stuttering and utilizing resources more evenly.
      const CONCURRENCY_LIMIT = 4;
      const activePromises = new Set();
      let completedCount = 0;

      const processPage = async (pageNumber) => {
        const canvas = await this.pdfProcessor.renderPageThumbnail(pageNumber);
        const thumbnailUrl = await this.pdfProcessor.canvasToBlob(canvas);
        thumbnails.push({ pageNumber, thumbnailUrl });

        completedCount++;
        const percent = Math.round((completedCount / numPages) * 100);
        this.ui.modal.setProgressCopy('Preparing page picker...', `${percent}%`);
        this.ui.modal.updateProgress(percent);
      };

      try {
        for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
          // Intentional forward reference: `trackedPromise` is captured by the `.finally()` closure
          // so that the Set removes the correct (finally-wrapped) promise upon settlement.
          const trackedPromise = processPage(pageNumber).finally(() => activePromises.delete(trackedPromise));
          activePromises.add(trackedPromise);

          if (activePromises.size >= CONCURRENCY_LIMIT) {
            await Promise.race(activePromises);
          }
        }

        await Promise.all(activePromises);

        // Ensure thumbnails are sorted by pageNumber since they resolve out of order
        thumbnails.sort((a, b) => a.pageNumber - b.pageNumber);
      } catch (error) {
        await Promise.allSettled(Array.from(activePromises));
        thumbnails.forEach(({ thumbnailUrl }) => {
          this.pdfProcessor.revokeBlobUrl(thumbnailUrl);
        });
        throw error;
      }
    } finally {
      this.ui.modal.showProgress(false);
    }

    try {
      return await this.ui.modal.showPagePicker({
        fileName,
        totalPages: numPages,
        selectionLimit,
        thumbnails
      });
    } finally {
      thumbnails.forEach(({ thumbnailUrl }) => {
        this.pdfProcessor.revokeBlobUrl(thumbnailUrl);
      });
    }
  }

  getNextInsertionIndex() {
    const emptyIndex = this.state.allPageImages.findIndex((url) => !url || url === this.state._blankPageUrl);
    if (emptyIndex !== -1) {
      return emptyIndex;
    }

    return this.state.getFilledPageCount();
  }

  prepareLayoutForTotalPages(totalPages) {
    const requiredPages = Math.max(totalPages, 1);
    this.state.totalPages = requiredPages;
    const requiredLength = this.state.getRequiredPageCapacity();

    if (this.state.allPageImages.length !== requiredLength) {
      const nextImages = new Array(requiredLength).fill(null);
      for (let index = 0; index < Math.min(this.state.allPageImages.length, nextImages.length); index++) {
        nextImages[index] = this.state.allPageImages[index];
      }
      this.state.allPageImages = nextImages;
    }
  }

  async ensureBlankPageUrl() {
    if (this.state._blankPageUrl) {
      return this.state._blankPageUrl;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 1414;
    const context = canvas.getContext('2d');
    context.fillStyle = '#fcfaf5';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = 'rgba(28, 28, 28, 0.08)';
    context.lineWidth = 6;
    context.strokeRect(36, 36, canvas.width - 72, canvas.height - 72);
    context.fillStyle = '#2b2b2b';
    context.font = '700 56px "Space Grotesk", sans-serif';
    context.textAlign = 'center';
    context.fillText('Blank page', canvas.width / 2, canvas.height / 2 - 16);
    context.fillStyle = 'rgba(43, 43, 43, 0.55)';
    context.font = '500 22px "IBM Plex Mono", monospace';
    context.fillText('Ready for the next import', canvas.width / 2, canvas.height / 2 + 40);

    this.state._blankPageUrl = await this.pdfProcessor.canvasToBlob(canvas);
    return this.state._blankPageUrl;
  }

  async fillBlankSlots() {
    const blankUrl = await this.ensureBlankPageUrl();
    const filledPages = this.state.getFilledPageCount();

    // ⚡ Bolt: Replace manual iteration with bulk fill to significantly optimize memory allocation and slot generation during imports.
    if (filledPages < this.state.allPageImages.length) {
      this.state.allPageImages.fill(blankUrl, filledPages);
    }
  }

  clearBlankSlots() {
    for (let index = 0; index < this.state.allPageImages.length; index++) {
      if (this.state.allPageImages[index] === this.state._blankPageUrl) {
        this.state.allPageImages[index] = null;
      }
    }
  }

  revokePreviewAssetUrls() {
    this.previewAssetUrls.forEach((url) => {
      this.pdfProcessor.revokeBlobUrl(url);
    });
    this.previewAssetUrls = [];
  }

  async buildPreviewAsset(sourceUrl, { isFlipped = false, isZoomed = false } = {}) {
    if (!sourceUrl || (!isFlipped && !isZoomed)) {
      return sourceUrl;
    }

    const image = new Image();
    image.src = sourceUrl;
    await image.decode();

    const width = image.naturalWidth || image.width || 1000;
    const height = image.naturalHeight || image.height || 1414;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.save();
    context.translate(width / 2, height / 2);
    if (isFlipped) {
      context.rotate(Math.PI);
    }

    const scale = isZoomed ? 1.1 : 1;
    context.scale(scale, scale);
    context.drawImage(image, -width / 2, -height / 2, width, height);
    context.restore();

    const previewUrl = await this.pdfProcessor.canvasToBlob(canvas);
    this.previewAssetUrls.push(previewUrl);
    return previewUrl;
  }

  getCurrentTemplate() {
    const { rows, cols } = this.state.gridSize;

    if (rows === 2 && cols === 4) {
      return 'mini-8';
    }

    return {
      label: `${rows}x${cols} Layout`,
      grid: { rows, cols },
      layout: Array.from({ length: rows * cols }, (_, index) => ({
        page: index + 1,
        upsideDown: false
      }))
    };
  }

  renderCurrentLayout() {
    const requiredLength = this.state.getRequiredPageCapacity();
    if (this.state.allPageImages.length !== requiredLength) {
      const nextImages = new Array(requiredLength).fill(null);
      for (let index = 0; index < Math.min(this.state.allPageImages.length, nextImages.length); index++) {
        nextImages[index] = this.state.allPageImages[index];
      }
      this.state.allPageImages = nextImages;
    }

    this.ui.generateLayout(requiredLength, this.getCurrentTemplate(), {
      paperSize: this.state.paperSize,
      orientation: this.state.orientation,
      margin: this.state.margin || 0
    });
    for (let index = 0; index < this.state.allPageImages.length; index++) {
      const url = this.state.allPageImages[index];
      this.ui.updatePagePreview(index, url);
      this.ui.setPageFlip(index, !!this.state.pageFlips[index]);
      this.ui.setPageZoom(index, !!this.state.pageZooms[index]);
    }

    this.updateWorkspaceUi();
  }

  updateWorkspaceUi() {
    this.ui.updateWorkspaceState({
      placedCount: this.state.getFilledPageCount(),
      totalSlots: this.state.allPageImages.length,
      rows: this.state.gridSize.rows,
      cols: this.state.gridSize.cols,
      isMiniLayout: this.state.isMiniZineLayout(),
      paperSize: this.state.paperSize,
      orientation: this.state.orientation,
      exported: this.state.workflowExported
    });
  }

  handlePaperSettingsChanged(data) {
    this.state.updatePaperSettings(data);
    this.state.resetWorkflowStatus();
    this.renderCurrentLayout();
  }

  handleGridSizeChanged({ rows, cols }) {
    rows = parseBoundedInteger(rows, {
      min: GRID_DIMENSION_MIN,
      max: GRID_DIMENSION_MAX,
      fallback: 2
    });
    cols = parseBoundedInteger(cols, {
      min: GRID_DIMENSION_MIN,
      max: GRID_DIMENSION_MAX,
      fallback: 4
    });

    this.state.gridSize = { rows, cols };
    this.state.resetWorkflowStatus();

    if (this.state.isMiniZineLayout()) {
      this.state.updatePaperSettings({ orientation: 'landscape' });
      this.ui.syncPaperSettings({ orientation: 'landscape' });
    } else {
      this.ui.toggle3DModal(false);
    }
    this.renderCurrentLayout();
  }

  handlePageFlipped(index) {
    if (!this.state.allPageImages[index]) {
      return;
    }

    const wasFlipped = !!this.state.pageFlips[index];
    this._pushSnapshot(`Page ${index + 1} flip ${wasFlipped ? 'removed' : 'applied'}`);
    this.state.pageFlips[index] = !wasFlipped;
    this.state.resetWorkflowStatus();
    this.ui.setPageFlip(index, this.state.pageFlips[index]);
    this.updateWorkspaceUi();
  }

  handlePageCropToggled(index) {
    if (!this.state.allPageImages[index]) {
      return;
    }

    this.state.pageZooms[index] = !this.state.pageZooms[index];
    this.state.resetWorkflowStatus();
    this.ui.setPageZoom(index, this.state.pageZooms[index]);
    this.updateWorkspaceUi();
  }

  handlePageRemoved(index) {
    const currentUrl = this.state.allPageImages[index];
    if (!currentUrl) {
      return;
    }

    // Defer revocation: keep the blob URL alive in the snapshot so undo can restore it.
    // onPrune fires only when the snapshot is evicted from the undo stack (never restored).
    const urlToRevoke = (currentUrl !== this.state._blankPageUrl) ? currentUrl : null;
    this._pushSnapshot(`Page ${index + 1} removed`, {
      onPrune: () => {
        if (urlToRevoke) { this.pdfProcessor.revokeBlobUrl(urlToRevoke); }
      }
    });

    this.state.allPageImages[index] = null;
    this.state.pageFlips[index] = false;
    this.state.pageZooms[index] = false;
    this.state.totalPages = this.state.getFilledPageCount();
    this.state.resetWorkflowStatus();

    if (this.state.totalPages === 0) {
      this.clearBlankSlots();
    }

    this.renderCurrentLayout();
  }

  handlePagesSwapped({ fromIndex, toIndex }) {
    this._pushSnapshot(`Pages ${fromIndex + 1} and ${toIndex + 1} swapped`);

    const tempImg = this.state.allPageImages[fromIndex];
    this.state.allPageImages[fromIndex] = this.state.allPageImages[toIndex];
    this.state.allPageImages[toIndex] = tempImg;

    const tempFlip = this.state.pageFlips[fromIndex];
    this.state.pageFlips[fromIndex] = this.state.pageFlips[toIndex];
    this.state.pageFlips[toIndex] = tempFlip;

    const tempZoom = this.state.pageZooms[fromIndex];
    this.state.pageZooms[fromIndex] = this.state.pageZooms[toIndex];
    this.state.pageZooms[toIndex] = tempZoom;

    this.state.resetWorkflowStatus();
    this.renderCurrentLayout();
  }

  handleClearAll() {
    const filledCount = this.state.getFilledPageCount();
    if (!filledCount) {
      return;
    }

    this._pushSnapshot('All pages cleared', {
      onPrune: () => {
        this.state.allPageImages.forEach((url) => {
          if (url && url !== this.state._blankPageUrl) {
            this.pdfProcessor.revokeBlobUrl(url);
          }
        });
      }
    });

    for (let index = 0; index < this.state.allPageImages.length; index++) {
      this.state.allPageImages[index] = null;
      this.state.pageFlips[index] = false;
      this.state.pageZooms[index] = false;
    }

    this.state.totalPages = 0;
    this.state.uploadedFiles = [];
    this.state.resetWorkflowStatus();
    this.ui.updateUploadedFilesList([]);
    this.ui.setStatus('Choose files or drop them here');
    this.renderCurrentLayout();
    toast.info('Cleared', 'All pages have been removed.');
  }

  async getZine3DViewerClass() {
    if (!this.zine3dViewerClassPromise) {
      this.zine3dViewerClassPromise = import('../components/Zine3DViewer.js')
        .then((module) => module.Zine3DViewer);
    }

    return this.zine3dViewerClassPromise;
  }

  ensureBookletPreview() {
    if (!this.bookletPreview) {
      this.bookletPreview = new BookletPreview({
        container: this.ui.elements.bookletPreviewContainer,
        prevButton: this.ui.elements.bookletPrevBtn,
        nextButton: this.ui.elements.bookletNextBtn,
        statusElement: this.ui.elements.bookletStatus
      });
    }
  }

  async handleView3d() {
    if (!this.state.getFilledPageCount()) {
      toast.warning('No Content', 'Import pages before opening the fold preview.');
      return;
    }

    if (!this.state.isMiniZineLayout()) {
      toast.warning('Mini-Zine Only', 'Fold preview is available for the 2 × 4 mini-zine layout.');
      return;
    }

    try {
      const blankUrl = await this.ensureBlankPageUrl();
      this.revokePreviewAssetUrls();
      const imageUrls = await Promise.all(this.state.allPageImages.slice(0, 8).map(async (url, index) => {
        const sourceUrl = url || blankUrl;
        const isFlipped = !!this.state.pageFlips[index];
        const isZoomed = !!this.state.pageZooms[index];

        return {
          sourceUrl,
          previewUrl: await this.buildPreviewAsset(sourceUrl, { isFlipped, isZoomed }),
          pageNumber: index + 1,
          isFlipped,
          isZoomed
        };
      }));

      this.ensureBookletPreview();
      this.ui.toggle3DModal(true);
      await new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });

      if (!this.viewer3d) {
        const container = this.ui.elements.zine3dContainer;
        if (container) {
          const Zine3DViewer = await this.getZine3DViewerClass();
          try {
            this.viewer3d = new Zine3DViewer(container);
          } catch (_viewerError) {
            void _viewerError;
            const fallback = container.querySelector('.zine-3d-fallback-canvas');
            if (fallback) {
              fallback.remove();
            }
            this.viewer3d = null;
            this.ui.toggle3DModal(false);
            toast.error('3D Preview Failed', 'Unable to initialize the fold preview.');
            return;
          }
        }
      }

      this.viewer3d?.loadPages(imageUrls);
      this.viewer3d?.refreshLayout?.();
      this.bookletPreview?.loadPages(imageUrls);
      this.ui.setFoldProgressControl(0);
      this.state.markPreviewed();
      this.updateWorkspaceUi();
    } catch (error) {
      toast.error('3D Preview Failed', error.message || 'Unable to load the fold preview.');
    }
  }

  handleFoldProgress(value) {
    this.viewer3d?.setFoldProgress(value);
  }

  async handleExport() {
    if (!this.state.getFilledPageCount()) {
      toast.warning('No Content', 'Import pages before exporting.');
      return;
    }

    this.ui.modal.showProgress(true, 'Generating PDF...');
    this.ui.setExportLoading(true);
    try {
      await this.exportService.handleExport();
      this.state.markExported();
      this.updateWorkspaceUi();
      toast.success('Export Ready', 'Your PDF has been generated.');
    } catch (error) {
      toast.error('Export Failed', error.message);
    } finally {
      this.ui.modal.showProgress(false);
      this.ui.setExportLoading(false);
    }
  }
}
