import mitt from 'mitt';
import { PAPER_SIZES, ZINE_TEMPLATES } from '../../utils/config.js';
import { debounce } from '../../utils/helpers.js';

import { ModalManager } from './ModalManager.js';
import { DragAndDropHandler } from './DragAndDropHandler.js';
import { LayoutRenderer } from './LayoutRenderer.js';
import { PAGE_CELL_TEMPLATE } from './Templates.js';


export class UIManager {
  constructor() {
    this.emitter = mitt();
    this.elements = {};
    this.pageNumbersVisible = true;
    this.activePageIndex = null;
    
    this.init();
  }

  init() {
    this.cacheElements();
    this.modal = new ModalManager(this.elements, this.emitter);
    this.dnd = new DragAndDropHandler(this.elements, this.emitter);
    this.renderer = new LayoutRenderer(this.elements.zineSheetsContainer, PAGE_CELL_TEMPLATE);
    
    this.renderPaperSizeOptions();
    this.setupEventListeners();
  }

  cacheElements() {
    const $ = (s) => document.querySelector(s);
    this.elements = {
      uploadZone: $('#upload-zone'),
      previewArea: $('#preview-area'),
      zineSheetsContainer: $('#zine-sheets-container'),
      paperSizeSelect: $('#paper-size-select'),
      orientationSelect: $('#orientation-select'),
      pageNumbersCheckbox: $('#show-page-numbers'),
      gridRows: $('#grid-rows'),
      gridCols: $('#grid-cols'),
      gridTotal: $('#grid-total'),
      printBtn: $('#printBtn'),
      exportPdfBtn: $('#exportPdfBtn'),
      view3dBtn: $('#view3dBtn'),
      pdfUpload: $('#pdf-upload'),
      progressContainer: $('#progress-container'),
      progressFill: $('#progress-fill'),
      progressText: $('#progress-text'),
      progressSubtext: $('#progress-subtext'),
      zine3dModal: $('#zine-3d-modal'),
      foldSlider: $('#fold-slider'),
      foldStatus: $('#fold-status'),
      foldHelper: $('#fold-helper'),
      pagePickerModal: $('#page-picker-modal'),
      pagePickerGrid: $('#page-picker-grid'),
      pagePickerCount: $('#page-picker-count')
    };
  }

  renderPaperSizeOptions() {
    if (this.elements.paperSizeSelect) {
      this.elements.paperSizeSelect.innerHTML = Object.entries(PAPER_SIZES)
        .map(([id, data]) => `<option value="${id}">${data.label}</option>`)
        .join('');
    }
  }

  setupEventListeners() {
    this.elements.paperSizeSelect?.addEventListener('change', (e) => this.emitter.emit('paperSizeChanged', { paperSize: e.target.value }));
    this.elements.orientationSelect?.addEventListener('change', (e) => this.emitter.emit('orientationChanged', { orientation: e.target.value }));
    this.elements.pageNumbersCheckbox?.addEventListener('change', (e) => {
      this.pageNumbersVisible = e.target.checked;
      this.emitter.emit('pageNumbersToggled', this.pageNumbersVisible);
    });
    
    this.elements.printBtn?.addEventListener('click', () => this.emitter.emit('print'));
    this.elements.exportPdfBtn?.addEventListener('click', () => this.emitter.emit('export'));
    this.elements.view3dBtn?.addEventListener('click', () => this.emitter.emit('view3d'));

    this.elements.uploadZone?.addEventListener('click', () => this.elements.pdfUpload?.click());
    this.dnd.setupEventListeners();
    this.emitter.on('filesDropped', (files) => this.emitter.emit('fileSelected', files[0])); // Simple handling for now

    this.elements.pdfUpload?.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        this.emitter.emit('fileSelected', files[0]);
      }
      e.target.value = '';
    });

    const debouncedGridChange = debounce(() => {
      const rows = parseInt(this.elements.gridRows.value);
      const cols = parseInt(this.elements.gridCols.value);
      this.emitter.emit('gridSizeChanged', { rows, cols });
    }, 300);

    this.elements.gridRows?.addEventListener('input', debouncedGridChange);
    this.elements.gridCols?.addEventListener('input', debouncedGridChange);

    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
  }

  handleKeyboard(e) {
    if (this.activePageIndex === null) {
      return;
    }
    if (e.key === 'r' || e.key === 'R') {
      this.emitter.emit('pageFlipped', this.activePageIndex);
    }
    if (e.key === 'z' || e.key === 'Z') {
      this.emitter.emit('pageZoomed', this.activePageIndex);
    }
    if (e.key === 'c' || e.key === 'C') {
      this.emitter.emit('pageCropToggled', this.activePageIndex);
    }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      this.emitter.emit('pageRemoved', this.activePageIndex);
    }
  }

  on(event, handler) { this.emitter.on(event, handler); }

  generateLayout(numPages, templateType) {
    const template = ZINE_TEMPLATES[templateType || 'mini-8'];
    const handlers = {
      onDragStart: (e, cell) => this.dnd.handleDragStart(e, cell),
      onDragOver: (e, cell) => this.dnd.handleDragOver(e, cell),
      onDragLeave: (cell) => this.dnd.handleDragLeave(cell),
      onDrop: (e, cell) => this.dnd.handleDrop(e, cell),
      onDragEnd: (cell) => this.dnd.handleDragEnd(cell),
      onClick: (e, i) => { this.activePageIndex = i; document.querySelectorAll('.page-cell').forEach((c, idx) => c.classList.toggle('active', idx === i)); },
      onFlip: (i) => this.emitter.emit('pageFlipped', i),
      onZoom: (i) => this.modal.showZoomModal(this.getImgUrl(i)),
      onCrop: (i) => this.emitter.emit('pageCropToggled', i),
      onRemove: (i) => this.emitter.emit('pageRemoved', i)
    };
    this.renderer.render(numPages, template, { pageNumbersVisible: this.pageNumbersVisible }, handlers);
  }

  getImgUrl(i) {
    // This will need adjustment once StateStore is fully integrated
    return document.querySelectorAll('.page-cell')[i]?.querySelector('img')?.src;
  }

  updatePagePreview(index, url) {
    const cell = document.querySelector(`.page-cell[data-page-index="${index}"]`);
    if (!cell) {
      return;
    }
    const img = cell.querySelector('.page-content-img');
    const placeholder = cell.querySelector('.page-placeholder');
    if (url) {
      img.src = url;
      img.classList.remove('hidden');
      placeholder.classList.add('hidden');
      cell.classList.add('has-page');
    } else {
      img.src = '';
      img.classList.add('hidden');
      placeholder.classList.remove('hidden');
      cell.classList.remove('has-page');
    }
  }

  setPageFlip(index, flipped) {
    const cell = document.querySelector(`.page-cell[data-page-index="${index}"]`);
    cell?.classList.toggle('is-flipped', flipped);
  }

  setPageZoom(index, zoomed) {
    const cell = document.querySelector(`.page-cell[data-page-index="${index}"]`);
    cell?.classList.toggle('page-zoomed', zoomed);
  }

  hasContent() {
    return !!document.querySelector('.page-cell.has-page');
  }

  getPaperDimensions(size, orientation) {
    const s = PAPER_SIZES[size || 'letter'];
    return orientation === 'landscape' ? { width: s.height, height: s.width } : { width: s.width, height: s.height };
  }
}
