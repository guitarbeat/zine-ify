import mitt from 'mitt';
import {
  GRID_DIMENSION_MAX,
  GRID_DIMENSION_MIN,
  PAPER_SIZES,
  ZINE_TEMPLATES
} from '../../utils/config.js';
import { debounce, formatFileSize, parseBoundedInteger } from '../../utils/helpers.js';
import {
  MAX_UPLOAD_FILES,
  MIXED_UPLOAD_WARNING,
  SUPPORTED_UPLOAD_MESSAGE,
  UNSUPPORTED_UPLOAD_TITLE,
  getFileTypeLabel,
  partitionSupportedFiles
} from '../../utils/fileValidation.js';
import { toast } from '../Toast.js';

import { ModalManager } from './ModalManager.js';
import { DragAndDropHandler } from './DragAndDropHandler.js';
import { LayoutRenderer } from './LayoutRenderer.js';
import { PAGE_CELL_TEMPLATE } from './Templates.js';

const FOLD_STAGES = [
  {
    threshold: 2.75,
    label: 'Booklet',
    helper: 'Flatten the stack and check the final reading order.'
  },
  {
    threshold: 1.75,
    label: 'Diamond Open',
    helper: 'Open the slit into a diamond before collapsing the pages flat.'
  },
  {
    threshold: 0.75,
    label: 'Folded Strip',
    helper: 'Fold the sheet into a strip so the center slit lines up cleanly.'
  },
  {
    threshold: -Infinity,
    label: 'Flat',
    helper: 'Start with the sheet open, print facing down, and the center slit cut.'
  }
];

const DEFAULT_GRID_ROWS = 2;
const DEFAULT_GRID_COLS = 4;

export class UIManager {
  constructor() {
    this.emitter = mitt();
    this.elements = {};
    this.pageNumbersVisible = true;
    this.activePageIndex = null;

    this.init();
  }

  init() {
    this._pageCellsCache = null;
    this.cacheElements();
    this.modal = new ModalManager(this.elements, this.emitter);
    this.dnd = new DragAndDropHandler(this.elements, this.emitter);
    this.renderer = new LayoutRenderer(this.elements.zineSheetsContainer, PAGE_CELL_TEMPLATE);

    this.renderPaperSizeOptions();
    this.syncPaperSettings({ paperSize: 'letter', orientation: 'portrait' });
    const { rows, cols } = this.normalizeGridInputs();
    this.updateGridTotalBadge(rows, cols);
    this.setupEventListeners();
    this.syncResponsiveUI();

    const savedControls = localStorage.getItem('zine-page-controls');
    const showControls = savedControls !== 'false';
    if (this.elements.pageControlsCheckbox) {
      this.elements.pageControlsCheckbox.checked = showControls;
    }
    this._applyPageControlsVisibility(showControls);
  }

  on(event, handler) {
    this.emitter.on(event, handler);
  }

  off(event, handler) {
    this.emitter.off(event, handler);
  }

  setStatus(message, tone = 'info') {
    if (this.elements.uploadStatus) {
      this.elements.uploadStatus.textContent = message;
      this.elements.uploadStatus.dataset.tone = tone;
    }
  }

  updateUploadedFilesList(files) {
    if (!this.elements.uploadedFilesList) {
      return;
    }

    this.elements.uploadedFilesList.innerHTML = files.map((file) => `<li>${file.name}</li>`).join('');
  }

  updatePagePreview(index, url) {
    const cell = this._getAllPageCells()[index];
    if (!cell) {
      return;
    }

    const img = cell.querySelector('.page-content-img');
    const placeholder = cell.querySelector('.page-placeholder');
    if (img) {
      img.src = url || '';
      img.classList.toggle('hidden', !url);
    }
    if (placeholder) {
      placeholder.classList.toggle('hidden', !!url);
    }
    cell.classList.toggle('has-page', !!url);
  }

  setPageFlip(index, enabled) {
    const cell = this._getAllPageCells()[index];
    cell?.classList.toggle('is-flipped', !!enabled);
  }

  setPageZoom(index, enabled) {
    const cell = this._getAllPageCells()[index];
    cell?.classList.toggle('page-zoomed', !!enabled);
  }

  toggle3DModal(show) {
    this.modal.toggle3DModal(show);
  }

  setFoldProgressControl(value) {
    if (this.elements.foldSlider) {
      this.elements.foldSlider.value = value;
    }
  }

  toggleMobileRail(show) {
    this.elements.previewArea?.classList.toggle('mobile-rail-open', !!show);
  }

  triggerFileUpload() {
    this.elements.pdfUpload?.click();
  }

  handleIncomingFiles(files) {
    this.emitter.emit('fileSelected', files?.[0] || null);
  }

  updateWorkspaceState() {}

  setPageTitle() {}

  setPageCount() {}

  setPageStatus() {}

  setPageOrder() {}

