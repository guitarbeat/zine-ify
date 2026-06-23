import Sortable from 'sortablejs';

/**
 * DragAndDropHandler.js
 * File-drop handling + SortableJS page reordering
 */
export class DragAndDropHandler {
  constructor(elements, emitter) {
    this.elements = elements;
    this.emitter = emitter;
    this._sortables = [];
  }

  setupEventListeners() {
    // Upload zone
    this.elements.uploadZone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.elements.uploadZone.classList.add('dragover');
    });
    this.elements.uploadZone?.addEventListener('dragleave', () => {
      this.elements.uploadZone.classList.remove('dragover');
    });
    this.elements.uploadZone?.addEventListener('drop', (e) => {
      e.preventDefault();
      this.elements.uploadZone.classList.remove('dragover');
      const files = Array.from(e.dataTransfer.files);
      if (files.length) this.emitter.emit('filesDropped', files);
    });

    // Unified drop zone (workspace canvas) — external file drops only
    const zone = document.getElementById('unified-drop-zone');
    if (zone) {
      zone.addEventListener('dragover', (e) => {
        // Ignore drags that originate from page cells (Sortable handles those)
        if (e.dataTransfer?.types.includes('text/plain')) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        zone.classList.add('drag-active');
      });
      zone.addEventListener('dragleave', (e) => {
        if (!zone.contains(e.relatedTarget)) zone.classList.remove('drag-active');
      });
      zone.addEventListener('drop', (e) => {
        zone.classList.remove('drag-active');
        const files = Array.from(e.dataTransfer?.files ?? []);
        if (files.length) { e.preventDefault(); this.emitter.emit('filesDropped', files); }
      });
    }
  }

  /**
   * Attach a Sortable instance to one zine grid.
   * Call after every render (LayoutRenderer re-creates DOM).
   */
  initSortable(gridEl) {
    if (!gridEl) return;

    let draggedPageIndex = null;
    let targetPageIndex  = null;

    const s = new Sortable(gridEl, {
      animation: 160,
      ghostClass:  'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass:   'sortable-drag',

      // Don't start a sort drag when clicking toolbar buttons
      filter: '.page-toolbar, button',
      preventOnFilter: false,

      onStart: ({ item }) => {
        draggedPageIndex = parseInt(item.dataset.pageIndex, 10);
        targetPageIndex  = null;
      },

      // Track the last cell the ghost hovered over
      onMove: (evt) => {
        const rel = evt.related;
        if (rel?.classList.contains('page-cell')) {
          targetPageIndex = parseInt(rel.dataset.pageIndex, 10);
        }
        return true;
      },

      onEnd: () => {
        if (
          draggedPageIndex !== null &&
          targetPageIndex  !== null &&
          draggedPageIndex !== targetPageIndex
        ) {
          this.emitter.emit('pagesSwapped', {
            fromIndex: draggedPageIndex,
            toIndex:   targetPageIndex,
          });
        }
        draggedPageIndex = null;
        targetPageIndex  = null;
      },
    });

    this._sortables.push(s);
    return s;
  }

  /** Destroy all Sortable instances (call before re-render) */
  destroySortables() {
    this._sortables.forEach(s => s.destroy());
    this._sortables = [];
  }
}
