
/* eslint-disable */
/**
 * Accessible UI Components
 * Inclusive design patterns that work across diverse users
 * - Keyboard navigable
 * - Screen reader friendly
 * - Progressive enhancement
 * - Reduced motion support
 */

/**
 * AccessibleTabs - Alternative to carousels
 *
 * Carousels are problematic because:
 * - Auto-play can't be paused by many users
 * - Content is often hidden, requiring navigation to discover
 * - Keyboard users have difficulty accessing all slides
 * - Motion can cause vestibular issues
 *
 * AccessibleTabs provides all content upfront with organized navigation.
 */
export class AccessibleTabs {
  constructor(container, options = {}) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    if (!this.container) {
      console.error('AccessibleTabs: Container not found');
      return;
    }

    this.options = {
      tabListLabel: 'Content sections',
      defaultTab: 0,
      orientation: 'horizontal', // or 'vertical'
      activation: 'auto', // 'auto' or 'manual'
      onChange: null,
      ...options
    };

    this.tabs = [];
    this.panels = [];
    this.activeTab = null;

    this._init();
  }

  _init() {
    // Find existing tab structure or create from children
    this._discoverTabs();

    if (this.tabs.length === 0) {
      console.warn('AccessibleTabs: No tabs found');
      return;
    }

    this._setupAttributes();
    this._setupKeyboardNav();
    this._selectTab(this.options.defaultTab);
  }

  _discoverTabs() {
    // Look for existing tab list
    const tabList = this.container.querySelector('[role="tablist"]');

    if (tabList) {
      this.tabList = tabList;
      this.tabs = Array.from(tabList.querySelectorAll('[role="tab"]'));
      this.panels = this.tabs.map(tab => {
        const panelId = tab.getAttribute('aria-controls');
        return document.getElementById(panelId);
      }).filter(Boolean);
    } else {
      // Create tabs from container children
      this._createTabsFromChildren();
    }
  }

  _createTabsFromChildren() {
    const children = Array.from(this.container.children);
    if (children.length === 0) return;

    // Create tab list
    this.tabList = document.createElement('div');
    this.tabList.setAttribute('role', 'tablist');
    this.tabList.setAttribute('aria-label', this.options.tabListLabel);

    const tabIds = [];
    const panelIds = [];

    children.forEach((child, index) => {
      const tabId = `tab-${this._generateId()}-${index}`;
      const panelId = `panel-${this._generateId()}-${index}`;
      tabIds.push(tabId);
      panelIds.push(panelId);
    });

    // Create tabs and panels
    children.forEach((child, index) => {
      // Get label from heading or data attribute
      const label = child.querySelector('h2, h3, h4')?.textContent
        || child.dataset.tabLabel
        || `Section ${index + 1}`;

      // Create tab button
      const tab = document.createElement('button');
      tab.id = tabIds[index];
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', panelIds[index]);
      tab.setAttribute('aria-selected', 'false');
      tab.setAttribute('tabindex', '-1');
      tab.className = 'accessible-tab';
      tab.textContent = label;

      // Create panel wrapper
      const panel = document.createElement('div');
      panel.id = panelIds[index];
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tabIds[index]);
      panel.setAttribute('tabindex', '0');
      panel.className = 'accessible-tabpanel';
      panel.hidden = true;

      // Move child content into panel
      panel.appendChild(child.cloneNode(true));
      child.replaceWith(panel);

      this.tabs.push(tab);
      this.panels.push(panel);
      this.tabList.appendChild(tab);
    });

    this.container.prepend(this.tabList);
  }

  _setupAttributes() {
    // Set orientation
    this.tabList.setAttribute('aria-orientation', this.options.orientation);

    // Ensure all tabs and panels have proper attributes
    this.tabs.forEach((tab, index) => {
      tab.setAttribute('role', 'tab');
      if (!tab.id) tab.id = `tab-${index}`;
      if (!tab.getAttribute('aria-controls')) {
        tab.setAttribute('aria-controls', this.panels[index]?.id);
      }
      tab.setAttribute('tabindex', '-1');
    });

    this.panels.forEach((panel, index) => {
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('tabindex', '0');
      panel.hidden = index !== this.options.defaultTab;
      if (!panel.getAttribute('aria-labelledby')) {
        panel.setAttribute('aria-labelledby', this.tabs[index]?.id);
      }
    });
  }

  _setupKeyboardNav() {
    this.tabList.addEventListener('keydown', (e) => {
      const currentIndex = this.tabs.indexOf(document.activeElement);
      if (currentIndex === -1) return;

      const isVertical = this.options.orientation === 'vertical';
      const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';
      const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';

      let newIndex = currentIndex;
      void newIndex;
      void newIndex;
      void newIndex;
      void newIndex;

      switch (e.key) {
        case nextKey:
          e.preventDefault();
          newIndex = (currentIndex + 1) % this.tabs.length;
          break;
        case prevKey:
          e.preventDefault();
          newIndex = (currentIndex - 1 + this.tabs.length) % this.tabs.length;
          break;
        case 'Home':
          e.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          newIndex = this.tabs.length - 1;
          break;
        default:
          return;
      }

      // Focus the new tab
      this.tabs[newIndex].focus();

      // Auto-activate on navigation if configured
      if (this.options.activation === 'auto') {
        this._selectTab(newIndex);
      }
    });

    // Click handling
    this.tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => {
        this._selectTab(index);
        tab.focus();
      });
    });
  }

  _selectTab(index) {
    if (index < 0 || index >= this.tabs.length) return;

    // Update all tabs
    this.tabs.forEach((tab, i) => {
      const isSelected = i === index;
      tab.setAttribute('aria-selected', String(isSelected));
      tab.setAttribute('tabindex', isSelected ? '0' : '-1');
      tab.classList.toggle('is-active', isSelected);
    });

    // Update all panels
    this.panels.forEach((panel, i) => {
      panel.hidden = i !== index;
      panel.classList.toggle('is-active', i === index);
    });

    // Track active tab
    this.activeTab = index;

    // Callback
    if (this.options.onChange) {
      this.options.onChange(index, this.tabs[index], this.panels[index]);
    }

    // Announce to screen readers
    this._announce(`Showing ${this.tabs[index].textContent}`);
  }

  _announce(message) {
    const announcer = document.getElementById('sr-announcer');
    if (announcer) {
      announcer.textContent = message;
    }
  }

  _generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  // Public API
  selectTab(index) {
    this._selectTab(index);
  }

  nextTab() {
    const next = (this.activeTab + 1) % this.tabs.length;
    this._selectTab(next);
  }

  prevTab() {
    const prev = (this.activeTab - 1 + this.tabs.length) % this.tabs.length;
    this._selectTab(prev);
  }

  getActiveTab() {
    return this.activeTab;
  }
}

