import { test, expect } from '@playwright/test';
import { SmartSheetConfig } from '../../../src/components/SmartSheetConfig.js';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
import { MARGIN_MAX, MARGIN_MIN, UNITS, PAPER_SIZES, toMm } from '../../../src/utils/config.js';
import DOMPurify from 'dompurify';

test.describe('SmartSheetConfig Component', () => {
  let dom;
  let container;
  let originalWindow;
  let originalDocument;

  test.beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><div id="container"></div>');

    // Save original globals if they exist in node test env
    originalWindow = global.window;
    originalDocument = global.document;

    global.window = dom.window;
    global.document = dom.window.document;
    const purify = DOMPurify(dom.window);
    DOMPurify.sanitize = purify.sanitize;

    // Polyfill DOMPurify for tests using JSDOM
    const purify = DOMPurify(global.window);
    DOMPurify.sanitize = purify.sanitize;

    container = document.getElementById('container');
  });

  test.afterEach(() => {
    global.window = originalWindow;
    global.document = originalDocument;
  });

  test('initializes with default options', () => {
    const config = new SmartSheetConfig(container);
    expect(config.state.paperSize).toBe('letter');
    expect(config.state.orientation).toBe('landscape');
    expect(config.state.unit).toBe('in');
    expect(config.state.margin).toBe(0);
    expect(config.state.customPaper.width).toBe(PAPER_SIZES.letter.width);
    expect(config.state.customPaper.height).toBe(PAPER_SIZES.letter.height);

    // Check initial render
    expect(container.querySelector('.smart-sheet-config')).toBeTruthy();
    expect(container.querySelector('select[data-field="paperSize"]').value).toBe('letter');
    expect(container.querySelector('.smart-sheet-orientation-btn[data-value="landscape"]').classList.contains('is-active')).toBe(true);
    expect(container.querySelector('.smart-sheet-unit-btn[data-unit="in"]').classList.contains('is-active')).toBe(true);
  });

  test('initializes with custom options', () => {
    const config = new SmartSheetConfig(container, {
      initialPaper: 'a4',
      initialOrientation: 'portrait',
      initialUnit: 'mm'
    });
    expect(config.state.paperSize).toBe('a4');
    expect(config.state.orientation).toBe('portrait');
    expect(config.state.unit).toBe('mm');
    expect(config.state.customPaper.width).toBe(PAPER_SIZES.a4.width);

    expect(container.querySelector('select[data-field="paperSize"]').value).toBe('a4');
    expect(container.querySelector('.smart-sheet-orientation-btn[data-value="portrait"]').classList.contains('is-active')).toBe(true);
  });

  test('emits onChange when unit is changed', () => {
    let emitted = null;
    const config = new SmartSheetConfig(container, {
      onChange: (state) => { emitted = state; }
    });

    const mmBtn = container.querySelector('.smart-sheet-unit-btn[data-unit="mm"]');
    mmBtn.click();

    expect(config.state.unit).toBe('mm');
    expect(emitted.unit).toBe('mm');
  });

  test('emits onChange when orientation is changed', () => {
    let emitted = null;
    const config = new SmartSheetConfig(container, {
      initialOrientation: 'landscape',
      onChange: (state) => { emitted = state; }
    });

    const portraitBtn = container.querySelector('.smart-sheet-orientation-btn[data-value="portrait"]');
    portraitBtn.click();

    expect(config.state.orientation).toBe('portrait');
    expect(emitted.orientation).toBe('portrait');
  });

  test('changes paper size and updates recommendation', () => {
    let emitted = null;
    const config = new SmartSheetConfig(container, {
      initialPaper: 'letter',
      onChange: (state) => { emitted = state; }
    });

    const select = container.querySelector('select[data-field="paperSize"]');
    select.value = 'a4';
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    expect(config.state.paperSize).toBe('a4');
    expect(emitted.paperSize).toBe('a4');

    // A4 best orientation is portrait, should auto-update
    expect(config.state.orientation).toBe('portrait');
    expect(emitted.orientation).toBe('portrait');
  });

  test('shows custom paper inputs when "custom" is selected', () => {
    const config = new SmartSheetConfig(container, { initialPaper: 'letter' });

    // Initially custom inputs should not exist
    expect(container.querySelector('.smart-sheet-custom-size')).toBeFalsy();

    const select = container.querySelector('select[data-field="paperSize"]');
    select.value = 'custom';
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    expect(config.state.paperSize).toBe('custom');

    // Custom inputs should now exist
    expect(container.querySelector('.smart-sheet-custom-size')).toBeTruthy();
    const widthInput = container.querySelector('[data-field="customWidth"]');
    const heightInput = container.querySelector('[data-field="customHeight"]');
    expect(widthInput).toBeTruthy();
    expect(heightInput).toBeTruthy();
  });

  test('updates custom dimensions on input', () => {
    let emitted = null;
    const config = new SmartSheetConfig(container, {
      initialPaper: 'custom',
      initialUnit: 'mm',
      onChange: (state) => { emitted = state; }
    });

    const widthInput = container.querySelector('[data-field="customWidth"]');
    widthInput.value = '300';
    widthInput.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    expect(config.state.customPaper.width).toBe(300);
    expect(emitted.customPaper.width).toBe(300);
  });

  test('handles margin slider input and clamps', () => {
    let emitted = null;
    const config = new SmartSheetConfig(container, {
      onChange: (state) => { emitted = state; }
    });

    const slider = container.querySelector('.smart-sheet-margin-slider');

    // Valid value
    slider.value = 10;
    slider.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    expect(config.state.margin).toBe(10);
    expect(emitted.margin).toBe(10);

    // Clamp to min
    slider.value = -5;
    slider.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    expect(config.state.margin).toBe(MARGIN_MIN);

    // Clamp to max
    slider.value = MARGIN_MAX + 10;
    slider.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    expect(config.state.margin).toBe(MARGIN_MAX);
  });

  test('handles margin stepper buttons', () => {
    const config = new SmartSheetConfig(container, {
      initialUnit: 'mm'
    });
    config.setMargin(10);

    const increaseBtn = container.querySelector('[data-margin-delta="1"]');
    increaseBtn.click();

    const stepMm = toMm(UNITS['mm'].marginStep, 'mm');
    expect(config.state.margin).toBe(10 + stepMm);

    const decreaseBtn = container.querySelector('[data-margin-delta="-1"]');
    decreaseBtn.click();
    expect(config.state.margin).toBe(10);
  });

  test('getState and setState function correctly', () => {
    const config = new SmartSheetConfig(container);

    const state = config.getState();
    expect(state.paperSize).toBe('letter');

    config.setState({ paperSize: 'a4', orientation: 'portrait' });
    expect(config.state.paperSize).toBe('a4');
    expect(config.state.orientation).toBe('portrait');

    const select = container.querySelector('select[data-field="paperSize"]');
    expect(select.value).toBe('a4');
  });

  test('destroy clears the container', () => {
    const config = new SmartSheetConfig(container);
    expect(container.innerHTML).not.toBe('');

    config.destroy();
    expect(container.innerHTML).toBe('');
  });
});
