import mitt from 'mitt';
import {
  GRID_DIMENSION_MAX,
  GRID_DIMENSION_MIN,
  PAPER_SIZES,
  ZINE_TEMPLATES
} from '../../utils/config.js';
import { debounce, parseBoundedInteger } from '../../utils/helpers.js';

import { SmartSheetConfig } from '../SmartSheetConfig.js';
import { ModalManager } from './ModalManager.js';
import { DragAndDropHandler } from './DragAndDropHandler.js';
import { LayoutRenderer } from './LayoutRenderer.js';
import { PAGE_CELL_TEMPLATE } from './Templates.js';


const DEFAULT_GRID_ROWS = 2;
const DEFAULT_GRID_COLS = 4;
const FOLD_STEPS = [
  {
    value: 0,
    status: 'Flat',
    helper: 'Start with the imposed sheet face up. Red marks the center slit; gray marks the crease grid.'
  },
  {
    value: 0.5,
    status: 'Creasing',
    helper: 'Crease the sheet across the short and long axes, then reopen it so every panel has a hinge.'
  },
  {
    value: 1,
    status: 'Folded Strip',
    helper: 'Fold the sheet lengthwise into a strip with the page artwork facing outward.'
  },
  {
    value: 1.5,
    status: 'Center Cut',
    helper: 'Cut only the center slit, stopping at the quarter folds. The red guide shows the cut span.'
  },
  {
    value: 2,
    status: 'Diamond Open',
    helper: 'Push the short ends together so the slit opens into a diamond and the page stacks swing inward.'
  },
  {
    value: 3,
    status: 'Booklet',
    helper: 'Press the panels into a booklet stack with the cover outside, then page through the reading preview.'
  }
];

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

    this.initSmartSheetConfig();
    this.syncPaperSettings({ paperSize: 'letter', orientation: 'landscape' });
    this.setupEventListeners();
    this.syncResponsiveUI();

    const savedControls = localStorage.getItem('zine-page-controls');
    const showControls = savedControls !== 'false';
    if (this.elements.pageControlsCheckbox) {
      this.elements.pageControlsCheckbox.checked = showControls;
    }
    this._applyPageControlsVisibility(showControls);
  }

  initSmartSheetConfig() {
    const container = document.getElementById('smart-sheet-config-container');
    if (!container) return;

    this.smartSheetConfig = new SmartSheetConfig(container, {
      initialRows: DEFAULT_GRID_ROWS,
      initialCols: DEFAULT_GRID_COLS,
      onChange: ({ rows, cols, paperSize, orientation, margin, totalSlots }) => {
        if (this.elements.gridRows) this.elements.gridRows.value = rows;
        if (this.elements.gridCols) this.elements.gridCols.value = cols;
        this.updateGridTotalBadge(rows, cols);
        this._syncOrientationVisibility(rows, cols);
        this.emitter.emit('gridSizeChanged', { rows, cols });
        this.emitter.emit('paperSizeChanged', { paperSize });
        this.emitter.emit('orientationChanged', { orientation });
        this.emitter.emit('marginChanged', { margin });
      }
    });
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
    this.elements.uploadedFilesList.innerHTML = '';
    if (files.length === 0) {
      this.elements.uploadedFilesList.classList.add('hidden');
      return;
    }
    this.elements.uploadedFilesList.classList.remove('hidden');
    const wrapper = document.createElement('div');
    wrapper.className = 'base-panel';
    const header = document.createElement('h4');
    header.className = 'rail-section-title';
    header.textContent = `Uploaded Files (${files.length})`;
    wrapper.appendChild(header);
    files.forEach((file, index) => {
      const item = document.createElement('div');
      item.className = 'uploaded-file-item';
      const icon = document.createElement('span');
      icon.className = 'material-symbols-outlined';
      icon.style.fontSize = '14px';
      icon.textContent = 'description';
      icon.setAttribute('aria-hidden', 'true');
      const body = document.createElement('div');
      const name = document.createElement('div');
      name.className = 'uploaded-file-name';
      name.textContent = file.name;
      const meta = document.createElement('div');
      meta.className = 'uploaded-file-meta';
      meta.textContent = `${file.kind === 'pdf' ? 'PDF' : 'Image'} \u2022 ${file.size ? (file.size / 1024).toFixed(1) + ' KB' : ''}`;
      body.appendChild(name);
      body.appendChild(meta);
      const remove = document.createElement('button');
      remove.className = 'uploaded-file-remove';
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove ${file.name}`);
      remove.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px;" aria-hidden="true">close</span>';
      remove.addEventListener('click', () => this.emitter.emit('removeUploadedFile', index));
      item.appendChild(icon);
      item.appendChild(body);
      item.appendChild(remove);
      wrapper.appendChild(item);
    });
    this.elements.uploadedFilesList.appendChild(wrapper);
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
    const parsedValue = typeof value === 'number' ? value : parseFloat(value || '0');
    const progress = Number.isFinite(parsedValue) ? parsedValue : 0;
    if (this.elements.foldSlider) {
      this.elements.foldSlider.value = progress;
    }
    this.syncFoldStepUi(progress);
  }

  syncFoldStepUi(progress) {
    const currentStep = FOLD_STEPS.reduce((closest, step) => (
      Math.abs(step.value - progress) < Math.abs(closest.value - progress) ? step : closest
    ), FOLD_STEPS[0]);

    if (this.elements.foldStatus) {
      this.elements.foldStatus.textContent = currentStep.status;
    }
    if (this.elements.foldHelper) {
      this.elements.foldHelper.textContent = currentStep.helper;
    }

    this.elements.foldStepButtons?.forEach((button) => {
      const isActive = Number(button.dataset.foldValue) === currentStep.value;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  }

  toggleMobileRail(show) {
    document.body.classList.toggle('mobile-rail-open', !!show);
    const rail = document.getElementById('control-rail');
    const overlay = document.getElementById('mobile-rail-overlay');
    if (rail) {
      rail.classList.toggle('is-open', !!show);
      rail.setAttribute('aria-hidden', !show);
    }
    if (overlay) {
      if (show) {
        overlay.classList.remove('hidden');
      } else {
        overlay.classList.add('hidden');
      }
      overlay.setAttribute('aria-hidden', !show);
    }
  }

  triggerFileUpload() {
    this.elements.pdfUpload?.click();
  }

  handleIncomingFiles(files) {
    if (!files?.length) { return; }
    files.forEach((file) => this.emitter.emit('fileSelected', file));
  }

  updateWorkspaceState({ placedCount = 0 } = {}) {
    const hasPagesLoaded = placedCount > 0;
    if (this.elements.clearAllBtn) {
      this.elements.clearAllBtn.style.display = hasPagesLoaded ? '' : 'none';
    }
    if (this.elements.exportPdfBtn) {
      this.elements.exportPdfBtn.disabled = !hasPagesLoaded;
    }
    if (this.elements.view3dBtn) {
      this.elements.view3dBtn.disabled = !hasPagesLoaded;
    }
  }

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
    if (paperSize) {
      if (this.elements.paperSizeSelect?.tagName === 'SELECT') {
        this.elements.paperSizeSelect.value = paperSize;
      }
      if (this.smartSheetConfig) {
        this.smartSheetConfig.setState({ paperSize });
      }
    }

    if (orientation) {
      if (this.elements.orientationToggle?.classList?.contains('orientation-seg')) {
        this.elements.orientationToggle.querySelectorAll('.orientation-seg-btn').forEach((btn) => {
          const isActive = btn.dataset.value === orientation;
          btn.classList.toggle('is-active', isActive);
          btn.setAttribute('aria-pressed', String(isActive));
        });
      }
      if (this.smartSheetConfig) {
        this.smartSheetConfig.setState({ orientation });
      }
    }
  }

  _syncOrientationVisibility(rows, cols) {
    if (this.smartSheetConfig) return;
    const isMini8 = rows === 2 && cols === 4;
    const wrapper = this.elements.orientationToggle?.closest('.workspace-config-field');
    if (wrapper) {
      wrapper.style.display = isMini8 ? 'none' : '';
    }
    const labelEl = document.getElementById('orientation-label');
    if (labelEl) {
      labelEl.closest('.workspace-config-field') && (labelEl.closest('.workspace-config-field').style.display = isMini8 ? 'none' : '');
    }
  }

  normalizeGridInputs() {
    if (this.smartSheetConfig) {
      const state = this.smartSheetConfig.getState();
      return { rows: state.rows, cols: state.cols };
    }
    const rows = parseBoundedInteger(this.elements.gridRows?.value, { min: GRID_DIMENSION_MIN, max: GRID_DIMENSION_MAX, fallback: DEFAULT_GRID_ROWS });
    const cols = parseBoundedInteger(this.elements.gridCols?.value, { min: GRID_DIMENSION_MIN, max: GRID_DIMENSION_MAX, fallback: DEFAULT_GRID_COLS });
    if (this.elements.gridRows) { this.elements.gridRows.value = rows; }
    if (this.elements.gridCols) { this.elements.gridCols.value = cols; }
    return { rows, cols };
  }

  updateGridTotalBadge(rows, cols) {
    if (this.elements.gridTotal) {
      this.elements.gridTotal.textContent = `${rows * cols} slots`;
    }
  }

  syncResponsiveUI() {
    const isMobile = window.matchMedia('(max-width: 1023px)').matches;
    this.elements.previewArea?.classList.toggle('is-mobile', isMobile);
    // Close mobile rail when resizing to desktop
    if (!isMobile&& document.body.classList.contains('mobile-rail-open')) {
      this.toggleMobileRail(false);
    }
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
      openRailSheetBtn: $('#open-rail-sheet-btn'),
      closeRailSheetBtn: $('#close-rail-sheet-btn'),
      mobileRailOverlay: $('#mobile-rail-overlay'),
      commandDeckContainer: $('#command-deck'),
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
      pagePickerCount: $('#page-picker-count'),
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
      clearAllBtn: $('#clear-all-btn'),
      exportPdfBtn: $('#exportPdfBtn'),
      view3dBtn: $('#view3dBtn')
    };
  }

  setupEventListeners() {
    if (!this.smartSheetConfig) {
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
          if (!target) { return; }
          const min = parseInt(target.min, 10) || 1;
          const max = parseInt(target.max, 10) || 10;
          const delta = parseInt(btn.dataset.delta, 10);
          const next = Math.min(max, Math.max(min, parseInt(target.value, 10) + delta));
          target.value = next;
          target.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
    }

    this.elements.pageNumbersCheckbox?.addEventListener('change', (event) => {
      this.pageNumbersVisible = event.target.checked;
      this.emitter.emit('pageNumbersToggled', this.pageNumbersVisible);
    });

    this.elements.pageControlsCheckbox?.addEventListener('change', (event) => {
      this._applyPageControlsVisibility(event.target.checked);
    });

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
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => {
        const value = parseFloat(button.dataset.foldValue || '0');
        this.setFoldProgressControl(value);
        this.emitter.emit('foldProgress', value);
      });
    });

    document.addEventListener('keydown', (event) => {
      if (!this.isFoldPreviewOpen() || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }

      const stepButton = Array.from(this.elements.foldStepButtons || [])
        .find((button) => button.dataset.stepIndex === event.key);
      if (!stepButton) {
        return;
      }

      event.preventDefault();
      stepButton.click();
    });

    this.dnd.setupEventListeners();
    this.emitter.on('filesDropped', (files) => this.handleIncomingFiles(files));

    this.elements.pdfUpload?.addEventListener('change', (event) => {
      const files = Array.from(event.target.files || []);
      this.handleIncomingFiles(files);
      event.target.value = '';
    });

    if (!this.smartSheetConfig) {
      const debouncedGridChange = debounce(() => {
        const { rows, cols } = this.normalizeGridInputs();

        this.updateGridTotalBadge(rows, cols);
        this._syncOrientationVisibility(rows, cols);
        this.emitter.emit('gridSizeChanged', { rows, cols });
      }, 300);

      this.elements.gridRows?.addEventListener('input', debouncedGridChange);
      this.elements.gridCols?.addEventListener('input', debouncedGridChange);
    }

    window.addEventListener('resize', () => this.syncResponsiveUI());
  }

  isFoldPreviewOpen() {
    return !!this.elements.zine3dModal
      && !this.elements.zine3dModal.classList.contains('hidden')
      && this.elements.zine3dModal.style.display !== 'none';
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
