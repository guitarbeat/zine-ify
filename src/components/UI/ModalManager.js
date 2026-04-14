import { toast } from '../Toast.js';

/**
 * ModalManager.js
 * Manages UI modals (Zoom, Page Picker, 3D Review, Progress)
 */
export class ModalManager {
  constructor(elements, emitter) {
    this.elements = elements;
    this.emitter = emitter;
    this.pagePickerState = null;

    this.bindPagePickerEvents();
  }

  bindPagePickerEvents() {
    this.elements.pagePickerClose?.addEventListener('click', () => this.closePagePicker(null));
    this.elements.pagePickerCancel?.addEventListener('click', () => this.closePagePicker(null));
    this.elements.pagePickerBackdrop?.addEventListener('click', () => this.closePagePicker(null));
    this.elements.pagePickerConfirm?.addEventListener('click', () => this.confirmPagePickerSelection());
    this.elements.pagePickerSelectFirst?.addEventListener('click', () => this.applyPagePickerPreset('first'));
    this.elements.pagePickerSelectLast?.addEventListener('click', () => this.applyPagePickerPreset('last'));
    this.elements.pagePickerSelectEven?.addEventListener('click', () => this.applyPagePickerPreset('even'));
    this.elements.pagePickerSelectOdd?.addEventListener('click', () => this.applyPagePickerPreset('odd'));
    this.elements.pagePickerClear?.addEventListener('click', () => this.applyPagePickerPreset('clear'));
  }

  toggle3DModal(show) {
    if (!this.elements.zine3dModal) {
      return;
    }
    if (show) {
      this.elements.zine3dModal.style.display = 'flex';
      this.elements.zine3dModal.classList.remove('hidden');
      setTimeout(() => {
        this.elements.zine3dModal.classList.remove('opacity-0');
        this.elements.zine3dModal.classList.add('opacity-100');
      }, 10);
    } else {
      this.elements.zine3dModal.classList.add('opacity-0');
      this.elements.zine3dModal.classList.remove('opacity-100');
      setTimeout(() => {
        this.elements.zine3dModal.classList.add('hidden');
        this.elements.zine3dModal.style.display = 'none';
      }, 300);
    }
  }

  isPagePickerOpen() {
    return !!this.pagePickerState;
  }

  showPagePicker({ fileName, totalPages, selectionLimit, thumbnails }) {
    if (!this.elements.pagePickerModal || !this.elements.pagePickerGrid) {
      return Promise.resolve(
        Array.from({ length: Math.min(selectionLimit, totalPages) }, (_, index) => index + 1)
      );
    }

    if (this.pagePickerState?.resolve) {
      this.pagePickerState.resolve(null);
    }

    const initialSelection = thumbnails
      .slice(0, Math.min(selectionLimit, thumbnails.length))
      .map(({ pageNumber }) => pageNumber);

    this.pagePickerState = {
      resolve: null,
      thumbnails,
      selectionLimit,
      selected: new Set(initialSelection)
    };

    if (this.elements.pagePickerSubtitle) {
      this.elements.pagePickerSubtitle.textContent = `${fileName} has ${totalPages} pages. Pick up to ${selectionLimit}.`;
    }
    if (this.elements.pagePickerSelectFirst) {
      this.elements.pagePickerSelectFirst.textContent = `First ${selectionLimit}`;
    }
    if (this.elements.pagePickerSelectLast) {
      this.elements.pagePickerSelectLast.textContent = `Last ${selectionLimit}`;
    }

    this.renderPagePickerGrid(thumbnails, initialSelection);
    this.updatePagePickerStatus();
    this.elements.pagePickerModal.classList.remove('hidden');
    this.elements.pagePickerModal.classList.add('flex');
    document.body.style.overflow = 'hidden';

    return new Promise((resolve) => {
      if (this.pagePickerState) {
        this.pagePickerState.resolve = resolve;
      } else {
        resolve(null);
      }
    });
  }

