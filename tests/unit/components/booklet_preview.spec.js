import { test, expect } from '@playwright/test';
import { BookletPreview } from '../../../src/components/BookletPreview.js';
import { JSDOM } from 'jsdom';

test.describe('BookletPreview Component', () => {
  let dom;
  let container;
  let prevButton;
  let nextButton;
  let statusElement;
  let originalWindow;
  let originalDocument;
  let originalRaf;

  test.beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><div id="container"></div><button id="prev"></button><button id="next"></button><div id="status"></div>');

    // Save original globals if they exist in node test env
    originalWindow = global.window;
    originalDocument = global.document;
    originalRaf = global.requestAnimationFrame;

    global.window = dom.window;
    global.document = dom.window.document;

    // Mock requestAnimationFrame to execute synchronously
    global.requestAnimationFrame = (cb) => {
      cb();
      return 1;
    };

    container = document.getElementById('container');
    prevButton = document.getElementById('prev');
    nextButton = document.getElementById('next');
    statusElement = document.getElementById('status');
  });

  test.afterEach(() => {
    global.window = originalWindow;
    global.document = originalDocument;
    global.requestAnimationFrame = originalRaf;
  });

  test('initializes and renders base HTML structure', () => {
    const preview = new BookletPreview({ container });

    expect(preview.container.querySelector('.booklet-shell')).toBeTruthy();
    expect(preview.container.querySelector('.booklet-stage')).toBeTruthy();
    expect(preview.container.querySelector('.booklet-spread')).toBeTruthy();
    expect(preview.container.querySelector('.booklet-page-left')).toBeTruthy();
    expect(preview.container.querySelector('.booklet-page-right')).toBeTruthy();
    expect(preview.container.querySelector('.booklet-turn-layer')).toBeTruthy();

    // Check cached element references
    expect(preview.spread).toBeTruthy();
    expect(preview.leftPage).toBeTruthy();
    expect(preview.rightPage).toBeTruthy();
    expect(preview.turnLayer).toBeTruthy();
    expect(preview.turnCard).toBeTruthy();
  });

  test('does not render if container is missing', () => {
    const preview = new BookletPreview({});
    expect(preview.spread).toBeUndefined();
    expect(preview.pages).toEqual([]);
  });

  test('loadPages sets up states and initializes layout properly', () => {
    const preview = new BookletPreview({ container, prevButton, nextButton, statusElement });
    const fakeImages = Array.from({ length: 8 }, (_, i) => `url-page-${i + 1}.png`);

    preview.loadPages(fakeImages);

    expect(preview.states.length).toBe(5); // Cover + 3 spreads + Back
    expect(preview.spreadIndex).toBe(0);
    expect(preview.isAnimating).toBe(false);
    expect(statusElement.textContent).toBe('Cover');

    const currentState = preview.getCurrentState();
    expect(currentState.label).toBe('Cover');

    // For Cover, right page is populated with page 1, left is null
    expect(preview.rightPage.querySelector('.booklet-page-media').src).toContain('url-page-1.png');
    expect(preview.leftPage.classList.contains('is-empty')).toBe(true);

    expect(preview.prevButton.disabled).toBe(true); // Can't go back from cover
    expect(preview.nextButton.disabled).toBe(false);
  });

  test('startTurn handles forward navigation and animation classes', () => {
    const preview = new BookletPreview({ container, prevButton, nextButton, statusElement });
    const fakeImages = Array.from({ length: 8 }, (_, i) => `url-page-${i + 1}.png`);

    preview.loadPages(fakeImages);

    // Turn forward
    preview.goNext();

    expect(preview.isAnimating).toBe(true);
    expect(preview.pendingSpreadIndex).toBe(1);

    // Since RAF is mocked to execute synchronously, 'is-active' class should be immediately applied
    expect(preview.turnLayer.classList.contains('is-visible')).toBe(true);
    expect(preview.turnLayer.classList.contains('is-active')).toBe(true);
    expect(preview.turnLayer.classList.contains('is-next')).toBe(true);

    // Finish turn (simulating transitionend)
    preview.finishTurn();

    expect(preview.isAnimating).toBe(false);
    expect(preview.spreadIndex).toBe(1);
    expect(preview.turnLayer.classList.contains('is-visible')).toBe(false);
    expect(statusElement.textContent).toBe('Pages 2-3');

    expect(preview.prevButton.disabled).toBe(false);
  });

  test('startTurn handles backward navigation', () => {
    const preview = new BookletPreview({ container, prevButton, nextButton, statusElement });
    const fakeImages = Array.from({ length: 8 }, (_, i) => `url-page-${i + 1}.png`);

    preview.loadPages(fakeImages);

    // Go to spread 1
    preview.goNext();
    preview.finishTurn();

    // Turn backward
    preview.goPrev();

    expect(preview.pendingSpreadIndex).toBe(0);
    expect(preview.turnLayer.classList.contains('is-prev')).toBe(true);

    preview.finishTurn();
    expect(preview.spreadIndex).toBe(0);
    expect(statusElement.textContent).toBe('Cover');
  });

  test('ignores turns if currently animating', () => {
    const preview = new BookletPreview({ container, prevButton, nextButton, statusElement });
    const fakeImages = Array.from({ length: 8 }, (_, i) => `url-page-${i + 1}.png`);

    preview.loadPages(fakeImages);

    preview.goNext();
    expect(preview.isAnimating).toBe(true);
    expect(preview.pendingSpreadIndex).toBe(1);

    // Attempt another turn while animating
    preview.goNext();
    expect(preview.pendingSpreadIndex).toBe(1); // Should still be 1, not 2
  });

  test('bindControls handles DOM click events', () => {
    const preview = new BookletPreview({ container, prevButton, nextButton, statusElement });
    const fakeImages = Array.from({ length: 8 }, (_, i) => `url-page-${i + 1}.png`);
    preview.loadPages(fakeImages);

    // Click next button
    nextButton.click();
    expect(preview.pendingSpreadIndex).toBe(1);
    preview.finishTurn();

    // Click right page
    preview.rightPage.click();
    expect(preview.pendingSpreadIndex).toBe(2);
    preview.finishTurn();

    // Click left page
    preview.leftPage.click();
    expect(preview.pendingSpreadIndex).toBe(1);
    preview.finishTurn();

    // Click prev button
    prevButton.click();
    expect(preview.pendingSpreadIndex).toBe(0);
    preview.finishTurn();
  });
});
