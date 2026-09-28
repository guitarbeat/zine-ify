import { test, expect } from '@playwright/test';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

test.describe('ModalManager', () => {
  let ModalManager;
  let dom;
  let elements;

  test.beforeAll(async () => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/' });
    global.window = dom.window;
    global.document = dom.window.document;
    global.requestAnimationFrame = (cb) => { cb(); return 1; };

    const module = await import('../../../src/components/UI/ModalManager.js');
    ModalManager = module.ModalManager;
  });

  test.afterAll(() => {
    delete global.window;
    delete global.document;
    delete global.requestAnimationFrame;
  });

  test.beforeEach(() => {
    document.body.innerHTML = `
      <div id="page-picker-overlay" class="hidden"></div>
      <div id="page-picker-grid"></div>
      <div id="progress-container" class="hidden"></div>
      <div id="progress-text"></div>
      <div id="progress-subtext"></div>
      <div id="progress-fill"></div>
      <div id="progress-bar-wrap"></div>

      <div id="card-fold-viewer" class="hidden"></div>
      <div id="card-fold-booklet" class="hidden"></div>
      <div id="card-fold-guide" class="hidden"></div>
    `;

    elements = {
      pagePickerModal: document.getElementById('page-picker-overlay'),
      pagePickerGrid: document.getElementById('page-picker-grid'),
      progressContainer: document.getElementById('progress-container'),
      progressText: document.getElementById('progress-text'),
      progressSubtext: document.getElementById('progress-subtext'),
      progressFill: document.getElementById('progress-fill'),
      progressBarWrap: document.getElementById('progress-bar-wrap')
    };
  });

  test('initializes with PagePicker and ProgressOverlay', () => {
    const manager = new ModalManager(elements, {});
    expect(manager.elements).toBe(elements);
    expect(manager.pagePicker).toBeDefined();
    expect(manager.progress).toBeDefined();
  });

  test('delegates PagePicker methods', () => {
    const manager = new ModalManager(elements, {});

    // Test isPagePickerOpen initially false
    expect(manager.isPagePickerOpen()).toBe(false);

    // Since pagePicker methods just manipulate state and UI, we can call them and check state
    manager.showPagePicker({ fileName: 'test.pdf', totalPages: 1, thumbnails: [] });
    expect(manager.isPagePickerOpen()).toBe(true);

    manager.closePagePicker([1]);
    expect(manager.isPagePickerOpen()).toBe(false);
  });

  test('delegates ProgressOverlay methods', () => {
    const manager = new ModalManager(elements, {});

    manager.showProgress(true, 'Test Title', 'Test Subtext');
    expect(elements.progressContainer.classList.contains('hidden')).toBe(false);
    expect(elements.progressText.textContent).toBe('Test Title');
    expect(elements.progressSubtext.textContent).toBe('Test Subtext');

    manager.setProgressCopy('New Title', 'New Subtext');
    expect(elements.progressText.textContent).toBe('New Title');
    expect(elements.progressSubtext.textContent).toBe('New Subtext');

    manager.updateProgress(50);
    expect(elements.progressFill.style.width).toBe('50%');

    manager.showProgress(false);
    expect(elements.progressContainer.classList.contains('hidden')).toBe(true);
  });

  test('toggle3DModal toggles hidden class on fold cards', () => {
    const manager = new ModalManager(elements, {});
    const viewer = document.getElementById('card-fold-viewer');
    const booklet = document.getElementById('card-fold-booklet');
    const guide = document.getElementById('card-fold-guide');

    manager.toggle3DModal(true);
    expect(viewer.classList.contains('hidden')).toBe(false);
    expect(booklet.classList.contains('hidden')).toBe(false);
    expect(guide.classList.contains('hidden')).toBe(false);

    manager.toggle3DModal(false);
    expect(viewer.classList.contains('hidden')).toBe(true);
    expect(booklet.classList.contains('hidden')).toBe(true);
    expect(guide.classList.contains('hidden')).toBe(true);
  });

  test('showZoomModal creates modal on first call and toggles visibility', () => {
    const manager = new ModalManager(elements, {});
    const imgUrl = 'test-image.jpg';

    manager.showZoomModal(imgUrl);

    const modal = document.querySelector('.zoom-modal');
    expect(modal).not.toBeNull();
    expect(modal.classList.contains('opacity-100')).toBe(true);
    expect(modal.classList.contains('pointer-events-auto')).toBe(true);

    const img = modal.querySelector('.zoom-img');
    expect(img.src).toContain(imgUrl);

    // Hide via backdrop click
    const backdrop = modal.querySelector('.absolute');
    backdrop.click();
    expect(modal.classList.contains('opacity-0')).toBe(true);
    expect(modal.classList.contains('pointer-events-none')).toBe(true);

    // Re-show, verify it doesn't recreate but reuses
    manager.showZoomModal('another.jpg');
    const modals = document.querySelectorAll('.zoom-modal');
    expect(modals.length).toBe(1);
    expect(modal.classList.contains('opacity-100')).toBe(true);
    expect(modal.querySelector('.zoom-img').src).toContain('another.jpg');

    // Hide via close button
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.click();
    expect(modal.classList.contains('opacity-0')).toBe(true);

    // Show again and hide via escape key
    manager.showZoomModal('test.jpg');
    expect(modal.classList.contains('opacity-100')).toBe(true);

    const escapeEvent = new dom.window.KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(escapeEvent);
    expect(modal.classList.contains('opacity-0')).toBe(true);
  });
});
