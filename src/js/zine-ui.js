// Modern UI management class
import mitt from 'mitt';
import { PAPER_SIZES, ZINE_TEMPLATES } from './config.js';
import { toast } from './toast.js';

export class UIManager {
  constructor() {
    this.emitter = mitt();
    this.elements = {};
    this.paperSize = 'a4';
    this.orientation = 'landscape';
    this.init();
  }

  /**
   * Initialize UI elements and event listeners
   */
  init() {
    this.cacheElements();
    this.renderPaperSizeOptions();
    this.loadSettings();
    this.updatePreviewLayout();
    this.setupEventListeners();
  }


  /**
   * Cache DOM elements for performance
   */
  cacheElements() {
    const $ = (selector) => document.querySelector(selector);

    this.elements = {
      // Main Containers
      uploadZone: $('#upload-zone'),
      previewArea: $('#preview-area'),
      actionButtons: $('#action-buttons'),
      previewDescription: $('#preview-description'),
      zineSheetsContainer: $('#zine-sheets-container'),

      // Interactions
      printBtn: $('#printBtn'),
      exportPdfBtn: $('#exportPdfBtn'),
      pdfUpload: $('#pdf-upload'),
      uploadStatus: $('#upload-status'),

      // Progress
      progressContainer: $('#progress-container'),
      progressFill: $('#progress-fill'),
      progressText: $('#progress-text'),
      progressSubtext: $('#progress-subtext'),

      // Settings
      paperSizeSelect: $('#paper-size-select'),
      orientationSelect: $('#orientation-select'),

      // Toast
      toastContainer: $('#toast-container'),

      // Zine Tabs
      zineTabs: $('#zine-tabs'),
      zineTab1: $('#zine-tab-1'),
      zineTab2: $('#zine-tab-2'),

      // Grid Size
      gridRows: $('#grid-rows'),
      gridCols: $('#grid-cols'),
      gridTotal: $('#grid-total')
    };

  }



