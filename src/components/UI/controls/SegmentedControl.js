export class SegmentedControl {
  /**
   * Initialize a segmented control
   * @param {HTMLElement} container - The wrapper element containing .orientation-seg-btn elements
   * @param {Function} onChange - Callback for when the selection changes
   */
  constructor(container, onChange) {
    if (!container) { return; }
    this.container = container;
    this.buttons = container.querySelectorAll('.orientation-seg-btn');
    this.onChange = onChange;

    this.init();
  }

  init() {
    this.buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const value = btn.dataset.value;

        // Update UI state
        this.buttons.forEach((b) => {
          const isActive = b === btn;
          b.classList.toggle('is-active', isActive);
          b.setAttribute('aria-pressed', String(isActive));
        });

        if (this.onChange) { this.onChange(value); }
      });
    });
  }

  getValue() {
    const activeBtn = Array.from(this.buttons).find(b => b.classList.contains('is-active'));
    return activeBtn ? activeBtn.dataset.value : null;
  }

  setValue(value) {
    this.buttons.forEach((b) => {
      const isActive = b.dataset.value === value;
      b.classList.toggle('is-active', isActive);
      b.setAttribute('aria-pressed', String(isActive));
    });
  }
}