  closePagePicker(selectedPages = null) {
    if (!this.pagePickerState) {
      return;
    }

    const { resolve } = this.pagePickerState;
    this.pagePickerState = null;

    this.elements.pagePickerModal?.classList.add('hidden');
    this.elements.pagePickerModal?.classList.remove('flex');

    if (this.elements.pagePickerGrid) {
      this.elements.pagePickerGrid.innerHTML = '';
    }

    document.body.style.overflow = '';
    resolve?.(selectedPages);
  }

  renderPagePickerGrid(thumbnails, initialSelection = []) {
    if (!this.elements.pagePickerGrid) {
      return;
    }

    this.elements.pagePickerGrid.innerHTML = '';
    thumbnails.forEach(({ pageNumber, thumbnailUrl }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'page-picker-thumb';
      button.dataset.pageNumber = String(pageNumber);
      button.setAttribute('aria-pressed', initialSelection.includes(pageNumber) ? 'true' : 'false');
      button.innerHTML = `
        <div class="page-picker-thumb-media">
          <img src="${thumbnailUrl}" alt="PDF page ${pageNumber}">
        </div>
        <div class="page-picker-thumb-page">
          <span>Page ${pageNumber}</span>
          <span class="page-picker-thumb-order" aria-hidden="true"></span>
        </div>
      `;
      button.addEventListener('click', () => this.togglePageSelection(pageNumber));
      this.elements.pagePickerGrid.appendChild(button);
    });
  }

  togglePageSelection(pageNumber) {
    if (!this.pagePickerState) {
      return;
    }

    const { selected, selectionLimit } = this.pagePickerState;
    if (selected.has(pageNumber)) {
      selected.delete(pageNumber);
    } else {
      if (selected.size >= selectionLimit) {
        toast.warning('Selection Full', `Pick up to ${selectionLimit} pages for this upload.`);
        return;
      }
      selected.add(pageNumber);
    }

    this.updatePagePickerStatus();
  }

  applyPagePickerPreset(preset) {
    if (!this.pagePickerState) {
      return;
    }

    const { thumbnails, selectionLimit, selected } = this.pagePickerState;
    selected.clear();

    let nextSelection = [];
    if (preset === 'first') {
      nextSelection = thumbnails.slice(0, selectionLimit);
    } else if (preset === 'last') {
      nextSelection = thumbnails.slice(-selectionLimit);
    } else if (preset === 'even') {
      nextSelection = thumbnails.filter((item) => item.pageNumber % 2 === 0).slice(0, selectionLimit);
    } else if (preset === 'odd') {
      nextSelection = thumbnails.filter((item) => item.pageNumber % 2 === 1).slice(0, selectionLimit);
    }

    nextSelection.forEach((item) => selected.add(item.pageNumber));
    this.updatePagePickerStatus();
  }

  updatePagePickerStatus() {
    if (!this.pagePickerState) {
      return;
    }

    const selectedPages = Array.from(this.pagePickerState.selected).sort((a, b) => a - b);
    const orderMap = new Map(selectedPages.map((pageNumber, index) => [pageNumber, index + 1]));
    const hasCapacity = selectedPages.length < this.pagePickerState.selectionLimit;

    this.elements.pagePickerGrid?.querySelectorAll('.page-picker-thumb').forEach((button) => {
      const pageNum = parseInt(button.dataset.pageNumber || '', 10);
      const isSelected = orderMap.has(pageNum);
      const orderLabel = button.querySelector('.page-picker-thumb-order');

      button.classList.toggle('is-selected', isSelected);
      button.classList.toggle('is-disabled', !isSelected && !hasCapacity);
      button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');

      if (orderLabel) {
        orderLabel.textContent = isSelected ? String(orderMap.get(pageNum)) : '';
      }
    });

    if (this.elements.pagePickerCount) {
      this.elements.pagePickerCount.textContent = `${selectedPages.length} of ${this.pagePickerState.selectionLimit} selected`;
    }

    if (this.elements.pagePickerHelper) {
      this.elements.pagePickerHelper.textContent = selectedPages.length === 0
        ? `Choose up to ${this.pagePickerState.selectionLimit} pages to import.`
        : `Selected pages: ${selectedPages.join(', ')}`;
    }

    if (this.elements.pagePickerConfirm) {
      this.elements.pagePickerConfirm.disabled = selectedPages.length === 0;
      this.elements.pagePickerConfirm.setAttribute('aria-disabled', selectedPages.length === 0 ? 'true' : 'false');
    }
  }

