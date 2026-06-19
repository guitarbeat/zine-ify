/**
 * DragAndDropHandler.js
 * Manages drag and drop interactions for the UI
 */
export class DragAndDropHandler {
  constructor(elements, emitter) {
    this.elements = elements;
    this.emitter = emitter;
    this._draggedItem = null;
    this._draggedSrc = null;
    this._draggedHasPage = false;
  }

  setupEventListeners() {
    // Upload zone in sidebar
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

    // Unified drop zone (workspace stage)
    const unifiedDropZone = document.getElementById('unified-drop-zone');
    if (unifiedDropZone) {
      unifiedDropZone.addEventListener('dragover', (e) => {
        if (this._draggedItem) { return; }
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        unifiedDropZone.classList.add('drag-active');
      });

      unifiedDropZone.addEventListener('dragleave', (e) => {
        if (!unifiedDropZone.contains(e.relatedTarget)) {
          unifiedDropZone.classList.remove('drag-active');
        }
      });

      unifiedDropZone.addEventListener('drop', (e) => {
        if (this._draggedItem) { return; }
        e.preventDefault();
        unifiedDropZone.classList.remove('drag-active');
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
          this.emitter.emit('filesDropped', files);
        }
      });
    }
  }

  handleDragStart(e, cell) {
    this._draggedItem = cell;
    this._draggedHasPage = cell.classList.contains('has-page');
    this._draggedSrc = cell.querySelector('.page-content-img')?.src || null;

    // Use the cell itself as the drag image so the ghost follows the cursor naturally
    e.dataTransfer.effectAllowed = 'move';
    cell.classList.add('dragging');
  }

  handleDragOver(e, cell) {
    if (e.preventDefault) { e.preventDefault(); }
    if (this._draggedItem === cell) { return; }

    if (!cell.classList.contains('drag-over')) {
      cell.classList.add('drag-over');
      this._injectPreview(cell);
    }
    return false;
  }

  handleDragLeave(cell, e) {
    if (e && cell.contains(e.relatedTarget)) { return; }
    cell.classList.remove('drag-over');
    this._removePreview(cell);
  }

  handleDrop(e, cell) {
    if (e.stopPropagation) { e.stopPropagation(); }
    cell.classList.remove('drag-over');
    this._removePreview(cell);

    if (this._draggedItem && this._draggedItem !== cell) {
      const fromIndex = parseInt(this._draggedItem.getAttribute('data-page-index'));
      const toIndex = parseInt(cell.getAttribute('data-page-index'));
      this.emitter.emit('pagesSwapped', { fromIndex, toIndex });
    }
    return false;
  }

  handleDragEnd(cell) {
    this._draggedItem = null;
    this._draggedSrc = null;
    this._draggedHasPage = false;
    cell.classList.remove('dragging');
    document.querySelectorAll('.page-cell').forEach(c => {
      c.classList.remove('drag-over');
      this._removePreview(c);
    });
  }

  _injectPreview(targetCell) {
    this._removePreview(targetCell);

    const overlay = document.createElement('div');
    overlay.className = 'drag-drop-preview';

    // Ghost thumbnail of the dragged page
    if (this._draggedHasPage && this._draggedSrc) {
      const img = document.createElement('img');
      img.src = this._draggedSrc;
      img.className = 'drag-drop-preview-img';
      img.alt = '';
      overlay.appendChild(img);
    }

    // Swap badge
    const badge = document.createElement('div');
    badge.className = 'drag-drop-preview-badge';
    badge.innerHTML = '<span class="material-symbols-outlined">swap_horiz</span>';
    overlay.appendChild(badge);

    targetCell.appendChild(overlay);
  }

  _removePreview(cell) {
    cell.querySelector('.drag-drop-preview')?.remove();
  }
}
