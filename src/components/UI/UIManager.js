import mitt from 'mitt';
import { PAPER_SIZES, ZINE_TEMPLATES } from '../../utils/config.js';
import { debounce, formatFileSize } from '../../utils/helpers.js';
import {
  MAX_UPLOAD_FILES,
  MIXED_UPLOAD_WARNING,
  SUPPORTED_UPLOAD_MESSAGE,
  getFileTypeLabel,
  partitionSupportedFiles
} from '../../utils/fileValidation.js';
import { toast } from '../Toast.js';

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
      exportPdfBtn: $('#exportPdfBtn'),
      view3dBtn: $('#view3dBtn'),
      pdfUpload: $('#pdf-upload'),
      progressContainer: $('#progress-container'),
      progressBarWrap: $('#progress-bar-wrap'),
      progressFill: $('#progress-fill'),
      progressText: $('#progress-text'),
      progressSubtext: $('#progress-subtext'),
      zine3dModal: $('#zine-3d-modal'),
      foldSlider: $('#fold-slider'),
      foldStatus: $('#fold-status'),
      foldHelper: $('#fold-helper'),
      pagePickerModal: $('#page-picker-modal'),
      pagePickerBackdrop: $('#page-picker-backdrop'),
      pagePickerClose: $('#page-picker-close'),
      pagePickerCancel: $('#page-picker-cancel'),
      pagePickerConfirm: $('#page-picker-confirm'),
      pagePickerGrid: $('#page-picker-grid'),
      pagePickerCount: $('#page-picker-count'),
      pagePickerSubtitle: $('#page-picker-subtitle'),
      pagePickerHelper: $('#page-picker-helper'),
      pagePickerSelectFirst: $('#page-picker-select-first'),
      pagePickerSelectLast: $('#page-picker-select-last'),
      pagePickerSelectEven: $('#page-picker-select-even'),
      pagePickerSelectOdd: $('#page-picker-select-odd'),
      pagePickerClear: $('#page-picker-clear')
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

    this.elements.uploadZone?.addEventListener('click', () => this.triggerFileUpload());
    this.elements.uploadZone?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.triggerFileUpload();
      }
    });

    this.dnd.setupEventListeners();
    this.emitter.on('filesDropped', (files) => this.handleIncomingFiles(files));

    this.elements.pdfUpload?.addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      this.handleIncomingFiles(files);
      e.target.value = '';
    });

    const debouncedGridChange = debounce(() => {
      const rows = parseInt(this.elements.gridRows?.value || '2', 10);
      const cols = parseInt(this.elements.gridCols?.value || '4', 10);
      this.emitter.emit('gridSizeChanged', { rows, cols });
    }, 300);

    this.elements.gridRows?.addEventListener('input', debouncedGridChange);
    this.elements.gridCols?.addEventListener('input', debouncedGridChange);

    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
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
      toast.error('Unsupported File', SUPPORTED_UPLOAD_MESSAGE);
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

  handleKeyboard(e) {
    if (this.modal.isPagePickerOpen()) {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.modal.closePagePicker(null);
      } else if (e.key === 'Enter' && document.activeElement?.tagName !== 'BUTTON') {
        e.preventDefault();
        this.modal.confirmPagePickerSelection();
      }
      return;
    }

    if (this.activePageIndex === null) {
      return;
    }

    if (e.key === 'r' || e.key === 'R') {
      this.emitter.emit('pageFlipped', this.activePageIndex);
    }
    if (e.key === 'z' || e.key === 'Z') {
      this.modal.showZoomModal(this.getImgUrl(this.activePageIndex));
    }
    if (e.key === 'c' || e.key === 'C') {
      this.emitter.emit('pageCropToggled', this.activePageIndex);
    }
    if (e.key === 'Backspace' || e.key === 'Delete') {
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
      onDragStart: (e, cell) => this.dnd.handleDragStart(e, cell),
      onDragOver: (e, cell) => this.dnd.handleDragOver(e, cell),
      onDragLeave: (cell) => this.dnd.handleDragLeave(cell),
      onDrop: (e, cell) => this.dnd.handleDrop(e, cell),
      onDragEnd: (cell) => this.dnd.handleDragEnd(cell),
      onClick: (_, i) => {
        this.activePageIndex = i;
        document.querySelectorAll('.page-cell').forEach((cell, idx) => {
          cell.classList.toggle('active', idx === i);
        });
      },
      onFlip: (i) => this.emitter.emit('pageFlipped', i),
      onZoom: (i) => this.modal.showZoomModal(this.getImgUrl(i)),
      onCrop: (i) => this.emitter.emit('pageCropToggled', i),
      onRemove: (i) => this.emitter.emit('pageRemoved', i)
    };

    this.renderer.render(numPages, template, { pageNumbersVisible: this.pageNumbersVisible }, handlers);
  }

  getImgUrl(i) {
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

  getPaperDimensions(size, orientation) {
    const paperSize = PAPER_SIZES[size || 'letter'];
    return orientation === 'landscape'
      ? { width: paperSize.height, height: paperSize.width }
      : { width: paperSize.width, height: paperSize.height };
  }
}
