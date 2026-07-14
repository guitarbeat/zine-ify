import { test, expect } from '@playwright/test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="toast-container"></div></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.requestAnimationFrame = (cb) => cb();
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.Event = dom.window.Event;
global.CustomEvent = dom.window.CustomEvent;

test.describe('PagePicker Component', () => {
  let PagePicker;
  let toast;
  let originalWindow;
  let originalDocument;
  let originalRequestAnimationFrame;
  let currentDom;

  test.beforeAll(async () => {
    const PP = await import('../../../src/components/UI/PagePicker.js');
    PagePicker = PP.PagePicker;
    const ToastModule = await import('../../../src/components/Toast.js');
    toast = ToastModule.toast;
  });

  test.beforeEach(() => {
    // Setup JSDOM environment
    currentDom = new JSDOM(`<!DOCTYPE html>
      <html>
        <body>
          <div id="toast-container"></div>
          <div id="page-picker-overlay" class="page-picker-overlay hidden">
            <div id="page-picker-backdrop"></div>
            <div id="page-picker-modal" class="hidden">
              <div id="page-picker-subtitle"></div>
              <div id="page-picker-count"></div>
              <div id="page-picker-grid" class="page-picker-grid"></div>

              <button id="page-picker-close">Close</button>
              <button id="page-picker-cancel">Cancel</button>
              <button id="page-picker-confirm">Confirm</button>

              <button id="page-picker-select-first">First</button>
              <button id="page-picker-select-last">Last</button>
              <button id="page-picker-select-even">Even</button>
              <button id="page-picker-select-odd">Odd</button>
              <button id="page-picker-clear">Clear</button>
            </div>
          </div>
        </body>
      </html>
    `);

    originalWindow = global.window;
    originalDocument = global.document;
    originalRequestAnimationFrame = global.requestAnimationFrame;

    global.window = currentDom.window;
    global.document = currentDom.window.document;
    global.requestAnimationFrame = (cb) => {
      cb();
      return 1;
    };

    // Toast setup (to intercept toast calls)
    toast.container = document.getElementById('toast-container');
    toast.template = document.createElement('template');
    toast.template.innerHTML = '<div class="toast-icon"></div><div class="toast-content"><div class="toast-title"></div><div class="toast-message"></div></div><button class="toast-close">&times;</button>';
  });

  test.afterEach(() => {
    global.window = originalWindow;
    global.document = originalDocument;
    global.requestAnimationFrame = originalRequestAnimationFrame;
    const toastContainer = document.getElementById('toast-container');
    if (toastContainer) { toastContainer.innerHTML = ''; }
  });

  function createElements() {
    return {
      pagePickerOverlay: document.getElementById('page-picker-overlay'),
      pagePickerBackdrop: document.getElementById('page-picker-backdrop'),
      pagePickerModal: document.getElementById('page-picker-modal'),
      pagePickerSubtitle: document.getElementById('page-picker-subtitle'),
      pagePickerCount: document.getElementById('page-picker-count'),
      pagePickerGrid: document.getElementById('page-picker-grid'),
      pagePickerClose: document.getElementById('page-picker-close'),
      pagePickerCancel: document.getElementById('page-picker-cancel'),
      pagePickerConfirm: document.getElementById('page-picker-confirm'),
      pagePickerSelectFirst: document.getElementById('page-picker-select-first'),
      pagePickerSelectLast: document.getElementById('page-picker-select-last'),
      pagePickerSelectEven: document.getElementById('page-picker-select-even'),
      pagePickerSelectOdd: document.getElementById('page-picker-select-odd'),
      pagePickerClear: document.getElementById('page-picker-clear')
    };
  }

  function getDummyThumbnails(count) {
    return Array.from({ length: count }, (_, i) => ({
      pageNumber: i + 1,
      thumbnailUrl: `thumb_${i + 1}.png`
    }));
  }

  test('initializes and binds events correctly', () => {
    const elements = createElements();
    const picker = new PagePicker(elements);

    expect(picker.elements).toBe(elements);
    expect(picker.state).toBeNull();
  });

  test('open method sets up modal and state correctly', async () => {
    const elements = createElements();
    const picker = new PagePicker(elements);
    const thumbnails = getDummyThumbnails(10);

    const openPromise = picker.open({
      fileName: 'test.pdf',
      totalPages: 10,
      selectionLimit: 8,
      thumbnails
    });

    expect(picker.state).not.toBeNull();
    expect(picker.state.selectionLimit).toBe(8);
    expect(picker.state.selected.size).toBe(8); // Min of limit and length
    expect(picker.state.thumbnails).toBe(thumbnails);

    // Modal UI should be updated
    expect(elements.pagePickerModal.classList.contains('hidden')).toBe(false);
    expect(elements.pagePickerModal.classList.contains('flex')).toBe(true);
    expect(elements.pagePickerSubtitle.textContent).toBe('test.pdf has 10 pages. Pick up to 8.');

    // Grid should have thumbnails
    const gridItems = elements.pagePickerGrid.querySelectorAll('.page-picker-thumb');
    expect(gridItems.length).toBe(10);

    // Initial 8 items should be selected
    const selectedItems = Array.from(gridItems).filter(item => item.classList.contains('is-selected'));
    expect(selectedItems.length).toBe(8);

    picker.close();
    await openPromise;
  });

  test('open method resolves immediately if missing critical elements', async () => {
    const elements = createElements();
    elements.pagePickerModal = null; // simulate missing modal
    const picker = new PagePicker(elements);

    const result = await picker.open({
      fileName: 'test.pdf',
      totalPages: 10,
      selectionLimit: 8,
      thumbnails: getDummyThumbnails(10)
    });

    // Should return [1, 2, 3, 4, 5, 6, 7, 8]
    expect(result).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  test('close method resets state and hides modal', async () => {
    const elements = createElements();
    const picker = new PagePicker(elements);

    const openPromise = picker.open({
      fileName: 'test.pdf',
      totalPages: 5,
      selectionLimit: 8,
      thumbnails: getDummyThumbnails(5)
    });

    elements.pagePickerClose.click(); // Trigger close via UI

    const result = await openPromise;
    expect(result).toBeNull();

    expect(picker.state).toBeNull();
    expect(elements.pagePickerModal.classList.contains('hidden')).toBe(true);
    expect(elements.pagePickerGrid.innerHTML).toBe('');
  });

  test('confirm method resolves with selected pages', async () => {
    const elements = createElements();
    const picker = new PagePicker(elements);

    const openPromise = picker.open({
      fileName: 'test.pdf',
      totalPages: 5,
      selectionLimit: 8,
      thumbnails: getDummyThumbnails(5)
    });

    elements.pagePickerConfirm.click(); // Trigger confirm via UI

    const result = await openPromise;
    // initial selection is first 5 pages
    expect(result).toEqual([1, 2, 3, 4, 5]);
  });

  test('confirm method shows warning if no pages selected', async () => {
    const elements = createElements();
    const picker = new PagePicker(elements);

    picker.open({
      fileName: 'test.pdf',
      totalPages: 5,
      selectionLimit: 8,
      thumbnails: getDummyThumbnails(5)
    });

    // Clear selection
    picker.applyPreset('clear');
    expect(picker.state.selected.size).toBe(0);

    // Try to confirm
    picker.confirm();

    // Verify toast was shown (state remains, modal doesn't close)
    expect(picker.state).not.toBeNull();
    const toastElem = document.querySelector('.toast-warning');
    expect(toastElem).not.toBeNull();
    expect(toastElem.textContent).toContain('No Pages Selected');
  });

  test('toggle method handles selecting and deselecting', async () => {
    const elements = createElements();
    const picker = new PagePicker(elements);

    picker.open({
      fileName: 'test.pdf',
      totalPages: 5,
      selectionLimit: 4,
      thumbnails: getDummyThumbnails(5)
    });

    // Initially 1,2,3,4 are selected. 5 is not.
    const gridItems = elements.pagePickerGrid.querySelectorAll('.page-picker-thumb');
    const thumb1 = gridItems[0];
    const thumb5 = gridItems[4];

    expect(picker.state.selected.has(1)).toBe(true);
    expect(picker.state.selected.has(5)).toBe(false);

    // Deselect page 1
    thumb1.click();
    expect(picker.state.selected.has(1)).toBe(false);
    expect(thumb1.classList.contains('is-selected')).toBe(false);

    // Select page 5
    thumb5.click();
    expect(picker.state.selected.has(5)).toBe(true);
    expect(thumb5.classList.contains('is-selected')).toBe(true);

    // Select page 1 again (should fail because limit is 4 and we have 2,3,4,5 selected)
    thumb1.click();
    expect(picker.state.selected.has(1)).toBe(false);

    const toastElem = document.querySelector('.toast-warning');
    expect(toastElem).not.toBeNull();
    expect(toastElem.textContent).toContain('Selection Full');
  });

  test('applyPreset handles various presets correctly', () => {
    const elements = createElements();
    const picker = new PagePicker(elements);

    picker.open({
      fileName: 'test.pdf',
      totalPages: 10,
      selectionLimit: 4,
      thumbnails: getDummyThumbnails(10)
    });

    // Test 'first'
    elements.pagePickerSelectFirst.click();
    expect(Array.from(picker.state.selected)).toEqual([1, 2, 3, 4]);

    // Test 'last'
    elements.pagePickerSelectLast.click();
    expect(Array.from(picker.state.selected)).toEqual([7, 8, 9, 10]);

    // Test 'even'
    elements.pagePickerSelectEven.click();
    expect(Array.from(picker.state.selected)).toEqual([2, 4, 6, 8]);

    // Test 'odd'
    elements.pagePickerSelectOdd.click();
    expect(Array.from(picker.state.selected)).toEqual([1, 3, 5, 7]);

    // Test 'clear'
    elements.pagePickerClear.click();
    expect(picker.state.selected.size).toBe(0);
  });
});
