// Modern UI management class
import mitt from 'mitt';
import { PAPER_SIZES, ZINE_TEMPLATES } from '../../utils/config.js';
import { toast } from '../Toast.js';
import { debounce, formatFileSize } from '../../utils/helpers.js';
import {
  MAX_UPLOAD_FILES,
  MIXED_UPLOAD_WARNING,
  SUPPORTED_UPLOAD_MESSAGE,
  getFileTypeLabel,
  partitionSupportedFiles
} from '../../utils/fileValidation.js';

const PAGE_TOOLBAR_HTML = `
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
        </div>`;

// ⚡ Bolt: Performance Optimization
// Using a <template> and .cloneNode(true) is ~50-60% faster than setting innerHTML in a loop,
// as it avoids repeated HTML parsing by the browser. This is especially noticeable
// when generating large custom grids.
const PAGE_CELL_TEMPLATE = document.createElement('template');
PAGE_CELL_TEMPLATE.innerHTML = `
  <span class="page-label"></span>
  ${PAGE_TOOLBAR_HTML}
  <div class="page-placeholder flex flex-col items-center justify-center text-gray-400 gap-2 absolute inset-0">
     <span class="material-symbols-outlined text-3xl">note_stack</span>
     <span class="text-[10px] font-bold uppercase tracking-widest">Empty</span>
  </div>
  <img class="page-content-img w-full h-full object-contain hidden transition-transform duration-200 ease-in-out relative z-[5]" draggable="false" />
`;

const TOOLBAR_BUTTON_CONFIG = [
  {
    selector: '.flip-btn',
    title: (labelText) => `Flip ${labelText}`,
    ariaLabel: (labelText) => `Rotate ${labelText} 180 degrees`,
    event: 'pageFlipped'
  },
  {
    selector: '.zoom-btn',
    title: (labelText) => `Quick Preview ${labelText}`,
    ariaLabel: (labelText) => `Quick Preview ${labelText}`,
    event: 'pageZoomed'
  },
  {
    selector: '.crop-btn',
    title: (labelText) => `Toggle Crop/Zoom ${labelText}`,
    ariaLabel: (labelText) => `Toggle Crop/Zoom ${labelText}`,
    event: 'pageCropToggled'
  },
  {
    selector: '.remove-btn',
    title: (labelText) => `Remove ${labelText}`,
    ariaLabel: (labelText) => `Remove ${labelText}`,
    event: 'pageRemoved'
  }
];

