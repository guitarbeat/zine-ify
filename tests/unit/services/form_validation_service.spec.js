import { test, expect } from '@playwright/test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="toast-container"></div></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.requestAnimationFrame = (cb) => cb();

test.describe('FormValidationService', () => {
  let FormValidationService;
  let formContainer;

  test.beforeAll(async () => {
    FormValidationService = await import('../../../src/services/FormValidationService.js');
    // We also need DOMPurify for createValidationDemo
    const dompurifyFactory = await import('dompurify');
    const DOMPurify = dompurifyFactory.default(global.window);
    // Assign to global if needed by module
    global.DOMPurify = DOMPurify;
  });

  test.beforeEach(() => {
    formContainer = global.document.createElement('div');
    global.document.body.appendChild(formContainer);
  });

  test.afterEach(() => {
    formContainer.remove();
    formContainer = null;
  });

  test.describe('initSettingsValidation', () => {
    test('should return null and warn if form is not found', () => {
      let warnMessage = '';
      const consoleWarnSpy = (msg) => { warnMessage = msg; };
      /* eslint-disable-next-line no-console */
      const originalWarn = console.warn;
      /* eslint-disable-next-line no-console */
      console.warn = consoleWarnSpy;

      const validator = FormValidationService.initSettingsValidation(formContainer);

      expect(validator).toBeNull();
      // Wait for any async logs if needed, but it shouldn't be async.
      // Wait, let's just make it expect.stringContaining
      expect(warnMessage).toContain('ValidationService: Settings form not found');

      /* eslint-disable-next-line no-console */
      console.warn = originalWarn;
    });

    test('should initialize and return FormValidator if form is found', () => {
      formContainer.innerHTML = '<form id="settings-group"></form>';
      const validator = FormValidationService.initSettingsValidation(formContainer);

      expect(validator).not.toBeNull();
      // FormValidator instance check (basic properties)
      expect(typeof validator.validate).toBe('function');
      expect(typeof validator.register).toBe('function');
    });

    test('should register grid-rows if present', () => {
      formContainer.innerHTML = `
        <form id="settings-group">
          <input id="grid-rows" type="number" value="2" />
        </form>
      `;
      const validator = FormValidationService.initSettingsValidation(formContainer);

      expect(validator.fieldConfigs.has('grid-rows')).toBe(true);
    });

    test('should register grid-cols if present', () => {
      formContainer.innerHTML = `
        <form id="settings-group">
          <input id="grid-cols" type="number" value="2" />
        </form>
      `;
      const validator = FormValidationService.initSettingsValidation(formContainer);

      expect(validator.fieldConfigs.has('grid-cols')).toBe(true);
    });

    test('should register margin-input if present', () => {
      formContainer.innerHTML = `
        <form id="settings-group">
          <input id="margin-input" type="number" value="10" />
        </form>
      `;
      const validator = FormValidationService.initSettingsValidation(formContainer);

      expect(validator.fieldConfigs.has('margin-input')).toBe(true);
    });

    test('should register paper-size-select if present', () => {
      formContainer.innerHTML = `
        <form id="settings-group">
          <select id="paper-size-select">
            <option value="A4">A4</option>
          </select>
        </form>
      `;
      const validator = FormValidationService.initSettingsValidation(formContainer);

      expect(validator.fieldConfigs.has('paper-size-select')).toBe(true);
    });
  });

  test.describe('Example Validators', () => {
    test('createEmailValidationExample should return email rules', () => {
      const example = FormValidationService.createEmailValidationExample();
      expect(example.rules).toBeDefined();
      expect(example.timing).toBeDefined();
    });

    test('createPasswordValidationExample should return password rules', () => {
      const example = FormValidationService.createPasswordValidationExample();
      expect(example.rules).toBeDefined();
      expect(example.timing).toBeDefined();
    });
  });

  test.describe('createValidationDemo', () => {
    test('should render demo form and return validator', () => {
      const validator = FormValidationService.createValidationDemo(formContainer);

      expect(formContainer.querySelector('.validation-demo')).not.toBeNull();
      expect(formContainer.querySelector('#demo-email')).not.toBeNull();
      expect(validator).toBeDefined();
    });
  });

  test.describe('showValidationErrorWithAction', () => {
    test('should render error message and action button', () => {
      formContainer.innerHTML = `
        <div>
          <input id="test-field" />
        </div>
      `;
      let actionCalled = false;
      const action = {
        label: 'Fix it',
        handler: () => { actionCalled = true; }
      };

      FormValidationService.showValidationErrorWithAction('test-field', 'Custom Error', action);

      const field = formContainer.querySelector('#test-field');
      expect(field.classList.contains('is-invalid')).toBe(true);

      const errorEl = formContainer.querySelector('.form-error');
      expect(errorEl).not.toBeNull();
      expect(errorEl.textContent).toContain('Custom Error');
      expect(errorEl.textContent).toContain('Fix it');

      const btn = errorEl.querySelector('button');
      expect(btn).not.toBeNull();

      btn.click();
      expect(actionCalled).toBe(true);
    });

    test('should do nothing if field is missing', () => {
      // Should not throw
      expect(() => {
        FormValidationService.showValidationErrorWithAction('missing-field', 'Error');
      }).not.toThrow();
    });
  });

  test.describe('setupPasswordConfirmation', () => {
    test('should return validation config if fields exist', () => {
      formContainer.innerHTML = `
        <input id="pwd1" type="password" value="12345" />
        <input id="pwd2" type="password" value="12345" />
      `;
      const config = FormValidationService.setupPasswordConfirmation('pwd1', 'pwd2');
      expect(config).toBeDefined();
      expect(config.rules).toBeDefined();
    });

    test('should return undefined if fields missing', () => {
      const config = FormValidationService.setupPasswordConfirmation('missing1', 'missing2');
      expect(config).toBeUndefined();
    });
  });
});