  confirmPagePickerSelection() {
    if (!this.pagePickerState) {
      return;
    }

    const selectedPages = Array.from(this.pagePickerState.selected).sort((a, b) => a - b);
    if (selectedPages.length === 0) {
      toast.warning('No Pages Selected', 'Choose at least one page to import.');
      return;
    }

    this.closePagePicker(selectedPages);
  }

  showZoomModal(imageUrl) {
    let modal = document.querySelector('.zoom-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'zoom-modal fixed inset-0 z-[300] flex items-center justify-center opacity-0 pointer-events-none transition-opacity duration-300';
      modal.innerHTML = `
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
        <div class="relative w-11/12 h-11/12 max-w-7xl max-h-[90vh] bg-white overflow-hidden flex flex-col scale-95 transition-transform duration-300" style="border: 3px solid black; box-shadow: 6px 6px 0px 0px black;">
          <div class="flex justify-between items-center px-4 py-2 border-b-2 border-black">
            <h3 class="font-bold uppercase tracking-wider text-sm">Page Preview</h3>
            <button class="close-modal w-8 h-8 bg-white border-2 border-black text-black flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors focus:outline-none" style="box-shadow: 2px 2px 0px 0px black;">
              <span class="material-symbols-outlined font-bold" aria-hidden="true">close</span>
            </button>
          </div>
          <div class="flex-1 overflow-auto p-4 flex items-center justify-center" style="background-color: var(--bg-neutral);">
            <img class="zoom-img max-w-full max-h-full object-contain" style="border: 2px solid black; box-shadow: 4px 4px 0px 0px black;" src="" alt="Zoomed Page Preview" />
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      const hideModal = () => {
        modal.classList.add('opacity-0', 'pointer-events-none');
        modal.classList.remove('opacity-100', 'pointer-events-auto');
        modal.querySelector('div').classList.remove('scale-100');
        modal.querySelector('div').classList.add('scale-95');
      };
      modal.querySelector('.close-modal').addEventListener('click', hideModal);
      modal.querySelector('.absolute').addEventListener('click', hideModal);
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('opacity-100')) {
          hideModal();
        }
      });
    }
    const img = modal.querySelector('.zoom-img');
    img.src = imageUrl;
    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.classList.add('opacity-100', 'pointer-events-auto');
    setTimeout(() => {
      modal.querySelector('div').classList.remove('scale-95');
      modal.querySelector('div').classList.add('scale-100');
    }, 10);
  }

  setProgressCopy(title = 'Processing...', subtext = '') {
    if (this.elements.progressText) {
      this.elements.progressText.textContent = title;
    }
    if (this.elements.progressSubtext) {
      this.elements.progressSubtext.textContent = subtext;
    }
  }

  showProgress(show, title = 'Processing...', subtext = '') {
    if (!this.elements.progressContainer) {
      return;
    }
    if (show) {
      const wasHidden = this.elements.progressContainer.classList.contains('hidden');
      this.setProgressCopy(title, subtext);
      this.elements.progressContainer.style.display = 'flex';
      this.elements.progressContainer.classList.remove('hidden');
      if (wasHidden) {
        this.updateProgress(0);
      }
    } else {
      this.elements.progressContainer.classList.add('hidden');
      this.elements.progressContainer.style.display = 'none';
    }
  }

  updateProgress(percent) {
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
