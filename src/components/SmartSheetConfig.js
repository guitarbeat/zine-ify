import { PAPER_SIZES, MARGIN_MIN, MARGIN_MAX } from '../utils/config.js';

const FIXED_ROWS = 2;
const FIXED_COLS = 4;

const PAPER_RECOMMENDATIONS = {
  'a4': { best: 'portrait', reason: 'Optimal for mini-zine folding' },
  'letter': { best: 'landscape', reason: 'Standard US format, good margins' },
  'a3': { best: 'landscape', reason: 'Great for double-mini format' },
  'legal': { best: 'landscape', reason: 'Extra height for longer content' },
  'a5': { best: 'landscape', reason: 'Compact format, great for cards' }
};

export class SmartSheetConfig {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      initialPaper: 'letter',
      initialOrientation: 'landscape',
      onChange: () => {},
      ...options
    };

    this.state = {
      rows: FIXED_ROWS,
      cols: FIXED_COLS,
      paperSize: this.options.initialPaper,
      orientation: this.options.initialOrientation,
      margin: 0
    };

    this.render();
    this.attachEventListeners();
  }

  render() {
    const { paperSize, orientation, margin } = this.state;
    const paper = PAPER_SIZES[paperSize] || PAPER_SIZES.letter;
    const recommendation = PAPER_RECOMMENDATIONS[paperSize];
    const isRecommended = orientation === recommendation?.best;

    const landscapeW = paper.height;
    const landscapeH = paper.width;
    const portraitW = paper.width;
    const portraitH = paper.height;

    this.container.innerHTML = `
      <div class="smart-sheet-config">
        <div class="smart-sheet-section">
          <div class="smart-sheet-header">
            <span class="smart-sheet-label">Paper Size</span>
            <span class="smart-sheet-paper-recommend ${isRecommended ? 'is-visible' : ''}">
              <span class="material-symbols-outlined">check_circle</span>
              ${recommendation?.reason || ''}
            </span>
          </div>

          <select class="smart-sheet-select" data-field="paperSize">
            ${Object.entries(PAPER_SIZES).map(([key, p]) => `
              <option value="${key}" ${paperSize === key ? 'selected' : ''}>
                ${p.label} (${p.width}×${p.height}mm)
              </option>
            `).join('')}
          </select>

          <div class="smart-sheet-orientation-seg">
            <button type="button"
              class="smart-sheet-orientation-btn ${orientation === 'landscape' ? 'is-active' : ''}"
              data-value="landscape"
              aria-pressed="${orientation === 'landscape'}">
              <svg class="smart-sheet-orientation-icon" width="24" height="18" viewBox="0 0 24 18">
                <rect x="1" y="1" width="22" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
              </svg>
              <span>Landscape</span>
              <span class="smart-sheet-orientation-dims">${landscapeW}×${landscapeH}</span>
            </button>
            <button type="button"
              class="smart-sheet-orientation-btn ${orientation === 'portrait' ? 'is-active' : ''}"
              data-value="portrait"
              aria-pressed="${orientation === 'portrait'}">
              <svg class="smart-sheet-orientation-icon" width="18" height="24" viewBox="0 0 18 24">
                <rect x="1" y="1" width="16" height="22" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
              </svg>
              <span>Portrait</span>
              <span class="smart-sheet-orientation-dims">${portraitW}×${portraitH}</span>
            </button>
          </div>
        </div>

        <div class="smart-sheet-section">
          <div class="smart-sheet-header">
            <span class="smart-sheet-label">Margin</span>
            <div class="smart-sheet-margin-stepper">
              <button type="button" class="smart-sheet-stepper-btn" data-margin-delta="-1" aria-label="Decrease margin" ${margin <= MARGIN_MIN ? 'disabled' : ''}>
                <span class="material-symbols-outlined">remove</span>
              </button>
              <span class="smart-sheet-margin-value">
                <span data-margin-display>${margin}</span>
                <span class="smart-sheet-times">mm</span>
              </span>
              <button type="button" class="smart-sheet-stepper-btn" data-margin-delta="1" aria-label="Increase margin" ${margin >= MARGIN_MAX ? 'disabled' : ''}>
                <span class="material-symbols-outlined">add</span>
              </button>
            </div>
          </div>

          <div class="smart-sheet-margin-control">
            <input
              type="range"
              class="smart-sheet-margin-slider"
              data-field="margin"
              min="${MARGIN_MIN}"
              max="${MARGIN_MAX}"
              step="1"
              value="${margin}"
              aria-label="Sheet margin in millimeters" />
          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    this.container.addEventListener('click', this.handleClick.bind(this));
    this.container.addEventListener('change', this.handleChange.bind(this));
    this.container.addEventListener('input', this.handleInput.bind(this));
  }

  handleClick(e) {
    const orientBtn = e.target.closest('.smart-sheet-orientation-btn');
    if (orientBtn) {
      this.setOrientation(orientBtn.dataset.value);
      return;
    }

    const marginBtn = e.target.closest('[data-margin-delta]');
    if (marginBtn) {
      const delta = parseInt(marginBtn.dataset.marginDelta, 10) || 0;
      this.setMargin(this.state.margin + delta);
    }
  }

  handleChange(e) {
    if (e.target.matches('.smart-sheet-select')) {
      this.setPaperSize(e.target.value);
    }
  }

  handleInput(e) {
    if (e.target.matches('.smart-sheet-margin-slider')) {
      // Live-update the displayed value while dragging without a full re-render.
      const value = this.clampMargin(parseInt(e.target.value, 10));
      this.state.margin = value;
      const display = this.container.querySelector('[data-margin-display]');
      if (display) {display.textContent = value;}
      this.emitChange();
    }
  }

  clampMargin(value) {
    if (Number.isNaN(value)) {return MARGIN_MIN;}
    return Math.min(MARGIN_MAX, Math.max(MARGIN_MIN, value));
  }

  setMargin(margin) {
    this.state.margin = this.clampMargin(margin);
    this.render();
    this.emitChange();
  }

  setPaperSize(paperSize) {
    this.state.paperSize = paperSize;
    const recommendation = PAPER_RECOMMENDATIONS[paperSize];
    if (recommendation) {
      this.state.orientation = recommendation.best;
    }
    this.render();
    this.emitChange();
  }

  setOrientation(orientation) {
    this.state.orientation = orientation;
    this.render();
    this.emitChange();
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
    this.render();
    this.emitChange();
  }

  destroy() {
    this.container.innerHTML = '';
  }
}
