/**
 * Innovative Input Selection Widgets
 * Modern, accessible input components with enhanced UX
 */

/**
 * PageRangeSelector - Visual page range selection with drag handles
 * Allows users to visually select a range of pages from a document
 */
export class PageRangeSelector {
  constructor(container, options = {}) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    this.options = {
      totalPages: 16,
      initialStart: 1,
      initialEnd: 8,
      maxSelection: 8,
      onPageClick: null,
      onRangeChange: null,
      showThumbnails: false,
      ...options
    };

    this.startPage = this.options.initialStart;
    this.endPage = this.options.initialEnd;
    this.isDragging = null;
    this.pages = [];

    this._init();
  }

  _init() {
    this._createStructure();
    this._renderPages();
    this._setupEvents();
    this._updateSelection();
  }

  _createStructure() {
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'page-range-selector';
    this.wrapper.setAttribute('role', 'group');
    this.wrapper.setAttribute('aria-label', 'Select page range');

    // Header
    this.header = document.createElement('div');
    this.header.className = 'page-range-header';
    this.header.innerHTML = `
      <span class="page-range-label">Select Pages</span>
      <span class="page-range-status" aria-live="polite">Pages ${this.startPage}-${this.endPage}</span>
    `;
    this.wrapper.appendChild(this.header);

    // Track area
    this.track = document.createElement('div');
    this.track.className = 'page-range-track';
    this.track.setAttribute('role', 'slider');
    this.track.setAttribute('aria-valuemin', '1');
    this.track.setAttribute('aria-valuemax', String(this.options.totalPages));
    this.wrapper.appendChild(this.track);

    // Pages container
    this.pagesContainer = document.createElement('div');
    this.pagesContainer.className = 'page-range-pages';
    this.track.appendChild(this.pagesContainer);

    // Selection overlay
    this.selectionOverlay = document.createElement('div');
    this.selectionOverlay.className = 'page-range-selection';
    this.track.appendChild(this.selectionOverlay);

    // Drag handles
    this.startHandle = document.createElement('div');
    this.startHandle.className = 'page-range-handle page-range-handle--start';
    this.startHandle.setAttribute('role', 'slider');
    this.startHandle.setAttribute('aria-label', 'Start page');
    this.startHandle.setAttribute('tabindex', '0');
    this.startHandle.innerHTML = `<span class="page-range-handle-value">${this.startPage}</span>`;
    this.track.appendChild(this.startHandle);

    this.endHandle = document.createElement('div');
    this.endHandle.className = 'page-range-handle page-range-handle--end';
    this.endHandle.setAttribute('role', 'slider');
    this.endHandle.setAttribute('aria-label', 'End page');
    this.endHandle.setAttribute('tabindex', '0');
    this.endHandle.innerHTML = `<span class="page-range-handle-value">${this.endPage}</span>`;
    this.track.appendChild(this.endHandle);

    // Quick select buttons
    this.quickSelect = document.createElement('div');
    this.quickSelect.className = 'page-range-quick';
    this.quickSelect.innerHTML = `
      <button type="button" class="page-range-quick-btn" data-action="first">First ${this.options.maxSelection}</button>
      <button type="button" class="page-range-quick-btn" data-action="last">Last ${this.options.maxSelection}</button>
      <button type="button" class="page-range-quick-btn" data-action="all">All</button>
    `;
    this.wrapper.appendChild(this.quickSelect);

    this.container.appendChild(this.wrapper);
  }

  _renderPages() {
    this.pagesContainer.innerHTML = '';
    this.pages = [];

    for (let i = 1; i <= this.options.totalPages; i++) {
      const page = document.createElement('button');
      page.type = 'button';
      page.className = 'page-range-page';
      page.dataset.page = String(i);
      page.setAttribute('aria-pressed', 'false');
      page.innerHTML = `<span class="page-range-page-num">${i}</span>`;
      this.pagesContainer.appendChild(page);
      this.pages.push(page);
    }
  }

  _setupEvents() {
    // Drag handle events
    [this.startHandle, this.endHandle].forEach((handle, index) => {
      handle.addEventListener('mousedown', (e) => this._startDrag(e, index === 0 ? 'start' : 'end'));
      handle.addEventListener('touchstart', (e) => this._startDrag(e, index === 0 ? 'start' : 'end'), { passive: false });
      handle.addEventListener('keydown', (e) => this._handleKeydown(e, index === 0 ? 'start' : 'end'));
    });

    // Page click
    this.pagesContainer.addEventListener('click', (e) => {
      const page = e.target.closest('.page-range-page');
      if (page) {
        const pageNum = parseInt(page.dataset.page, 10);
        this._togglePage(pageNum);
      }
    });

    // Quick select
    this.quickSelect.addEventListener('click', (e) => {
      const btn = e.target.closest('.page-range-quick-btn');
      if (btn) {
        this._quickSelect(btn.dataset.action);
      }
    });

    // Global move/up
    document.addEventListener('mousemove', (e) => this._handleDrag(e));
    document.addEventListener('touchmove', (e) => this._handleDrag(e), { passive: false });
    document.addEventListener('mouseup', () => this._endDrag());
    document.addEventListener('touchend', () => this._endDrag());
  }

  _startDrag(e, handle) {
    e.preventDefault();
    this.isDragging = handle;
    document.body.style.userSelect = 'none';
  }

  _handleDrag(e) {
    if (!this.isDragging) {return;}

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const rect = this.track.getBoundingClientRect();
    const x = clientX - rect.left;
    const pageWidth = rect.width / this.options.totalPages;
    const pageNum = Math.max(1, Math.min(this.options.totalPages, Math.round(x / pageWidth) + 1));

    if (this.isDragging === 'start') {
      this.startPage = Math.min(pageNum, this.endPage);
    } else {
      this.endPage = Math.max(pageNum, this.startPage);
    }

    // Enforce max selection
    if (this.endPage - this.startPage + 1 > this.options.maxSelection) {
      if (this.isDragging === 'start') {
        this.startPage = this.endPage - this.options.maxSelection + 1;
      } else {
        this.endPage = this.startPage + this.options.maxSelection - 1;
      }
    }

    this._updateSelection();
  }

  _endDrag() {
    if (this.isDragging) {
      this.isDragging = null;
      document.body.style.userSelect = '';
      if (this.options.onRangeChange) {
        this.options.onRangeChange(this.getRange());
      }
    }
  }

  _handleKeydown(e, handle) {
    const current = handle === 'start' ? this.startPage : this.endPage;
    let newValue = current;

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault();
        newValue = Math.max(1, current - 1);
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault();
        newValue = Math.min(this.options.totalPages, current + 1);
        break;
      case 'Home':
        e.preventDefault();
        newValue = 1;
        break;
      case 'End':
        e.preventDefault();
        newValue = this.options.totalPages;
        break;
    }

    if (newValue !== current) {
      if (handle === 'start') {
        this.startPage = Math.min(newValue, this.endPage);
      } else {
        this.endPage = Math.max(newValue, this.startPage);
      }
      this._updateSelection();

      if (this.options.onRangeChange) {
        this.options.onRangeChange(this.getRange());
      }
    }
  }

  _togglePage(pageNum) {
    if (this.options.onPageClick) {
      this.options.onPageClick(pageNum);
    }
  }

  _quickSelect(action) {
    switch (action) {
      case 'first':
        this.startPage = 1;
        this.endPage = Math.min(this.options.maxSelection, this.options.totalPages);
        break;
      case 'last':
        this.endPage = this.options.totalPages;
        this.startPage = Math.max(1, this.options.totalPages - this.options.maxSelection + 1);
        break;
      case 'all':
        this.startPage = 1;
        this.endPage = this.options.totalPages;
        break;
    }
    this._updateSelection();

    if (this.options.onRangeChange) {
      this.options.onRangeChange(this.getRange());
    }
  }

  _updateSelection() {
    const pageSize = 100 / this.options.totalPages;
    const startOffset = (this.startPage - 1) * pageSize;
    const endOffset = (this.endPage) * pageSize;

    this.selectionOverlay.style.left = `${startOffset}%`;
    this.selectionOverlay.style.width = `${endOffset - startOffset}%`;

    this.startHandle.style.left = `${startOffset}%`;
    this.endHandle.style.left = `${endOffset - pageSize/2}%`;

    this.startHandle.querySelector('.page-range-handle-value').textContent = this.startPage;
    this.endHandle.querySelector('.page-range-handle-value').textContent = this.endPage;

    // Update page states
    this.pages.forEach((page, index) => {
      const pageNum = index + 1;
      const isSelected = pageNum >= this.startPage && pageNum <= this.endPage;
      page.classList.toggle('is-selected', isSelected);
      page.setAttribute('aria-pressed', String(isSelected));
    });

    // Update status
    const status = this.wrapper.querySelector('.page-range-status');
    status.textContent = `Pages ${this.startPage}-${this.endPage} (${this.endPage - this.startPage + 1} selected)`;
  }

  getRange() {
    return {
      start: this.startPage,
      end: this.endPage,
      pages: Array.from({ length: this.endPage - this.startPage + 1 }, (_, i) => this.startPage + i)
    };
  }

  setRange(start, end) {
    this.startPage = Math.max(1, start);
    this.endPage = Math.min(this.options.totalPages, end);
    this._updateSelection();
  }
}

