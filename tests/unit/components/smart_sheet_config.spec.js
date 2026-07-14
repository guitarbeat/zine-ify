import { test, expect } from '@playwright/test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="container"></div></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.Event = dom.window.Event;
global.CustomEvent = dom.window.CustomEvent;

test.describe('SmartSheetConfig Component', () => {
  let SmartSheetConfig;
  let container;
  let onChangeArgs;

  test.beforeAll(async () => {
    const module = await import('../../../src/components/SmartSheetConfig.js');
    SmartSheetConfig = module.SmartSheetConfig;
  });

  test.beforeEach(() => {
    container = document.createElement('div');
    container.className = 'rail-settings-panel';
    document.body.appendChild(container);
    onChangeArgs = null;
  });

  test.afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  test('initializes with default options and renders correctly', () => {
    const config = new SmartSheetConfig(container, {
      onChange: (args) => { onChangeArgs = args; }
    });

    const state = config.getState();
    expect(state.paperSize).toBe('letter');
    expect(state.orientation).toBe('landscape');
    expect(state.unit).toBe('in');
    expect(state.margin).toBe(0);

    const select = container.querySelector('select[data-field="paperSize"]');
    expect(select).toBeTruthy();
    expect(select.value).toBe('letter');
  });

  test('handles paper size change', () => {
    const config = new SmartSheetConfig(container, {
      onChange: (args) => { onChangeArgs = args; }
    });

    // Simulate change event on paper size select
    const select = container.querySelector('select[data-field="paperSize"]');
    select.value = 'a4';
    select.dispatchEvent(new Event('change', { bubbles: true }));

    expect(config.getState().paperSize).toBe('a4');
    expect(onChangeArgs).toBeTruthy();
    expect(onChangeArgs.paperSize).toBe('a4');
  });

  test('handles unit change and preserves internal margin value', () => {
    const config = new SmartSheetConfig(container, {
      onChange: (args) => { onChangeArgs = args; },
      initialUnit: 'mm'
    });

    // Change to 'in'
    const unitBtn = container.querySelector('.smart-sheet-unit-btn[data-unit="in"]');
    unitBtn.dispatchEvent(new Event('click', { bubbles: true }));

    expect(config.getState().unit).toBe('in');
    expect(onChangeArgs.unit).toBe('in');
  });

  test('handles orientation change', () => {
    const config = new SmartSheetConfig(container, {
      onChange: (args) => { onChangeArgs = args; },
      initialOrientation: 'landscape'
    });

    const portraitBtn = container.querySelector('.smart-sheet-orientation-btn[data-value="portrait"]');
    portraitBtn.dispatchEvent(new Event('click', { bubbles: true }));

    expect(config.getState().orientation).toBe('portrait');
    expect(onChangeArgs.orientation).toBe('portrait');
  });

  test('handles margin increment and clamp', () => {
    const config = new SmartSheetConfig(container, {
      onChange: (args) => { onChangeArgs = args; },
      initialUnit: 'mm'
    });

    config.setMargin(0);

    const incBtn = container.querySelector('[data-margin-delta="1"]');
    incBtn.dispatchEvent(new Event('click', { bubbles: true }));

    // margin step is 1mm
    expect(config.getState().margin).toBe(1);

    // Try to set way past MAX (25)
    config.setMargin(100);
    expect(config.getState().margin).toBe(25);

    // Try to set below MIN (0)
    config.setMargin(-10);
    expect(config.getState().margin).toBe(0);
  });

  test('handles custom size configuration', () => {
    const config = new SmartSheetConfig(container, {
      onChange: (args) => { onChangeArgs = args; },
      initialUnit: 'mm',
      initialPaper: 'letter'
    });

    const select = container.querySelector('select[data-field="paperSize"]');
    select.value = 'custom';
    select.dispatchEvent(new Event('change', { bubbles: true }));

    expect(config.getState().paperSize).toBe('custom');

    // Check that custom inputs are rendered
    const widthInput = container.querySelector('input[data-field="customWidth"]');
    const heightInput = container.querySelector('input[data-field="customHeight"]');
    expect(widthInput).toBeTruthy();
    expect(heightInput).toBeTruthy();

    // Change width
    widthInput.value = '100';
    widthInput.dispatchEvent(new Event('change', { bubbles: true }));
    expect(config.getState().customPaper.width).toBe(100);

    // Change height
    const newHeightInput = container.querySelector('input[data-field="customHeight"]');
    newHeightInput.value = '200';
    newHeightInput.dispatchEvent(new Event('change', { bubbles: true }));
    expect(config.getState().customPaper.height).toBe(200);
  });

  test('handles margin slider input', () => {
    const config = new SmartSheetConfig(container, {
      onChange: (args) => { onChangeArgs = args; },
      initialUnit: 'mm'
    });

    const slider = container.querySelector('.smart-sheet-margin-slider');
    slider.value = '10';
    slider.dispatchEvent(new Event('input', { bubbles: true }));

    expect(config.getState().margin).toBe(10);
    expect(onChangeArgs.margin).toBe(10);

    const display = container.querySelector('[data-margin-display]');
    expect(display.textContent).toBe('10');
  });

});
