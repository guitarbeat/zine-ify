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
    helper: 'Collapse the four sections together so your cover page is outermost. No stapling needed — the single cut holds everything together.'
  },
  {
    threshold: 1.75,
    label: 'Diamond Open',
    helper: 'Push both short ends inward — the center slit opens into a diamond or cross shape. Keep pushing until all four page sections meet.'
  },
  {
    threshold: 0.75,
    label: 'Folded Strip',
    helper: 'Fold in half along the long axis, pages facing out. Cut through both layers along the center crease, only between the quarter-fold marks.'
  },
  {
    threshold: -Infinity,
    label: 'Flat',
    helper: 'Print the layout, then crease the sheet in half both ways and open flat. Make two more creases to divide the long direction into quarters.'
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
    this.syncPaperSettings({ paperSize: 'letter', orientation: 'landscape' });
    const { rows, cols } = this.normalizeGridInputs();
    this.updateGridTotalBadge(rows, cols);
    this._syncOrientationVisibility(rows, cols);
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
    const container = this.elements.uploadedFilesList;
    if (!container) {
      return;
    }

    // Toggle visibility based on whether we have files
    container.classList.toggle('hidden', files.length === 0);

    // Clear existing list
    container.innerHTML = '';

    // Rebuild the list securely using programmatic DOM creation
    files.forEach((file) => {
      const item = document.createElement('div');
      item.className = 'uploaded-file-item flex items-center justify-between p-2 bg-white border border-black rounded mb-2';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'file-name-display truncate';
      nameSpan.textContent = file.name;

      item.appendChild(nameSpan);
      container.appendChild(item);
    });
  }

  updatePagePreview(index, url) {
    const cell = this._getPageCell(index);
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
    const cell = this._getPageCell(index);
    cell?.classList.toggle('is-flipped', !!enabled);
  }

  setPageZoom(index, enabled) {
    const cell = this._getPageCell(index);
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
    if (!files?.length) return;
    files.forEach((file) => this.emitter.emit('fileSelected', file));
  }

  updateWorkspaceState({ placedCount = 0 } = {}) {
    const hasPagesLoaded = placedCount > 0;
    if (this.elements.clearAllBtn) {
      this.elements.clearAllBtn.style.display = hasPagesLoaded ? '' : 'none';
    }
  }

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

  _syncOrientationVisibility(rows, cols) {
    const isMini8 = rows === 2 && cols === 4;
    const wrapper = this.elements.orientationToggle?.closest('.workspace-config-field');
    if (wrapper) {
      wrapper.style.display = isMini8 ? 'none' : '';
    }
    // Also hide the label row sibling if needed
    const labelEl = document.getElementById('orientation-label');
    if (labelEl) {
      labelEl.closest('.workspace-config-field') && (labelEl.closest('.workspace-config-field').style.display = isMini8 ? 'none' : '');
    }
  }

  normalizeGridInputs() {
    const rows = parseBoundedInteger(this.elements.gridRows?.value, { min: GRID_DIMENSION_MIN, max: GRID_DIMENSION_MAX, fallback: DEFAULT_GRID_ROWS });
    const cols = parseBoundedInteger(this.elements.gridCols?.value, { min: GRID_DIMENSION_MIN, max: GRID_DIMENSION_MAX, fallback: DEFAULT_GRID_COLS });
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

  _getPageCell(index) {
    return this.elements.zineSheetsContainer?.querySelector(`[data-page-index="${index}"]`) || null;
  }

  getPaperDimensions(paperSizeKey, orientation) {
    const paper = PAPER_SIZES[paperSizeKey] || PAPER_SIZES.letter;
    const landscape = orientation === 'landscape';
    return landscape
      ? { width: paper.height, height: paper.width }
      : { width: paper.width, height: paper.height };
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
      marginInput: $('#margin-input'),
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
      pagePickerClose: $('#page-picker-close'),
      pagePickerModal: $('#page-picker-modal'),
      pagePickerBackdrop: $('#page-picker-backdrop'),
      pagePickerCancel: $('#page-picker-cancel'),
      pagePickerConfirm: $('#page-picker-confirm'),
      pagePickerSubtitle: $('#page-picker-subtitle'),
      pagePickerSelectFirst: $('#page-picker-select-first'),
      pagePickerSelectLast: $('#page-picker-select-last'),
      pagePickerSelectEven: $('#page-picker-select-even'),
      pagePickerSelectOdd: $('#page-picker-select-odd'),
      pagePickerClear: $('#page-picker-clear'),
      bookletPreviewContainer: $('#booklet-preview-container'),
      bookletPrevBtn: $('#booklet-prev-btn'),
      bookletNextBtn: $('#booklet-next-btn'),
      bookletStatus: $('#booklet-status'),
      clearAllBtn: $('#clear-all-btn')
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

    this.elements.marginInput?.closest('.stepper')?.querySelectorAll('.stepper-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const min = parseInt(this.elements.marginInput.min, 10) || 0;
        const max = parseInt(this.elements.marginInput.max, 10) || 25;
        const delta = parseInt(btn.dataset.delta, 10);
        const next = Math.min(max, Math.max(min, parseInt(this.elements.marginInput.value, 10) + delta));
        this.elements.marginInput.value = next;
        this.emitter.emit('marginChanged', { margin: next });
      });
    });

    this.elements.marginInput?.addEventListener('change', (e) => {
      const val = Math.min(25, Math.max(0, parseInt(e.target.value, 10) || 0));
      this.elements.marginInput.value = val;
      this.emitter.emit('marginChanged', { margin: val });
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
    this.elements.clearAllBtn?.addEventListener('click', () => this.emitter.emit('clearAll'));

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
      this._syncOrientationVisibility(rows, cols);
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
      onDragLeave: (cell, e) => this.dnd.handleDragLeave(cell, e),
      onDrop: (event, cell) => this.dnd.handleDrop(event, cell),
      onDragEnd: (cell) => this.dnd.handleDragEnd(cell),
      onClick: (_, index) => {
        const cell = this._getPageCell(index);
        const hasPage = cell?.classList.contains('has-page');
        if (hasPage) {
          this.emitter.emit('pageRemoved', index);
        } else {
          this.triggerFileUpload();
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
    dimensions.margin = paperSettings.margin || 0;

    this.renderer.render(
      numPages,
      template,
      { pageNumbersVisible: this.pageNumbersVisible },
      handlers,
      dimensions
    );
  }
}