/**
 * SmartGridConfigurator - Interactive grid picker with visual preview
 * Select rows/cols with visual feedback
 */
export class SmartGridConfigurator {
  constructor(container, options = {}) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    this.options = {
      minRows: 1,
      maxRows: 10,
      minCols: 1,
      maxCols: 10,
      initialRows: 2,
      initialCols: 4,
      presets: [
        { label: 'Mini Zine (2×4)', rows: 2, cols: 4 },
        { label: 'Standard (3×3)', rows: 3, cols: 3 },
        { label: 'Large (4×4)', rows: 4, cols: 4 }
      ],
      onChange: null,
      ...options
    };

    this.rows = this.options.initialRows;
    this.cols = this.options.initialCols;
    this.hoveredRows = 0;
    this.hoveredCols = 0;

    this._init();
  }

  _init() {
    this._createStructure();
    this._setupEvents();
    this._updateDisplay();
  }

  _createStructure() {
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'smart-grid-config';
    this.wrapper.setAttribute('role', 'group');
    this.wrapper.setAttribute('aria-label', 'Grid configuration');

    // Header
    this.header = document.createElement('div');
    this.header.className = 'smart-grid-header';
    this.header.innerHTML = `
      <span class="smart-grid-label">Grid Layout</span>
      <span class="smart-grid-status" aria-live="polite">${this.rows}×${this.cols} = ${this.rows * this.cols} slots</span>
    `;
    this.wrapper.appendChild(this.header);

    // Visual grid selector
    this.gridSelector = document.createElement('div');
    this.gridSelector.className = 'smart-grid-selector';
    this.gridSelector.setAttribute('role', 'grid');
    this.gridSelector.setAttribute('aria-label', 'Select grid dimensions');
    this._renderGridSelector();
    this.wrapper.appendChild(this.gridSelector);

    // Presets
    if (this.options.presets.length > 0) {
      this.presetsContainer = document.createElement('div');
      this.presetsContainer.className = 'smart-grid-presets';
      this.options.presets.forEach(preset => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'smart-grid-preset-btn';
        btn.innerHTML = `
          <span class="smart-grid-preset-name">${preset.label}</span>
          <span class="smart-grid-preset-size">${preset.rows * preset.size}</span>
        `;
        btn.addEventListener('click', () => {
          this.rows = preset.rows;
          this.cols = preset.cols;
          this._updateDisplay();
          if (this.options.onChange) {
            this.options.onChange(this.getValue());
          }
        });
        this.presetsContainer.appendChild(btn);
      });
      this.wrapper.appendChild(this.presetsContainer);
    }

    // Manual controls
    this.manualControls = document.createElement('div');
    this.manualControls.className = 'smart-grid-manual';
    this.manualControls.innerHTML = `
      <div class="smart-grid-input-group">
        <label class="smart-grid-input-label">Rows</label>
        <div class="smart-grid-stepper">
          <button type="button" class="smart-grid-stepper-btn" data-dim="rows" data-delta="-1">−</button>
          <input type="number" class="smart-grid-input" data-dim="rows" value="${this.rows}" min="${this.options.minRows}" max="${this.options.maxRows}">
          <button type="button" class="smart-grid-stepper-btn" data-dim="rows" data-delta="1">+</button>
        </div>
      </div>
      <span class="smart-grid-times">×</span>
      <div class="smart-grid-input-group">
        <label class="smart-grid-input-label">Cols</label>
        <div class="smart-grid-stepper">
          <button type="button" class="smart-grid-stepper-btn" data-dim="cols" data-delta="-1">−</button>
          <input type="number" class="smart-grid-input" data-dim="cols" value="${this.cols}" min="${this.options.minCols}" max="${this.options.maxCols}">
          <button type="button" class="smart-grid-stepper-btn" data-dim="cols" data-delta="1">+</button>
        </div>
      </div>
    `;
    this.wrapper.appendChild(this.manualControls);

    this.container.appendChild(this.wrapper);
  }

  _renderGridSelector() {
    this.gridSelector.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'smart-grid-visual';

    for (let r = 0; r < this.options.maxRows; r++) {
      const row = document.createElement('div');
      row.className = 'smart-grid-row';

      for (let c = 0; c < this.options.maxCols; c++) {
        const cell = document.createElement('div');
        cell.className = 'smart-grid-cell';
        cell.dataset.row = String(r + 1);
        cell.dataset.col = String(c + 1);
        row.appendChild(cell);
      }

      grid.appendChild(row);
    }

    this.gridSelector.appendChild(grid);
  }

  _setupEvents() {
    // Grid cell hover/click
    this.gridSelector.addEventListener('mouseover', (e) => {
      const cell = e.target.closest('.smart-grid-cell');
      if (cell) {
        this.hoveredRows = parseInt(cell.dataset.row, 10);
        this.hoveredCols = parseInt(cell.dataset.col, 10);
        this._updateHover();
      }
    });

    this.gridSelector.addEventListener('mouseleave', () => {
      this.hoveredRows = 0;
      this.hoveredCols = 0;
      this._updateHover();
    });

    this.gridSelector.addEventListener('click', (e) => {
      const cell = e.target.closest('.smart-grid-cell');
      if (cell) {
        this.rows = parseInt(cell.dataset.row, 10);
        this.cols = parseInt(cell.dataset.col, 10);
        this._updateDisplay();
        if (this.options.onChange) {
          this.options.onChange(this.getValue());
        }
      }
    });

    // Stepper buttons
    this.manualControls.addEventListener('click', (e) => {
      const btn = e.target.closest('.smart-grid-stepper-btn');
      if (btn) {
        const dim = btn.dataset.dim;
        const delta = parseInt(btn.dataset.delta, 10);
        const current = dim === 'rows' ? this.rows : this.cols;
        const min = dim === 'rows' ? this.options.minRows : this.options.minCols;
        const max = dim === 'rows' ? this.options.maxRows : this.options.maxCols;

        if (dim === 'rows') {
          this.rows = Math.max(min, Math.min(max, current + delta));
        } else {
          this.cols = Math.max(min, Math.min(max, current + delta));
        }

        this._updateDisplay();
        if (this.options.onChange) {
          this.options.onChange(this.getValue());
        }
      }
    });

    // Input changes
    this.manualControls.addEventListener('input', (e) => {
      const input = e.target.closest('.smart-grid-input');
      if (input) {
        const dim = input.dataset.dim;
        const value = parseInt(input.value, 10) || 1;
        const min = dim === 'rows' ? this.options.minRows : this.options.minCols;
        const max = dim === 'rows' ? this.options.maxRows : this.options.maxCols;

        if (dim === 'rows') {
          this.rows = Math.max(min, Math.min(max, value));
        } else {
          this.cols = Math.max(min, Math.min(max, value));
        }

        this._updateDisplay();
      }
    });
  }

  _updateHover() {
    this.gridSelector.querySelectorAll('.smart-grid-cell').forEach(cell => {
      const r = parseInt(cell.dataset.row, 10);
      const c = parseInt(cell.dataset.col, 10);
      const isSelected = r <= this.rows && c <= this.cols;
      const isHovered = this.hoveredRows > 0 && r <= this.hoveredRows && c <= this.hoveredCols;

      cell.classList.toggle('is-selected', isSelected);
      cell.classList.toggle('is-hovered', isHovered);
    });
  }

  _updateDisplay() {
    // Update grid visual
    this._updateHover();

    // Update status
    const status = this.wrapper.querySelector('.smart-grid-status');
    status.textContent = `${this.rows}×${this.cols} = ${this.rows * this.cols} slots`;

    // Update inputs
    this.manualControls.querySelector('[data-dim="rows"]').value = this.rows;
    this.manualControls.querySelector('[data-dim="cols"]').value = this.cols;
  }

  getValue() {
    return { rows: this.rows, cols: this.cols, total: this.rows * this.cols };
  }

  setValue(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this._updateDisplay();
  }
}