export class UIManager {
  constructor() {
    this.emitter = mitt();
    this.elements = {};
    this.paperSize = 'letter';
    this.orientation = 'landscape';
    this._pageCellsCache = null;
    this.activePageIndex = null;
    this.pagePickerState = null;
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
      previewLayoutChip: $('#preview-layout-chip'),
      previewCountChip: $('#preview-count-chip'),
      previewEmptyTitle: $('#preview-empty-title'),
      previewEmptyBody: $('#preview-empty-body'),
      zineSheetsContainer: $('#zine-sheets-container'),
      workflowChip: $('#workflow-chip'),
      workflowButtons: Array.from(document.querySelectorAll('.workflow-step')),

      printBtn: $('#printBtn'),
      printBtnLabel: $('#printBtnLabel'),
      exportPdfBtn: $('#exportPdfBtn'),
      exportPdfBtnLabel: $('#exportPdfBtnLabel'),
      view3dBtn: $('#view3dBtn'),
      view3dBtnLabel: $('#view3dBtnLabel'),
      pdfUpload: $('#pdf-upload'),
      uploadStatus: $('#upload-status'),

      // Progress
      progressContainer: $('#progress-container'),
      progressBarWrap: $('#progress-bar-wrap'),
      progressFill: $('#progress-fill'),
      progressBar: $('#progress-bar'),
      progressText: $('#progress-text'),
      progressSubtext: $('#progress-subtext'),
      progressBarContainer: $('.progress-bar-container'),

      // Settings
      paperSizeSelect: $('#paper-size-select'),
      orientationSelect: $('#orientation-select'),
      pageNumbersCheckbox: $('#show-page-numbers'),

      // Toast
      toastContainer: $('#toast-container'),


      gridRows: $('#grid-rows'),
      gridCols: $('#grid-cols'),
      gridTotal: $('#grid-total'),

      // Unused Pages Bucket
      unusedSection: $('#unused-pages-section'),
      unusedGrid: $('#unused-grid'),

      // Uploaded Files List
      uploadedFilesList: $('#uploaded-files-list'),

      // 3D Modal
      zine3dModal: $('#zine-3d-modal'),
      close3dBtn: $('#close-3d-btn'),
      zine3dContainer: $('#zine-3d-container'),
      foldSlider: $('#fold-slider'),
      foldStatus: $('#fold-status'),
      foldHelper: $('#fold-helper'),
      foldStepButtons: Array.from(document.querySelectorAll('.fold-step-btn')),
      bookletPreviewContainer: $('#booklet-preview-container'),
      bookletPrevBtn: $('#booklet-prev-btn'),
      bookletNextBtn: $('#booklet-next-btn'),
      bookletStatus: $('#booklet-status'),

      // Page Picker Modal
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
    this.elements.view3dBtn?.addEventListener('click', () => this.emitter.emit('view3d'));
    this.elements.workflowButtons?.forEach((button) => {
      button.addEventListener('click', () => this.handleWorkflowAction(button.dataset.workflowStep));
    });

    // 3D Modal
    this.elements.close3dBtn?.addEventListener('click', () => this.toggle3DModal(false));
    this.elements.foldSlider?.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.updateFoldUI(val);
        this.emitter.emit('foldProgress', val);
    });
    this.elements.foldStepButtons?.forEach((button) => {
      button.addEventListener('click', () => {
        const value = parseFloat(button.dataset.foldValue || '0');
        if (this.elements.foldSlider) {
          this.elements.foldSlider.value = String(value);
        }
        this.updateFoldUI(value);
        this.emitter.emit('foldProgress', value);
      });
    });

    // Page picker modal
    this.elements.pagePickerClose?.addEventListener('click', () => this.closePagePicker(null));
    this.elements.pagePickerCancel?.addEventListener('click', () => this.closePagePicker(null));
    this.elements.pagePickerBackdrop?.addEventListener('click', () => this.closePagePicker(null));
    this.elements.pagePickerConfirm?.addEventListener('click', () => this.confirmPagePickerSelection());
    this.elements.pagePickerSelectFirst?.addEventListener('click', () => this.applyPagePickerPreset('first'));
    this.elements.pagePickerSelectLast?.addEventListener('click', () => this.applyPagePickerPreset('last'));
    this.elements.pagePickerSelectEven?.addEventListener('click', () => this.applyPagePickerPreset('even'));
    this.elements.pagePickerSelectOdd?.addEventListener('click', () => this.applyPagePickerPreset('odd'));
    this.elements.pagePickerClear?.addEventListener('click', () => this.applyPagePickerPreset('clear'));

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
      const files = Array.from(e.target.files);
      this.handleIncomingFiles(files);
      e.target.value = '';
    });


    // Grid size inputs
    // Debounce the grid resize event to prevent expensive DOM regeneration on every keystroke
    const updateGridSize = debounce((rows, cols) => {
      this.emitter.emit('gridSizeChanged', { rows, cols });
    }, 300);

    const handleGridChange = () => {
      let rows = parseInt(this.elements.gridRows?.value) || 2;
      let cols = parseInt(this.elements.gridCols?.value) || 4;

      // Clamp values to prevent client-side DoS via massive DOM node creation
      rows = Math.max(1, Math.min(10, rows));
      cols = Math.max(1, Math.min(10, cols));

      // Sync clamped values back to the UI
      if (this.elements.gridRows) { this.elements.gridRows.value = rows; }
      if (this.elements.gridCols) { this.elements.gridCols.value = cols; }

      if (this.elements.gridTotal) {
        this.elements.gridTotal.textContent = `(${rows * cols} pages)`;
      }
      updateGridSize(rows, cols);
    };
    const debouncedHandleGridChange = debounce(handleGridChange, 300);
    this.elements.gridRows?.addEventListener('input', debouncedHandleGridChange);
    this.elements.gridCols?.addEventListener('input', debouncedHandleGridChange);

    // Document click to clear active state
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.page-cell') && !e.target.closest('.action-button')) {
            this.clearActiveSelection();
        }
    });

    // Keyboard
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
  }





  /**
   * Set the UI to "ready" state (enable preview area and action buttons)
   */
  setReady(ready, description = null) {
    if (ready) {
      this.elements.actionButtons?.classList.remove('hidden');
    } else {
      this.elements.actionButtons?.classList.add('hidden');
    }

    this.setPreviewDescription(description);
  }

  setPreviewDescription(description = null) {
    if (description && this.elements.previewDescription) {
      this.elements.previewDescription.textContent = description;
    }
  }

  focusPreviewArea() {
    if (!this.elements.previewArea) {
      return;
    }

    this.elements.previewArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.elements.previewArea.classList.add('workflow-focus');
    window.setTimeout(() => {
      this.elements.previewArea?.classList.remove('workflow-focus');
    }, 1200);
  }

  /**
   * Toggle the 3D Modal visibility
   */
  toggle3DModal(show) {
      if (!this.elements.zine3dModal) {return;}
      if (show) {
          this.elements.zine3dModal.style.display = 'flex';
          this.elements.zine3dModal.classList.remove('hidden');
          // small delay for transition
          setTimeout(() => {
              this.elements.zine3dModal.classList.remove('opacity-0');
              this.elements.zine3dModal.classList.add('opacity-100');
          }, 10);
      } else {
          this.elements.zine3dModal.classList.add('opacity-0');
          this.elements.zine3dModal.classList.remove('opacity-100');
          setTimeout(() => {
              this.elements.zine3dModal.classList.add('hidden');
              this.elements.zine3dModal.style.display = 'none';
          }, 300);
      }
  }

  updateFoldUI(value) {
    let status = 'Flat';
    let helper = 'Keep the sheet open with the slit centered and both rows visible.';
    let activeStep = 0;

    if (value >= 2.99) {
      status = 'Booklet';
      helper = 'Press the stack flat so page 1 becomes the cover and page 8 becomes the back.';
      activeStep = 5;
    } else if (value > 2) {
      status = 'Folding Shut';
      helper = 'Keep pushing inward until the four sections swing together and the covers meet.';
      activeStep = 5;
    } else if (value >= 2) {
      status = 'Diamond Open';
      helper = 'The slit is fully open. The sheet should read like a plus or diamond before flattening.';
      activeStep = 4;
    } else if (value > 1) {
      status = 'Opening Slit';
      helper = 'Hold the folded strip by both short ends and push inward until the center opens into a diamond.';
      activeStep = 3;
    } else if (value >= 1) {
      status = 'Folded Strip';
      helper = 'The top row should now sit directly on the bottom row as one folded strip.';
      activeStep = 2;
    } else if (value > 0) {
      status = 'Folding Down';
      helper = 'Bring the top row down onto the bottom row along the long center crease.';
      activeStep = 1;
    }

    if (this.elements.foldStatus) {
      this.elements.foldStatus.textContent = status;
    }
    if (this.elements.foldHelper) {
      this.elements.foldHelper.textContent = helper;
    }
    this.elements.foldStepButtons?.forEach((button, index) => {
      const isActive = index === activeStep;
      button.classList.toggle('bg-black', isActive);
      button.classList.toggle('text-white', isActive);
      button.classList.toggle('text-black', !isActive);
      button.classList.toggle('border-black', !isActive);
      button.classList.toggle('bg-white', !isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  handleWorkflowAction(step) {
    if (step === 'upload') {
      this.triggerFileUpload();
      return;
    }

    if (step === 'arrange') {
      this.focusPreviewArea();
      return;
    }

    if (step === 'preview') {
      if (!this.elements.view3dBtn?.disabled) {
        this.emitter.emit('view3d');
      }
      return;
    }

    if (step === 'export') {
      if (!this.elements.exportPdfBtn?.disabled) {
        this.emitter.emit('export');
      }
    }
  }

  updateWorkflow({
    uploadedFiles = 0,
    filledPages = 0,
    totalSlots = 8,
    layoutLabel = '8-page mini-zine',
    isMiniZineLayout = true,
    previewOpened = false,
    exportCompleted = false
  } = {}) {
    const hasQueuedFiles = uploadedFiles > 0;
    const hasContent = filledPages > 0;
    const hasStarted = hasQueuedFiles || hasContent;
    const isLoading = hasQueuedFiles && !hasContent;
    const previewReady = hasContent && isMiniZineLayout;
    const exportReady = hasContent;
    const filledSummary = `${filledPages}/${totalSlots}`;
    const placedSummary = `${filledPages} placed`;

    let nextLabel = 'Import';
    let emptyTitle = 'The sheet is ready when you are.';
    let emptyBody = 'Add files from the rail.';

    if (hasContent && !isMiniZineLayout) {
      nextLabel = exportCompleted ? 'Refine' : 'Export';
    } else if (hasContent && previewOpened && exportCompleted) {
      nextLabel = 'Refine';
    } else if (hasContent && previewOpened) {
      nextLabel = 'Export';
    } else if (hasContent) {
      nextLabel = isMiniZineLayout ? 'Preview' : 'Export';
    } else if (hasQueuedFiles) {
      nextLabel = 'Arrange';
      emptyTitle = 'Importing pages into the sheet.';
      emptyBody = 'Please wait.';
    }

    this.elements.previewArea?.classList.toggle('has-content', hasContent);
    this.elements.previewArea?.classList.toggle('is-empty', !hasContent);
    this.elements.previewArea?.classList.toggle('is-loading', isLoading);

    if (this.elements.workflowChip) {
      this.elements.workflowChip.textContent = `Next: ${nextLabel}`;
    }
    if (this.elements.previewLayoutChip) {
      this.elements.previewLayoutChip.textContent = layoutLabel;
    }
    if (this.elements.previewCountChip) {
      this.elements.previewCountChip.textContent = hasContent ? placedSummary : (isLoading ? 'Importing' : '0 placed');
    }
    if (this.elements.previewEmptyTitle) {
      this.elements.previewEmptyTitle.textContent = emptyTitle;
    }
    if (this.elements.previewEmptyBody) {
      this.elements.previewEmptyBody.textContent = emptyBody;
    }

    const previewDescription = hasContent
      ? `${layoutLabel} • ${placedSummary}`
      : hasQueuedFiles
        ? 'Importing pages into the sheet...'
        : 'Add files to start.';
    this.setPreviewDescription(previewDescription);

    this.updateActionButtonState(this.elements.view3dBtn, {
      enabled: previewReady,
      title: !hasContent
        ? 'Add pages to preview the zine'
        : isMiniZineLayout
          ? 'Open fold and booklet preview'
          : 'Fold preview is only available for the 2×4 mini-zine layout'
    });
    this.updateActionButtonState(this.elements.exportPdfBtn, {
      enabled: exportReady,
      title: exportReady ? 'Download PDF (Ctrl+S)' : 'Add pages before exporting'
    });
    this.updateActionButtonState(this.elements.printBtn, {
      enabled: exportReady,
      title: exportReady ? 'Print Zine (Ctrl+P)' : 'Add pages before printing'
    });

    if (this.elements.view3dBtnLabel) {
      this.elements.view3dBtnLabel.textContent = 'Preview';
    }
    if (this.elements.exportPdfBtnLabel) {
      this.elements.exportPdfBtnLabel.textContent = 'Export PDF';
    }
    if (this.elements.printBtnLabel) {
      this.elements.printBtnLabel.textContent = 'Print';
    }

    const workflowStates = {
      upload: {
        state: hasStarted ? 'done' : 'ready',
        text: hasQueuedFiles ? `${uploadedFiles} file${uploadedFiles === 1 ? '' : 's'}` : (hasContent ? 'Loaded' : 'Ready'),
        disabled: false,
        current: !hasStarted
      },
      arrange: {
        state: hasContent ? (previewOpened || exportCompleted ? 'done' : 'ready') : 'locked',
        text: hasContent ? filledSummary : 'Waiting',
        disabled: !hasStarted,
        current: hasContent && !previewOpened
      },
      preview: {
        state: previewOpened ? 'done' : (previewReady ? 'ready' : 'locked'),
        text: previewOpened ? 'Viewed' : (previewReady ? 'Open' : (hasContent ? 'Mini-zine' : 'Waiting')),
        disabled: !previewReady,
        current: previewReady && !previewOpened
      },
      export: {
        state: exportCompleted ? 'done' : (exportReady ? 'ready' : 'locked'),
        text: exportCompleted ? 'Saved' : (exportReady ? 'Ready' : 'Waiting'),
        disabled: !exportReady,
        current: exportReady && (previewOpened || !isMiniZineLayout) && !exportCompleted
      }
    };

    this.elements.workflowButtons?.forEach((button) => {
      const step = workflowStates[button.dataset.workflowStep];
      if (!step) {
        return;
      }

      button.classList.remove('is-done', 'is-ready', 'is-locked', 'is-current');
      button.classList.add(`is-${step.state}`);
      if (step.current) {
        button.classList.add('is-current');
        button.setAttribute('aria-current', 'step');
      } else {
        button.removeAttribute('aria-current');
      }

      button.disabled = step.disabled;
      button.setAttribute('aria-disabled', step.disabled ? 'true' : 'false');

      const stateLabel = button.querySelector('.workflow-step-state');
      if (stateLabel) {
        stateLabel.textContent = step.text;
      }
    });
  }

  updateActionButtonState(button, { enabled, title }) {
    if (!button) {
      return;
    }

    button.disabled = !enabled;
    button.setAttribute('aria-disabled', enabled ? 'false' : 'true');
    button.title = title;
  }

  /**
   * Update progress bar
   */
  updateProgress(percent) {
    if (this.elements.progressFill) {
      this.elements.progressFill.style.width = `${percent}%`;
    }
    if (this.elements.progressBarWrap) {
      this.elements.progressBarWrap.setAttribute('aria-valuenow', percent);
    }
  }

  /**
   * Update status message
   */
  setStatus(message, type = 'info') {
    if (this.elements.uploadStatus) {
      this.elements.uploadStatus.textContent = message;
      this.elements.uploadStatus.className = `upload-status${type === 'error' ? ' upload-status--error' : type === 'success' ? ' upload-status--success' : ''}`;
    }
  }

  /**
   * Generate sheets and page placeholders
   * @param {number} numPages - Number of pages in the PDF
   * @param {string} templateType - Template type: 'mini-8', 'dual-16', or 'accordion-16'
   */
  generateLayout(numPages = 8, templateType = null) {
    if (!this.elements.zineSheetsContainer) { return; }

    // Invalidate cell cache when layout changes
    this._pageCellsCache = null;

    this.elements.zineSheetsContainer.innerHTML = '';
    this._pageCellsCache = null;

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
      throw new Error(`Unknown template: ${templateType}`);
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
  createSheetGrid({ sheetNumber, template, gridClass = 'zine-grid', columns, rows, id }) {
    const sheetWrapper = document.createElement('div');
    sheetWrapper.className = 'print-sheet w-full p-0 relative overflow-hidden rounded-sm';
    sheetWrapper.setAttribute('data-sheet', sheetNumber);
    sheetWrapper.setAttribute('data-template', template);

    const grid = document.createElement('div');
    grid.className = gridClass;
    grid.id = id;
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    return { sheetWrapper, grid };
  }

  createPageCell({ pageIndex, pageNumber, labelText, altText }) {
    const cell = document.createElement('div');
    cell.className = 'page-cell h-full w-full bg-white relative flex items-center justify-center overflow-hidden transition-all duration-200 group';
    cell.setAttribute('data-page-index', pageIndex);
    cell.setAttribute('data-page', pageNumber);
    cell.setAttribute('draggable', 'true');

    cell.replaceChildren(PAGE_CELL_TEMPLATE.content.cloneNode(true));
    cell.querySelector('.page-label').textContent = labelText;
    cell.querySelector('.page-content-img').alt = altText;

    this.setupDragAndDrop(cell);
    this.setupToolbar(cell, labelText);
    this.setupSelection(cell, pageIndex);

    return cell;
  }

  generateCustomGrid(rows, cols, totalPDFPages = 0) {
    this.elements.zineSheetsContainer.innerHTML = '';
    this._pageCellsCache = null;
    this.currentTemplate = `custom-${rows}x${cols}`;
    const totalSlots = rows * cols;
    const actualPages = Math.max(totalSlots, totalPDFPages);
    const sheetCount = Math.max(1, Math.ceil(actualPages / totalSlots));

    for (let sheetIndex = 0; sheetIndex < sheetCount; sheetIndex++) {
      const { sheetWrapper, grid } = this.createSheetGrid({
        sheetNumber: sheetIndex + 1,
        template: `custom-${rows}x${cols}`,
        columns: cols,
        rows,
        id: `zine-grid-sheet-${sheetIndex + 1}`
      });
      grid.style.gridTemplateAreas = 'none';

      for (let slotIndex = 0; slotIndex < totalSlots; slotIndex++) {
        const pageIndex = (sheetIndex * totalSlots) + slotIndex;
        const pageNum = pageIndex + 1;
        const labelText = pageNum === 1 ? 'Cover' : `Page ${pageNum}`;
        const cell = this.createPageCell({
          pageIndex,
          pageNumber: slotIndex + 1,
          labelText,
          altText: `Page ${pageNum}`
        });
        grid.appendChild(cell);
      }

      sheetWrapper.appendChild(grid);
      this.elements.zineSheetsContainer.appendChild(sheetWrapper);
    }

    this.generateUnusedBucket(actualPages, actualPages);

    this.updatePreviewLayout();
  }

  generateUnusedBucket(startIndex, totalPages) {
    this._pageCellsCache = null;
    const { unusedSection, unusedGrid } = this.elements;
    if (!unusedSection || !unusedGrid) { return; }

    // Invalidate cell cache when layout changes
    this._pageCellsCache = null;

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
      cell.className = 'page-cell bg-white aspect-[1/1.414] relative border-2 border-black flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:border-[var(--primary-vibrant)] transition-all duration-200 group';
      cell.setAttribute('data-page-index', i);
      cell.draggable = true;

      const img = document.createElement('img');
      img.className = 'page-content-img w-full h-full object-contain hidden pointer-events-none group-hover:scale-105 transition-transform duration-200';
      img.draggable = false;

      const label = document.createElement('div');
      label.className = 'page-label bg-black text-white text-[10px] font-bold px-1.5 py-0.5 absolute top-0 left-0 z-10';
      label.textContent = `#${i + 1}`;

      const placeholder = document.createElement('div');
      placeholder.className = 'unused-placeholder-text text-[10px] uppercase font-bold text-gray-400 select-none';
      placeholder.textContent = 'Unused';

      cell.appendChild(label);
      cell.appendChild(placeholder);
      cell.appendChild(img);

      this.setupDragAndDrop(cell);
      this.setupSelection(cell, i);
      unusedGrid.appendChild(cell);
    }
  }

  /**
   * Generate the accordion-16 layout (single sheet, 4x4 grid)
   */
  generateAccordionLayout(template) {
    this._pageCellsCache = null;
    const { sheetWrapper, grid } = this.createSheetGrid({
      sheetNumber: 1,
      template: 'accordion-16',
      gridClass: 'zine-grid accordion-16',
      columns: 4,
      rows: 4,
      id: 'zine-grid-sheet-1'
    });

    // Generate cells based on template layout
    template.layout.forEach((item) => {
      const labelText = item.page === 1 ? 'Cover' : (item.page === 16 ? 'Back' : `Page ${item.page}`);
      const cell = this.createPageCell({
        pageIndex: item.page - 1,
        pageNumber: item.page,
        labelText,
        altText: `Page ${item.page}`
      });
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
    this._pageCellsCache = null;
    const numSheets = Math.max(1, Math.ceil(numPages / 8));
    const miniLayout = ZINE_TEMPLATES['mini-8'].layout;

    for (let s = 1; s <= numSheets; s++) {
      const { sheetWrapper, grid } = this.createSheetGrid({
        sheetNumber: s,
        template: 'mini-8',
        gridClass: 'zine-grid mini-zine',
        columns: 4,
        rows: 2,
        id: `zine-grid-sheet-${s}`
      });

      for (const item of miniLayout) {
        const pageNumberOnSheet = item.page;
        const pageIdx = ((s - 1) * 8) + pageNumberOnSheet;
        const labelText = pageIdx === 1 ? 'Cover' : (pageNumberOnSheet === 8 ? 'Back' : `Page ${pageIdx}`);
        const cell = this.createPageCell({
          pageIndex: pageIdx - 1,
          pageNumber: pageNumberOnSheet,
          labelText,
          altText: `Page ${pageIdx}`
        });
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

  setupSelection(cell, pageIndex) {
    cell.addEventListener('click', (e) => {
      // Don't trigger if they clicked a toolbar button natively
      if (e.target.closest('.page-toolbar')) {
        return;
      }

      e.stopPropagation();
      this.setActivePage(pageIndex);
    });
  }

  setActivePage(pageIndex) {
    if (this.activePageIndex === pageIndex) {
      return;
    }

    this.clearActiveSelection();
    this.activePageIndex = pageIndex;

    const cells = this._getPageCells(pageIndex);
    cells.forEach(c => c.classList.add('active'));
  }

  clearActiveSelection() {
    if (this.activePageIndex === null) {
      return;
    }
    const prevCells = this._getPageCells(this.activePageIndex);
    prevCells.forEach(c => c.classList.remove('active'));
    this.activePageIndex = null;
  }

  updatePagePreview(pageIndex, dataUrl) {
    const cells = this._getPageCells(pageIndex);

    cells.forEach(cell => {
      const img = cell.querySelector('.page-content-img');
      const placeholder = cell.querySelector('.page-placeholder');

      // Handle "Unused" placeholder structure which is different
      const unusedPlaceholder = cell.querySelector('.unused-placeholder-text'); // The 'Unused' text div

      if (dataUrl) {
        cell.classList.add('has-page');
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
        cell.classList.remove('has-page');
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
   * Setup toolbar button click handlers for a cell
   */
  setupToolbar(cell, labelText) {
    const pageIndex = parseInt(cell.getAttribute('data-page-index'));

    cell.querySelectorAll('.material-symbols-outlined').forEach((icon) => {
      icon.setAttribute('aria-hidden', 'true');
    });

    TOOLBAR_BUTTON_CONFIG.forEach(({ selector, title, ariaLabel, event }) => {
      const button = cell.querySelector(selector);
      if (!button) {
        return;
      }

      if (labelText) {
        button.setAttribute('title', title(labelText));
        button.setAttribute('aria-label', ariaLabel(labelText));
      }

      button.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent drag
        this.emitter.emit(event, pageIndex);
      });
    });
  }

  _getPageCells(pageIndex) {
    if (!this._pageCellsCache) {
      this._pageCellsCache = new Map();
      const cells = [
        ...Array.from(this.elements.zineSheetsContainer?.querySelectorAll('.page-cell') || []),
        ...Array.from(this.elements.unusedGrid?.querySelectorAll('.page-cell') || [])
      ];

      cells.forEach(cell => {
        const idx = parseInt(cell.getAttribute('data-page-index'), 10);
        if (!isNaN(idx)) {
          if (!this._pageCellsCache.has(idx)) {
            this._pageCellsCache.set(idx, []);
          }
          this._pageCellsCache.get(idx).push(cell);
        }
      });
    }
    return this._pageCellsCache.get(parseInt(pageIndex, 10)) || [];
  }

  /**
   * Apply zoom/crop state to a page
   */
  setPageZoom(pageIndex, isZoomed) {
    const cells = this._getPageCells(pageIndex);

    cells.forEach(cell => {
      if (isZoomed) {
        cell.classList.add('page-zoomed');
        const cropBtn = cell.querySelector('.crop-btn span');
        if (cropBtn) {cropBtn.textContent = 'aspect_ratio';} // Back to fit
      } else {
        cell.classList.remove('page-zoomed');
        const cropBtn = cell.querySelector('.crop-btn span');
        if (cropBtn) {cropBtn.textContent = 'crop_free';} // To crop
      }
    });
  }

  /**
   * Apply flip state to a page
   */
  setPageFlip(pageIndex, isFlipped) {
    const cells = this._getPageCells(pageIndex);

    cells.forEach(cell => {
      if (isFlipped) {
        cell.classList.add('is-flipped');
      } else {
        cell.classList.remove('is-flipped');
      }
    });
  }

  isPagePickerOpen() {
    return !!this.pagePickerState;
  }

  async showPagePicker({ fileName, totalPages, selectionLimit, thumbnails }) {
    if (!this.elements.pagePickerModal || !this.elements.pagePickerGrid) {
      return Array.from({ length: Math.min(selectionLimit, totalPages) }, (_, index) => index + 1);
    }

    if (this.pagePickerState?.resolve) {
      this.pagePickerState.resolve(null);
    }

    const initialSelection = thumbnails
      .slice(0, Math.min(selectionLimit, thumbnails.length))
      .map(item => item.pageNumber);

    this.pagePickerState = {
      resolve: null,
      thumbnails,
      selectionLimit,
      selected: new Set(initialSelection)
    };

    if (this.elements.pagePickerSubtitle) {
      this.elements.pagePickerSubtitle.textContent = `${fileName} has ${totalPages} pages. Pick up to ${selectionLimit}.`;
    }

    if (this.elements.pagePickerSelectFirst) {
      this.elements.pagePickerSelectFirst.textContent = `First ${selectionLimit}`;
    }
    if (this.elements.pagePickerSelectLast) {
      this.elements.pagePickerSelectLast.textContent = `Last ${selectionLimit}`;
    }

    this.elements.pagePickerGrid.innerHTML = '';

    thumbnails.forEach(({ pageNumber, thumbnailUrl }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'page-picker-thumb';
      button.setAttribute('data-page-number', pageNumber);
      button.setAttribute('aria-pressed', initialSelection.includes(pageNumber) ? 'true' : 'false');

      button.innerHTML = `
        <div class="page-picker-thumb-media">
          <img src="${thumbnailUrl}" alt="PDF page ${pageNumber}">
        </div>
        <div class="page-picker-thumb-page">
          <span>Page ${pageNumber}</span>
          <span class="page-picker-thumb-order" aria-hidden="true"></span>
        </div>
      `;

      button.addEventListener('click', () => this.togglePagePickerSelection(pageNumber));
      this.elements.pagePickerGrid.appendChild(button);
    });

    this.elements.pagePickerModal.classList.remove('hidden');
    this.elements.pagePickerModal.classList.add('flex');
    document.body.style.overflow = 'hidden';
    this.updatePagePickerSelectionUI();

    return new Promise((resolve) => {
      if (this.pagePickerState) {
        this.pagePickerState.resolve = resolve;
      } else {
        resolve(null);
      }
    });
  }

  togglePagePickerSelection(pageNumber) {
    if (!this.pagePickerState) { return; }

    const { selected, selectionLimit } = this.pagePickerState;

    if (selected.has(pageNumber)) {
      selected.delete(pageNumber);
    } else {
      if (selected.size >= selectionLimit) {
        toast.warning('Selection Limit Reached', `This import can place up to ${selectionLimit} pages. Deselect one to add another.`);
        return;
      }
      selected.add(pageNumber);
    }

    this.updatePagePickerSelectionUI();
  }

  applyPagePickerPreset(preset) {
    if (!this.pagePickerState) { return; }

    const { thumbnails, selectionLimit, selected } = this.pagePickerState;
    selected.clear();

    let nextSelection = [];
    if (preset === 'first') {
      nextSelection = thumbnails.slice(0, selectionLimit);
    } else if (preset === 'last') {
      nextSelection = thumbnails.slice(-selectionLimit);
    } else if (preset === 'even') {
      nextSelection = thumbnails.filter(item => item.pageNumber % 2 === 0).slice(0, selectionLimit);
    } else if (preset === 'odd') {
      nextSelection = thumbnails.filter(item => item.pageNumber % 2 === 1).slice(0, selectionLimit);
    } else if (preset === 'clear') {
      nextSelection = [];
    }

    nextSelection.forEach(item => selected.add(item.pageNumber));
    this.updatePagePickerSelectionUI();
  }

  updatePagePickerSelectionUI() {
    if (!this.pagePickerState || !this.elements.pagePickerGrid) { return; }

    const selectedPages = Array.from(this.pagePickerState.selected).sort((a, b) => a - b);
    const orderMap = new Map(selectedPages.map((pageNumber, index) => [pageNumber, index + 1]));
    const hasCapacity = selectedPages.length < this.pagePickerState.selectionLimit;

    Array.from(this.elements.pagePickerGrid.children).forEach((node) => {
      const button = /** @type {HTMLButtonElement} */ (node);
      const pageNumber = parseInt(button.getAttribute('data-page-number') || '', 10);
      const isSelected = orderMap.has(pageNumber);
      const orderNode = button.querySelector('.page-picker-thumb-order');

      button.classList.toggle('is-selected', isSelected);
      button.classList.toggle('is-disabled', !isSelected && !hasCapacity);
      button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');

      if (orderNode) {
        orderNode.textContent = isSelected ? String(orderMap.get(pageNumber)) : '';
      }
    });

    if (this.elements.pagePickerCount) {
      this.elements.pagePickerCount.textContent = `${selectedPages.length} of ${this.pagePickerState.selectionLimit} selected`;
    }

    if (this.elements.pagePickerHelper) {
      this.elements.pagePickerHelper.textContent = selectedPages.length === 0
        ? `Choose up to ${this.pagePickerState.selectionLimit} pages to import.`
        : `Selected pages: ${selectedPages.join(', ')}`;
    }

    if (this.elements.pagePickerConfirm) {
      this.elements.pagePickerConfirm.disabled = selectedPages.length === 0;
      this.elements.pagePickerConfirm.setAttribute('aria-disabled', selectedPages.length === 0 ? 'true' : 'false');
    }
  }

  confirmPagePickerSelection() {
    if (!this.pagePickerState) { return; }

    const selectedPages = Array.from(this.pagePickerState.selected).sort((a, b) => a - b);
    if (selectedPages.length === 0) {
      toast.warning('Choose At Least One Page', 'Select one or more pages before importing from this PDF.');
      return;
    }

    this.closePagePicker(selectedPages);
  }

  closePagePicker(result) {
    if (!this.pagePickerState) { return; }

    const { resolve } = this.pagePickerState;
    this.pagePickerState = null;

    if (this.elements.pagePickerModal) {
      this.elements.pagePickerModal.classList.add('hidden');
      this.elements.pagePickerModal.classList.remove('flex');
    }

    if (this.elements.pagePickerGrid) {
      this.elements.pagePickerGrid.innerHTML = '';
    }

    document.body.style.overflow = '';
    resolve?.(result);
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

    const files = Array.from(e.dataTransfer.files);
    this.handleIncomingFiles(files);
  }

  handleIncomingFiles(files) {
    const limitedFiles = files.slice(0, MAX_UPLOAD_FILES);

    if (files.length > MAX_UPLOAD_FILES) {
      toast.warning('Upload Limit Reached', `You added ${files.length} files. Only the first ${MAX_UPLOAD_FILES} will be queued.`);
    }

    const { acceptedFiles, rejectedFiles } = partitionSupportedFiles(limitedFiles);

    if (rejectedFiles.length > 0) {
      const title = acceptedFiles.length > 0 ? 'Some Files Were Skipped' : 'Unsupported Upload';
      const message = acceptedFiles.length > 0
        ? `${MIXED_UPLOAD_WARNING} The supported files are still queued.`
        : `${SUPPORTED_UPLOAD_MESSAGE} Add a PDF or image file to start the layout.`;
      toast[acceptedFiles.length > 0 ? 'warning' : 'error'](title, message);
    }

    acceptedFiles.forEach(file => {
      this.emitter.emit('fileSelected', file);
    });
  }

  handleKeyboard(e) {
    if (this.isPagePickerOpen()) {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.closePagePicker(null);
      } else if (e.key === 'Enter' && document.activeElement?.tagName !== 'BUTTON') {
        e.preventDefault();
        this.confirmPagePickerSelection();
      }
      return;
    }

    if (this.elements.zine3dModal && !this.elements.zine3dModal.classList.contains('hidden')) {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.toggle3DModal(false);
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.elements.bookletPrevBtn?.click();
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.elements.bookletNextBtn?.click();
        return;
      }
      if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        e.preventDefault();
        this.elements.foldStepButtons?.[parseInt(e.key, 10) - 1]?.click();
        return;
      }
    }

    // Global keyboard shortcuts
    if (e.key.toLowerCase() === 'p' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      this.emitter.emit('print');
    }
    if (e.key.toLowerCase() === 'o' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      this.triggerFileUpload();
    }
    if (e.key.toLowerCase() === 's' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      this.emitter.emit('export');
    }

    // Active page shortcuts (only if no modal/input focused)
    if (this.activePageIndex !== null && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        const char = e.key.toLowerCase();
        
        if (char === 'r') {
            e.preventDefault();
            this.emitter.emit('pageFlipped', this.activePageIndex);
        } else if (char === 'z') {
            e.preventDefault();
            this.emitter.emit('pageZoomed', this.activePageIndex);
        } else if (char === 'c') {
            e.preventDefault();
            this.emitter.emit('pageCropToggled', this.activePageIndex);
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            this.emitter.emit('pageRemoved', this.activePageIndex);
        }
    }
  }

  showZoomModal(imageUrl) {
    let modal = document.getElementById('zoom-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'zoom-modal';
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center opacity-0 pointer-events-none transition-opacity duration-300';
      modal.style.backgroundColor = 'rgba(240, 240, 240, 0.95)';
      modal.innerHTML = `
        <div class="relative w-11/12 h-11/12 max-w-7xl max-h-[90vh] bg-white overflow-hidden flex flex-col scale-95 transition-transform duration-300" style="border: 3px solid black; box-shadow: 6px 6px 0px 0px black;">
          <div class="flex justify-between items-center px-4 py-2 border-b-2 border-black">
            <h3 class="font-bold uppercase tracking-wider text-sm">Page Preview</h3>
            <button class="close-modal w-8 h-8 bg-white border-2 border-black text-black flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors focus:outline-none" style="box-shadow: 2px 2px 0px 0px black;">
              <span class="material-symbols-outlined font-bold" aria-hidden="true">close</span>
            </button>
          </div>
          <div class="flex-1 overflow-auto p-4 flex items-center justify-center" style="background-color: var(--bg-neutral);">
            <img class="zoom-img max-w-full max-h-full object-contain" style="border: 2px solid black; box-shadow: 4px 4px 0px 0px black;" src="" alt="Zoomed Page Preview" />
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const closeBtn = modal.querySelector('.close-modal');
      const hideModal = () => {
        modal.classList.add('opacity-0', 'pointer-events-none');
        modal.classList.remove('opacity-100', 'pointer-events-auto');
        modal.querySelector('div').classList.remove('scale-100');
        modal.querySelector('div').classList.add('scale-95');
      };

      closeBtn.addEventListener('click', hideModal);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {hideModal();}
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('opacity-100')) {hideModal();}
      });
    }

    const img = modal.querySelector('.zoom-img');
    img.src = imageUrl;

    // Show modal
    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.classList.add('opacity-100', 'pointer-events-auto');
    modal.querySelector('div').classList.remove('scale-95');
    modal.querySelector('div').classList.add('scale-100');
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
    }
    if (this.elements.paperSizeSelect) { this.elements.paperSizeSelect.value = this.paperSize; }

    if (savedOrientation) {
      this.orientation = savedOrientation;
    }
    if (this.elements.orientationSelect) { this.elements.orientationSelect.value = this.orientation; }
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
    const size = PAPER_SIZES[paperSize] || PAPER_SIZES.letter;

    if (orientation === 'landscape') {
      return { width: size.height, height: size.width };
    }

    return { width: size.width, height: size.height };
  }



  hasContent() {
    return this.elements.zineSheetsContainer &&
      this.elements.zineSheetsContainer.querySelector('.page-content-img:not(.hidden)') !== null;
  }

  createUploadedFileListItem(fileInfo, index) {
    const itemWrapper = document.createElement('div');
    itemWrapper.className = 'uploaded-file-item flex items-center justify-between p-2 bg-white border border-black rounded mb-2';

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'flex items-center gap-2';

    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined text-sm';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = fileInfo.kind === 'image' ? 'image' : 'description';

    const textWrapper = document.createElement('div');

    const nameDiv = document.createElement('div');
    nameDiv.className = 'text-xs font-bold font-typewriter';
    nameDiv.textContent = fileInfo.name;

    const sizeDiv = document.createElement('div');
    sizeDiv.className = 'text-[10px] text-gray-500';
    sizeDiv.textContent = `${getFileTypeLabel(fileInfo.kind)} • ${formatFileSize(fileInfo.size)}`;

    textWrapper.appendChild(nameDiv);
    textWrapper.appendChild(sizeDiv);
    contentWrapper.appendChild(icon);
    contentWrapper.appendChild(textWrapper);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-file-btn w-6 h-6 bg-red-500 hover:bg-red-600 text-white border border-black flex items-center justify-center text-xs focus-visible:outline-4 focus-visible:outline-black focus-visible:outline-dashed focus-visible:outline-offset-4 focus-visible:!bg-yellow-300 focus-visible:!text-black';
    removeBtn.title = `Remove ${fileInfo.name}`;
    removeBtn.setAttribute('aria-label', `Remove ${fileInfo.name}`);
    removeBtn.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">close</span>';
    removeBtn.addEventListener('click', () => {
      if (window.zineMaker && typeof window.zineMaker.removeUploadedFile === 'function') {
        window.zineMaker.removeUploadedFile(index);
      }
    });

    itemWrapper.appendChild(contentWrapper);
    itemWrapper.appendChild(removeBtn);

    return itemWrapper;
  }

  /**
   * Update the uploaded files list display
   */
  updateUploadedFilesList(uploadedFiles) {
    if (!this.elements.uploadedFilesList) { return; }

    if (uploadedFiles.length === 0) {
      this.elements.uploadedFilesList.classList.add('hidden');
      this.elements.uploadedFilesList.innerHTML = '<p class="text-xs font-bold uppercase">No files uploaded yet</p>';
      return;
    }

    this.elements.uploadedFilesList.classList.remove('hidden');
    this.elements.uploadedFilesList.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'mb-2';

    const header = document.createElement('h4');
    header.className = 'text-sm font-marker uppercase mb-2';
    header.textContent = `Uploaded Files (${uploadedFiles.length})`;
    wrapper.appendChild(header);

    uploadedFiles.forEach((fileInfo, index) => {
      wrapper.appendChild(this.createUploadedFileListItem(fileInfo, index));
    });

    this.elements.uploadedFilesList.appendChild(wrapper);
  }

  on(event, handler) {
    this.emitter.on(event, handler);
  }
}
