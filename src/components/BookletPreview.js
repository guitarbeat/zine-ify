import { buildMiniZineBookletStates, MINI_ZINE_LAYOUT } from '../utils/miniZineLayout.js';
import { normalizePreviewPage, getPageLabel } from '../utils/previewHelpers.js';

export class BookletPreview {
  constructor({ container, prevButton, nextButton, statusElement }) {
    this.container = container;
    this.prevButton = prevButton;
    this.nextButton = nextButton;
    this.statusElement = statusElement;
    this.pages = [];
    this.spreadIndex = 0;
    this.isAnimating = false;

    if (!this.container) {
      return;
    }

    this.renderBase();
    this.bindControls();
    this.updateStaticSpread();
    this.updateControls();
  }

  renderBase() {
    this.container.innerHTML = `
      <div class="booklet-shell">
        <div class="booklet-stage">
          <div class="booklet-spread">
            <div class="booklet-page booklet-page-left" data-side="left">
              <img class="booklet-page-media" alt="Left page preview">
              <span class="booklet-page-placeholder"></span>
            </div>
            <div class="booklet-spine" aria-hidden="true"></div>
            <div class="booklet-page booklet-page-right" data-side="right">
              <img class="booklet-page-media" alt="Right page preview">
              <span class="booklet-page-placeholder"></span>
            </div>
            <div class="booklet-turn-layer" aria-hidden="true">
              <div class="booklet-turn-card">
                <div class="booklet-face booklet-face-front">
                  <img class="booklet-page-media" alt="">
                  <span class="booklet-page-placeholder"></span>
                </div>
                <div class="booklet-face booklet-face-back">
                  <img class="booklet-page-media" alt="">
                  <span class="booklet-page-placeholder"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.spread = this.container.querySelector('.booklet-spread');
    this.leftPage = this.container.querySelector('.booklet-page-left');
    this.rightPage = this.container.querySelector('.booklet-page-right');
    this.turnLayer = this.container.querySelector('.booklet-turn-layer');
    this.turnCard = this.container.querySelector('.booklet-turn-card');
    this.turnFront = this.container.querySelector('.booklet-face-front');
    this.turnBack = this.container.querySelector('.booklet-face-back');
  }

  bindControls() {
    this.prevButton?.addEventListener('click', () => this.goPrev());
    this.nextButton?.addEventListener('click', () => this.goNext());
    this.turnCard?.addEventListener('transitionend', () => this.finishTurn());
    this.leftPage?.addEventListener('click', () => this.goPrev());
    this.rightPage?.addEventListener('click', () => this.goNext());
  }

  loadPages(imageUrls = []) {
    const orderedPages = (imageUrls || []).map((page, pageIndex) => normalizePreviewPage(page, pageIndex + 1));
    this.slotPages = MINI_ZINE_LAYOUT.map((pageNumber, slotIndex) => {
      const page = orderedPages[pageNumber - 1] ?? null;
      if (!page) {
        return null;
      }

      return {
        ...page,
        slotIndex,
        pageIndex: pageNumber - 1
      };
    });

    this.states = buildMiniZineBookletStates(this.slotPages);
    this.spreadIndex = 0;
    this.isAnimating = false;
    this.hideTurnLayer();
    this.updateStaticSpread();
    this.updateControls();
  }

  hideTurnLayer() {
    this.turnLayer?.classList.remove('is-visible', 'is-active', 'is-next', 'is-prev');
    this.turnLayer?.setAttribute('aria-hidden', 'true');
    this.setPageFace(this.turnFront, null);
    this.setPageFace(this.turnBack, null);
  }

  showTurnLayer(direction) {
    this.turnLayer?.classList.remove('is-prev', 'is-next');
    this.turnLayer?.classList.add(direction > 0 ? 'is-next' : 'is-prev', 'is-visible');
    this.turnLayer?.setAttribute('aria-hidden', 'false');
  }

  getCurrentState() {
    return this.states?.[this.spreadIndex];
  }

  getNextState(direction) {
    return this.states?.[this.spreadIndex + direction];
  }

  updateSpreadMode(state) {
    if (!this.spread) {
      return;
    }

    this.spread.classList.remove('is-single-page', 'is-single-left', 'is-single-right');

    if (!state) {
      return;
    }

    const hasLeft = !!state.left;
    const hasRight = !!state.right;

    if (hasLeft === hasRight) {
      return;
    }

    this.spread.classList.add('is-single-page', hasRight ? 'is-single-right' : 'is-single-left');
  }

  setPageFace(element, page) {
    if (!element) {
      return;
    }

    const media = element.querySelector('.booklet-page-media');
    const placeholder = element.querySelector('.booklet-page-placeholder');
    const src = page?.previewUrl || page?.sourceUrl || null;
    const pageLabel = page ? getPageLabel(page.pageNumber, 8) : 'Blank';

    if (src) {
      media.src = src;
      media.classList.add('is-visible');
      media.style.transform = 'none';
      media.style.objectFit = 'contain';
      placeholder.textContent = '';
      element.classList.remove('is-empty');
    } else {
      media.removeAttribute('src');
      media.classList.remove('is-visible');
      media.style.transform = 'none';
      media.style.objectFit = 'contain';
      placeholder.textContent = pageLabel;
      element.classList.add('is-empty');
    }

    element.dataset.pageNumber = page?.pageNumber ? String(page.pageNumber) : '';
    media.alt = `${pageLabel} preview`;
  }

  updateStaticSpread() {
    const state = this.getCurrentState();
    if (!state) {
      return;
    }

    this.updateSpreadMode(state);
    this.setPageFace(this.leftPage, state.left);
    this.setPageFace(this.rightPage, state.right);
    if (this.statusElement) {
      this.statusElement.textContent = state.label;
    }
  }

  updateControls() {
    const stateCount = this.states?.length ?? 0;
    const disablePrev = this.isAnimating || this.spreadIndex === 0;
    const disableNext = this.isAnimating || this.spreadIndex === (stateCount - 1);

    if (this.prevButton) {
      this.prevButton.disabled = disablePrev;
      this.prevButton.classList.toggle('opacity-50', disablePrev);
      this.prevButton.classList.toggle('cursor-not-allowed', disablePrev);
    }

    if (this.nextButton) {
      this.nextButton.disabled = disableNext;
      this.nextButton.classList.toggle('opacity-50', disableNext);
      this.nextButton.classList.toggle('cursor-not-allowed', disableNext);
    }
  }

  goNext() {
    this.startTurn(1);
  }

  goPrev() {
    this.startTurn(-1);
  }

  startTurn(direction) {
    if (this.isAnimating) {
      return;
    }

    const nextState = this.getNextState(direction);
    if (!nextState) {
      return;
    }

    const currentState = this.getCurrentState();
    this.isAnimating = true;
    this.pendingSpreadIndex = this.spreadIndex + direction;
    this.updateSpreadMode(null);
    if (this.statusElement) {
      this.statusElement.textContent = nextState.label;
    }

    if (direction > 0) {
      this.setPageFace(this.leftPage, currentState.left);
      this.setPageFace(this.rightPage, nextState.right);
      this.setPageFace(this.turnFront, currentState.right);
      this.setPageFace(this.turnBack, nextState.left);
      this.showTurnLayer(direction);
    } else {
      this.setPageFace(this.leftPage, nextState.left);
      this.setPageFace(this.rightPage, currentState.right);
      this.setPageFace(this.turnFront, currentState.left);
      this.setPageFace(this.turnBack, nextState.right);
      this.showTurnLayer(direction);
    }

    this.updateControls();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.turnLayer.classList.add('is-active');
      });
    });
  }

  finishTurn() {
    if (!this.isAnimating) {
      return;
    }

    this.spreadIndex = this.pendingSpreadIndex;
    this.pendingSpreadIndex = null;
    this.isAnimating = false;
    this.hideTurnLayer();
    this.updateStaticSpread();
    this.updateControls();
  }
}