/**
 * WheelPicker - iOS-style wheel picker for selecting values
 */
export class WheelPicker {
  constructor(container, options = {}) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    this.options = {
      values: [],
      displayKey: null, // For object values, which key to display
      initialValue: null,
      label: 'Select',
      loop: true,
      onChange: null,
      ...options
    };

    this.currentIndex = 0;
    this.isDragging = false;
    this.startY = 0;
    this.startOffset = 0;
    this.velocity = 0;
    this.itemHeight = 44;

    this._init();
  }

  _init() {
    if (this.options.values.length === 0) {
      console.warn('WheelPicker: No values provided');
      return;
    }

    // Find initial index
    if (this.options.initialValue !== null) {
      const index = this.options.values.findIndex(v =>
        this._getDisplayValue(v) === this.options.initialValue ||
        v === this.options.initialValue
      );
      if (index !== -1) {this.currentIndex = index;}
    }

    this._createStructure();
    this._setupEvents();
    this._updateSelection();
  }

  _getDisplayValue(value) {
    if (this.options.displayKey && typeof value === 'object') {
      return value[this.options.displayKey];
    }
    return String(value);
  }

  _createStructure() {
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'wheel-picker';
    this.wrapper.setAttribute('role', 'listbox');
    this.wrapper.setAttribute('aria-label', this.options.label);

    // Highlight mask
    this.highlight = document.createElement('div');
    this.highlight.className = 'wheel-picker-highlight';
    this.highlight.innerHTML = '<div class="wheel-picker-highlight-line"></div>';
    this.wrapper.appendChild(this.highlight);

    // Wheels container
    this.wheel = document.createElement('div');
    this.wheel.className = 'wheel-picker-wheel';

    // Render items
    this.options.values.forEach((value, index) => {
      const item = document.createElement('div');
      item.className = 'wheel-picker-item';
      item.dataset.index = String(index);
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', index === this.currentIndex ? 'true' : 'false');
      item.textContent = this._getDisplayValue(value);
      this.wheel.appendChild(item);
    });

    this.wrapper.appendChild(this.wheel);
    this.container.appendChild(this.wrapper);
  }

  _setupEvents() {
    // Touch/mouse events
    this.wheel.addEventListener('touchstart', (e) => {
      this.isDragging = true;
      this.startY = e.touches[0].clientY;
      this.startOffset = this._getCurrentOffset();
      this.velocity = 0;
      this.lastTime = Date.now();
      this.lastY = this.startY;
    }, { passive: true });

    this.wheel.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.startY = e.clientY;
      this.startOffset = this._getCurrentOffset();
      this.velocity = 0;
      this.lastTime = Date.now();
      this.lastY = this.startY;
    });

    document.addEventListener('touchmove', (e) => {
      if (!this.isDragging) {return;}
      const clientY = e.touches[0].clientY;
      const delta = clientY - this.startY;
      const newOffset = this.startOffset + delta;
      this._setOffset(newOffset);

      // Track velocity
      const now = Date.now();
      const dt = now - this.lastTime;
      if (dt > 0) {
        this.velocity = (clientY - this.lastY) / dt;
      }
      this.lastTime = now;
      this.lastY = clientY;
    }, { passive: true });

    document.addEventListener('mousemove', (e) => {
      if (!this.isDragging) {return;}
      const delta = e.clientY - this.startY;
      const newOffset = this.startOffset + delta;
      this._setOffset(newOffset);

      // Track velocity
      const now = Date.now();
      const dt = now - this.lastTime;
      if (dt > 0) {
        this.velocity = (e.clientY - this.lastY) / dt;
      }
      this.lastTime = now;
      this.lastY = e.clientY;
    });

    document.addEventListener('touchend', () => this._endDrag());
    document.addEventListener('mouseup', () => this._endDrag());

    // Wheel events
    this.wheel.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1 : -1;
      this._snapToIndex(this.currentIndex + delta);
    }, { passive: false });

    // Keyboard
    this.wheel.setAttribute('tabindex', '0');
    this.wheel.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          this._snapToIndex(this.currentIndex - 1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          this._snapToIndex(this.currentIndex + 1);
          break;
        case 'Home':
          e.preventDefault();
          this._snapToIndex(0);
          break;
        case 'End':
          e.preventDefault();
          this._snapToIndex(this.options.values.length - 1);
          break;
      }
    });

    // Click to select
    this.wheel.addEventListener('click', (e) => {
      const item = e.target.closest('.wheel-picker-item');
      if (item) {
        this._snapToIndex(parseInt(item.dataset.index, 10));
      }
    });
  }

  _getCurrentOffset() {
    return -this.currentIndex * this.itemHeight;
  }

  _setOffset(offset) {
    const maxOffset = 0;
    const minOffset = -(this.options.values.length - 1) * this.itemHeight;

    let clampedOffset = offset;
    if (!this.options.loop) {
      clampedOffset = Math.max(minOffset, Math.min(maxOffset, offset));
    }

    this.wheel.style.transform = `translateY(${this.itemHeight + clampedOffset}px)`;

    // Update visual depth effect
    this.wheel.querySelectorAll('.wheel-picker-item').forEach((item, index) => {
      const itemOffset = index * this.itemHeight + clampedOffset;
      const distance = Math.abs(itemOffset);
      const scale = Math.max(0.6, 1 - distance / 200);
      const opacity = Math.max(0.3, 1 - distance / 150);
      item.style.transform = `scale(${scale})`;
      item.style.opacity = String(opacity);
    });
  }

  _endDrag() {
    if (!this.isDragging) {return;}
    this.isDragging = false;

    // Apply momentum
    const momentum = this.velocity * 100;
    const targetOffset = this._getCurrentOffset() + momentum;
    const targetIndex = Math.round(-targetOffset / this.itemHeight);

    this._snapToIndex(targetIndex);
  }

  _snapToIndex(index) {
    if (this.options.loop) {
      index = ((index % this.options.values.length) + this.options.values.length) % this.options.values.length;
    } else {
      index = Math.max(0, Math.min(this.options.values.length - 1, index));
    }

    this.currentIndex = index;
    this._animateToOffset(-index * this.itemHeight);
    this._updateSelection();
  }

  _animateToOffset(targetOffset) {
    const startOffset = parseFloat(this.wheel.style.transform?.match(/translateY\(([^)]+)px\)/)?.[1] || this.itemHeight) - this.itemHeight;
    const startTime = performance.now();
    const duration = 200;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const offset = startOffset + (targetOffset - startOffset) * eased;

      this._setOffset(offset);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  _updateSelection() {
    const selectedValue = this.options.values[this.currentIndex];

    this.wheel.querySelectorAll('.wheel-picker-item').forEach((item, index) => {
      const isSelected = index === this.currentIndex;
      item.classList.toggle('is-selected', isSelected);
      item.setAttribute('aria-selected', String(isSelected));
    });

    if (this.options.onChange) {
      this.options.onChange(selectedValue, this.currentIndex);
    }
  }

  getValue() {
    return this.options.values[this.currentIndex];
  }

  setValue(value) {
    const index = this.options.values.findIndex(v =>
      this._getDisplayValue(v) === value || v === value
    );
    if (index !== -1) {
      this._snapToIndex(index);
    }
  }
}

