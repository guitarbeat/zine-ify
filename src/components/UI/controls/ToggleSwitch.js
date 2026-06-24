export class ToggleSwitch {
  /**
   * Initialize a toggle switch component
   * @param {HTMLElement} element - The checkbox input element
   * @param {Function} onChange - Callback for when the state changes
   */
  constructor(element, onChange) {
    if (!element) { return; }
    this.element = element;
    this.onChange = onChange;

    this.init();
  }

  init() {
    this.element.addEventListener('change', (e) => {
      if (this.onChange) { this.onChange(e.target.checked); }
    });
  }

  isChecked() {
    return this.element.checked;
  }

  setChecked(checked) {
    this.element.checked = !!checked;
  }
}