/**
 * AccessibleList - Alternative to infinite scroll
 *
 * Infinite scroll is problematic because:
 * - No sense of progress or completion
 * - Can't skip to end or go back easily
 * - Footer content is unreachable
 * - Performance degrades with DOM growth
 * - Announcements don't work well
 *
 * AccessibleList uses "Load More" with progress indicator.
 */
export class AccessibleList {
  constructor(container, options = {}) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    if (!this.container) {
      console.error('AccessibleList: Container not found');
      return;
    }

    this.options = {
      pageSize: 10,
      loadMoreLabel: 'Load more items',
      loadingLabel: 'Loading...',
      progressLabel: 'Showing {shown} of {total} items',
      onLoadMore: null, // Async function returning { items: [], total: number, hasMore: boolean }
      renderItem: null, // Function to render each item
      ...options
    };

    this.items = [];
    this.total = 0;
    this.shown = 0;
    this.isLoading = false;
    this.hasMore = true;

    this._init();
  }

  _init() {
    this._createStructure();
    this._setupEvents();

    // Load initial items
    this._loadMore();
  }

  _createStructure() {
    // Create wrapper
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'accessible-list';

    // Status region for screen readers
    this.statusRegion = document.createElement('div');
    this.statusRegion.setAttribute('role', 'status');
    this.statusRegion.setAttribute('aria-live', 'polite');
    this.statusRegion.className = 'accessible-list-status sr-only';
    this.statusRegion.textContent = 'Loading items...';
    this.wrapper.appendChild(this.statusRegion);

    // Item list
    this.listElement = document.createElement('ul');
    this.listElement.setAttribute('role', 'list');
    this.listElement.className = 'accessible-list-items';
    this.wrapper.appendChild(this.listElement);

    // Progress indicator (visual)
    this.progressIndicator = document.createElement('div');
    this.progressIndicator.className = 'accessible-list-progress';
    this.progressIndicator.setAttribute('aria-hidden', 'true');
    this.wrapper.appendChild(this.progressIndicator);

    // Load more button
    this.loadMoreBtn = document.createElement('button');
    this.loadMoreBtn.type = 'button';
    this.loadMoreBtn.className = 'accessible-list-load-more action-button';
    this.loadMoreBtn.textContent = this.options.loadMoreLabel;
    this.loadMoreBtn.setAttribute('aria-describedby', this.statusRegion.id || '');
    this.wrapper.appendChild(this.loadMoreBtn);

    // Wrap existing container content
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
    this.container.appendChild(this.wrapper);
  }

  _setupEvents() {
    this.loadMoreBtn.addEventListener('click', () => this._loadMore());

    // Keyboard shortcut: End key jumps to load more
    this.container.addEventListener('keydown', (e) => {
      if (e.key === 'End' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        this.loadMoreBtn.focus();
      }
    });
  }

  async _loadMore() {
    if (this.isLoading || !this.hasMore) return;

    this.isLoading = true;
    this.loadMoreBtn.disabled = true;
    this.loadMoreBtn.textContent = this.options.loadingLabel;
    this.statusRegion.textContent = this.options.loadingLabel;

    try {
      const result = await this.options.onLoadMore(
        Math.floor(this.shown / this.options.pageSize),
        this.options.pageSize
      );

      if (!result || !result.items) {
        this.hasMore = false;
        return;
      }

      // Add new items
      result.items.forEach(item => {
        this.items.push(item);
        this._renderItem(item);
      });

      this.total = result.total ?? this.items.length;
      this.shown = this.items.length;
      this.hasMore = result.hasMore !== false && this.shown < this.total;

      // Update UI
      this._updateProgress();

    } catch (error) {
      console.error('AccessibleList: Load error', error);
      this.statusRegion.textContent = 'Error loading items. Please try again.';
    } finally {
      this.isLoading = false;
      this.loadMoreBtn.disabled = false;
      this.loadMoreBtn.textContent = this.options.loadMoreLabel;

      // Hide button if no more items
      this.loadMoreBtn.hidden = !this.hasMore;
      if (!this.hasMore) {
        this.statusRegion.textContent = `All ${this.shown} items loaded`;
      }
    }
  }

  _renderItem(item) {
    const li = document.createElement('li');
    li.setAttribute('role', 'listitem');

    if (this.options.renderItem) {
      li.appendChild(this.options.renderItem(item));
    } else {
      li.textContent = typeof item === 'string' ? item : JSON.stringify(item);
    }

    // Add with animation support
    li.style.opacity = '0';
    this.listElement.appendChild(li);

    // Trigger animation
    requestAnimationFrame(() => {
      li.style.transition = 'opacity 0.2s ease';
      li.style.opacity = '1';
    });
  }

  _updateProgress() {
    const progressText = this.options.progressLabel
      .replace('{shown}', String(this.shown))
      .replace('{total}', String(this.total));

    // Screen reader status
    this.statusRegion.textContent = progressText;

    // Visual progress bar
    const percentage = Math.round((this.shown / this.total) * 100);
    this.progressIndicator.innerHTML = `
      <div class="accessible-list-progress-bar" style="width: ${percentage}%"></div>
      <span class="accessible-list-progress-text">${progressText}</span>
    `;
  }

  // Public API
  async loadAll() {
    while (this.hasMore) {
      await this._loadMore();
    }
  }

  refresh() {
    this.items = [];
    this.shown = 0;
    this.listElement.innerHTML = '';
    this._loadMore();
  }

  getItemCount() {
    return this.shown;
  }
}