/**
 * SegmentedControl - Enhanced segmented control with smooth animations
 */
export class SegmentedControl {
  constructor(container, options = {}) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    this.options = {
      segments: [],
      initialValue: null,
      label: 'Select option',
      onChange: null,
      ...options
    };

    this.value = this.options.initialValue || (this.options.segments[0]?.value ?? null);
    this.indicator = null;

    this._init();
  }

  _init() {
    this._createStructure();
    this._setupEvents();
    this._updateIndicator();
  }

  _createStructure() {
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'segmented-control';
    this.wrapper.setAttribute('role', 'radiogroup');
    this.wrapper.setAttribute('aria-label', this.options.label);

    // Track
    this.track = document.createElement('div');
    this.track.className = 'segmented-control-track';

    // Indicator (slides behind active segment)
    this.indicator = document.createElement('div');
    this.indicator.className = 'segmented-control-indicator';
    this.track.appendChild(this.indicator);

    // Segments
    this.options.segments.forEach((segment, _index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'segmented-control-btn';
      btn.dataset.value = String(segment.value);
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', segment.value === this.value ? 'true' : 'false');
      btn.innerHTML = `
        ${segment.icon ? `<span class="material-symbols-outlined" aria-hidden="true">${segment.icon}</span>` : ''}
        <span class="segmented-control-label">${segment.label}</span>
      `;
      this.track.appendChild(btn);
    });

    this.wrapper.appendChild(this.track);
    this.container.appendChild(this.wrapper);
  }

  _setupEvents() {
    this.track.addEventListener('click', (e) => {
      const btn = e.target.closest('.segmented-control-btn');
      if (btn) {
        this.setValue(btn.dataset.value);
      }
    });

    // Keyboard navigation
    this.track.addEventListener('keydown', (e) => {
      const buttons = Array.from(this.track.querySelectorAll('.segmented-control-btn'));
      const currentIndex = buttons.findIndex(b => b.dataset.value === this.value);

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp': {
          e.preventDefault();
          const prevIndex = (currentIndex - 1 + buttons.length) % buttons.length;
          this.setValue(buttons[prevIndex].dataset.value);
          buttons[prevIndex].focus();
          break;
        }
        case 'ArrowRight':
        case 'ArrowDown': {
          e.preventDefault();
          const nextIndex = (currentIndex + 1) % buttons.length;
          this.setValue(buttons[nextIndex].dataset.value);
          buttons[nextIndex].focus();
          break;
        }
      }
    });
  }

  _updateIndicator() {
    const buttons = this.track.querySelectorAll('.segmented-control-btn');
    const activeBtn = Array.from(buttons).find(b => b.dataset.value === this.value);

    if (activeBtn && this.indicator) {
      const trackRect = this.track.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();

      this.indicator.style.width = `${btnRect.width}px`;
      this.indicator.style.left = `${btnRect.left - trackRect.left}px`;
    }
  }

  setValue(value) {
    this.value = value;

    this.track.querySelectorAll('.segmented-control-btn').forEach(btn => {
      const isActive = btn.dataset.value === value;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-checked', String(isActive));
    });

    this._updateIndicator();

    if (this.options.onChange) {
      this.options.onChange(value);
    }
  }

  getValue() {
    return this.value;
  }
}

