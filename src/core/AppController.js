import { PDFProcessor } from '../services/PDFProcessor.js';
import { UIManager } from '../components/UI/UIManager.js';
import { StateStore } from './StateStore.js';
import { ExportService } from '../services/ExportService.js';
import { toast } from '../components/Toast.js';
import referenceImageUrl from '../assets/reference-back-side.jpg';
import { classifyFileKind } from '../utils/fileValidation.js';

export class AppController {
  constructor() {
    this.state = new StateStore();
    this.pdfProcessor = new PDFProcessor();
    this.ui = new UIManager();
    this.exportService = new ExportService(this.ui, this.state, this.pdfProcessor);

    this.init();
  }

  async init() {
    try {
      await this.pdfProcessor.initialize();
      this.setupEventListeners();
      this.renderCurrentLayout();
      this.ui.setStatus('Choose files or drop them here');
    } catch (error) {
      toast.error('Initialization Failed', 'Check console for details.');
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }

  setupEventListeners() {
    this.ui.on('fileSelected', (file) => this.handleFileSelected(file));
    this.ui.on('gridSizeChanged', (data) => this.handleGridSizeChanged(data));
    this.ui.on('pageFlipped', (i) => this.handlePageFlipped(i));
    this.ui.on('pageCropToggled', (i) => this.handlePageCropToggled(i));
    this.ui.on('pageRemoved', (i) => this.handlePageRemoved(i));
    this.ui.on('pagesSwapped', (data) => this.handlePagesSwapped(data));
    this.ui.on('print', () => this.exportService.handlePrint(referenceImageUrl));
    this.ui.on('export', () => this.handleExport());
    this.ui.on('paperSizeChanged', (data) => this.state.updatePaperSettings(data));
    this.ui.on('orientationChanged', (data) => this.state.updatePaperSettings(data));
  }

  handleFileSelected(file) {
    const kind = classifyFileKind(file);
    if (!kind) {
      toast.error('Unsupported File', 'Please select a PDF or image file.');
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

    const targetIndex = this.getNextImageInsertionIndex();
    const currentFilledPages = this.state.getFilledPageCount();

    this.prepareLayoutForTotalPages(Math.max(currentFilledPages, targetIndex + 1));

    const existingUrl = this.state.allPageImages[targetIndex];
    const canvas = await this.pdfProcessor.renderImageFile(record.file);
    const imageUrl = await this.pdfProcessor.canvasToBlob(canvas);

    if (existingUrl) {
      this.pdfProcessor.revokeBlobUrl(existingUrl);
    }

    this.state.allPageImages[targetIndex] = imageUrl;
    this.state.totalPages = this.state.getFilledPageCount();
    this.ui.updatePagePreview(targetIndex, imageUrl);

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
    this.ui.modal.updateProgress(0);

    for (const [selectedIndex, pageNumber] of selectedPages.entries()) {
      const targetIndex = startIndex + selectedIndex;
      const canvas = await this.pdfProcessor.renderPage(pageNumber);
      const pageUrl = await this.pdfProcessor.canvasToBlob(canvas);
      const existingUrl = this.state.allPageImages[targetIndex];

      if (existingUrl) {
        this.pdfProcessor.revokeBlobUrl(existingUrl);
      }

      this.state.allPageImages[targetIndex] = pageUrl;
      this.ui.updatePagePreview(targetIndex, pageUrl);

      const percent = Math.round(((selectedIndex + 1) / selectedPages.length) * 100);
      this.ui.modal.setProgressCopy('Rendering pages...', `${percent}%`);
      this.ui.modal.updateProgress(percent);
    }

    this.state.totalPages = this.state.getFilledPageCount();

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
      for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
        const canvas = await this.pdfProcessor.renderPageThumbnail(pageNumber);
        const thumbnailUrl = await this.pdfProcessor.canvasToBlob(canvas);
        thumbnails.push({ pageNumber, thumbnailUrl });

        const percent = Math.round((pageNumber / numPages) * 100);
        this.ui.modal.setProgressCopy('Preparing page picker...', `${percent}%`);
        this.ui.modal.updateProgress(percent);
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

  getNextImageInsertionIndex() {
    const emptyIndex = this.state.allPageImages.findIndex((url) => !url);
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

    this.renderCurrentLayout();
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

    this.ui.generateLayout(requiredLength, this.getCurrentTemplate());
    this.state.allPageImages.forEach((url, index) => this.ui.updatePagePreview(index, url));

    for (let index = 0; index < this.state.allPageImages.length; index++) {
      this.ui.setPageFlip(index, !!this.state.pageFlips[index]);
      this.ui.setPageZoom(index, !!this.state.pageZooms[index]);
    }
  }

  handleGridSizeChanged({ rows, cols }) {
    this.state.gridSize = { rows, cols };
    this.renderCurrentLayout();
  }

  handlePageFlipped(i) {
    this.state.pageFlips[i] = !this.state.pageFlips[i];
    this.ui.setPageFlip(i, this.state.pageFlips[i]);
  }

  handlePageCropToggled(i) {
    this.state.pageZooms[i] = !this.state.pageZooms[i];
    this.ui.setPageZoom(i, this.state.pageZooms[i]);
  }

  handlePageRemoved(i) {
    if (this.state.allPageImages[i]) {
      this.pdfProcessor.revokeBlobUrl(this.state.allPageImages[i]);
      this.state.allPageImages[i] = null;
      this.state.totalPages = this.state.getFilledPageCount();
      this.ui.updatePagePreview(i, null);
    }
  }

  handlePagesSwapped({ fromIndex, toIndex }) {
    const tempImg = this.state.allPageImages[fromIndex];
    this.state.allPageImages[fromIndex] = this.state.allPageImages[toIndex];
    this.state.allPageImages[toIndex] = tempImg;

    this.ui.updatePagePreview(fromIndex, this.state.allPageImages[fromIndex]);
    this.ui.updatePagePreview(toIndex, this.state.allPageImages[toIndex]);
  }

  async handleExport() {
    this.ui.modal.showProgress(true, 'Generating PDF...');
    try {
      await this.exportService.handleExport(referenceImageUrl);
      toast.success('Export Ready', 'Your PDF has been generated.');
    } catch (error) {
      toast.error('Export Failed', error.message);
    } finally {
      this.ui.modal.showProgress(false);
    }
  }
}
