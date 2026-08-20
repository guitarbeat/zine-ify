import { test, expect } from '@playwright/test';
import { JSDOM } from 'jsdom';

// Setup JSDOM BEFORE importing any files that might rely on global objects
let dom;

test.beforeAll(() => {
  dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  global.window = dom.window;
  global.document = dom.window.document;
});

test.describe('FormValidationService Tests', () => {
  let initSettingsValidation;
  let createPasswordValidationExample;
  let createValidationDemo;
  let showValidationErrorWithAction;
  let setupPasswordConfirmation;
  let GRID_DIMENSION_MAX, GRID_DIMENSION_MIN, MARGIN_MAX;

  test.beforeAll(async () => {
    // Dynamic import to ensure JSDOM is setup first
    const FormValidationService = await import('../../../src/services/FormValidationService.js');
    initSettingsValidation = FormValidationService.initSettingsValidation;
    createPasswordValidationExample = FormValidationService.createPasswordValidationExample;
    createValidationDemo = FormValidationService.createValidationDemo;
    showValidationErrorWithAction = FormValidationService.showValidationErrorWithAction;
    setupPasswordConfirmation = FormValidationService.setupPasswordConfirmation;

    const config = await import('../../../src/utils/config.js');
    GRID_DIMENSION_MAX = config.GRID_DIMENSION_MAX;
    GRID_DIMENSION_MIN = config.GRID_DIMENSION_MIN;
    MARGIN_MAX = config.MARGIN_MAX;
  });

  test.beforeEach(() => {
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

        <input id="test-field" type="text" />
        <div id="field-wrapper">
          <input id="action-field" type="text" />
        </div>

        <input id="password" type="password" value="password123" />
        <input id="confirm-password" type="password" value="password123" />
      </div>
    `;
  });

  test.describe('initSettingsValidation', () => {
    test('returns null if settings form is not found', () => {
      const emptyContainer = document.createElement('div');
      const validator = initSettingsValidation(emptyContainer);
      expect(validator).toBeNull();
    });

    test('initializes validator and clamps row value to MIN on invalid change', () => {
      const container = document.getElementById('test-container');
      const validator = initSettingsValidation(container);
      expect(validator).not.toBeNull();

      const gridRowsInput = document.getElementById('grid-rows');
      // Simulate invalid change (value below min)
      gridRowsInput.value = GRID_DIMENSION_MIN - 1;

      // Manually trigger the validation change callback registered by the service
      const rowConfig = validator.fieldConfigs.get('grid-rows') || validator.fieldConfigs.get('#grid-rows');
      expect(rowConfig).toBeDefined();

      rowConfig.onValidationChange({ isValid: false }, gridRowsInput);

      expect(gridRowsInput.value).toBe(GRID_DIMENSION_MIN.toString());

      // Check if grid total was updated
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


  test.describe('createPasswordValidationExample', () => {
    test('returns correct password validation configuration', () => {
      const config = createPasswordValidationExample();
      expect(config.rules).toHaveLength(4); // required, minLength, maxLength, pattern
      expect(config.constraints.minLength).toBe(8);
      expect(config.constraints.maxLength).toBe(64);
    });
  });

  test.describe('createValidationDemo', () => {
    test('injects demo HTML and initializes validator', () => {
      const container = document.getElementById('demo-container');
      const validator = createValidationDemo(container);

      expect(validator).not.toBeNull();

      // Check if HTML was injected
      const emailInput = document.getElementById('demo-email');
      const passwordInput = document.getElementById('demo-password');
      expect(emailInput).not.toBeNull();
      expect(passwordInput).not.toBeNull();

      // Check if rules are registered
      expect(validator.fieldConfigs.has('demo-password') || validator.fieldConfigs.has('#demo-password')).toBe(true);
      expect(validator.fieldConfigs.has('demo-comment') || validator.fieldConfigs.has('#demo-comment')).toBe(true);
    });
  });

  test.describe('showValidationErrorWithAction', () => {
    test('does nothing if field is not found', () => {
      // Should not throw
      showValidationErrorWithAction('non-existent-field', 'Error message');
    });

    test('adds error message and action button to field', () => {
      const actionHandler = () => {};
      showValidationErrorWithAction('action-field', 'Test Error', {
        label: 'Fix It',
        handler: actionHandler
      });

      const field = document.getElementById('action-field');
      expect(field.classList.contains('is-invalid')).toBe(true);
      expect(field.getAttribute('aria-invalid')).toBe('true');

      const errorEl = field.nextElementSibling;
      expect(errorEl).not.toBeNull();
      expect(errorEl.className).toBe('form-error');

      const textSpan = errorEl.querySelector('span');
      expect(textSpan.textContent).toBe('Test Error');

      const actionBtn = errorEl.querySelector('button');
      expect(actionBtn).not.toBeNull();
      expect(actionBtn.textContent).toBe('Fix It');
      expect(actionBtn.onclick).toBe(actionHandler);
    });

    test('removes existing error before adding a new one', () => {
      showValidationErrorWithAction('action-field', 'Error 1');
      showValidationErrorWithAction('action-field', 'Error 2');

      const field = document.getElementById('action-field');
      const parent = field.parentElement;
      const errors = parent.querySelectorAll('.form-error');

      expect(errors).toHaveLength(1);
      expect(errors[0].querySelector('span').textContent).toBe('Error 2');
    });
  });

  test.describe('setupPasswordConfirmation', () => {
    test('returns undefined if fields are not found', () => {
      const result = setupPasswordConfirmation('bad-id-1', 'bad-id-2');
      expect(result).toBeUndefined();
    });

    test('returns correct validation rules for password confirmation', () => {
      const config = setupPasswordConfirmation('password', 'confirm-password');

      expect(config).toBeDefined();
      expect(config.rules).toHaveLength(2); // required, match
      expect(config.constraints.format).toBe('must match password');
    });
  });
});