/**
 * RadialMenu - Circular radial menu for quick actions
 */
export class RadialMenu {
  constructor(container, options = {}) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    this.options = {
      items: [],
      radius: 100,
      onSelect: null,
      ...options
    };

    this.isOpen = false;
    this.selectedIndex = -1;

    this._init();
  }

  _init() {
    this._createStructure();
    this._setupEvents();
  }

  _createStructure() {
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'radial-menu';
    this.wrapper.setAttribute('role', 'menu');
    this.wrapper.setAttribute('aria-label', 'Quick actions');

    // Center trigger
    this.trigger = document.createElement('button');
    this.trigger.type = 'button';
    this.trigger.className = 'radial-menu-trigger';
    this.trigger.setAttribute('aria-haspopup', 'menu');
    this.trigger.setAttribute('aria-expanded', 'false');
    this.trigger.innerHTML = '<span class="material-symbols-outlined">menu</span>';
    this.wrapper.appendChild(this.trigger);

    // Radial items
    this.itemsContainer = document.createElement('div');
    this.itemsContainer.className = 'radial-menu-items';

    const angleStep = 360 / this.options.items.length;

    this.options.items.forEach((item, index) => {
      const menuItem = document.createElement('button');
      menuItem.type = 'button';
      menuItem.className = 'radial-menu-item';
      menuItem.setAttribute('role', 'menuitem');
      menuItem.dataset.index = String(index);
      menuItem.innerHTML = `
        <span class="radial-menu-item-icon">
          <span class="material-symbols-outlined">${item.icon}</span>
        </span>
        <span class="radial-menu-item-label">${item.label}</span>
      `;

      // Position around center
      const angle = (angleStep * index - 90) * (Math.PI / 180);
      menuItem.style.setProperty('--x', `${Math.cos(angle) * this.options.radius}px`);
      menuItem.style.setProperty('--y', `${Math.sin(angle) * this.options.radius}px`);

      this.itemsContainer.appendChild(menuItem);
    });

    this.wrapper.appendChild(this.itemsContainer);
    this.container.appendChild(this.wrapper);
  }

  _setupEvents() {
    this.trigger.addEventListener('click', () => this.toggle());

    this.itemsContainer.addEventListener('click', (e) => {
      const item = e.target.closest('.radial-menu-item');
      if (item) {
        const index = parseInt(item.dataset.index, 10);
        this.select(index);
      }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (this.isOpen && !this.wrapper.contains(e.target)) {
        this.close();
      }
    });

    // Keyboard
    this.trigger.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.open();
      }
    });

    this.itemsContainer.addEventListener('keydown', (e) => {
      if (!this.isOpen) {return;}

      const items = this.options.items;
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          this._focusItem((this.selectedIndex + 1) % items.length);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this._focusItem((this.selectedIndex - 1 + items.length) % items.length);
          break;
        case 'Escape':
          this.close();
          this.trigger.focus();
          break;
      }
    });
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  open() {
    this.isOpen = true;
    this.wrapper.classList.add('is-open');
    this.trigger.setAttribute('aria-expanded', 'true');
    this.itemsContainer.classList.remove('hidden');

    // Animate items in
    const items = this.itemsContainer.querySelectorAll('.radial-menu-item');
    items.forEach((item, index) => {
      item.style.transitionDelay = `${index * 30}ms`;
    });

    // Focus first item
    this._focusItem(0);
  }

  close() {
    this.isOpen = false;
    this.wrapper.classList.remove('is-open');
    this.trigger.setAttribute('aria-expanded', 'false');

    // Reset transition delays
    const items = this.itemsContainer.querySelectorAll('.radial-menu-item');
    items.forEach(item => {
      item.style.transitionDelay = '';
    });
  }

  _focusItem(index) {
    this.selectedIndex = index;
    const items = this.itemsContainer.querySelectorAll('.radial-menu-item');
    items[index]?.focus();
  }

  select(index) {
    const item = this.options.items[index];
    if (item && this.options.onSelect) {
      this.options.onSelect(item, index);
    }
    this.close();
  }
}

