// Modern UI management class
import mitt from 'mitt';
import { PAPER_SIZES, ZINE_TEMPLATES } from './config.js';
import { toast } from './toast.js';
import { debounce } from './utils.js';

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

    // Ensure preview is visible and enabled on load
    if (this.elements.previewArea) {
      this.elements.previewArea.classList.remove('opacity-50', 'pointer-events-none');
    }
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
      pageNumbersCheckbox: $('#show-page-numbers'),

      // Toast
      toastContainer: $('#toast-container'),

      // Zine Tabs
      zineTabs: $('#zine-tabs'),
      zineTab1: $('#zine-tab-1'),
      zineTab2: $('#zine-tab-2'),

      gridRows: $('#grid-rows'),
      gridCols: $('#grid-cols'),
      gridTotal: $('#grid-total'),

      // Unused Pages Bucket
      unusedSection: $('#unused-pages-section'),
      unusedGrid: $('#unused-grid')
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
    this.elements.pageNumbersCheckbox?.addEventListener('change', (e) => this.togglePageNumbers(e.target.checked));

    // Action Buttons
    this.elements.printBtn?.addEventListener('click', () => this.emitter.emit('print'));
    this.elements.exportPdfBtn?.addEventListener('click', () => this.emitter.emit('export'));

    // Upload interactions
    this.elements.uploadZone?.addEventListener('click', () => this.triggerFileUpload());
    this.elements.uploadZone?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.triggerFileUpload();
      }
    });
    this.elements.uploadZone?.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.elements.uploadZone?.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    this.elements.uploadZone?.addEventListener('drop', (e) => this.handleFileDrop(e));

    this.elements.pdfUpload?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) { this.emitter.emit('fileSelected', file); }
    });


    // Grid size inputs
    // Debounce the grid resize event to prevent expensive DOM regeneration on every keystroke
    const updateGridSize = debounce((rows, cols) => {
      this.emitter.emit('gridSizeChanged', { rows, cols });
    }, 300);

    const handleGridChange = () => {
      const rows = parseInt(this.elements.gridRows?.value) || 2;
      const cols = parseInt(this.elements.gridCols?.value) || 4;
      if (this.elements.gridTotal) {
        this.elements.gridTotal.textContent = `(${rows * cols} pages)`;
      }
      updateGridSize(rows, cols);
    };
    const debouncedHandleGridChange = debounce(handleGridChange, 300);
    this.elements.gridRows?.addEventListener('input', debouncedHandleGridChange);
    this.elements.gridCols?.addEventListener('input', debouncedHandleGridChange);

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

    // Ensure preview is visible and enabled
    if (this.elements.previewArea) {
      this.elements.previewArea.classList.remove('opacity-50', 'pointer-events-none');
    }
  }


  /**
   * Generate a custom grid layout with specified rows and columns
   */
  generateCustomGrid(rows, cols, totalPDFPages = 0) {
    this.elements.zineSheetsContainer.innerHTML = '';
    const totalSlots = rows * cols;
    // Ensure we account for all pages if totalPDFPages is larger
    const actualPages = Math.max(totalSlots, totalPDFPages);

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
    grid.style.gridTemplateAreas = 'none'; // Critical: override default CSS areas

    for (let i = 0; i < totalSlots; i++) {
      const pageNum = i + 1;
      const cell = document.createElement('div');
      cell.className = 'page-cell h-full w-full bg-white relative flex items-center justify-center overflow-hidden transition-all duration-200';
      cell.setAttribute('data-page-index', i);
      cell.setAttribute('data-page', pageNum);
      cell.setAttribute('draggable', 'true');

      const labelText = pageNum === 1 ? 'Cover' : (pageNum === totalSlots ? 'Back' : `Page ${pageNum}`);

      cell.innerHTML = `
        <span class="page-label centered absolute top-2 left-2 px-2 py-1 bg-black text-white text-[10px] font-black rounded uppercase z-10 shadow-[2px_2px_0_black]">${labelText}</span>
        <button class="flip-btn absolute top-2 right-2 w-8 h-8 bg-white hover:bg-yellow-300 border-2 border-black flex items-center justify-center text-sm z-10 shadow-[2px_2px_0_black] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none">
            <span class="material-symbols-outlined text-lg font-bold">rotate_right</span>
        </button>
        <div class="page-placeholder text-gray-200 text-xs font-black uppercase tracking-widest">Empty</div>
        <img alt="Page ${pageNum}" class="page-content-img w-full h-full object-contain hidden transition-transform duration-300 ease-in-out" draggable="false" />
      `;

      const flipBtn = cell.querySelector('.flip-btn');
      if (flipBtn) {
        flipBtn.setAttribute('title', `Flip ${labelText}`);
        flipBtn.setAttribute('aria-label', `Rotate ${labelText} 180 degrees`);
      }

      this.setupDragAndDrop(cell);
      this.setupFlipButton(cell);
      grid.appendChild(cell);
    }

    sheetWrapper.appendChild(grid);
    this.elements.zineSheetsContainer.appendChild(sheetWrapper);

    // Generate bucket for extra pages
    this.generateUnusedBucket(totalSlots, actualPages);

    this.updatePreviewLayout();
  }

  generateUnusedBucket(startIndex, totalPages) {
    const { unusedSection, unusedGrid } = this.elements;
    if (!unusedSection || !unusedGrid) { return; }

    unusedGrid.innerHTML = '';

    // If no extra pages, hide the section
    if (startIndex >= totalPages) {
      unusedSection.classList.add('hidden');
      return;
    }

    unusedSection.classList.remove('hidden');

    // Create slots for remaining pages
    for (let i = startIndex; i < totalPages; i++) {
      const cell = document.createElement('div');
      // Using similar but distinct styling for bucket items
      cell.className = 'page-cell bg-white aspect-[1/1.414] relative rounded-lg shadow-sm border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing hover:border-blue-500 transition-colors duration-200';
      cell.setAttribute('data-page-index', i);
      cell.draggable = true;

      const img = document.createElement('img');
      img.className = 'page-content-img w-full h-full object-contain hidden pointer-events-none';
      img.draggable = false;

      const label = document.createElement('div');
      label.className = 'absolute top-1 left-1 bg-gray-500 text-white text-[8px] px-1.5 py-0.5 rounded-sm font-bold z-10';
      label.textContent = `#${i + 1}`;

      const placeholder = document.createElement('div');
      placeholder.className = 'text-[10px] uppercase font-bold text-gray-300 select-none';
      placeholder.textContent = 'Unused';

      cell.appendChild(label);
      cell.appendChild(placeholder);
      cell.appendChild(img);

      this.setupDragAndDrop(cell);
      unusedGrid.appendChild(cell);
    }
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
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
    grid.style.gridTemplateRows = 'repeat(4, 1fr)';

    // Generate cells based on template layout
    template.layout.forEach((item) => {
      const cell = document.createElement('div');
      cell.className = 'page-cell h-full w-full bg-white relative flex items-center justify-center overflow-hidden';
      cell.setAttribute('data-page-index', item.page - 1);
      cell.setAttribute('data-page', item.page);
      cell.setAttribute('draggable', 'true');

      const labelText = item.page === 1 ? 'Cover' : (item.page === 16 ? 'Back' : `Page ${item.page}`);

      cell.innerHTML = `
        <span class="page-label centered absolute top-2 left-2 px-2 py-1 bg-black text-white text-[10px] font-black rounded uppercase z-10 shadow-[2px_2px_0_black]">${labelText}</span>
        <button class="flip-btn absolute top-2 right-2 w-8 h-8 bg-white hover:bg-yellow-300 border-2 border-black flex items-center justify-center text-sm z-10 shadow-[2px_2px_0_black] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none">
            <span class="material-symbols-outlined text-lg font-bold">rotate_right</span>
        </button>
        <div class="page-placeholder text-gray-200 text-xs font-black uppercase tracking-widest">Empty</div>
        <img alt="Page ${item.page}" class="page-content-img w-full h-full object-contain hidden transition-transform duration-300 ease-in-out" draggable="false" />
      `;

      const flipBtn = cell.querySelector('.flip-btn');
      if (flipBtn) {
        flipBtn.setAttribute('title', `Flip ${labelText}`);
        flipBtn.setAttribute('aria-label', `Rotate ${labelText} 180 degrees`);
      }

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

    // Cut lines removed per user request

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
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
      grid.style.gridTemplateRows = 'repeat(2, 1fr)';

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
          <span class="page-label centered absolute top-2 left-2 px-2 py-1 bg-black text-white text-[10px] font-black rounded uppercase z-10 shadow-[2px_2px_0_black]">${labelText}${sheetLabel}</span>
        <button class="flip-btn absolute top-2 right-2 w-8 h-8 bg-white hover:bg-yellow-300 border-2 border-black flex items-center justify-center text-sm z-10 shadow-[2px_2px_0_black] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none">
              <span class="material-symbols-outlined text-lg font-bold">rotate_right</span>
          </button>
          <div class="page-placeholder text-gray-200 text-xs font-black uppercase tracking-widest">Empty</div>
        <img alt="Page ${pageIdx}" class="page-content-img w-full h-full object-contain hidden transition-transform duration-300 ease-in-out" draggable="false" />
        `;

        const flipBtn = cell.querySelector('.flip-btn');
        if (flipBtn) {
          flipBtn.setAttribute('title', `Flip ${labelText}`);
          flipBtn.setAttribute('aria-label', `Rotate ${labelText} 180 degrees`);
        }

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
    // Search in both main container (by data-page-index) and unused grid
    // Note: Use querySelectorAll to catch duplicates if any, but usually unique by index
    const cells = [
      ...Array.from(this.elements.zineSheetsContainer.querySelectorAll(`.page-cell[data-page-index="${pageIndex}"]`)),
      ...(this.elements.unusedGrid ? Array.from(this.elements.unusedGrid.querySelectorAll(`.page-cell[data-page-index="${pageIndex}"]`)) : [])
    ];

    cells.forEach(cell => {
      const img = cell.querySelector('.page-content-img');
      const placeholder = cell.querySelector('.page-placeholder');

      // Handle "Unused" placeholder structure which is different
      const unusedPlaceholder = cell.querySelector('.text-gray-300'); // The 'Unused' text div

      if (dataUrl) {
        if (img) {
          img.src = dataUrl;
          img.classList.remove('hidden');
        }
        if (placeholder) { placeholder.classList.add('hidden'); }
        // Hide "Unused" text if present
        if (unusedPlaceholder && unusedPlaceholder.textContent === 'Unused') {
          unusedPlaceholder.classList.add('hidden');
        }
      } else {
        if (img) {
          img.src = '';
          img.classList.add('hidden');
        }
        if (placeholder) { placeholder.classList.remove('hidden'); }
        if (unusedPlaceholder && unusedPlaceholder.textContent === 'Unused') {
          unusedPlaceholder.classList.remove('hidden');
        }
      }
    });

    // Also force show the bucket section if we are populating it
    if (this.elements.unusedGrid && this.elements.unusedGrid.children.length > 0) {
      this.elements.unusedSection.classList.remove('hidden');
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

  togglePageNumbers(show) {
    const labels = document.querySelectorAll('.page-label');
    labels.forEach(label => {
      if (show) {
        label.classList.remove('hidden');
        label.classList.add('centered'); // Force centered style when shown per user request
      } else {
        label.classList.add('hidden');
        label.classList.remove('centered');
      }
    });
  }


  updatePreviewLayout() {
    const sheets = document.querySelectorAll('.print-sheet');
    if (!sheets.length) { return; }

    // Get dimensions for the current selection
    const dims = this.getPaperDimensions(this.paperSize, this.orientation);
    // Calculate ratio (width / height)
    const ratio = dims.width / dims.height;

    sheets.forEach(sheet => {
      // 1. Set Aspect Ratio
      sheet.style.aspectRatio = `${ratio}`;

      // 2. Fit to Screen Logic
      // We want the sheet to fit within, say, 75vh to leave room for headers/controls
      // and max-width 100% of container.
      sheet.style.maxHeight = '75vh';
      sheet.style.maxWidth = '100%'; // Ensure it fits in the container width
      sheet.style.margin = '0 auto'; // Center it
    });
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