  renderPaperSizeOptions() {
    if (!this.elements.paperSizeSelect) {
      return;
    }

    this.elements.paperSizeSelect.innerHTML = Object.entries(PAPER_SIZES)
      .map(([key, paper]) => `<option value="${key}">${paper.label}</option>`)
      .join('');
  }

  bindAppController(controller) {
    this.controller = controller;
  }

  syncPaperSettings({ paperSize, orientation } = {}) {
    if (paperSize && this.elements.paperSizeSelect) {
      this.elements.paperSizeSelect.value = paperSize;
    }

    if (orientation && this.elements.orientationToggle) {
      this.elements.orientationToggle.querySelectorAll('.orientation-seg-btn').forEach((btn) => {
        const isActive = btn.dataset.value === orientation;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
      });
    }
  }

  normalizeGridInputs() {
    const rows = parseBoundedInteger(this.elements.gridRows?.value, DEFAULT_GRID_ROWS, GRID_DIMENSION_MIN, GRID_DIMENSION_MAX);
    const cols = parseBoundedInteger(this.elements.gridCols?.value, DEFAULT_GRID_COLS, GRID_DIMENSION_MIN, GRID_DIMENSION_MAX);
    if (this.elements.gridRows) this.elements.gridRows.value = rows;
    if (this.elements.gridCols) this.elements.gridCols.value = cols;
    return { rows, cols };
  }

  updateGridTotalBadge(rows, cols) {
    if (this.elements.gridTotal) {
      this.elements.gridTotal.textContent = `${rows * cols} slots`;
    }
  }

  syncResponsiveUI() {
    const isMobile = window.matchMedia('(max-width: 900px)').matches;
    this.elements.previewArea?.classList.toggle('is-mobile', isMobile);
    this.elements.previewArea?.classList.toggle('mobile-rail-open', isMobile);
  }

  _getAllPageCells() {
    return Array.from(this.elements.zineSheetsContainer?.querySelectorAll('.page-cell') || []);
  }

  getPaperDimensions(paperSizeKey, orientation) {
    const paper = PAPER_SIZES[paperSizeKey] || PAPER_SIZES.letter;
    const landscape = orientation === 'landscape';
    return landscape
      ? { width: paper.width, height: paper.height }
      : { width: paper.height, height: paper.width };
  }

  _applyPageControlsVisibility(show) {
    this.elements.previewArea?.classList.toggle('hide-page-controls', !show);
    localStorage.setItem('zine-page-controls', String(show));
  }

  cacheElements() {
    const $ = (selector) => document.querySelector(selector);

    this.elements = {
      uploadZone: $('#upload-zone'),
      uploadStatus: $('#upload-status'),
      uploadedFilesList: $('#uploaded-files-list'),
      previewArea: $('#preview-area'),
      zineSheetsContainer: $('#zine-sheets-container'),
      paperSizeSelect: $('#paper-size-select'),
      orientationToggle: $('#orientation-toggle'),
      pageNumbersCheckbox: $('#show-page-numbers'),
      pageControlsCheckbox: $('#show-page-controls'),
      gridRows: $('#grid-rows'),
      gridCols: $('#grid-cols'),
      gridTotal: $('#grid-total'),
      printBtn: $('#printBtn'),
      printBtnLabel: $('#printBtnLabel'),
      exportPdfBtn: $('#exportPdfBtn'),
      exportPdfBtnLabel: $('#exportPdfBtnLabel'),
      view3dBtn: $('#view3dBtn'),
      view3dBtnLabel: $('#view3dBtnLabel'),
      pdfUpload: $('#pdf-upload'),
      progressContainer: $('#progress-container'),
      progressBarWrap: $('#progress-bar-wrap'),
      progressFill: $('#progress-fill'),
      progressText: $('#progress-text'),
      progressSubtext: $('#progress-subtext'),
      zine3dModal: $('#zine-3d-modal'),
      zine3dContainer: $('#zine-3d-container'),
      close3dBtn: $('#close-3d-btn'),
      foldSlider: $('#fold-slider'),
      foldStatus: $('#fold-status'),
      foldHelper: $('#fold-helper'),
      foldStepButtons: document.querySelectorAll('.fold-step-btn'),
      pagePickerGrid: $('#page-picker-grid'),
      pagePickerSearch: $('#page-picker-search'),
      pagePickerSelectAll: $('#page-picker-select-all'),
      pagePickerClearAll: $('#page-picker-clear-all'),
      pagePickerCount: $('#page-picker-count'),
      pagePickerPreview: $('#page-picker-preview'),
      pagePickerDialog: $('#page-picker-dialog'),
      pagePickerClose: $('#page-picker-close')
    };
  }

