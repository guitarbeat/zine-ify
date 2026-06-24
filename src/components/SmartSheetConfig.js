/**
 * SmartSheetConfig.js
 * An intelligent sheet configuration widget with visual grid selection,
 * smart presets, and paper-aware optimizations.
 */

import { PAPER_SIZES, ZINE_TEMPLATES } from '../utils/config.js';

const SMART_PRESETS = [
  { id: 'mini-8', rows: 2, cols: 4, label: 'Mini Zine', desc: '8 pages, 1 cut', pages: 8, popular: true },
  { id: 'mini-16', rows: 4, cols: 4, label: 'Double Mini', desc: '16 pages, 2 sheets', pages: 16 },
  { id: 'accordion', rows: 4, cols: 4, label: 'Accordion', desc: '16 pages, folded', pages: 16 },
  { id: 'single-6', rows: 2, cols: 3, label: 'Small Zine', desc: '6 pages, simple', pages: 6 },
  { id: 'poster-3x3', rows: 3, cols: 3, label: 'Poster', desc: '9 panels', pages: 9 },
  { id: 'card-2x2', rows: 2, cols: 2, label: 'Card', desc: '4 panels', pages: 4 }
];

const PAPER_RECOMMENDATIONS = {
  'a4': { best: 'portrait', slots: 8, reason: 'Optimal for mini-zine folding' },
  'letter': { best: 'landscape', slots: 8, reason: 'Standard US format, good margins' },
  'a3': { best: 'landscape', slots: 16, reason: 'Great for double-mini format' },
  'legal': { best: 'landscape', slots: 8, reason: 'Extra height for longer content' },
  'a5': { best: 'landscape', slots: 4, reason: 'Compact format, great for cards' }
};

