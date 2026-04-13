import mitt from 'mitt';
import { PAPER_SIZES, ZINE_TEMPLATES } from '../../utils/config.js';
import { toast } from '../Toast.js';
import { debounce, formatFileSize } from '../../utils/helpers.js';
import { getFileTypeLabel } from '../../utils/fileValidation.js';
import { ModalManager } from './ModalManager.js';
import { DragAndDropHandler } from './DragAndDropHandler.js';
import { LayoutRenderer } from './LayoutRenderer.js';

const PAGE_CELL_TEMPLATE = document.createElement('template');
PAGE_CELL_TEMPLATE.innerHTML = `
  <span class="page-label"></span>
  <div class="page-toolbar absolute top-1 right-1 flex flex-wrap justify-end gap-1 z-10 max-w-[calc(100%-0.5rem)] transition-opacity duration-200 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
     <button class="zoom-btn w-7 h-7 bg-white border-2 border-black text-black flex items-center justify-center transition-all duration-100 focus:outline-none hover:bg-[var(--primary-vibrant)] hover:text-white" style="box-shadow: 2px 2px 0px 0px black;" title="Quick Preview (Z)">
          <span class="material-symbols-outlined text-[16px]" aria-hidden="true">zoom_in</span>
     </button>
     <button class="crop-btn w-7 h-7 bg-white border-2 border-black text-black flex items-center justify-center transition-all duration-100 focus:outline-none hover:bg-[var(--primary-vibrant)] hover:text-white" style="box-shadow: 2px 2px 0px 0px black;" title="Toggle Crop/Zoom (C)">
          <span class="material-symbols-outlined text-[16px]" aria-hidden="true">crop_free</span>
     </button>
     <button class="flip-btn w-7 h-7 bg-white border-2 border-black text-black flex items-center justify-center transition-all duration-100 focus:outline-none hover:bg-[var(--primary-vibrant)] hover:text-white" style="box-shadow: 2px 2px 0px 0px black;" title="Flip 180° (R)">
          <span class="material-symbols-outlined text-[16px]" aria-hidden="true">rotate_right</span>
     </button>
     <button class="remove-btn w-7 h-7 bg-white border-2 border-black text-black flex items-center justify-center transition-all duration-100 focus:outline-none hover:bg-red-600 hover:text-white" style="box-shadow: 2px 2px 0px 0px black;" title="Remove Page (Backspace)">
          <span class="material-symbols-outlined text-[16px]" aria-hidden="true">close</span>
     </button>
  </div>
  <div class="page-placeholder flex flex-col items-center justify-center text-gray-400 gap-2 absolute inset-0">
     <span class="material-symbols-outlined text-3xl">note_stack</span>
     <span class="text-[10px] font-bold uppercase tracking-widest">Empty</span>
  </div>
  <img class="page-content-img w-full h-full object-contain hidden transition-transform duration-200 ease-in-out relative z-[5]" draggable="false" />
`;

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
      if (files.length > 0) this.emitter.emit('fileSelected', files[0]);
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
    if (this.activePageIndex === null) return;
    if (e.key === 'r' || e.key === 'R') this.emitter.emit('pageFlipped', this.activePageIndex);
    if (e.key === 'z' || e.key === 'Z') this.emitter.emit('pageZoomed', this.activePageIndex);
    if (e.key === 'c' || e.key === 'C') this.emitter.emit('pageCropToggled', this.activePageIndex);
    if (e.key === 'Backspace' || e.key === 'Delete') this.emitter.emit('pageRemoved', this.activePageIndex);
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
    if (!cell) return;
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