  /**
   * Render paper size options from constants
   */
  renderPaperSizeOptions() {
    if (!this.elements.paperSizeSelect) { return; }

    this.elements.paperSizeSelect.innerHTML = Object.entries(PAPER_SIZES)
      .map(([id, data]) => `<option value="${id}">${data.label}</option>`)
      .join('');
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Settings
    this.elements.paperSizeSelect?.addEventListener('change', (e) => this.updatePaperSize(e.target.value));
    this.elements.orientationSelect?.addEventListener('change', (e) => this.updateOrientation(e.target.value));

    // Upload interactions
    this.elements.uploadZone?.addEventListener('click', () => this.triggerFileUpload());
    this.elements.uploadZone?.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.elements.uploadZone?.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    this.elements.uploadZone?.addEventListener('drop', (e) => this.handleFileDrop(e));

    this.elements.pdfUpload?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) { this.emitter.emit('fileSelected', file); }
    });


    // Grid size inputs
    const handleGridChange = () => {
      const rows = parseInt(this.elements.gridRows?.value) || 2;
      const cols = parseInt(this.elements.gridCols?.value) || 4;
      if (this.elements.gridTotal) {
        this.elements.gridTotal.textContent = `(${rows * cols} pages)`;
      }
      this.emitter.emit('gridSizeChanged', { rows, cols });
    };
    this.elements.gridRows?.addEventListener('input', handleGridChange);
    this.elements.gridCols?.addEventListener('input', handleGridChange);

    // Keyboard
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
  }





  /**
   * Set the UI to "ready" state (enable preview area and action buttons)
   */
  setReady(ready, description = null) {
    if (ready) {
      this.elements.previewArea?.classList.remove('opacity-30', 'pointer-events-none');
      this.elements.actionButtons?.classList.remove('hidden');
    } else {
      this.elements.previewArea?.classList.add('opacity-30', 'pointer-events-none');
      this.elements.actionButtons?.classList.add('hidden');
    }

    if (description && this.elements.previewDescription) {
      this.elements.previewDescription.textContent = description;
    }
  }

  /**
   * Update progress bar
   */
  updateProgress(percent) {
    if (this.elements.progressFill) {
      this.elements.progressFill.style.width = `${percent}%`;
    }
  }

  /**
   * Update status message
   */
  setStatus(message, type = 'info') {
    if (this.elements.uploadStatus) {
      this.elements.uploadStatus.textContent = message;
      this.elements.uploadStatus.className = `text-[11px] uppercase font-bold tracking-wider ${type === 'error' ? 'text-red-500' : type === 'success' ? 'text-green-500' : 'text-gray-400'
        }`;
    }
  }

  /**
   * Generate sheets and page placeholders
   * @param {number} numPages - Number of pages in the PDF
   * @param {string} templateType - Template type: 'mini-8', 'dual-16', or 'accordion-16'
   */
  generateLayout(numPages = 8, templateType = null) {
    if (!this.elements.zineSheetsContainer) { return; }
    this.elements.zineSheetsContainer.innerHTML = '';

    // Auto-detect template if not specified
    if (!templateType) {
      if (numPages > 8) {
        templateType = 'accordion-16'; // Default to accordion for 9-16 pages
      } else {
        templateType = 'mini-8';
      }
    }

    this.currentTemplate = templateType;
    const template = ZINE_TEMPLATES[templateType];

    if (!template) {
      console.error(`Unknown template: ${templateType}`);
      return;
    }

    // For accordion-16, we use a single sheet with 4x4 grid
    if (templateType === 'accordion-16') {
      this.generateAccordionLayout(template);
    } else {
      // Mini-8 or dual-16 (two 8-page sheets)
      this.generateMiniZineLayout(numPages, template);
    }

    this.updatePreviewLayout();
  }


  /**
   * Generate a custom grid layout with specified rows and columns
   */
  generateCustomGrid(rows, cols) {
    this.elements.zineSheetsContainer.innerHTML = '';
    const totalPages = rows * cols;

    const sheetWrapper = document.createElement('div');
    sheetWrapper.className = 'print-sheet w-full p-0 relative overflow-hidden rounded-sm';
    sheetWrapper.setAttribute('data-sheet', 1);
    sheetWrapper.setAttribute('data-template', `custom-${rows}x${cols}`);

    const grid = document.createElement('div');
    grid.className = 'zine-grid';
    grid.id = 'zine-grid-sheet-1';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    for (let i = 0; i < totalPages; i++) {
      const pageNum = i + 1;
      const cell = document.createElement('div');
      cell.className = 'page-cell h-full w-full bg-white relative flex items-center justify-center overflow-hidden';
      cell.setAttribute('data-page-index', i);
      cell.setAttribute('data-page', pageNum);
      cell.setAttribute('draggable', 'true');

      const labelText = pageNum === 1 ? 'Cover' : (pageNum === totalPages ? 'Back' : `Page ${pageNum}`);

      cell.innerHTML = `
        <span class="page-label absolute top-2 left-2 px-2 py-1 bg-black text-white text-[10px] font-black rounded uppercase z-10">${labelText}</span>
        <button class="flip-btn absolute top-2 right-2 w-6 h-6 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-xs z-10 shadow" title="Flip page">🔄</button>
        <div class="page-placeholder text-gray-200 text-xs font-black uppercase tracking-widest">Empty</div>
        <img alt="Page ${pageNum}" class="page-content-img w-full h-full object-contain hidden" draggable="false" />
      `;

      this.setupDragAndDrop(cell);
      this.setupFlipButton(cell);
      grid.appendChild(cell);
    }

    sheetWrapper.appendChild(grid);
    this.elements.zineSheetsContainer.appendChild(sheetWrapper);

    this.updatePreviewLayout();
  }

  /**
   * Generate the accordion-16 layout (single sheet, 4x4 grid)
   */
  generateAccordionLayout(template) {
    const sheetWrapper = document.createElement('div');
    sheetWrapper.className = 'print-sheet w-full p-0 relative overflow-hidden rounded-sm';
    sheetWrapper.setAttribute('data-sheet', 1);
    sheetWrapper.setAttribute('data-template', 'accordion-16');

    const grid = document.createElement('div');
    grid.className = 'zine-grid accordion-16';
    grid.id = 'zine-grid-sheet-1';

    // Generate cells based on template layout
    template.layout.forEach((item) => {
      const cell = document.createElement('div');
      cell.className = 'page-cell h-full w-full bg-white relative flex items-center justify-center overflow-hidden';
      cell.setAttribute('data-page-index', item.page - 1);
      cell.setAttribute('data-page', item.page);
      cell.setAttribute('draggable', 'true');

      const labelText = item.page === 1 ? 'Cover' : (item.page === 16 ? 'Back' : `Page ${item.page}`);

      cell.innerHTML = `
        <span class="page-label absolute top-2 left-2 px-2 py-1 bg-black text-white text-[10px] font-black rounded uppercase z-10">${labelText}</span>
        <button class="flip-btn absolute top-2 right-2 w-6 h-6 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-xs z-10 shadow" title="Flip page">🔄</button>
        <div class="page-placeholder text-gray-200 text-xs font-black uppercase tracking-widest">Empty</div>
        <img alt="Page ${item.page}" class="page-content-img w-full h-full object-contain hidden" draggable="false" />
      `;

      this.setupDragAndDrop(cell);
      this.setupFlipButton(cell);
      grid.appendChild(cell);
    });

    sheetWrapper.appendChild(grid);

    // Add fold guidelines for accordion
    const guidelines = `
      <div class="absolute top-1/4 left-0 w-full border-t border-blue-400/30 pointer-events-none"></div>
      <div class="absolute top-1/2 left-0 w-full border-t border-blue-400/30 pointer-events-none"></div>
      <div class="absolute top-3/4 left-0 w-full border-t border-blue-400/30 pointer-events-none"></div>
      <div class="absolute top-0 left-1/4 h-full border-l border-blue-400/30 pointer-events-none"></div>
      <div class="absolute top-0 left-1/2 h-full border-l border-blue-400/30 pointer-events-none"></div>
      <div class="absolute top-0 left-3/4 h-full border-l border-blue-400/30 pointer-events-none"></div>
    `;
    sheetWrapper.insertAdjacentHTML('beforeend', guidelines);

    // Add cut line indicators (left and right edges, through rows 1-3)
    const cutLineLeft = document.createElement('div');
    cutLineLeft.className = 'cut-line cut-line-left';
    cutLineLeft.style.top = '0';
    cutLineLeft.style.height = '75%'; // 3 of 4 rows
    sheetWrapper.appendChild(cutLineLeft);

    const cutLineRight = document.createElement('div');
    cutLineRight.className = 'cut-line cut-line-right';
    cutLineRight.style.top = '0';
    cutLineRight.style.height = '75%'; // 3 of 4 rows
    sheetWrapper.appendChild(cutLineRight);

    this.elements.zineSheetsContainer.appendChild(sheetWrapper);
  }

  /**
   * Generate mini-zine layout (8-page single or dual sheets)
   */
  generateMiniZineLayout(numPages, _template) {
    const numSheets = numPages > 8 ? 2 : 1;

    for (let s = 1; s <= numSheets; s++) {
      const sheetWrapper = document.createElement('div');
      sheetWrapper.className = 'print-sheet w-full p-0 relative overflow-hidden rounded-sm';
      sheetWrapper.setAttribute('data-sheet', s);

      const grid = document.createElement('div');
      grid.className = 'zine-grid';
      grid.id = `zine-grid-sheet-${s}`;

      for (let i = 1; i <= 8; i++) {
        const pageIdx = (s - 1) * 8 + i;
        const cell = document.createElement('div');
        cell.className = 'page-cell h-full w-full bg-white relative flex items-center justify-center overflow-hidden';
        cell.setAttribute('data-page-index', pageIdx - 1);
        cell.setAttribute('data-page', i);
        cell.setAttribute('draggable', 'true');

        const labelText = i === 1 ? 'Cover' : (i === 8 ? 'Back' : `Page ${i}`);
        const sheetLabel = numSheets > 1 ? ` <span class="opacity-50 text-[8px] ml-1">(Sheet ${s})</span>` : '';

        cell.innerHTML = `
          <span class="page-label absolute top-2 left-2 px-2 py-1 bg-black text-white text-[10px] font-black rounded uppercase z-10">${labelText}${sheetLabel}</span>
          <button class="flip-btn absolute top-2 right-2 w-6 h-6 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-xs z-10 shadow" title="Flip page">🔄</button>
          <div class="page-placeholder text-gray-200 text-xs font-black uppercase tracking-widest">Empty</div>
          <img alt="Page ${pageIdx}" class="page-content-img w-full h-full object-contain hidden" draggable="false" />
        `;

        this.setupDragAndDrop(cell);
        this.setupFlipButton(cell);
        grid.appendChild(cell);
      }

      // Guidelines
      const guidelines = `
        <div class="absolute top-1/2 left-0 w-full border-t border-blue-400/20 pointer-events-none"></div>
        <div class="absolute top-0 left-1/4 h-full border-l border-blue-400/20 pointer-events-none"></div>
        <div class="absolute top-0 left-1/2 h-full border-l border-blue-400/20 pointer-events-none"></div>
        <div class="absolute top-0 left-3/4 h-full border-l border-blue-400/20 pointer-events-none"></div>
      `;

      sheetWrapper.appendChild(grid);
      sheetWrapper.insertAdjacentHTML('beforeend', guidelines);
      this.elements.zineSheetsContainer.appendChild(sheetWrapper);
    }
  }

  setupDragAndDrop(cell) {
    cell.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', cell.getAttribute('data-page-index'));
      cell.classList.add('dragging');
    });

    cell.addEventListener('dragend', () => {
      cell.classList.remove('dragging');
      document.querySelectorAll('.page-cell').forEach(c => c.classList.remove('drag-over'));
    });

    cell.addEventListener('dragover', (e) => {
      e.preventDefault();
      cell.classList.add('drag-over');
    });

    cell.addEventListener('dragleave', () => {
      cell.classList.remove('drag-over');
    });

    cell.addEventListener('drop', (e) => {
      e.preventDefault();
      cell.classList.remove('drag-over');
      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
      const toIndex = parseInt(cell.getAttribute('data-page-index'));

      if (fromIndex !== toIndex) {
        this.emitter.emit('pagesSwapped', { fromIndex, toIndex });
      }
    });
  }

  updatePagePreview(pageIndex, dataUrl) {
    const cell = this.elements.zineSheetsContainer.querySelector(`[data-page-index="${pageIndex}"]`);
    if (cell) {
      const img = cell.querySelector('.page-content-img');
      const placeholder = cell.querySelector('.page-placeholder');
      if (img && placeholder) {
        if (dataUrl) {
          img.src = dataUrl;
          img.classList.remove('hidden');
          placeholder.classList.add('hidden');
        } else {
          img.src = '';
          img.classList.add('hidden');
          placeholder.classList.remove('hidden');
        }
      }

    }
  }

  /**
   * Setup flip button click handler for a cell
   */
  setupFlipButton(cell) {
    const flipBtn = cell.querySelector('.flip-btn');
    if (flipBtn) {
      flipBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent drag
        const pageIndex = parseInt(cell.getAttribute('data-page-index'));
        this.emitter.emit('pageFlipped', pageIndex);
      });
    }
  }

  /**
   * Apply flip state to a page
   */
  setPageFlip(pageIndex, isFlipped) {
    const cell = this.elements.zineSheetsContainer.querySelector(`[data-page-index="${pageIndex}"]`);
    if (cell) {
      const img = cell.querySelector('.page-content-img');
      if (img) {
        if (isFlipped) {
          img.style.transform = `${img.style.transform || ''} rotate(180deg)`.trim();
          img.classList.add('flipped');
        } else {
          img.style.transform = img.style.transform.replace('rotate(180deg)', '').trim();
          img.classList.remove('flipped');
        }
      }
    }
  }

  setActiveTab() {
    // Obsolete
  }

  triggerFileUpload() {
    this.elements.pdfUpload?.click();
  }

  handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    if (this.elements.uploadZone) {
      this.elements.uploadZone.classList.add('dragover');
    }
  }

  handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    if (this.elements.uploadZone && !this.elements.uploadZone.contains(e.relatedTarget)) {
      this.elements.uploadZone.classList.remove('dragover');
    }
  }

  handleFileDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    if (this.elements.uploadZone) {
      this.elements.uploadZone.classList.remove('dragover');
    }

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
      this.emitter.emit('fileSelected', files[0]);
    } else {
      toast.error('Invalid File', 'Please drop a valid PDF file');
    }
  }

  handleKeyboard(e) {
    // Global keyboard shortcuts
    if (e.key === 'p' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      this.emitter.emit('print');
    }
  }

  showProgress(show, text = 'Processing PDF...', subtext = '') {
    if (show) {
      if (this.elements.progressContainer) {
        this.elements.progressContainer.classList.remove('hidden');
        this.elements.progressContainer.classList.add('flex');
      }
    } else {
      if (this.elements.progressContainer) {
        this.elements.progressContainer.classList.add('hidden');
        this.elements.progressContainer.classList.remove('flex');
      }
    }

    if (this.elements.progressText) { this.elements.progressText.textContent = text; }
    if (this.elements.progressSubtext) { this.elements.progressSubtext.textContent = subtext; }
  }

  /**
   * Load settings from localStorage
   */
  loadSettings() {
    const savedPaperSize = localStorage.getItem('paperSize');
    const savedOrientation = localStorage.getItem('orientation');

    if (savedPaperSize) {
      this.paperSize = savedPaperSize;
      if (this.elements.paperSizeSelect) { this.elements.paperSizeSelect.value = savedPaperSize; }
    }

    if (savedOrientation) {
      this.orientation = savedOrientation;
      if (this.elements.orientationSelect) { this.elements.orientationSelect.value = savedOrientation; }
    }
  }

  updatePaperSize(paperSize) {
    this.paperSize = paperSize;
    localStorage.setItem('paperSize', paperSize);
    this.updatePreviewLayout();
    this.emitter.emit('paperSizeChanged', { paperSize, orientation: this.orientation });
  }

  updateOrientation(orientation) {
    this.orientation = orientation;
    localStorage.setItem('orientation', orientation);
    this.updatePreviewLayout();
    this.emitter.emit('orientationChanged', { paperSize: this.paperSize, orientation });
  }


  updatePreviewLayout() {
    const sheet = document.querySelector('.print-sheet');
    if (sheet) {
      if (this.orientation === 'landscape') {
        sheet.style.aspectRatio = '1.414 / 1';
      } else {
        sheet.style.aspectRatio = '1 / 1.414';
      }
    }
  }

  getPaperDimensions(paperSize, orientation) {
    const size = PAPER_SIZES[paperSize] || PAPER_SIZES.a4;

    if (orientation === 'landscape') {
      return { width: size.height, height: size.width };
    }

    return { width: size.width, height: size.height };
  }

  getPaperSizeLabel(paperSize) {
    return PAPER_SIZES[paperSize]?.label || 'A4';
  }

  hasContent() {
    return this.elements.zineSheetsContainer &&
      this.elements.zineSheetsContainer.querySelector('.page-content-img:not(.hidden)') !== null;
  }

  on(event, handler) {
    this.emitter.on(event, handler);
  }
}