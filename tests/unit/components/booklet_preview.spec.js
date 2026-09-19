import { test, expect } from '@playwright/test';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

test.describe('BookletPreview Component', () => {
  let dom;
  let container;
  let prevButton;
  let nextButton;
  let statusElement;
  let originalWindow;
  let originalDocument;
  let originalRaf;
  let BookletPreview;

  test.beforeEach(async () => {
    const { JSDOM } = require('jsdom');
    dom = new JSDOM(
      '<!DOCTYPE html><div id="container"></div><button id="prev"></button><button id="next"></button><div id="status"></div>'
    );

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

    const mod = await import('../../../src/components/BookletPreview.js');
    BookletPreview = mod.BookletPreview;
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

    expect(preview.states.length).toBe(5);
    expect(preview.spreadIndex).toBe(0);
    expect(preview.isAnimating).toBe(false);
    expect(statusElement.textContent).toBe('Cover');

    const currentState = preview.getCurrentState();
    expect(currentState.label).toBe('Cover');

    expect(preview.rightPage.querySelector('.booklet-page-media').src).toContain('url-page-1.png');
    expect(preview.leftPage.classList.contains('is-empty')).toBe(true);

    expect(preview.prevButton.disabled).toBe(true);
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
    expect(preview.pendingSpreadIndex).toBe(1);
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

  test('handles keyboard navigation with ArrowLeft and ArrowRight', () => {
    const preview = new BookletPreview({ container, prevButton, nextButton, statusElement });
    const fakeImages = Array.from({ length: 8 }, (_, i) => `url-page-${i + 1}.png`);
    preview.loadPages(fakeImages);

    const rightArrowEvent = new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true });
    preview.shell.dispatchEvent(rightArrowEvent);

    expect(rightArrowEvent.defaultPrevented).toBe(true);
    expect(preview.pendingSpreadIndex).toBe(1);

    preview.finishTurn();
    expect(preview.spreadIndex).toBe(1);

    const leftArrowEvent = new dom.window.KeyboardEvent('keydown', { key: 'ArrowLeft', cancelable: true });
    preview.shell.dispatchEvent(leftArrowEvent);

    expect(leftArrowEvent.defaultPrevented).toBe(true);
    expect(preview.pendingSpreadIndex).toBe(0);

    preview.finishTurn();
    expect(preview.spreadIndex).toBe(0);

    // Other keys should be ignored
    const upArrowEvent = new dom.window.KeyboardEvent('keydown', { key: 'Up', cancelable: true });
    preview.shell.dispatchEvent(upArrowEvent);
    expect(upArrowEvent.defaultPrevented).toBe(false);
  });

  test('handles partial page lists and empty slots when loadPages is called', () => {
    const preview = new BookletPreview({ container, prevButton, nextButton, statusElement });
    // Provide only 3 pages instead of 8
    const fakeImages = ['p1.png', 'p2.png', 'p3.png'];

    preview.loadPages(fakeImages);

    expect(preview.slotPages.length).toBe(8);
    expect(preview.states).toBeDefined();
    expect(preview.states.length).toBe(5);
  });

  test('setPageFace updates page display when page object has sourceUrl instead of previewUrl', () => {
    const preview = new BookletPreview({ container });
    preview.loadPages();

    preview.setPageFace(preview.leftPage, { sourceUrl: 'source-only.png', pageNumber: 2 });
    const img = preview.leftPage.querySelector('.booklet-page-media');
    expect(img.src).toContain('source-only.png');
    expect(preview.leftPage.dataset.pageNumber).toBe('2');
  });

  test('setPageFace safely handles null or empty element reference', () => {
    const preview = new BookletPreview({ container });
    expect(() => preview.setPageFace(null, { previewUrl: 'test.png', pageNumber: 1 })).not.toThrow();
  });

  test('handles startTurn boundary conditions (at ends of spreads or when animating)', () => {
    const preview = new BookletPreview({ container, prevButton, nextButton, statusElement });
    const fakeImages = Array.from({ length: 8 }, (_, i) => `url-page-${i + 1}.png`);
    preview.loadPages(fakeImages);

    // Attempting to goPrev on spreadIndex 0
    preview.goPrev();
    expect(preview.isAnimating).toBe(false);
    expect(preview.spreadIndex).toBe(0);

    // Turn forward to last spread (index 4)
    for (let i = 0; i < 4; i++) {
      preview.goNext();
      preview.finishTurn();
    }
    expect(preview.spreadIndex).toBe(4);

    // Attempting to goNext on last spread
    preview.goNext();
    expect(preview.isAnimating).toBe(false);
    expect(preview.spreadIndex).toBe(4);
  });

  test('finishTurn does nothing if isAnimating is false', () => {
    const preview = new BookletPreview({ container, prevButton, nextButton, statusElement });
    preview.loadPages(['p1.png']);

    expect(preview.isAnimating).toBe(false);
    preview.finishTurn();
    expect(preview.spreadIndex).toBe(0);
  });

  test('updateSpreadMode sets single page mode classes when spread state is single page', () => {
    const preview = new BookletPreview({ container });
    preview.loadPages(['p1.png']);

    // Cover state (left: null, right: page1)
    preview.updateStaticSpread();
    expect(preview.spread.classList.contains('is-single-page')).toBe(true);
    expect(preview.spread.classList.contains('is-single-right')).toBe(true);
    expect(preview.spread.classList.contains('is-single-left')).toBe(false);

    // Custom state with left present, right null
    preview.updateSpreadMode({ left: { pageNumber: 8 }, right: null });
    expect(preview.spread.classList.contains('is-single-page')).toBe(true);
    expect(preview.spread.classList.contains('is-single-left')).toBe(true);
    expect(preview.spread.classList.contains('is-single-right')).toBe(false);

    // Both left and right present
    preview.updateSpreadMode({ left: { pageNumber: 2 }, right: { pageNumber: 3 } });
    expect(preview.spread.classList.contains('is-single-page')).toBe(false);
  });

  test('handles missing prevButton, nextButton, or statusElement gracefully', () => {
    const preview = new BookletPreview({ container }); // No buttons or statusElement
    const fakeImages = Array.from({ length: 8 }, (_, i) => `url-page-${i + 1}.png`);

    expect(() => preview.loadPages(fakeImages)).not.toThrow();
    expect(() => preview.goNext()).not.toThrow();
    expect(() => preview.finishTurn()).not.toThrow();
  });

  test('handles transitionend event on turnCard to invoke finishTurn', () => {
    const preview = new BookletPreview({ container, prevButton, nextButton, statusElement });
    preview.loadPages(['p1.png', 'p2.png']);

    preview.goNext();
    expect(preview.isAnimating).toBe(true);

    const transitionEndEvent = new dom.window.Event('transitionend');
    preview.turnCard.dispatchEvent(transitionEndEvent);

    expect(preview.isAnimating).toBe(false);
    expect(preview.spreadIndex).toBe(1);
  });

  test('loadPages handles default parameter (undefined) safely', () => {
    const preview = new BookletPreview({ container });
    expect(() => preview.loadPages()).not.toThrow();
    expect(preview.states.length).toBe(5);
    expect(preview.slotPages.every(p => p === null)).toBe(true);
  });

  test('updateSpreadMode safely returns when spread element or state is missing/null', () => {
    const preview = new BookletPreview({ container });
    preview.spread = null;
    expect(() => preview.updateSpreadMode({ left: { pageNumber: 1 }, right: null })).not.toThrow();

    const preview2 = new BookletPreview({ container });
    preview2.spread.className = 'booklet-spread is-single-page';
    preview2.updateSpreadMode(null);
    expect(preview2.spread.classList.contains('is-single-page')).toBe(false);
  });

  test('updateControls correctly sets aria and disabled states on buttons', () => {
    const preview = new BookletPreview({ container, prevButton, nextButton, statusElement });
    const fakeImages = Array.from({ length: 8 }, (_, i) => `url-page-${i + 1}.png`);
    preview.loadPages(fakeImages);

    // Initial state: spread 0
    expect(prevButton.disabled).toBe(true);
    expect(prevButton.getAttribute('aria-disabled')).toBe('true');
    expect(nextButton.disabled).toBe(false);
    expect(nextButton.getAttribute('aria-disabled')).toBe('false');

    // Go to last spread: spread 4
    preview.spreadIndex = 4;
    preview.updateControls();

    expect(prevButton.disabled).toBe(false);
    expect(prevButton.getAttribute('aria-disabled')).toBe('false');
    expect(nextButton.disabled).toBe(true);
    expect(nextButton.getAttribute('aria-disabled')).toBe('true');
  });

  test('updateStaticSpread safely does nothing if getCurrentState returns undefined', () => {
    const preview = new BookletPreview({ container });
    preview.states = [];
    expect(() => preview.updateStaticSpread()).not.toThrow();
  });
});
