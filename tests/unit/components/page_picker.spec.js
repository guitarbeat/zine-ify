import { test, expect } from '@playwright/test';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

test.describe('PagePicker Component', () => {
  let PagePicker;
  let dom;
  let elements;

  test.beforeAll(async () => {
    dom = new JSDOM('<!DOCTYPE html><div id="toast-container"></div>');
    global.window = dom.window;
    global.document = dom.window.document;
    global.requestAnimationFrame = (cb) => { cb(); return 1; };

    const module = await import('../../../src/components/UI/PagePicker.js');
    PagePicker = module.PagePicker;
  });

  test.afterAll(() => {
    delete global.window;
    delete global.document;
    delete global.requestAnimationFrame;
  });

  test.beforeEach(() => {
    document.body.innerHTML = `
      <div id="toast-container"></div>
      <div id="page-picker-overlay" class="page-picker-overlay hidden">
        <div id="page-picker-subtitle"></div>
        <div id="page-picker-count"></div>
        <div id="page-picker-grid" class="page-picker-grid"></div>

        <button id="page-picker-close"></button>
        <button id="page-picker-cancel"></button>
        <div id="page-picker-backdrop"></div>
        <button id="page-picker-confirm"></button>

        <button id="page-picker-select-first"></button>
        <button id="page-picker-select-last"></button>
        <button id="page-picker-select-even"></button>
        <button id="page-picker-select-odd"></button>
        <button id="page-picker-clear"></button>
      </div>
    `;

    elements = {
      pagePickerModal: document.getElementById('page-picker-overlay'),
      pagePickerGrid: document.getElementById('page-picker-grid'),
      pagePickerSubtitle: document.getElementById('page-picker-subtitle'),
      pagePickerCount: document.getElementById('page-picker-count'),
      pagePickerClose: document.getElementById('page-picker-close'),
      pagePickerCancel: document.getElementById('page-picker-cancel'),
      pagePickerBackdrop: document.getElementById('page-picker-backdrop'),
      pagePickerConfirm: document.getElementById('page-picker-confirm'),
      pagePickerSelectFirst: document.getElementById('page-picker-select-first'),
      pagePickerSelectLast: document.getElementById('page-picker-select-last'),
      pagePickerSelectEven: document.getElementById('page-picker-select-even'),
      pagePickerSelectOdd: document.getElementById('page-picker-select-odd'),
      pagePickerClear: document.getElementById('page-picker-clear')
    };
  });

  test('initializes and binds events correctly', () => {
    const picker = new PagePicker(elements);
    expect(picker.elements).toBe(elements);
    expect(picker.state).toBeNull();
  });

  test('open sets state and renders grid', async () => {
    const picker = new PagePicker(elements);
    const thumbnails = [
      { pageNumber: 1, thumbnailUrl: 'url1' },
      { pageNumber: 2, thumbnailUrl: 'url2' },
      { pageNumber: 3, thumbnailUrl: 'url3' }
    ];

    // Call open without awaiting to inspect state right after
    picker.open({ fileName: 'test.pdf', totalPages: 3, selectionLimit: 2, thumbnails });

    expect(picker.state).not.toBeNull();
    expect(picker.state.selectionLimit).toBe(2);
    expect(picker.state.thumbnails).toEqual(thumbnails);
    expect(Array.from(picker.state.selected)).toEqual([1, 2]); // First 2 pages selected

    expect(elements.pagePickerModal.classList.contains('hidden')).toBe(false);
    expect(elements.pagePickerModal.classList.contains('flex')).toBe(true);
    expect(elements.pagePickerSubtitle.textContent).toBe('test.pdf has 3 pages. Pick up to 2.');
    expect(document.body.style.overflow).toBe('hidden');

    // Grid rendering
    const thumbs = elements.pagePickerGrid.querySelectorAll('.page-picker-thumb');
    expect(thumbs.length).toBe(3);
    expect(thumbs[0].getAttribute('aria-pressed')).toBe('true');
    expect(thumbs[1].getAttribute('aria-pressed')).toBe('true');
    expect(thumbs[2].getAttribute('aria-pressed')).toBe('false');
  });

  test('open resolves early if missing crucial elements', async () => {
    const missingElements = { ...elements, pagePickerModal: null };
    const picker = new PagePicker(missingElements);

    const result = await picker.open({ fileName: 'test.pdf', totalPages: 5, selectionLimit: 3, thumbnails: [] });
    expect(result).toEqual([1, 2, 3]);
  });

  test('close resets state and hidden modal, returning selected pages', async () => {
    const picker = new PagePicker(elements);
    const thumbnails = [
      { pageNumber: 1, thumbnailUrl: 'url1' },
      { pageNumber: 2, thumbnailUrl: 'url2' }
    ];

    const promise = picker.open({ fileName: 'test.pdf', totalPages: 2, selectionLimit: 2, thumbnails });

    expect(picker.state).not.toBeNull();
    picker.close([1]);

    expect(picker.state).toBeNull();
    expect(elements.pagePickerModal.classList.contains('hidden')).toBe(true);
    expect(elements.pagePickerModal.classList.contains('flex')).toBe(false);
    expect(elements.pagePickerGrid.innerHTML).toBe('');
    expect(document.body.style.overflow).toBe('');

    const result = await promise;
    expect(result).toEqual([1]);
  });

  test('confirm does not close if no pages selected', async () => {
    const picker = new PagePicker(elements);
    const thumbnails = [
      { pageNumber: 1, thumbnailUrl: 'url1' }
    ];

    picker.open({ fileName: 'test.pdf', totalPages: 1, selectionLimit: 1, thumbnails });

    // Clear selection
    picker.state.selected.clear();
    picker.confirm();

    // Should still be open
    expect(picker.state).not.toBeNull();
  });

  test('confirm closes and resolves with sorted selected pages', async () => {
    const picker = new PagePicker(elements);
    const thumbnails = [
      { pageNumber: 1, thumbnailUrl: 'url1' },
      { pageNumber: 2, thumbnailUrl: 'url2' },
      { pageNumber: 3, thumbnailUrl: 'url3' }
    ];

    const promise = picker.open({ fileName: 'test.pdf', totalPages: 3, selectionLimit: 3, thumbnails });

    // Change selection out of order
    picker.state.selected = new Set([3, 1]);
    picker.confirm();

    const result = await promise;
    expect(result).toEqual([1, 3]); // Sorted
  });

  test('_toggle handles selection limit correctly', async () => {
    const picker = new PagePicker(elements);
    const thumbnails = [
      { pageNumber: 1, thumbnailUrl: 'url1' },
      { pageNumber: 2, thumbnailUrl: 'url2' },
      { pageNumber: 3, thumbnailUrl: 'url3' }
    ];

    picker.open({ fileName: 'test.pdf', totalPages: 3, selectionLimit: 2, thumbnails });

    // Deselect page 2
    picker._toggle(2);
    expect(Array.from(picker.state.selected)).toEqual([1]);

    // Select page 3
    picker._toggle(3);
    expect(Array.from(picker.state.selected)).toEqual([1, 3]);

    // Try to select page 2 again (limit reached)
    picker._toggle(2);
    expect(Array.from(picker.state.selected)).toEqual([1, 3]);

    // Deselect page 1
    picker._toggle(1);
    expect(Array.from(picker.state.selected)).toEqual([3]);
  });

  test('applyPreset works correctly', async () => {
    const picker = new PagePicker(elements);
    const thumbnails = Array.from({ length: 6 }, (_, i) => ({ pageNumber: i + 1, thumbnailUrl: `url${i + 1}` }));

    picker.open({ fileName: 'test.pdf', totalPages: 6, selectionLimit: 3, thumbnails });

    // First
    picker.applyPreset('first');
    expect(Array.from(picker.state.selected)).toEqual([1, 2, 3]);

    // Last
    picker.applyPreset('last');
    expect(Array.from(picker.state.selected)).toEqual([4, 5, 6]);

    // Even
    picker.applyPreset('even');
    expect(Array.from(picker.state.selected)).toEqual([2, 4, 6]);

    // Odd
    picker.applyPreset('odd');
    expect(Array.from(picker.state.selected)).toEqual([1, 3, 5]);

    // Clear
    picker.applyPreset('clear');
    expect(Array.from(picker.state.selected)).toEqual([]);
  });

  test('UI controls trigger methods', async () => {
    const picker = new PagePicker(elements);
    const thumbnails = [
      { pageNumber: 1, thumbnailUrl: 'url1' },
      { pageNumber: 2, thumbnailUrl: 'url2' }
    ];
    picker.open({ fileName: 'test.pdf', totalPages: 2, selectionLimit: 2, thumbnails });

    // Test cancel
    elements.pagePickerCancel.click();
    expect(picker.state).toBeNull();

    // Reopen
    picker.open({ fileName: 'test.pdf', totalPages: 2, selectionLimit: 2, thumbnails });

    // Test grid button click
    const thumbBtn = elements.pagePickerGrid.querySelector('.page-picker-thumb');
    thumbBtn.click(); // Should toggle off since initially selected
    expect(picker.state.selected.has(1)).toBe(false);
  });
});
