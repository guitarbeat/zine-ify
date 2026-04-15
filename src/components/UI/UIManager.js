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
    this.cacheElements();
    this.modal = new ModalManager(this.elements, this.emitter);
    this.dnd = new DragAndDropHandler(this.elements, this.emitter);
    this.renderer = new LayoutRenderer(this.elements.zineSheetsContainer, PAGE_CELL_TEMPLATE);

    this.renderPaperSizeOptions();
    const { rows, cols } = this.normalizeGridInputs();
    this.updateGridTotalBadge(rows, cols);
    this.setupEventListeners();
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
      orientationSelect: $('#orientation-select'),
      pageNumbersCheckbox: $('#show-page-numbers'),
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
      foldStepButtons: Array.from(document.querySelectorAll('.fold-step-btn')),
      bookletPreviewContainer: $('#booklet-preview-container'),
      bookletPrevBtn: $('#booklet-prev-btn'),
      bookletNextBtn: $('#booklet-next-btn'),
      bookletStatus: $('#booklet-status'),
      pagePickerModal: $('#page-picker-modal'),
      pagePickerBackdrop: $('#page-picker-backdrop'),
      pagePickerClose: $('#page-picker-close'),
      pagePickerCancel: $('#page-picker-cancel'),
      pagePickerConfirm: $('#page-picker-confirm'),
      pagePickerGrid: $('#page-picker-grid'),
      pagePickerCount: $('#page-picker-count'),
      pagePickerSubtitle: $('#page-picker-subtitle'),
      pagePickerSelectFirst: $('#page-picker-select-first'),
      pagePickerSelectLast: $('#page-picker-select-last'),
      pagePickerSelectEven: $('#page-picker-select-even'),
      pagePickerSelectOdd: $('#page-picker-select-odd'),
      pagePickerClear: $('#page-picker-clear'),
      actionButtons: $('#action-buttons'),
      workflowSteps: Array.from(document.querySelectorAll('.workflow-step')),
      previewDescription: $('#preview-description'),
      previewCountChip: $('#preview-count-chip'),
      previewEmptyState: $('#preview-empty-state'),
      previewEmptyTitle: $('#preview-empty-title'),
      previewEmptyBody: $('#preview-empty-body'),
      openRailSheetBtn: $('#open-rail-sheet-btn'),
      closeRailSheetBtn: $('#close-rail-sheet-btn'),
      mobileRailOverlay: $('#mobile-rail-overlay'),
      controlRail: $('#control-rail'),
      unusedSection: $('#unused-pages-section'),
      unusedGrid: $('#unused-grid')
    };
  }

  renderPaperSizeOptions() {
    if (!this.elements.paperSizeSelect) {
      return;
    }

    this.elements.paperSizeSelect.innerHTML = Object.entries(PAPER_SIZES)
      .map(([id, data]) => `<option value="${id}">${data.label}</option>`)
      .join('');
  }

  setupEventListeners() {
    this.elements.paperSizeSelect?.addEventListener('change', (event) => {
      this.emitter.emit('paperSizeChanged', { paperSize: event.target.value });
    });

    this.elements.orientationSelect?.addEventListener('change', (event) => {
      this.emitter.emit('orientationChanged', { orientation: event.target.value });
    });

    this.elements.pageNumbersCheckbox?.addEventListener('change', (event) => {
      this.pageNumbersVisible = event.target.checked;
      this.emitter.emit('pageNumbersToggled', this.pageNumbersVisible);
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

    window.addEventListener('resize', () => {
      if (window.innerWidth >= 1024) {
        this.toggleMobileRail(false);
      }
    });

    document.addEventListener('keydown', (event) => this.handleKeyboard(event));
  }

  triggerFileUpload() {
    this.elements.pdfUpload?.click();
  }

  handleIncomingFiles(files) {
    if (!Array.isArray(files) || files.length === 0) {
      return;
    }

    const { acceptedFiles, rejectedFiles } = partitionSupportedFiles(files);
    if (acceptedFiles.length === 0) {
      toast.error(UNSUPPORTED_UPLOAD_TITLE, SUPPORTED_UPLOAD_MESSAGE);
      return;
    }

    if (rejectedFiles.length > 0) {
      toast.warning('Files Skipped', MIXED_UPLOAD_WARNING);
    }

    const cappedFiles = acceptedFiles.slice(0, MAX_UPLOAD_FILES);
    if (acceptedFiles.length > MAX_UPLOAD_FILES) {
      toast.warning('Limit Exceeded', `Maximum ${MAX_UPLOAD_FILES} files allowed at once. Processing first ${MAX_UPLOAD_FILES} files.`);
    }

    cappedFiles.forEach((file) => this.emitter.emit('fileSelected', file));
  }

  handleKeyboard(event) {
    if (this.modal.isPagePickerOpen()) {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.modal.closePagePicker(null);
      } else if (event.key === 'Enter' && document.activeElement?.tagName !== 'BUTTON') {
        event.preventDefault();
        this.modal.confirmPagePickerSelection();
      }
      return;
    }

    if ((event.metaKey || event.ctrlKey) && !event.shiftKey) {
      const key = event.key.toLowerCase();

      if (key === 'o') {
        event.preventDefault();
        this.triggerFileUpload();
        return;
      }

      if (key === 'p') {
        event.preventDefault();
        if (!this.elements.printBtn?.disabled) {
          this.emitter.emit('print');
        }
        return;
      }

      if (key === 's') {
        event.preventDefault();
        if (!this.elements.exportPdfBtn?.disabled) {
          this.emitter.emit('export');
        }
        return;
      }
    }

    if (this.is3DModalOpen() && event.key === 'Escape') {
      event.preventDefault();
      this.toggle3DModal(false);
      return;
    }

    if (this.isMobileRailOpen() && event.key === 'Escape') {
      event.preventDefault();
      this.toggleMobileRail(false);
      return;
    }

    if (this.activePageIndex === null) {
      return;
    }

    if (event.key === 'r' || event.key === 'R') {
      this.emitter.emit('pageFlipped', this.activePageIndex);
    }

    if (event.key === 'z' || event.key === 'Z') {
      const imageUrl = this.getImgUrl(this.activePageIndex);
      if (imageUrl) {
        this.modal.showZoomModal(imageUrl);
      }
    }

    if (event.key === 'c' || event.key === 'C') {
      this.emitter.emit('pageCropToggled', this.activePageIndex);
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      this.emitter.emit('pageRemoved', this.activePageIndex);
    }
  }

  on(event, handler) {
    this.emitter.on(event, handler);
  }

  generateLayout(numPages, templateType) {
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
        document.querySelectorAll('.page-cell').forEach((cell, cellIndex) => {
          cell.classList.toggle('active', cellIndex === index);
        });
      },
      onFlip: (index) => this.emitter.emit('pageFlipped', index),
      onZoom: (index) => {
        const imageUrl = this.getImgUrl(index);
        if (imageUrl) {
          this.modal.showZoomModal(imageUrl);
        }
      },
      onCrop: (index) => this.emitter.emit('pageCropToggled', index),
      onRemove: (index) => this.emitter.emit('pageRemoved', index)
    };

    this.renderer.render(numPages, template, { pageNumbersVisible: this.pageNumbersVisible }, handlers);
  }

  getImgUrl(index) {
    return document.querySelectorAll('.page-cell')[index]?.querySelector('img')?.src;
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
    if (!cell) {
      return;
    }

    cell.classList.toggle('is-flipped', flipped);
    const button = cell.querySelector('.flip-btn');
    button?.setAttribute('aria-pressed', flipped ? 'true' : 'false');
  }

  setPageZoom(index, zoomed) {
    const cell = document.querySelector(`.page-cell[data-page-index="${index}"]`);
    if (!cell) {
      return;
    }

    cell.classList.toggle('page-zoomed', zoomed);

    const button = cell.querySelector('.crop-btn');
    button?.setAttribute('aria-pressed', zoomed ? 'true' : 'false');

    const icon = button?.querySelector('.material-symbols-outlined');
    if (icon) {
      icon.textContent = zoomed ? 'aspect_ratio' : 'crop_free';
    }
  }

  hasContent() {
    return !!document.querySelector('.page-cell.has-page');
  }

  is3DModalOpen() {
    return !!this.elements.zine3dModal && !this.elements.zine3dModal.classList.contains('hidden') && this.elements.zine3dModal.style.display !== 'none';
  }

  isMobileRailOpen() {
    return this.elements.controlRail?.classList.contains('is-open') || false;
  }

  toggleMobileRail(show) {
    if (!this.elements.controlRail) {
      return;
    }

    const shouldShow = !!show && window.innerWidth < 1024;
    this.elements.controlRail.classList.toggle('is-open', shouldShow);
    this.elements.mobileRailOverlay?.classList.toggle('hidden', !shouldShow);
    this.elements.mobileRailOverlay?.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
    document.body.classList.toggle('mobile-rail-open', shouldShow);
  }

  toggle3DModal(show) {
    this.modal.toggle3DModal(show);
  }

  getNormalizedGridSize(rowsValue = this.elements.gridRows?.value, colsValue = this.elements.gridCols?.value) {
    return {
      rows: parseBoundedInteger(rowsValue, {
        min: GRID_DIMENSION_MIN,
        max: GRID_DIMENSION_MAX,
        fallback: DEFAULT_GRID_ROWS
      }),
      cols: parseBoundedInteger(colsValue, {
        min: GRID_DIMENSION_MIN,
        max: GRID_DIMENSION_MAX,
        fallback: DEFAULT_GRID_COLS
      })
    };
  }

  normalizeGridInputs(rowsValue = this.elements.gridRows?.value, colsValue = this.elements.gridCols?.value) {
    const { rows, cols } = this.getNormalizedGridSize(rowsValue, colsValue);

    if (this.elements.gridRows) {
      this.elements.gridRows.value = String(rows);
    }

    if (this.elements.gridCols) {
      this.elements.gridCols.value = String(cols);
    }

    return { rows, cols };
  }

  updateGridTotalBadge(rows = this.elements.gridRows?.value, cols = this.elements.gridCols?.value) {
    const { rows: normalizedRows, cols: normalizedCols } = this.getNormalizedGridSize(rows, cols);

    if (this.elements.gridTotal) {
      this.elements.gridTotal.textContent = `${normalizedRows * normalizedCols} slots`;
    }
  }

  getFoldStage(value) {
    return FOLD_STAGES.find((stage) => value >= stage.threshold) || FOLD_STAGES[FOLD_STAGES.length - 1];
  }

  setFoldProgressControl(value) {
    if (this.elements.foldSlider) {
      this.elements.foldSlider.value = String(value);
    }

    const stage = this.getFoldStage(value);
    if (this.elements.foldStatus) {
      this.elements.foldStatus.textContent = stage.label;
    }
    if (this.elements.foldHelper) {
      this.elements.foldHelper.textContent = stage.helper;
    }

    const numericValue = Number.isFinite(value) ? value : 0;
    this.elements.foldStepButtons?.forEach((button) => {
      const stepValue = parseFloat(button.dataset.foldValue || '0');
      const isActive = Math.abs(stepValue - numericValue) < 0.26;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  setStatus(message, type = 'info') {
    if (!this.elements.uploadStatus) {
      return;
    }

    this.elements.uploadStatus.textContent = message;
    this.elements.uploadStatus.className = 'upload-status';

    if (type === 'success') {
      this.elements.uploadStatus.classList.add('upload-status--success');
    }
    if (type === 'error') {
      this.elements.uploadStatus.classList.add('upload-status--error');
    }
  }

  createUploadedFileListItem(fileInfo) {
    const item = document.createElement('div');
    item.className = 'uploaded-file-item flex items-start justify-between gap-3 rounded-[0.85rem] border-[1.5px] border-black bg-white px-3 py-3 shadow-[3px_3px_0_0_#171717]';

    const content = document.createElement('div');
    content.className = 'min-w-0 flex-1 space-y-1';

    const name = document.createElement('div');
    name.className = 'truncate text-xs font-bold';
    name.textContent = fileInfo.name;

    const meta = document.createElement('div');
    meta.className = 'text-[11px] uppercase tracking-[0.12em] text-[var(--muted-ink)]';
    meta.textContent = `${getFileTypeLabel(fileInfo.kind)} | ${formatFileSize(fileInfo.size)}`;

    const status = document.createElement('div');
    status.className = 'text-[11px] font-bold';
    status.textContent = fileInfo.status || 'Queued';

    content.appendChild(name);
    content.appendChild(meta);
    content.appendChild(status);
    item.appendChild(content);

    return item;
  }

  updateUploadedFilesList(uploadedFiles) {
    if (!this.elements.uploadedFilesList) {
      return;
    }

    this.elements.uploadedFilesList.replaceChildren();

    if (!uploadedFiles.length) {
      this.elements.uploadedFilesList.classList.add('hidden');
      return;
    }

    this.elements.uploadedFilesList.classList.remove('hidden');

    const wrapper = document.createElement('div');
    wrapper.className = 'space-y-2';

    const header = document.createElement('h3');
    header.className = 'text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-ink)]';
    header.textContent = `Uploaded Files (${uploadedFiles.length})`;
    wrapper.appendChild(header);

    uploadedFiles.forEach((fileInfo) => {
      wrapper.appendChild(this.createUploadedFileListItem(fileInfo));
    });

    this.elements.uploadedFilesList.appendChild(wrapper);
  }

  updateWorkspaceState({
    placedCount = 0,
    totalSlots = 0,
    rows = 2,
    cols = 4,
    isMiniLayout = true,
    previewed = false,
    exported = false
  }) {
    const hasPages = placedCount > 0;
    const slotsPerSheet = Math.max(rows * cols, 1);
    const sheetCount = Math.max(1, Math.ceil(Math.max(placedCount, 1) / slotsPerSheet));

    this.updateGridTotalBadge(rows, cols);

    this.elements.previewArea?.classList.toggle('is-empty', !hasPages);
    this.elements.previewCountChip && (this.elements.previewCountChip.textContent = hasPages
      ? `${placedCount} of ${totalSlots} placed`
      : `${totalSlots} slots ready`);

    if (this.elements.previewDescription) {
      this.elements.previewDescription.textContent = hasPages
        ? `${placedCount} page${placedCount === 1 ? '' : 's'} placed across ${sheetCount} sheet${sheetCount === 1 ? '' : 's'}. Drag to reorder, then flip, crop, preview, or export.`
        : 'Import a PDF or image stack to start laying out the sheet.';
    }

    if (this.elements.previewEmptyState) {
      this.elements.previewEmptyState.classList.toggle('hidden', hasPages);
    }

    if (this.elements.previewEmptyTitle) {
      this.elements.previewEmptyTitle.textContent = hasPages
        ? 'Pages loaded.'
        : 'Build the sheet from the left rail.';
    }

    if (this.elements.previewEmptyBody) {
      this.elements.previewEmptyBody.textContent = hasPages
        ? 'Reorder pages directly on the sheet, or keep importing to fill more slots.'
        : 'Small PDFs import directly. Larger PDFs open the page picker so you can choose exactly what lands on the canvas.';
    }

    if (this.elements.actionButtons) {
      this.elements.actionButtons.classList.toggle('hidden', !hasPages);
    }

    if (this.elements.exportPdfBtn) {
      this.elements.exportPdfBtn.disabled = !hasPages;
    }

    if (this.elements.printBtn) {
      this.elements.printBtn.disabled = !hasPages;
    }

    if (this.elements.exportPdfBtnLabel) {
      this.elements.exportPdfBtnLabel.textContent = exported ? 'Export Again' : 'Export PDF';
    }

    if (this.elements.printBtnLabel) {
      this.elements.printBtnLabel.textContent = hasPages ? 'Print Sheet' : 'Print';
    }

    if (this.elements.view3dBtn) {
      const canPreview3d = hasPages && isMiniLayout;
      this.elements.view3dBtn.disabled = !canPreview3d;
      this.elements.view3dBtn.title = canPreview3d
        ? 'Preview the fold sequence and booklet order'
        : 'Fold preview is available only for the 2 x 4 mini-zine layout';
    }

    if (this.elements.view3dBtnLabel) {
      this.elements.view3dBtnLabel.textContent = isMiniLayout ? 'Fold Preview' : 'Mini Preview Only';
    }

    const stepStateMap = {
      upload: hasPages ? { status: 'done', label: 'Done' } : { status: 'current', label: 'Ready' },
      arrange: hasPages ? { status: 'current', label: 'Live' } : { status: 'idle', label: 'Waiting' },
      preview: !isMiniLayout
        ? { status: 'idle', label: 'Mini only' }
        : previewed
          ? { status: 'done', label: 'Viewed' }
          : hasPages
            ? { status: 'current', label: 'Ready' }
            : { status: 'idle', label: 'Optional' },
      export: exported
        ? { status: 'done', label: 'Done' }
        : hasPages
          ? { status: 'current', label: 'Ready' }
          : { status: 'idle', label: 'Waiting' }
    };

    this.elements.workflowSteps?.forEach((step) => {
      const key = step.dataset.workflowStep;
      const state = stepStateMap[key];
      if (!state) {
        return;
      }

      step.classList.remove('is-idle', 'is-current', 'is-done');
      step.classList.add(`is-${state.status}`);
      step.setAttribute('aria-current', state.status === 'current' ? 'step' : 'false');

      const stateNode = step.querySelector('.workflow-step-state');
      if (stateNode) {
        stateNode.textContent = state.label;
      }
    });
  }

  getPaperDimensions(size, orientation) {
    const paperSize = PAPER_SIZES[size || 'letter'];
    return orientation === 'landscape'
      ? { width: paperSize.height, height: paperSize.width }
      : { width: paperSize.width, height: paperSize.height };
  }
}