/**
 * AccessibleCombobox - Alternative to complex dropdowns
 *
 * Complex dropdowns are problematic because:
 * - Keyboard navigation is often inconsistent
 * - Screen readers may not announce options properly
 * - Long lists are hard to navigate
 * - Search/filter isn't always accessible
 *
 * AccessibleCombobox follows WAI-ARIA combobox pattern.
 */
export class AccessibleCombobox {
  constructor(container, options = {}) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    if (!this.container) {
      console.error('AccessibleCombobox: Container not found');
      return;
    }

    this.options = {
      label: 'Select an option',
      placeholder: 'Type to search...',
      noResultsText: 'No results found',
      options: [],
      value: null,
      onSelect: null,
      onSearch: null, // Async search function
      ...options
    };

    this.filteredOptions = [...this.options.options];
    this.activeDescendant = -1;
    this.isOpen = false;
    this.selectedValue = this.options.value;

    this._init();
  }

  _init() {
    this._createStructure();
    this._setupEvents();
    this._updateDisplay();
  }

  _createStructure() {
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'accessible-combobox';

    // Generate unique IDs
    this.inputId = `combobox-input-${Math.random().toString(36).substr(2, 9)}`;
    this.listboxId = `combobox-listbox-${Math.random().toString(36).substr(2, 9)}`;
    this.labelId = `combobox-label-${Math.random().toString(36).substr(2, 9)}`;

    // Label
    this.label = document.createElement('label');
    this.label.id = this.labelId;
    this.label.className = 'accessible-combobox-label';
    this.label.textContent = this.options.label;
    this.label.setAttribute('for', this.inputId);
    this.wrapper.appendChild(this.label);

    // Input container
    this.inputContainer = document.createElement('div');
    this.inputContainer.className = 'accessible-combobox-container';

    // Text input
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.id = this.inputId;
    this.input.className = 'accessible-combobox-input workspace-config-input';
    this.input.setAttribute('role', 'combobox');
    this.input.setAttribute('aria-autocomplete', 'list');
    this.input.setAttribute('aria-expanded', 'false');
    this.input.setAttribute('aria-controls', this.listboxId);
    this.input.setAttribute('aria-labelledby', this.labelId);
    this.input.setAttribute('aria-haspopup', 'listbox');
    this.input.setAttribute('placeholder', this.options.placeholder);
    this.input.setAttribute('autocomplete', 'off');
    this.inputContainer.appendChild(this.input);

    // Dropdown indicator
    this.indicator = document.createElement('button');
    this.indicator.type = 'button';
    this.indicator.className = 'accessible-combobox-indicator';
    this.indicator.setAttribute('aria-hidden', 'true');
    this.indicator.setAttribute('tabindex', '-1');
    this.indicator.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="2" fill="none"/></svg>`;
    this.inputContainer.appendChild(this.indicator);

    this.wrapper.appendChild(this.inputContainer);

    // Listbox (dropdown)
    this.listbox = document.createElement('ul');
    this.listbox.id = this.listboxId;
    this.listbox.setAttribute('role', 'listbox');
    this.listbox.className = 'accessible-combobox-listbox';
    this.listbox.hidden = true;
    this.wrapper.appendChild(this.listbox);

    // Clear existing and add wrapper
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
    this.container.appendChild(this.wrapper);

    // Render initial options
    this._renderOptions();
  }

  _setupEvents() {
    // Input events
    this.input.addEventListener('input', (e) => this._handleInput(e));
    this.input.addEventListener('focus', () => this._open());
    this.input.addEventListener('blur', (e) => this._handleBlur(e));
    this.input.addEventListener('keydown', (e) => this._handleKeydown(e));

    // Indicator click
    this.indicator.addEventListener('click', () => {
      if (this.isOpen) {
        this._close();
      } else {
        this.input.focus();
      }
    });

    // Click outside to close
    document.addEventListener('click', (e) => {
      if (!this.wrapper.contains(e.target)) {
        this._close();
      }
    });
  }

  _handleInput(e) {
    const query = e.target.value.toLowerCase().trim();
    this._filterOptions(query);
    this._open();
  }

  _handleBlur(e) {
    // Delay to allow click on option
    setTimeout(() => {
      if (!this.wrapper.contains(document.activeElement)) {
        this._close();
        this._updateDisplay();
      }
    }, 150);
  }

  _handleKeydown(e) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this._navigateOption(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this._navigateOption(-1);
        break;
      case 'Enter':
        e.preventDefault();
        this._selectActiveOption();
        break;
      case 'Escape':
        e.preventDefault();
        this._close();
        this.input.value = '';
        this._updateDisplay();
        break;
      case 'Tab':
        this._close();
        break;
    }
  }

  _navigateOption(direction) {
    const options = this.listbox.querySelectorAll('[role="option"]:not([aria-disabled="true"])');
    if (options.length === 0) return;

    const newIndex = this.activeDescendant + direction;

    if (newIndex < 0) {
      this.activeDescendant = options.length - 1;
    } else if (newIndex >= options.length) {
      this.activeDescendant = 0;
    } else {
      this.activeDescendant = newIndex;
    }

    this._updateActiveDescendant(options);
  }

  _updateActiveDescendant(options) {
    options.forEach((opt, index) => {
      const isActive = index === this.activeDescendant;
      opt.classList.toggle('is-active', isActive);
      opt.setAttribute('aria-selected', String(isActive));

      if (isActive) {
        // Scroll into view
        opt.scrollIntoView({ block: 'nearest' });
        this.input.setAttribute('aria-activedescendant', opt.id);
      }
    });
  }

  _selectActiveOption() {
    const options = this.listbox.querySelectorAll('[role="option"]:not([aria-disabled="true"])');
    const activeOption = options[this.activeDescendant];

    if (activeOption) {
      this._selectOption(activeOption.dataset.value);
    }
  }

  _selectOption(value) {
    const option = this.options.options.find(o => o.value === value);
    if (option) {
      this.selectedValue = value;
      this.input.value = option.label;
      this._close();

      if (this.options.onSelect) {
        this.options.onSelect(option);
      }
    }
  }

  async _filterOptions(query) {
    if (this.options.onSearch) {
      // Async search
      this.filteredOptions = await this.options.onSearch(query);
    } else {
      // Local filter
      this.filteredOptions = this.options.options.filter(opt =>
        opt.label.toLowerCase().includes(query)
      );
    }

    this._renderOptions();
  }

  _renderOptions() {
    this.listbox.innerHTML = '';

    if (this.filteredOptions.length === 0) {
      const noResults = document.createElement('li');
      noResults.setAttribute('role', 'option');
      noResults.setAttribute('aria-disabled', 'true');
      noResults.className = 'accessible-combobox-option is-disabled';
      noResults.textContent = this.options.noResultsText;
      this.listbox.appendChild(noResults);
      return;
    }

    this.filteredOptions.forEach((option, index) => {
      const li = document.createElement('li');
      li.id = `${this.listboxId}-option-${index}`;
      li.setAttribute('role', 'option');
      li.setAttribute('data-value', option.value);
      li.setAttribute('aria-selected', option.value === this.selectedValue ? 'true' : 'false');
      li.className = 'accessible-combobox-option';

      if (option.value === this.selectedValue) {
        li.classList.add('is-selected');
        this.activeDescendant = index;
      }

      // Label text
      const labelSpan = document.createElement('span');
      labelSpan.className = 'accessible-combobox-option-label';
      labelSpan.textContent = option.label;
      li.appendChild(labelSpan);

      // Optional description
      if (option.description) {
        const descSpan = document.createElement('span');
        descSpan.className = 'accessible-combobox-option-desc';
        descSpan.textContent = option.description;
        li.appendChild(descSpan);
      }

      // Click handler
      li.addEventListener('click', () => this._selectOption(option.value));

      this.listbox.appendChild(li);
    });
  }

  _open() {
    if (this.isOpen) return;

    this.isOpen = true;
    this.listbox.hidden = false;
    this.input.setAttribute('aria-expanded', 'true');
    this.wrapper.classList.add('is-open');

    // Reset active descendant
    this.activeDescendant = -1;
  }

  _close() {
    if (!this.isOpen) return;

    this.isOpen = false;
    this.listbox.hidden = true;
    this.input.setAttribute('aria-expanded', 'false');
    this.input.removeAttribute('aria-activedescendant');
    this.wrapper.classList.remove('is-open');
  }

  _updateDisplay() {
    const selectedOption = this.options.options.find(o => o.value === this.selectedValue);
    this.input.value = selectedOption ? selectedOption.label : '';
  }

  // Public API
  getValue() {
    return this.selectedValue;
  }

  setValue(value) {
    this.selectedValue = value;
    this._updateDisplay();
    this._renderOptions();
  }

  setOptions(options) {
    this.options.options = options;
    this.filteredOptions = [...options];
    this._renderOptions();
  }

  focus() {
    this.input.focus();
  }
}

/**
 * Accordion - Progressive enhancement pattern
 *
 * Transforms existing content into an accessible accordion.
 * Works without JavaScript (CSS-only state) for progressive enhancement.
 */
export class Accordion {
  constructor(container, options = {}) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    if (!this.container) {
      console.error('Accordion: Container not found');
      return;
    }

    this.options = {
      allowMultiple: false,
      defaultExpanded: [],
      onToggle: null,
      ...options
    };

    this.items = [];

    this._init();
  }

  _init() {
    this._discoverItems();
    this._setupAttributes();
    this._setupEvents();
  }

  _discoverItems() {
    const sections = this.container.querySelectorAll('details');

    sections.forEach((section, index) => {
      const trigger = section.querySelector('summary');
      if (!trigger) return;

      this.items.push({
        section,
        trigger,
        id: section.id || `accordion-${index}`
      });
    });
  }

  _setupAttributes() {
    this.items.forEach((item) => {
      const { section, trigger } = item;

      // Ensure proper attributes
      trigger.setAttribute('role', 'button');
      trigger.setAttribute('aria-expanded', section.open ? 'true' : 'false');

      // Add class for styling hooks
      section.classList.add('accordion-item');
      trigger.classList.add('accordion-trigger');

      // Content area
      const content = trigger.nextElementSibling;
      if (content) {
        content.id = content.id || `${item.id}-content`;
        trigger.setAttribute('aria-controls', content.id);
        content.classList.add('accordion-content');
      }
    });
  }

  _setupEvents() {
    this.items.forEach((item, index) => {
      const { section, trigger } = item;

      // Handle click
      trigger.addEventListener('click', (e) => {
        // If allowMultiple is false, close others
        if (!this.options.allowMultiple) {
          this.items.forEach((otherItem, otherIndex) => {
            if (otherIndex !== index && otherItem.section.open) {
              otherItem.section.open = false;
              otherItem.trigger.setAttribute('aria-expanded', 'false');
            }
          });
        }
      });

      // Handle keyboard
      trigger.addEventListener('keydown', (e) => {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            const nextIndex = (index + 1) % this.items.length;
            this.items[nextIndex].trigger.focus();
            break;
          case 'ArrowUp':
            e.preventDefault();
            const prevIndex = (index - 1 + this.items.length) % this.items.length;
            this.items[prevIndex].trigger.focus();
            break;
          case 'Home':
            e.preventDefault();
            this.items[0].trigger.focus();
            break;
          case 'End':
            e.preventDefault();
            this.items[this.items.length - 1].trigger.focus();
            break;
        }
      });

      // Observe open changes
      const observer = new MutationObserver(() => {
        trigger.setAttribute('aria-expanded', section.open ? 'true' : 'false');

        if (this.options.onToggle) {
          this.options.onToggle(item, section.open);
        }
      });

      observer.observe(section, { attributes: true, attributeFilter: ['open'] });
    });
  }

  // Public API
  expand(index) {
    if (this.items[index]) {
      this.items[index].section.open = true;
    }
  }

  collapse(index) {
    if (this.items[index]) {
      this.items[index].section.open = false;
    }
  }

  expandAll() {
    this.items.forEach(item => item.section.open = true);
  }

  collapseAll() {
    this.items.forEach(item => item.section.open = false);
  }
}

/**
 * SkipLink - Navigation aid for keyboard users
 * Add to page for immediate keyboard navigation to main content
 */
export function createSkipLink(targetSelector = '#main-content', label = 'Skip to main content') {
  const skipLink = document.createElement('a');
  skipLink.href = targetSelector;
  skipLink.className = 'skip-link';
  skipLink.textContent = label;

  // Style for visual hide but visible on focus
  skipLink.style.cssText = `
    position: absolute;
    top: -40px;
    left: 0;
    padding: 8px 16px;
    background: var(--primary-vibrant, #c45d3e);
    color: white;
    text-decoration: none;
    z-index: 10000;
    transition: top 0.2s ease;
  `;

  skipLink.addEventListener('focus', () => {
    skipLink.style.top = '0';
  });

  skipLink.addEventListener('blur', () => {
    skipLink.style.top = '-40px';
  });

  // Ensure target is focusable
  const target = document.querySelector(targetSelector);
  if (target && !target.hasAttribute('tabindex')) {
    target.setAttribute('tabindex', '-1');
  }

  document.body.insertBefore(skipLink, document.body.firstChild);

  return skipLink;
}

/**
 * ScreenReaderAnnouncer - Live region for announcements
 * Create once and use throughout the app
 */
let announcerInstance = null;

export function getAnnouncer() {
  if (announcerInstance) return announcerInstance;

  const announcer = document.createElement('div');
  announcer.id = 'sr-announcer';
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-live', 'polite');
  announcer.setAttribute('aria-atomic', 'true');
  announcer.className = 'sr-only';
  announcer.style.cssText = `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  `;
  document.body.appendChild(announcer);

  announcerInstance = {
    announce(message, priority = 'polite') {
      announcer.setAttribute('aria-live', priority);
      announcer.textContent = '';
      // Small delay to ensure screen reader catches the change
      setTimeout(() => {
        announcer.textContent = message;
      }, 50);
    },

    assertive(message) {
      this.announce(message, 'assertive');
    }
  };

  return announcerInstance;
}

/**
 * FocusTrap - Modal focus management
 * Traps focus within a container for modals/dialogs
 */
export class FocusTrap {
  constructor(container, options = {}) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    this.options = {
      initialFocus: null, // Selector or element
      returnFocus: true,
      onEscape: null,
      ...options
    };

    this.previousFocus = document.activeElement;
    this.focusableElements = [];

    this._init();
  }

  _init() {
    this._updateFocusableElements();
    this._setupEvents();
    this._focusInitial();
  }

  _updateFocusableElements() {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    this.focusableElements = Array.from(
      this.container.querySelectorAll(selector)
    ).filter(el => el.offsetParent !== null); // Only visible elements
  }

  _setupEvents() {
    this.handler = (e) => this._handleKeydown(e);
    document.addEventListener('keydown', this.handler);
  }

  _handleKeydown(e) {
    if (e.key === 'Escape' && this.options.onEscape) {
      this.options.onEscape();
      return;
    }

    if (e.key !== 'Tab') return;

    this._updateFocusableElements();
    if (this.focusableElements.length === 0) return;

    const first = this.focusableElements[0];
    const last = this.focusableElements[this.focusableElements.length - 1];

    if (e.shiftKey) {
      // Shift+Tab: going backwards
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      // Tab: going forwards
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  _focusInitial() {
    if (this.options.initialFocus) {
      const initial = typeof this.options.initialFocus === 'string'
        ? this.container.querySelector(this.options.initialFocus)
        : this.options.initialFocus;

      if (initial) {
        initial.focus();
        return;
      }
    }

    // Focus first focusable or container
    if (this.focusableElements.length > 0) {
      this.focusableElements[0].focus();
    } else {
      this.container.setAttribute('tabindex', '-1');
      this.container.focus();
    }
  }

  // Public API
  deactivate() {
    document.removeEventListener('keydown', this.handler);

    if (this.options.returnFocus && this.previousFocus) {
      this.previousFocus.focus();
    }
  }

  update() {
    this._updateFocusableElements();
  }
}

/**
 * ReducedMotion - Check user's motion preference
 */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function createMotionSafeAnimation(element, keyframes, options = {}) {
  const duration = prefersReducedMotion() ? 0 : (options.duration || 300);

  return element.animate(keyframes, {
    ...options,
    duration
  });
}