export class SmartSheetConfig {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      maxRows: 10,
      maxCols: 10,
      initialRows: 2,
      initialCols: 4,
      initialPaper: 'letter',
      initialOrientation: 'landscape',
      onChange: () => {},
      ...options
    };

    this.state = {
      rows: this.options.initialRows,
      cols: this.options.initialCols,
      paperSize: this.options.initialPaper,
      orientation: this.options.initialOrientation,
      margin: 0,
      hoverRows: null,
      hoverCols: null
    };

    this.render();
    this.attachEventListeners();
  }

  render() {
    const totalSlots = this.state.rows * this.state.cols;
    const recommendation = PAPER_RECOMMENDATIONS[this.state.paperSize];
    const isRecommended = this.state.orientation === recommendation?.best && totalSlots <= recommendation?.slots;

    this.container.innerHTML = `
      <div class="smart-sheet-config">
        <div class="smart-sheet-section">
          <div class="smart-sheet-header">
            <span class="smart-sheet-label">Grid Layout</span>
            <span class="smart-sheet-status ${totalSlots > 16 ? 'is-warning' : ''}">${totalSlots} slots</span>
          </div>

          <div class="smart-sheet-presets">
            ${SMART_PRESETS.map(preset => `
              <button type="button"
                class="smart-sheet-preset ${this.state.rows === preset.rows && this.state.cols === preset.cols ? 'is-active' : ''}"
                data-rows="${preset.rows}"
                data-cols="${preset.cols}"
                title="${preset.desc}">
                <span class="smart-sheet-preset-visual">
                  ${this.renderPresetVisual(preset.rows, preset.cols)}
                </span>
                <span class="smart-sheet-preset-name">${preset.label}</span>
                <span class="smart-sheet-preset-size">${preset.rows}×${preset.cols}</span>
                ${preset.popular ? '<span class="smart-sheet-preset-badge">Popular</span>' : ''}
              </button>
            `).join('')}
          </div>

          <div class="smart-sheet-visual" role="grid" aria-label="Select grid dimensions">
            ${this.renderGridVisual()}
          </div>

          <div class="smart-sheet-manual">
            <div class="smart-sheet-stepper-group">
              <button type="button" class="smart-sheet-stepper-btn" data-action="decrease-rows" aria-label="Fewer rows">−</button>
              <div class="smart-sheet-stepper-value">
                <span class="smart-sheet-value">${this.state.rows}</span>
                <span class="smart-sheet-value-label">Rows</span>
              </div>
              <button type="button" class="smart-sheet-stepper-btn" data-action="increase-rows" aria-label="More rows">+</button>
            </div>
            <span class="smart-sheet-times">×</span>
            <div class="smart-sheet-stepper-group">
              <button type="button" class="smart-sheet-stepper-btn" data-action="decrease-cols" aria-label="Fewer columns">−</button>
              <div class="smart-sheet-stepper-value">
                <span class="smart-sheet-value">${this.state.cols}</span>
                <span class="smart-sheet-value-label">Cols</span>
              </div>
              <button type="button" class="smart-sheet-stepper-btn" data-action="increase-cols" aria-label="More columns">+</button>
            </div>
          </div>
        </div>

        <div class="smart-sheet-section">
          <div class="smart-sheet-header">
            <span class="smart-sheet-label">Paper Size</span>
            <label class="smart-sheet-paper-recommend ${isRecommended ? 'is-visible' : ''}">
              <span class="material-symbols-outlined">check_circle</span>
              ${recommendation?.reason || ''}
            </label>
          </div>

          <select class="smart-sheet-select" data-field="paperSize">
            ${Object.entries(PAPER_SIZES).map(([key, paper]) => `
              <option value="${key}" ${this.state.paperSize === key ? 'selected' : ''}>
                ${paper.label} (${paper.width}×${paper.height}mm)
              </option>
            `).join('')}
          </select>

          ${this.renderOrientationControl()}

          <div class="smart-sheet-margin-control">
            <span class="smart-sheet-label">Margin</span>
            <div class="smart-sheet-margin-stepper">
              <button type="button" class="smart-sheet-stepper-btn" data-action="decrease-margin" aria-label="Decrease margin">−</button>
              <div class="smart-sheet-margin-value">
                <span class="smart-sheet-value">${this.state.margin}</span>
                <span class="smart-sheet-value-label">mm</span>
              </div>
              <button type="button" class="smart-sheet-stepper-btn" data-action="increase-margin" aria-label="Increase margin">+</button>
            </div>
            <input type="range" class="smart-sheet-margin-slider"
              min="0" max="25" value="${this.state.margin}"
              aria-label="Margin in millimeters">
          </div>
        </div>

        ${totalSlots > 16 ? `
          <div class="smart-sheet-warning">
            <span class="material-symbols-outlined">info</span>
            <span>Large grids may require multiple sheets or complex folding.</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  renderPresetVisual(rows, cols) {
    const totalCells = rows * cols;
    const cellSize = Math.min(6, 24 / Math.max(rows, cols));

    let html = '<div class="smart-sheet-preset-grid">';
    for (let r = 0; r < rows; r++) {
      html += '<div class="smart-sheet-preset-row">';
      for (let c = 0; c < cols; c++) {
        html += '<span class="smart-sheet-preset-cell"></span>';
      }
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  renderGridVisual() {
    const maxRows = this.options.maxRows;
    const maxCols = this.options.maxCols;

    let html = '';
    for (let r = 1; r <= maxRows; r++) {
      html += '<div class="smart-sheet-grid-row">';
      for (let c = 1; c <= maxCols; c++) {
        const isSelected = r <= this.state.rows && c <= this.state.cols;
        const isHovered = this.state.hoverRows !== null &&
          r <= this.state.hoverRows && c <= this.state.hoverCols;
        const isPreviewRow = r === this.state.rows + 1 && c <= this.state.cols;
        const isPreviewCol = c === this.state.cols + 1 && r <= this.state.rows;

        html += `
          <button type="button"
            class="smart-sheet-grid-cell
              ${isSelected ? 'is-selected' : ''}
              ${isHovered ? 'is-hovered' : ''}"
            data-rows="${r}"
            data-cols="${c}"
            aria-label="${r}×${c} grid"
            aria-pressed="${isSelected && r === this.state.rows && c === this.state.cols}">
          </button>
        `;
      }
      html += '</div>';
    }
    return html;
  }

  renderOrientationControl() {
    const { orientation, paperSize } = this.state;
    const paper = PAPER_SIZES[paperSize] || PAPER_SIZES.letter;
    const recommendation = PAPER_RECOMMENDATIONS[paperSize];
    const showOrientation = recommendation && this.state.rows === 2 && this.state.cols === 4;

    if (!showOrientation) {return '';}

    const landscapeWidth = paper.height;
    const landscapeHeight = paper.width;
    const portraitWidth = paper.width;
    const portraitHeight = paper.height;

    return `
      <div class="smart-sheet-orientation">
        <span class="smart-sheet-label">Orientation</span>
        <div class="smart-sheet-orientation-seg">
          <button type="button"
            class="smart-sheet-orientation-btn ${orientation === 'landscape' ? 'is-active' : ''}"
            data-value="landscape"
            aria-pressed="${orientation === 'landscape'}">
            <svg class="smart-sheet-orientation-icon" width="24" height="18" viewBox="0 0 24 18">
              <rect x="1" y="1" width="22" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span>Landscape</span>
            <span class="smart-sheet-orientation-dims">${landscapeWidth}×${landscapeHeight}</span>
          </button>
          <button type="button"
            class="smart-sheet-orientation-btn ${orientation === 'portrait' ? 'is-active' : ''}"
            data-value="portrait"
            aria-pressed="${orientation === 'portrait'}">
            <svg class="smart-sheet-orientation-icon" width="18" height="24" viewBox="0 0 18 24">
              <rect x="1" y="1" width="16" height="22" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span>Portrait</span>
            <span class="smart-sheet-orientation-dims">${portraitWidth}×${portraitHeight}</span>
          </button>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    this.container.addEventListener('click', this.handleClick.bind(this));
    this.container.addEventListener('mouseover', this.handleMouseOver.bind(this));
    this.container.addEventListener('mouseout', this.handleMouseOut.bind(this));
    this.container.addEventListener('change', this.handleChange.bind(this));
    this.container.addEventListener('input', this.handleInput.bind(this));
  }

  handleClick(e) {
    const cell = e.target.closest('.smart-sheet-grid-cell');
    if (cell) {
      const rows = parseInt(cell.dataset.rows, 10);
      const cols = parseInt(cell.dataset.cols, 10);
      this.setGrid(rows, cols);
      return;
    }

    const preset = e.target.closest('.smart-sheet-preset');
    if (preset) {
      const rows = parseInt(preset.dataset.rows, 10);
      const cols = parseInt(preset.dataset.cols, 10);
      this.setGrid(rows, cols);
      return;
    }

    const stepperBtn = e.target.closest('.smart-sheet-stepper-btn');
    if (stepperBtn) {
      const action = stepperBtn.dataset.action;
      this.handleStepperAction(action);
      return;
    }

    const orientBtn = e.target.closest('.smart-sheet-orientation-btn');
    if (orientBtn) {
      this.setOrientation(orientBtn.dataset.value);
      return;
    }
  }

  handleMouseOver(e) {
    const cell = e.target.closest('.smart-sheet-grid-cell');
    if (cell) {
      this.state.hoverRows = parseInt(cell.dataset.rows, 10);
      this.state.hoverCols = parseInt(cell.dataset.cols, 10);
      this.updateGridVisual();
    }
  }

  handleMouseOut(e) {
    const grid = e.target.closest('.smart-sheet-visual');
    if (grid && !grid.contains(e.relatedTarget)) {
      this.state.hoverRows = null;
      this.state.hoverCols = null;
      this.updateGridVisual();
    }
  }

  handleChange(e) {
    if (e.target.matches('.smart-sheet-select')) {
      this.setPaperSize(e.target.value);
    }
  }

  handleInput(e) {
    if (e.target.matches('.smart-sheet-margin-slider')) {
      this.setMargin(parseInt(e.target.value, 10));
    }
  }

  handleStepperAction(action) {
    switch (action) {
      case 'increase-rows':
        this.setGrid(Math.min(this.state.rows + 1, this.options.maxRows), this.state.cols);
        break;
      case 'decrease-rows':
        this.setGrid(Math.max(this.state.rows - 1, 1), this.state.cols);
        break;
      case 'increase-cols':
        this.setGrid(this.state.rows, Math.min(this.state.cols + 1, this.options.maxCols));
        break;
      case 'decrease-cols':
        this.setGrid(this.state.rows, Math.max(this.state.cols - 1, 1));
        break;
      case 'increase-margin':
        this.setMargin(Math.min(this.state.margin + 1, 25));
        break;
      case 'decrease-margin':
        this.setMargin(Math.max(this.state.margin - 1, 0));
        break;
    }
  }

  setGrid(rows, cols) {
    this.state.rows = rows;
    this.state.cols = cols;
    this.updateUI();
    this.emitChange();
  }

  setPaperSize(paperSize) {
    this.state.paperSize = paperSize;
    const recommendation = PAPER_RECOMMENDATIONS[paperSize];
    if (recommendation) {
      this.state.orientation = recommendation.best;
    }
    this.updateUI();
    this.emitChange();
  }

  setOrientation(orientation) {
    this.state.orientation = orientation;
    this.updateUI();
    this.emitChange();
  }

  setMargin(margin) {
    this.state.margin = margin;
    this.updateUI();
    this.emitChange();
  }

  updateUI() {
    this.render();
  }

  updateGridVisual() {
    const grid = this.container.querySelector('.smart-sheet-visual');
    if (!grid) {return;}

    const cells = grid.querySelectorAll('.smart-sheet-grid-cell');
    cells.forEach(cell => {
      const r = parseInt(cell.dataset.rows, 10);
      const c = parseInt(cell.dataset.cols, 10);

      const isSelected = r <= this.state.rows && c <= this.state.cols;
      const isHovered = this.state.hoverRows !== null &&
        r <= this.state.hoverRows && c <= this.state.hoverCols;

      cell.classList.toggle('is-selected', isSelected);
      cell.classList.toggle('is-hovered', isHovered);
    });

    const statusEl = this.container.querySelector('.smart-sheet-status');
    if (statusEl) {
      const hoverTotal = this.state.hoverRows && this.state.hoverCols
        ? this.state.hoverRows * this.state.hoverCols
        : null;
      statusEl.textContent = `${hoverTotal || this.state.rows * this.state.cols} slots`;
      statusEl.classList.toggle('is-warning', (hoverTotal || this.state.rows * this.state.cols) > 16);
    }
  }

  emitChange() {
    this.options.onChange({
      rows: this.state.rows,
      cols: this.state.cols,
      paperSize: this.state.paperSize,
      orientation: this.state.orientation,
      margin: this.state.margin,
      totalSlots: this.state.rows * this.state.cols
    });
  }

  getState() {
    return { ...this.state, totalSlots: this.state.rows * this.state.cols };
  }

  setState(newState) {
    Object.assign(this.state, newState);
    this.updateUI();
    this.emitChange();
  }

  destroy() {
    this.container.innerHTML = '';
  }
}