  setupEventListeners() {
    this.elements.paperSizeSelect?.addEventListener('change', (event) => {
      this.emitter.emit('paperSizeChanged', { paperSize: event.target.value });
    });

    this.elements.orientationToggle?.querySelectorAll('.orientation-seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const value = btn.dataset.value;
        this.elements.orientationToggle.querySelectorAll('.orientation-seg-btn').forEach((b) => {
          b.classList.toggle('is-active', b === btn);
          b.setAttribute('aria-pressed', String(b === btn));
        });
        this.emitter.emit('orientationChanged', { orientation: value });
      });
    });

    this.elements.gridRows?.closest('.workspace-config-split')?.querySelectorAll('.stepper-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = document.getElementById(btn.dataset.target);
        if (!target) return;
        const min = parseInt(target.min, 10) || 1;
        const max = parseInt(target.max, 10) || 10;
        const delta = parseInt(btn.dataset.delta, 10);
        const next = Math.min(max, Math.max(min, parseInt(target.value, 10) + delta));
        target.value = next;
        target.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });

    this.elements.pageNumbersCheckbox?.addEventListener('change', (event) => {
      this.pageNumbersVisible = event.target.checked;
      this.emitter.emit('pageNumbersToggled', this.pageNumbersVisible);
    });

    this.elements.pageControlsCheckbox?.addEventListener('change', (event) => {
      this._applyPageControlsVisibility(event.target.checked);
    });

    this.elements.printBtn?.addEventListener('click', () => this.emitter.emit('print'));
    this.elements.exportPdfBtn?.addEventListener('click', () => this.emitter.emit('export'));
    this.elements.view3dBtn?.addEventListener('click', () => this.emitter.emit('view3d'));

    this.elements.uploadZone?.addEventListener('click', () => this.triggerFileUpload());
    this.elements.uploadZone?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.triggerFileUpload();
      }
    });

    this.elements.openRailSheetBtn?.addEventListener('click', () => this.toggleMobileRail(true));
    this.elements.closeRailSheetBtn?.addEventListener('click', () => this.toggleMobileRail(false));
    this.elements.mobileRailOverlay?.addEventListener('click', () => this.toggleMobileRail(false));
    this.elements.close3dBtn?.addEventListener('click', () => this.toggle3DModal(false));

    this.elements.foldSlider?.addEventListener('input', (event) => {
      const value = parseFloat(event.target.value || '0');
      this.setFoldProgressControl(value);
      this.emitter.emit('foldProgress', value);
    });

    this.elements.foldStepButtons?.forEach((button) => {
      button.addEventListener('click', () => {
        const value = parseFloat(button.dataset.foldValue || '0');
        this.setFoldProgressControl(value);
        this.emitter.emit('foldProgress', value);
      });
    });

    this.dnd.setupEventListeners();
    this.emitter.on('filesDropped', (files) => this.handleIncomingFiles(files));

    this.elements.pdfUpload?.addEventListener('change', (event) => {
      const files = Array.from(event.target.files || []);
      this.handleIncomingFiles(files);
      event.target.value = '';
    });

    const debouncedGridChange = debounce(() => {
      const { rows, cols } = this.normalizeGridInputs();

      this.updateGridTotalBadge(rows, cols);
      this.emitter.emit('gridSizeChanged', { rows, cols });
    }, 300);

    this.elements.gridRows?.addEventListener('input', debouncedGridChange);
    this.elements.gridCols?.addEventListener('input', debouncedGridChange);

    window.addEventListener('resize', () => this.syncResponsiveUI());
  }

  generateLayout(numPages, templateType, paperSettings = {}) {
    const template = typeof templateType === 'string'
      ? ZINE_TEMPLATES[templateType || 'mini-8']
      : (templateType || ZINE_TEMPLATES['mini-8']);

    const handlers = {
      onDragStart: (event, cell) => this.dnd.handleDragStart(event, cell),
      onDragOver: (event, cell) => this.dnd.handleDragOver(event, cell),
      onDragLeave: (cell) => this.dnd.handleDragLeave(cell),
      onDrop: (event, cell) => this.dnd.handleDrop(event, cell),
      onDragEnd: (cell) => this.dnd.handleDragEnd(cell),
      onClick: (_, index) => {
        this.activePageIndex = index;
        this._getAllPageCells().forEach((cell) => {
          if (cell) {
             const cellIndex = Number.parseInt(cell.getAttribute('data-page-index'), 10);
             cell.classList.toggle('active', cellIndex === index);
          }
        });
        const imageUrl = this.getImgUrl(index);
        if (imageUrl) {
          this.modal.showZoomModal(imageUrl);
        }
      },
      onFlip: (index) => this.emitter.emit('pageFlipped', index),
      onCrop: (index) => this.emitter.emit('pageCropToggled', index),
      onRemove: (index) => this.emitter.emit('pageRemoved', index)
    };

    const dimensions = this.getPaperDimensions(
      paperSettings.paperSize || 'letter',
      paperSettings.orientation || 'landscape'
    );

    this.renderer.render(
      numPages,
      template,
      { pageNumbersVisible: this.pageNumbersVisible },
      handlers,
      dimensions
    );
  }
}