/**
 * NumericDial - Rotary knob-style input for numeric values
 */
export class NumericDial {
  constructor(container, options = {}) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    this.options = {
      label: 'Value',
      min: 0,
      max: 100,
      value: 50,
      step: 1,
      suffix: '',
      showValue: true,
      onChange: null,
      ...options
    };

    this.value = this.options.value;
    this.isDragging = false;
    this.startAngle = 0;
    this.currentAngle = this._valueToAngle(this.value);

    this._init();
  }

  _init() {
    this._createStructure();
    this._setupEvents();
    this._updateDisplay();
  }

  _valueToAngle(value) {
    const range = this.options.max - this.options.min;
    const normalized = (value - this.options.min) / range;
    return normalized * 270 - 135; // -135 to 135 degrees
  }

  _angleToValue(angle) {
    const normalized = (angle + 135) / 270;
    const range = this.options.max - this.options.min;
    return Math.round((this.options.min + normalized * range) / this.options.step) * this.options.step;
  }

  _createStructure() {
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'numeric-dial';
    this.wrapper.setAttribute('role', 'slider');
    this.wrapper.setAttribute('aria-label', this.options.label);
    this.wrapper.setAttribute('aria-valuemin', String(this.options.min));
    this.wrapper.setAttribute('aria-valuemax', String(this.options.max));
    this.wrapper.setAttribute('aria-valuenow', String(this.value));

    // Dial track
    this.track = document.createElement('div');
    this.track.className = 'numeric-dial-track';
    this.track.innerHTML = `
      <svg viewBox="0 0 100 100" class="numeric-dial-svg">
        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border-color)" stroke-width="4" />
        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--primary-vibrant)" stroke-width="4"
                stroke-dasharray="251.2" stroke-dashoffset="251.2" class="numeric-dial-progress"
                transform="rotate(-135 50 50)" />
      </svg >
    `;
    this.wrapper.appendChild(this.track);

    // Dial knob
    this.knob = document.createElement('div');
    this.knob.className = 'numeric-dial-knob';
    this.knob.innerHTML = '<div class="numeric-dial-indicator"></div>';
    this.wrapper.appendChild(this.knob);

    // Value display
    if (this.options.showValue) {
      this.valueDisplay = document.createElement('div');
      this.valueDisplay.className = 'numeric-dial-value';
      this.valueDisplay.innerHTML = `
        <span class="numeric-dial-value-num">${this.value}</span>
        <span class="numeric-dial-value-suffix">${this.options.suffix}</span>
      `;
      this.wrapper.appendChild(this.valueDisplay);
    }

    // Label
    this.label = document.createElement('div');
    this.label.className = 'numeric-dial-label';
    this.label.textContent = this.options.label;
    this.wrapper.appendChild(this.label);

    this.container.appendChild(this.wrapper);
  }

  _setupEvents() {
    this.knob.addEventListener('mousedown', (e) => this._startDrag(e));
    this.knob.addEventListener('touchstart', (e) => this._startDrag(e), { passive: false });

    document.addEventListener('mousemove', (e) => this._handleDrag(e));
    document.addEventListener('touchmove', (e) => this._handleDrag(e), { passive: false });
    document.addEventListener('mouseup', () => this._endDrag());
    document.addEventListener('touchend', () => this._endDrag());

    // Keyboard
    this.knob.setAttribute('tabindex', '0');
    this.knob.addEventListener('keydown', (e) => {
      let delta = 0;
      void delta;
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowUp':
          delta = this.options.step;
          break;
        case 'ArrowLeft':
        case 'ArrowDown':
          delta = -this.options.step;
          break;
        case 'PageUp':
          delta = this.options.step * 10;
          break;
        case 'PageDown':
          delta = -this.options.step * 10;
          break;
        case 'Home':
          this.value = this.options.min;
          this._updateDisplay();
          return;
        case 'End':
          this.value = this.options.max;
          this._updateDisplay();
          return;
        default:
          return;
      }

      e.preventDefault();
      this.value = Math.max(this.options.min, Math.min(this.options.max, this.value + delta));
      this._updateDisplay();

      if (this.options.onChange) {
        this.options.onChange(this.value);
      }
    });
  }

  _startDrag(e) {
    e.preventDefault();
    this.isDragging = true;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const rect = this.wrapper.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    this.startAngle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
  }

  _handleDrag(e) {
    if (!this.isDragging) {return;}

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const rect = this.wrapper.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const angle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);

    // Clamp angle to valid range
    let newAngle = angle;
    if (newAngle < -135) {newAngle = -135;}
    if (newAngle > 135) {newAngle = 135;}

    this.currentAngle = newAngle;
    this.value = this._angleToValue(newAngle);
    this.value = Math.max(this.options.min, Math.min(this.options.max, this.value));

    this._updateDisplay();
  }

  _endDrag() {
    if (this.isDragging) {
      this.isDragging = false;
      if (this.options.onChange) {
        this.options.onChange(this.value);
      }
    }
  }

  _updateDisplay() {
    // Update knob rotation
    this.knob.style.transform = `rotate(${this.currentAngle}deg)`;

    // Update progress arc
    const progress = this.track.querySelector('.numeric-dial-progress');
    if (progress) {
      const range = this.options.max - this.options.min;
      const pct = (this.value - this.options.min) / range;
      const circumference = 251.2; // 2 * PI * 40
      progress.style.strokeDashoffset = String(circumference * (1 - pct));
    }

    // Update value display
    if (this.valueDisplay) {
      this.valueDisplay.querySelector('.numeric-dial-value-num').textContent = this.value;
    }

    // Update ARIA
    this.wrapper.setAttribute('aria-valuenow', String(this.value));
  }

  getValue() {
    return this.value;
  }

  setValue(value) {
    this.value = Math.max(this.options.min, Math.min(this.options.max, value));
    this.currentAngle = this._valueToAngle(this.value);
    this._updateDisplay();
  }
}
