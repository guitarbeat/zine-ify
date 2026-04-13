/**
 * DragAndDropHandler.js
 * Manages drag and drop interactions for the UI
 */
export class DragAndDropHandler {
  constructor(elements, emitter) {
    this.elements = elements;
    this.emitter = emitter;
    this._draggedItem = null;
  }

  setupEventListeners() {
    this.elements.uploadZone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.elements.uploadZone.classList.add('dragover');
    });
    this.elements.uploadZone?.addEventListener('dragleave', (e) => {
      e.preventDefault();
      this.elements.uploadZone.classList.remove('dragover');
    });
    this.elements.uploadZone?.addEventListener('drop', (e) => {
      e.preventDefault();
      this.elements.uploadZone.classList.remove('dragover');
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        this.emitter.emit('filesDropped', files);
      }
    });
  }

  handleDragStart(e, cell) {
    this._draggedItem = cell;
    e.dataTransfer.effectAllowed = 'move';
    cell.classList.add('dragging');
  }

  handleDragOver(e, cell) {
    if (e.preventDefault) e.preventDefault();
    if (this._draggedItem === cell) return;
    cell.classList.add('drag-over');
    return false;
  }

  handleDragLeave(cell) {
    cell.classList.remove('drag-over');
  }

  handleDrop(e, cell) {
    if (e.stopPropagation) e.stopPropagation();
    cell.classList.remove('drag-over');
    if (this._draggedItem && this._draggedItem !== cell) {
      const fromIndex = parseInt(this._draggedItem.getAttribute('data-page-index'));
      const toIndex = parseInt(cell.getAttribute('data-page-index'));
      this.emitter.emit('pagesSwapped', { fromIndex, toIndex });
    }
    return false;
  }

  handleDragEnd(cell) {
    this._draggedItem = null;
    cell.classList.remove('dragging');
    document.querySelectorAll('.page-cell').forEach(c => c.classList.remove('drag-over'));
  }
}
