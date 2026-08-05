import { test, expect } from '@playwright/test';
import { JSDOM } from 'jsdom';

test.describe('ProgressOverlay Component', () => {
  let ProgressOverlay;
  let dom;
  let elements;
  let document;

  test.beforeAll(async () => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    global.window = dom.window;
    global.document = dom.window.document;

    const module = await import('../../../src/components/UI/ProgressOverlay.js');
    ProgressOverlay = module.ProgressOverlay;
  });

  test.afterAll(() => {
    delete global.window;
    delete global.document;
  });

  test.beforeEach(() => {
    document = global.document;
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

  test('constructor sets elements', () => {
    const overlay = new ProgressOverlay(elements);
    expect(overlay.elements).toBe(elements);
  });

  test('setCopy updates text correctly with default values', () => {
    const overlay = new ProgressOverlay(elements);
    overlay.setCopy();
    expect(elements.progressText.textContent).toBe('Processing...');
    expect(elements.progressSubtext.textContent).toBe('');
  });

  test('setCopy updates text correctly with provided values', () => {
    const overlay = new ProgressOverlay(elements);
    overlay.setCopy('New Title', 'New Subtext');
    expect(elements.progressText.textContent).toBe('New Title');
    expect(elements.progressSubtext.textContent).toBe('New Subtext');
  });

  test('setCopy works safely with missing text elements', () => {
    const overlay = new ProgressOverlay({});
    expect(() => overlay.setCopy('Title', 'Subtext')).not.toThrow();
  });

  test('show(true) displays the container and resets progress if it was hidden', () => {
    const overlay = new ProgressOverlay(elements);
    elements.progressContainer.classList.add('hidden');
    elements.progressFill.style.width = '50%'; // Mock state

    overlay.show(true, 'Loading', 'Wait');

    expect(elements.progressContainer.classList.contains('hidden')).toBe(false);
    expect(elements.progressContainer.style.display).toBe('flex');
    expect(elements.progressText.textContent).toBe('Loading');
    expect(elements.progressSubtext.textContent).toBe('Wait');
    expect(elements.progressFill.style.width).toBe('0%'); // Reset
  });

  test('show(true) displays the container without reset if it was not hidden', () => {
    const overlay = new ProgressOverlay(elements);
    elements.progressContainer.classList.remove('hidden');
    elements.progressFill.style.width = '50%'; // Mock state

    overlay.show(true);

    expect(elements.progressContainer.classList.contains('hidden')).toBe(false);
    expect(elements.progressContainer.style.display).toBe('flex');
    expect(elements.progressFill.style.width).toBe('50%'); // No reset
  });

  test('show(false) hides the container', () => {
    const overlay = new ProgressOverlay(elements);
    elements.progressContainer.classList.remove('hidden');
    elements.progressContainer.style.display = 'flex';

    overlay.show(false);

    expect(elements.progressContainer.classList.contains('hidden')).toBe(true);
    expect(elements.progressContainer.style.display).toBe('none');
  });

  test('show works safely without progressContainer', () => {
    const overlay = new ProgressOverlay({});
    expect(() => overlay.show(true)).not.toThrow();
  });

  test('update sets percent correctly', () => {
    const overlay = new ProgressOverlay(elements);

    overlay.update(45);

    expect(elements.progressFill.style.width).toBe('45%');
    expect(elements.progressBarWrap.getAttribute('aria-valuenow')).toBe('45');
  });

  test('update ignores invalid values (string, NaN)', () => {
    const overlay = new ProgressOverlay(elements);
    elements.progressFill.style.width = '10%';
    elements.progressBarWrap.setAttribute('aria-valuenow', '10');

    overlay.update('50'); // String
    expect(elements.progressFill.style.width).toBe('10%');

    overlay.update(NaN); // NaN
    expect(elements.progressFill.style.width).toBe('10%');
  });

  test('update works safely without elements', () => {
    const overlay = new ProgressOverlay({});
    expect(() => overlay.update(50)).not.toThrow();
  });
});
