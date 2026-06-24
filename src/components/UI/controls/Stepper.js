export class Stepper {
  /**
   * Initialize a stepper component
   * @param {HTMLElement} container - The wrapper element containing .stepper-btn and .stepper-input
   * @param {Function} onChange - Callback for when the value changes
   */
  constructor(container, onChange) {
    if (!container) { return; }
    this.container = container;

    // Fallback to checking id and direct children if it is a generic wrapper, not the strict '.stepper' container.
    this.input = container.querySelector('.stepper-input') || container.querySelector('input[type="number"]');
    this.buttons = container.querySelectorAll('.stepper-btn');

    if (!this.input) { return; }

    this.onChange = onChange;

    this.min = parseInt(this.input.min, 10) || 0;
    this.max = parseInt(this.input.max, 10) || 100;

    this.init();
  }

  init() {
    this.buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const delta = parseInt(btn.dataset.delta, 10);
        const current = parseInt(this.input.value, 10) || this.min;
        const next = Math.min(this.max, Math.max(this.min, current + delta));

        if (next !== current) {
          this.input.value = next;
          if (this.onChange) { this.onChange(next); }
        }
      });
    });

    this.input.addEventListener('change', (e) => {
      const val = parseInt(e.target.value, 10);
      const safeVal = isNaN(val) ? this.min : Math.min(this.max, Math.max(this.min, val));

      this.input.value = safeVal;
      if (this.onChange) { this.onChange(safeVal); }
    });
  }

  getValue() {
    return parseInt(this.input.value, 10) || this.min;
  }

  setValue(val) {
    const safeVal = isNaN(val) ? this.min : Math.min(this.max, Math.max(this.min, val));
    this.input.value = safeVal;
  }
}