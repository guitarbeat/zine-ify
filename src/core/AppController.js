import { PDFProcessor } from '../services/PDFProcessor.js';
import { UIManager } from '../components/UI/UIManager.js'; // I'll rename Manager.js to UIManager.js too
import { StateStore } from './StateStore.js';
import { ExportService } from '../services/ExportService.js';
import { toast } from '../components/Toast.js';
import referenceImageUrl from '../assets/reference-back-side.jpg';

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
      this.ui.generateLayout(8, 'mini-8');
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

  async handleFileSelected(file) {
    this.ui.modal.showProgress(true, `Reading ${file.name}...`);
    try {
      const result = await this.pdfProcessor.loadPDF(file, (progress) => {
        this.ui.modal.updateProgress(progress);
      });
      
      const selectionLimit = this.state.gridSize.rows * this.state.gridSize.cols;

      // Sliding window concurrency for thumbnail processing
      const CONCURRENCY_LIMIT = 4;
      const activePromises = new Set();
      const thumbnails = [];

      for (let i = 1; i <= result.numPages; i++) {
        const promise = (async () => {
          const canvas = await this.pdfProcessor.renderPageThumbnail(i);
          const url = await this.pdfProcessor.canvasToBlob(canvas);
          return { pageNumber: i, thumbnailUrl: url };
        })();

        activePromises.add(promise);

        promise.then((thumb) => {
          activePromises.delete(promise);
          thumbnails.push(thumb);
        });

        if (activePromises.size >= CONCURRENCY_LIMIT) {
          await Promise.race(activePromises);
        }
      }

      await Promise.all(activePromises);

      // Sort thumbnails to maintain correct page order
      thumbnails.sort((a, b) => a.pageNumber - b.pageNumber);

      const selectedPages = await this.ui.modal.showPagePicker({
        fileName: file.name,
        totalPages: result.numPages,
        selectionLimit,
        thumbnails
      });

      if (selectedPages?.length > 0) {
        await this.importPages(selectedPages);
      }
    } catch (error) {
      toast.error('Import Failed', error.message);
    } finally {
      this.ui.modal.showProgress(false);
    }
  }

  async importPages(pageNumbers) {
    this.ui.modal.showProgress(true, 'Rendering pages...');

    // Sliding window concurrency for page import processing
    const CONCURRENCY_LIMIT = 4;
    const activePromises = new Set();

    for (const [idx, pageNum] of pageNumbers.entries()) {
      const promise = (async () => {
        const canvas = await this.pdfProcessor.renderPage(pageNum);
        const url = await this.pdfProcessor.canvasToBlob(canvas);
        this.state.allPageImages[idx] = url;
        this.ui.updatePagePreview(idx, url);
      })();

      activePromises.add(promise);
      promise.finally(() => activePromises.delete(promise));

      if (activePromises.size >= CONCURRENCY_LIMIT) {
        await Promise.race(activePromises);
      }
    }

    await Promise.all(activePromises);

    this.ui.modal.showProgress(false);
    toast.success('Import Complete', `${pageNumbers.length} pages added.`);
  }

  handleGridSizeChanged({ rows, cols }) {
    this.state.gridSize = { rows, cols };
    this.ui.generateLayout(this.state.getRequiredPageCapacity());
    this.state.allPageImages.forEach((url, i) => this.ui.updatePagePreview(i, url));
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
