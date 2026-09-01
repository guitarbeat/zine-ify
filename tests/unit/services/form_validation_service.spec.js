import { test, expect } from '@playwright/test';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

test.describe('FormValidationService Tests', () => {
  let initSettingsValidation;
  let GRID_DIMENSION_MAX, GRID_DIMENSION_MIN, MARGIN_MAX;

  test.beforeEach(async () => {
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    global.window = dom.window;
    global.document = dom.window.document;
    global.HTMLElement = dom.window.HTMLElement;

    const FormValidationService = await import('../../../src/services/FormValidationService.js');
    initSettingsValidation = FormValidationService.initSettingsValidation;

    const config = await import('../../../src/utils/config.js');
    GRID_DIMENSION_MAX = config.GRID_DIMENSION_MAX;
    GRID_DIMENSION_MIN = config.GRID_DIMENSION_MIN;
    MARGIN_MAX = config.MARGIN_MAX;

    document.body.innerHTML = `
      <div id="test-container">
        <div id="settings-group">
          <input id="grid-rows" type="number" value="4" />
          <input id="grid-cols" type="number" value="2" />
          <input id="margin-input" type="number" value="10" />
          <select id="paper-size-select">
            <option value="A4">A4</option>
          </select>
          <div id="grid-total">8 slots</div>
        </div>
        <div id="demo-container"></div>
      </div>
    `;
  });

  test.afterEach(() => {
    delete global.window;
    delete global.document;
    delete global.HTMLElement;
  });

  test.describe('initSettingsValidation', () => {
    test('returns null if settings form is not found', () => {
      const emptyContainer = document.createElement('div');
      const validator = initSettingsValidation(emptyContainer);
      expect(validator).toBeNull();
    });

    test('initializes validator and clamps row value to MIN on invalid change', () => {
      const container = document.getElementById('test-container');
      let totalUpdated = false;
      const mockUiManager = {
        updateGridTotalBadge: (rows, cols) => {
          totalUpdated = true;
          const totalEl = document.getElementById('grid-total');
          if (totalEl) totalEl.textContent = `${rows * cols} slots`;
        }
      };

      const validator = initSettingsValidation(container, mockUiManager);
      expect(validator).not.toBeNull();

      const gridRowsInput = document.getElementById('grid-rows');
      gridRowsInput.value = GRID_DIMENSION_MIN - 1;

      const rowConfig = validator.fieldConfigs.get('grid-rows') || validator.fieldConfigs.get('#grid-rows');
      expect(rowConfig).toBeDefined();

      rowConfig.onValidationChange({ isValid: false }, gridRowsInput);

      expect(gridRowsInput.value).toBe(GRID_DIMENSION_MIN.toString());
      expect(totalUpdated).toBe(true);

      const totalEl = document.getElementById('grid-total');
      const rows = parseInt(gridRowsInput.value, 10);
      const cols = parseInt(document.getElementById('grid-cols').value, 10);
      expect(totalEl.textContent).toBe(`${rows * cols} slots`);
    });

    test('clamps row value to MAX on invalid change', () => {
      const container = document.getElementById('test-container');
      const validator = initSettingsValidation(container);

      const gridRowsInput = document.getElementById('grid-rows');
      gridRowsInput.value = GRID_DIMENSION_MAX + 1;

      const rowConfig = validator.fieldConfigs.get('grid-rows') || validator.fieldConfigs.get('#grid-rows');
      rowConfig.onValidationChange({ isValid: false }, gridRowsInput);

      expect(gridRowsInput.value).toBe(GRID_DIMENSION_MAX.toString());
    });

    test('clamps col value to MIN on invalid change', () => {
      const container = document.getElementById('test-container');
      const validator = initSettingsValidation(container);

      const gridColsInput = document.getElementById('grid-cols');
      gridColsInput.value = GRID_DIMENSION_MIN - 1;

      const colConfig = validator.fieldConfigs.get('grid-cols') || validator.fieldConfigs.get('#grid-cols');
      colConfig.onValidationChange({ isValid: false }, gridColsInput);

      expect(gridColsInput.value).toBe(GRID_DIMENSION_MIN.toString());
    });

    test('clamps margin value to MAX on invalid change', () => {
      const container = document.getElementById('test-container');
      const validator = initSettingsValidation(container);

      const marginInput = document.getElementById('margin-input');
      marginInput.value = MARGIN_MAX + 10;

      const marginConfig = validator.fieldConfigs.get('margin-input') || validator.fieldConfigs.get('#margin-input');
      marginConfig.onValidationChange({ isValid: false }, marginInput);

      expect(marginInput.value).toBe(MARGIN_MAX.toString());
    });
  });
});
