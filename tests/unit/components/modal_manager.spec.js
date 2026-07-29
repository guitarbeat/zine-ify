import { test, expect } from '@playwright/test';
import { JSDOM } from 'jsdom';

test.describe('ModalManager Component', () => {
  let ModalManager;
  let dom;
  let elements;
  let originalWindow;
  let originalDocument;
  let originalRaf;

  test.beforeAll(async () => {
    dom = new JSDOM('<!DOCTYPE html><div id="app"></div>', { url: 'http://localhost/' });
    originalWindow = global.window;
    originalDocument = global.document;
    originalRaf = global.requestAnimationFrame;

    global.window = dom.window;
    global.document = dom.window.document;
    global.requestAnimationFrame = (cb) => { cb(); return 1; };

    const module = await import('../../../src/components/UI/ModalManager.js');
    ModalManager = module.ModalManager;
  });

  test.afterAll(() => {
    global.window = originalWindow;
    global.document = originalDocument;
    global.requestAnimationFrame = originalRaf;
  });

  test.beforeEach(() => {
    document.body.innerHTML = `
      <div id="card-fold-viewer" class="hidden"></div>
      <div id="card-fold-booklet" class="hidden"></div>
      <div id="card-fold-guide" class="hidden"></div>
      <div id="progress-container" class="hidden" style="display: none;">
        <div id="progress-text"></div>
        <div id="progress-subtext"></div>
        <div id="progress-fill"></div>
        <div id="progress-bar-wrap"></div>
      </div>
    `;
    elements = {
      progressContainer: document.getElementById('progress-container'),
      progressText: document.getElementById('progress-text'),
      progressSubtext: document.getElementById('progress-subtext'),
      progressFill: document.getElementById('progress-fill'),
      progressBarWrap: document.getElementById('progress-bar-wrap')
    };
  });

  test('initializes with PagePicker and ProgressOverlay', () => {
    const emitter = {};
    const manager = new ModalManager(elements, emitter);
    expect(manager.elements).toBe(elements);
    expect(manager.emitter).toBe(emitter);
    expect(manager.pagePicker).toBeDefined();
    expect(manager.progress).toBeDefined();
  });

  test('delegates PagePicker methods', () => {
    const manager = new ModalManager(elements, {});

    // Mock PagePicker methods
    let openOpts = null;
    let closeResult = null;
    manager.pagePicker.open = (opts) => { openOpts = opts; return 'open'; };
    manager.pagePicker.close = (res) => { closeResult = res; };

    manager.pagePicker.state = null;
    expect(manager.isPagePickerOpen()).toBe(false);
    manager.pagePicker.state = {};
    expect(manager.isPagePickerOpen()).toBe(true);

    const result = manager.showPagePicker({ test: 1 });
    expect(openOpts).toEqual({ test: 1 });
    expect(result).toBe('open');

    manager.closePagePicker('result');
    expect(closeResult).toBe('result');
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
    expect(elements.progressBarWrap.getAttribute('aria-valuenow')).toBe('50');
  });

  test('toggle3DModal toggles hidden class on fold cards', () => {
    const manager = new ModalManager(elements, {});

    manager.toggle3DModal(true);
    expect(document.getElementById('card-fold-viewer').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('card-fold-booklet').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('card-fold-guide').classList.contains('hidden')).toBe(false);

    manager.toggle3DModal(false);
    expect(document.getElementById('card-fold-viewer').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('card-fold-booklet').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('card-fold-guide').classList.contains('hidden')).toBe(true);
  });

  test('showZoomModal creates and shows modal with expected DOM elements', () => {
    const manager = new ModalManager(elements, {});

    expect(document.querySelector('.zoom-modal')).toBeNull();

    manager.showZoomModal('test.jpg');

    const modal = document.querySelector('.zoom-modal');
    expect(modal).not.toBeNull();
    expect(modal.classList.contains('opacity-100')).toBe(true);
    expect(modal.classList.contains('opacity-0')).toBe(false);

    // Assert DOM elements are correctly constructed
    const img = modal.querySelector('.zoom-img');
    expect(img.src).toContain('test.jpg');
    expect(img.tagName).toBe('IMG');

    const backdrop = modal.querySelector('.absolute');
    expect(backdrop).not.toBeNull();
    expect(backdrop.classList.contains('bg-black/80')).toBe(true);

    const closeBtn = modal.querySelector('.close-modal');
    expect(closeBtn).not.toBeNull();
    expect(closeBtn.tagName).toBe('BUTTON');

    // Test Escape key event listener
    const event = new dom.window.KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(event);
    expect(modal.classList.contains('opacity-0')).toBe(true);
    expect(modal.classList.contains('opacity-100')).toBe(false);

    // Show again to test other closes
    manager.showZoomModal('test2.jpg');
    expect(modal.classList.contains('opacity-100')).toBe(true);
    expect(modal.querySelector('.zoom-img').src).toContain('test2.jpg');

    // Test close by backdrop click
    backdrop.click();
    expect(modal.classList.contains('opacity-0')).toBe(true);

    // Show again
    manager.showZoomModal('test3.jpg');
    expect(modal.classList.contains('opacity-100')).toBe(true);

    // Test close by close button click
    closeBtn.click();
    expect(modal.classList.contains('opacity-0')).toBe(true);

    // Ensure modal is lazily created and not appended twice
    manager.showZoomModal('test4.jpg');
    expect(document.querySelectorAll('.zoom-modal').length).toBe(1);
  });
});
