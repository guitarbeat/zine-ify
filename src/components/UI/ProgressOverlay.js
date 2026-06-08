/**
 * ProgressOverlay.js
 * Self-contained progress overlay component
 */
export class ProgressOverlay {
  constructor(elements) {
    this.elements = elements;
  }

  setCopy(title = 'Processing...', subtext = '') {
    if (this.elements.progressText) {
      this.elements.progressText.textContent = title;
    }
    if (this.elements.progressSubtext) {
      this.elements.progressSubtext.textContent = subtext;
    }
  }

  show(show, title = 'Processing...', subtext = '') {
    if (!this.elements.progressContainer) return;
    if (show) {
      const wasHidden = this.elements.progressContainer.classList.contains('hidden');
      this.setCopy(title, subtext);
      this.elements.progressContainer.style.display = 'flex';
      this.elements.progressContainer.classList.remove('hidden');
      if (wasHidden) {
        this.update(0);
      }
    } else {
      this.elements.progressContainer.classList.add('hidden');
      this.elements.progressContainer.style.display = 'none';
    }
  }

  update(percent) {
    if (typeof percent !== 'number' || Number.isNaN(percent)) {
      return;
    }
    if (this.elements.progressFill) {
      this.elements.progressFill.style.width = `${percent}%`;
    }
    if (this.elements.progressBarWrap) {
      this.elements.progressBarWrap.setAttribute('aria-valuenow', String(percent));
    }
  }
}
