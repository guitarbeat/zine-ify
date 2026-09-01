import { test, expect } from '@playwright/test';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

test.describe('ProgressOverlay Component', () => {
  let ProgressOverlay;
  let dom;
  let elements;
  let originalWindow;
  let originalDocument;

  test.beforeAll(async () => {
    dom = new JSDOM('<!DOCTYPE html><div id="progress"></div>');
    originalWindow = global.window;
    originalDocument = global.document;

    global.window = dom.window;
    global.document = dom.window.document;

    const module = await import('../../../src/components/UI/ProgressOverlay.js');
    ProgressOverlay = module.ProgressOverlay;
  });

  test.afterAll(() => {
    global.window = originalWindow;
    global.document = originalDocument;
  });

  test.beforeEach(() => {
    document.body.innerHTML = `
      <div id="progress-container" class="hidden" style="display: none;">
        <div id="progress-text"></div>
        <div id="progress-subtext"></div>
        <div id="progress-bar-wrap" aria-valuenow="0">
          <div id="progress-fill" style="width: 0%;"></div>
        </div>
      </div>
    `;

    elements = {
      progressContainer: document.getElementById('progress-container'),
      progressText: document.getElementById('progress-text'),
      progressSubtext: document.getElementById('progress-subtext'),
      progressBarWrap: document.getElementById('progress-bar-wrap'),
      progressFill: document.getElementById('progress-fill'),
    };
  });

  test('initializes with elements', () => {
    const overlay = new ProgressOverlay(elements);
    expect(overlay.elements).toBe(elements);
  });

  test('setCopy updates text content', () => {
    const overlay = new ProgressOverlay(elements);
    overlay.setCopy('New Title', 'New Subtext');
    expect(elements.progressText.textContent).toBe('New Title');
    expect(elements.progressSubtext.textContent).toBe('New Subtext');
  });

  test('setCopy uses default values', () => {
    const overlay = new ProgressOverlay(elements);
    overlay.setCopy();
    expect(elements.progressText.textContent).toBe('Processing...');
    expect(elements.progressSubtext.textContent).toBe('');
  });

  test('show(true) displays overlay and sets copy', () => {
    const overlay = new ProgressOverlay(elements);
    overlay.show(true, 'Loading...', 'Please wait');

    expect(elements.progressContainer.style.display).toBe('flex');
    expect(elements.progressContainer.classList.contains('hidden')).toBe(false);
    expect(elements.progressText.textContent).toBe('Loading...');
    expect(elements.progressSubtext.textContent).toBe('Please wait');

    // Check that it calls update(0) when it was previously hidden
    expect(elements.progressFill.style.width).toBe('0%');
    expect(elements.progressBarWrap.getAttribute('aria-valuenow')).toBe('0');
  });

  test('show(false) hides overlay', () => {
    const overlay = new ProgressOverlay(elements);

    // Show it first
    overlay.show(true);
    expect(elements.progressContainer.classList.contains('hidden')).toBe(false);

    // Hide it
    overlay.show(false);
    expect(elements.progressContainer.classList.contains('hidden')).toBe(true);
    expect(elements.progressContainer.style.display).toBe('none');
  });

  test('show safely returns if container is missing', () => {
    const overlay = new ProgressOverlay({});
    // Should not throw
    overlay.show(true);
  });

  test('update changes progress bar width and aria attribute', () => {
    const overlay = new ProgressOverlay(elements);

    overlay.update(50);
    expect(elements.progressFill.style.width).toBe('50%');
    expect(elements.progressBarWrap.getAttribute('aria-valuenow')).toBe('50');

    overlay.update(100);
    expect(elements.progressFill.style.width).toBe('100%');
    expect(elements.progressBarWrap.getAttribute('aria-valuenow')).toBe('100');
  });

  test('update ignores invalid inputs', () => {
    const overlay = new ProgressOverlay(elements);

    overlay.update(50);

    // Ignore string
    overlay.update('75');
    expect(elements.progressFill.style.width).toBe('50%');

    // Ignore NaN
    overlay.update(NaN);
    expect(elements.progressFill.style.width).toBe('50%');

    // Ignore undefined
    overlay.update();
    expect(elements.progressFill.style.width).toBe('50%');
  });

  test('safely handles missing sub-elements', () => {
    const partialElements = {
      progressContainer: elements.progressContainer
    };
    const overlay = new ProgressOverlay(partialElements);

    // Should not throw
    overlay.setCopy('Title');
    overlay.show(true, 'Title');
    overlay.update(50);
  });
});
