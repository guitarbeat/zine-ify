/**
 * ModalManager.js
 * Manages UI modals (Zoom, Page Picker, 3D Review, Progress)
 */
export class ModalManager {
  constructor(elements, emitter) {
    this.elements = elements;
    this.emitter = emitter;
  }

  toggle3DModal(show) {
    if (!this.elements.zine3dModal) return;
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

  showPagePicker({ fileName, totalPages, selectionLimit, thumbnails }) {
    return new Promise((resolve) => {
      this.pagePickerState = { resolve, selectedPages: [], selectionLimit };
      if (this.elements.pagePickerSubtitle) {
        this.elements.pagePickerSubtitle.textContent = `Choose up to ${selectionLimit} pages from ${fileName}`;
      }
      this.renderPagePickerGrid(thumbnails);
      this.updatePagePickerStatus();
      this.elements.pagePickerModal.classList.remove('hidden');
      this.elements.pagePickerModal.classList.add('flex');
    });
  }

  closePagePicker(selectedPages = null) {
    this.elements.pagePickerModal.classList.add('hidden');
    this.elements.pagePickerModal.classList.remove('flex');
    if (this.pagePickerState?.resolve) {
      this.pagePickerState.resolve(selectedPages);
    }
    this.pagePickerState = null;
  }

  renderPagePickerGrid(thumbnails) {
    if (!this.elements.pagePickerGrid) return;
    this.elements.pagePickerGrid.innerHTML = '';
    thumbnails.forEach(({ pageNumber, thumbnailUrl }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'page-picker-thumb';
      button.dataset.pageNumber = pageNumber;
      button.innerHTML = `
        <div class="page-picker-thumb-media">
          <img src="${thumbnailUrl}" alt="Page ${pageNumber}">
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
    if (!this.pagePickerState) return;
    const index = this.pagePickerState.selectedPages.indexOf(pageNumber);
    if (index >= 0) {
      this.pagePickerState.selectedPages.splice(index, 1);
    } else if (this.pagePickerState.selectedPages.length < this.pagePickerState.selectionLimit) {
      this.pagePickerState.selectedPages.push(pageNumber);
    }
    this.updatePagePickerStatus();
  }

  updatePagePickerStatus() {
    const { selectedPages, selectionLimit } = this.pagePickerState;
    if (this.elements.pagePickerCount) {
      this.elements.pagePickerCount.textContent = `${selectedPages.length} of ${selectionLimit} selected`;
    }
    const buttons = this.elements.pagePickerGrid.querySelectorAll('.page-picker-thumb');
    buttons.forEach((button) => {
      const pageNum = parseInt(button.dataset.pageNumber);
      const selIndex = selectedPages.indexOf(pageNum);
      const isSelected = selIndex >= 0;
      button.classList.toggle('is-selected', isSelected);
      const orderLabel = button.querySelector('.page-picker-thumb-order');
      if (orderLabel) orderLabel.textContent = isSelected ? (selIndex + 1) : '';
    });
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
        if (e.key === 'Escape' && modal.classList.contains('opacity-100')) hideModal();
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

  showProgress(show, title = 'Processing...', subtext = '') {
    if (!this.elements.progressContainer) return;
    if (show) {
      if (this.elements.progressText) this.elements.progressText.textContent = title;
      if (this.elements.progressSubtext) this.elements.progressSubtext.textContent = subtext;
      this.elements.progressContainer.style.display = 'flex';
      this.elements.progressContainer.classList.remove('hidden');
      this.updateProgress(0);
    } else {
      this.elements.progressContainer.classList.add('hidden');
      this.elements.progressContainer.style.display = 'none';
    }
  }

  updateProgress(percent) {
    if (this.elements.progressFill) {
      this.elements.progressFill.style.width = `${percent}%`;
    }
    if (this.elements.progressBarWrap) {
      this.elements.progressBarWrap.setAttribute('aria-valuenow', percent);
    }
  }
}
