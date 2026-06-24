/* eslint-disable */
import { PagePicker } from './PagePicker.js';
import { ProgressOverlay } from './ProgressOverlay.js';

/**
 * ModalManager.js
 * Thin orchestrator: PagePicker + ProgressOverlay + Zoom modal + 3D modal
 */
export class ModalManager {
  constructor(elements, emitter) {
    this.elements = elements;
    this.emitter = emitter;
    this.pagePicker = new PagePicker(elements);
    this.progress = new ProgressOverlay(elements);
  }

  /* ── PagePicker ── */
  showPagePicker(opts) {
    return this.pagePicker.open(opts);
  }
  closePagePicker(result) {
    this.pagePicker.close(result);
  }
  isPagePickerOpen() {
    return this.pagePicker.state !== null;
  }

  /* ── ProgressOverlay ── */
  showProgress(show, title, subtext) {
    this.progress.show(show, title, subtext);
  }
  setProgressCopy(title, subtext) {
    this.progress.setCopy(title, subtext);
  }
  updateProgress(percent) {
    this.progress.update(percent);
  }

  /* ── 3D Modal ── */
  toggle3DModal(show) {
    const modal = this.elements.zine3dModal;
    if (!modal) {return;}
    if (show) {
      modal.style.display = 'flex';
      modal.classList.remove('hidden');
      requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        modal.classList.add('opacity-100');
      });
    } else {
      modal.classList.add('opacity-0');
      modal.classList.remove('opacity-100');
      setTimeout(() => {
        modal.classList.add('hidden');
        modal.style.display = 'none';
      }, 300);
    }
  }

  /* ── Zoom Modal ── */
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
            <button class="close-modal w-8 h-8 bg-white border-2 border-black text-black flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors focus:outline-none" style="box-shadow: 2px 2px 0px 0px black;" aria-label="Close page preview" title="Close page preview">
              <span class="material-symbols-outlined font-bold" aria-hidden="true">close</span>
            </button>
          </div>
          <div class="flex-1 overflow-auto p-4 flex items-center justify-center" style="background-color: var(--bg-neutral);">
            <img class="zoom-img max-w-full max-h-full object-contain" style="border: 2px solid black; box-shadow: 4px 4px 0px 0px black;" src="" alt="Zoomed Page Preview" />
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      const hide = () => {
        modal.classList.add('opacity-0', 'pointer-events-none');
        modal.classList.remove('opacity-100', 'pointer-events-auto');
        modal.querySelector('div').classList.remove('scale-100');
        modal.querySelector('div').classList.add('scale-95');
      };
      modal.querySelector('.close-modal').addEventListener('click', hide);
      modal.querySelector('.absolute').addEventListener('click', hide);
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('opacity-100')) {
          hide();
        }
      });
    }
    modal.querySelector('.zoom-img').src = imageUrl;
    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.classList.add('opacity-100', 'pointer-events-auto');
    requestAnimationFrame(() => {
      modal.querySelector('div').classList.remove('scale-95');
      modal.querySelector('div').classList.add('scale-100');
    });
  }
}
