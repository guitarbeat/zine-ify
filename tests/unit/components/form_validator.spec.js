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

let toast;
test.beforeAll(async () => {
  const toastModule = await import('../../../src/components/Toast.js');
  toast = toastModule.toast;
});

test.describe('FormValidator Component', () => {
  let form;
  let FormValidator, createFormValidator;
  let VALIDATION_RULES;

  test.beforeAll(async () => {
    window.HTMLElement.prototype.scrollIntoView = function() {};
    const FV = await import('../../../src/components/FormValidator.js');
    FormValidator = FV.FormValidator;

    createFormValidator = FV.createFormValidator;


    const util = await import('../../../src/utils/formValidation.js');
    VALIDATION_RULES = util.VALIDATION_RULES;
  });

  test.beforeEach(() => {
    document.body.innerHTML = `
      <div id="toast-container"></div>
      <form id="test-form">
        <div class="workspace-config-field">
          <label for="name">Name</label>
          <input type="text" id="name" name="name" required data-validate="required" />
        </div>
        <div class="workspace-config-field">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" data-validate="email" />
        </div>
        <div class="workspace-config-field">
          <label for="age">Age</label>
          <input type="number" id="age" name="age" min="18" max="100" data-validate="integer" />
        </div>
        <div class="workspace-config-field">
          <label for="username">Username</label>
          <input type="text" id="username" name="username" data-validate="minLength:3,maxLength:20" minLength="3" maxLength="20" />
        </div>
        <div class="workspace-config-field">
          <label for="no-validation">No Validation</label>
          <input type="text" id="no-validation" name="no-validation" />
        </div>
        <button type="submit">Submit</button>
      </form>
    `;
    form = document.getElementById('test-form');
  });

  test('initializes with form element correctly', () => {
    const validator = new FormValidator(form);
    expect(validator.form).toBe(form);
    expect(form.hasAttribute('novalidate')).toBe(true);
  });

  test('initializes with string selector', () => {
    const validator = new FormValidator('#test-form');
    expect(validator.form).toBe(form);
  });

  test('handles missing form gracefully', () => {
    const originalConsoleError = console.error;
    let errorMsg = '';
    console.error = (msg) => { errorMsg = msg; };

    const validator = new FormValidator('#non-existent');
    expect(validator.form).toBeNull();
    expect(errorMsg).toBe('');

    console.error = originalConsoleError;
  });

  test('discovers fields and sets up validation', () => {
    const validator = new FormValidator(form);

    // Field IDs are based on id attribute without #
    expect(validator.fieldConfigs.has('name')).toBe(true);
    expect(validator.fieldConfigs.has('email')).toBe(true);
    expect(validator.fieldConfigs.has('age')).toBe(true);
    expect(validator.fieldConfigs.has('username')).toBe(true);

    expect(validator.fieldConfigs.has('no-validation')).toBe(false);
  });

  test('factory function works correctly', () => {
    const validator = createFormValidator('#test-form');
    expect(validator).toBeInstanceOf(FormValidator);
    expect(validator.form).toBe(form);
  });

  test('validates fields successfully', async () => {
    const validator = new FormValidator(form);

    const emailField = document.getElementById('email');
    emailField.value = 'john@example.com';

    const result = validator.validateField('email');
    expect(result.isValid).toBe(true);
  });

  test('validation fails on invalid input', async () => {
    const validator = new FormValidator(form);

    const emailField = document.getElementById('email');
    emailField.value = 'invalid-email';

    const result = validator.validateField('email');

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);

    // Verify UI is updated
    expect(emailField.classList.contains('is-invalid')).toBe(true);
    expect(emailField.getAttribute('aria-invalid')).toBe('true');
  });

  test('reset clears field states', () => {
    const validator = new FormValidator(form);

    const emailField = document.getElementById('email');
    emailField.value = 'invalid-email';
    validator.validateField('email');

    expect(emailField.classList.contains('is-invalid')).toBe(true);

    validator.reset();

    expect(emailField.classList.contains('is-invalid')).toBe(false);
  });

  test('validate() validates all fields and returns overall result', () => {
    const validator = new FormValidator(form);

    // Everything is empty so required field should fail
    const result = validator.validate();

    expect(result.isValid).toBe(false);
    expect(result.errors['name']).toBeDefined();
  });

  test('getState() returns current state', () => {
    const validator = new FormValidator(form);
    const state = validator.getState();

    expect(state).toHaveProperty('isValid');
    expect(state).toHaveProperty('hasErrors');
    expect(state).toHaveProperty('fields');
  });


  test('handles valid form submission', async () => {
    const nameField = document.getElementById('name');
    nameField.value = 'John Doe';
    const emailField = document.getElementById('email');
    emailField.value = 'john@example.com';
    const ageField = document.getElementById('age');
    ageField.value = '25';
    const usernameField = document.getElementById('username');
    usernameField.value = 'johndoe';

    let successToastCount = 0;
    const originalSuccess = toast.success;
    toast.success = () => { successToastCount++; };

    const validator = new FormValidator(form);

    const event = new Event('submit', { cancelable: true });
    let preventDefaultCalled = false;
    event.preventDefault = () => { preventDefaultCalled = true; };

    const result = await validator._handleSubmit(event);

    expect(result).toBe(true);
    expect(preventDefaultCalled).toBe(false);
    expect(successToastCount).toBe(1);

    toast.success = originalSuccess;
  });

  test('handles invalid form submission', async () => {
    let errorToastCount = 0;
    const originalError = toast.error;
    toast.error = () => { errorToastCount++; };

    const validator = new FormValidator(form);

    const event = new Event('submit', { cancelable: true });
    let preventDefaultCalled = false;
    let stopPropCalled = false;
    event.preventDefault = () => { preventDefaultCalled = true; };
    event.stopImmediatePropagation = () => { stopPropCalled = true; };

    const result = await validator._handleSubmit(event);

    expect(result).toBe(false);
    expect(preventDefaultCalled).toBe(true);
    expect(stopPropCalled).toBe(true);
    expect(errorToastCount).toBe(1);

    toast.error = originalError;
  });

  test('extracts field values correctly', () => {
    const checkboxHtml = '<input type="checkbox" id="agree" name="agree" checked />';
    const radioHtml1 = '<input type="radio" name="gender" value="m" checked />';
    const radioHtml2 = '<input type="radio" name="gender" value="f" />';
    const selectHtml = '<select id="multiselect" multiple><option value="1" selected></option><option value="2" selected></option></select>';

    form.insertAdjacentHTML('beforeend', checkboxHtml + radioHtml1 + radioHtml2 + selectHtml);

    const validator = new FormValidator(form);

    expect(validator._getFieldValue(document.getElementById('agree'))).toBe(true);
    expect(validator._getFieldValue(form.querySelector('input[name="gender"]'))).toBe('m');
    expect(validator._getFieldValue(document.getElementById('multiselect'))).toEqual(['1', '2']);
  });

  test('sets up character counter correctly', () => {
    new FormValidator(form);
    const usernameField = document.getElementById('username');
    const counter = usernameField.parentElement.querySelector('.form-char-counter');
    expect(counter).toBeTruthy();

    usernameField.value = 'test';
    usernameField.dispatchEvent(new Event('input'));

    expect(counter.textContent).toBe('4/20');
  });

  test('handles blur validation', () => {
    new FormValidator(form, { validateOnSubmit: false });
    const nameField = document.getElementById('name');

    expect(nameField.classList.contains('is-invalid')).toBe(false);

    nameField.dispatchEvent(new Event('blur'));

    expect(nameField.classList.contains('is-invalid')).toBe(true);
  });

  test('adds a rule dynamically', () => {
    const validator = new FormValidator(form);
    validator.addRule('name', VALIDATION_RULES.email);
    expect(validator.fieldConfigs.get('name').rules).toContain(VALIDATION_RULES.email);
  });
});

test.describe('FieldValidator Component', () => {
  let field;
  let FieldValidator, createFieldValidator, VALIDATION_RULES, VALIDATION_TIMING;

  test.beforeAll(async () => {
    const FV = await import('../../../src/components/FormValidator.js');
    FieldValidator = FV.FieldValidator;
    createFieldValidator = FV.createFieldValidator;
    const util = await import('../../../src/utils/formValidation.js');
    VALIDATION_RULES = util.VALIDATION_RULES;
    VALIDATION_TIMING = util.VALIDATION_TIMING;
  });

  test.beforeEach(() => {
    document.body.innerHTML = `
      <div id="toast-container"></div>
      <div class="workspace-config-field">
        <label for="single-field">Single</label>
        <input type="text" id="single-field" name="single" />
      </div>
    `;
    field = document.getElementById('single-field');
  });

  test('initializes correctly', () => {
    const validator = new FieldValidator(field, { rules: [VALIDATION_RULES.required] });
    expect(validator.field).toBe(field);
  });

  test('factory function works correctly', () => {
    const validator = createFieldValidator('#single-field', { rules: [VALIDATION_RULES.required] });
    expect(validator).toBeInstanceOf(FieldValidator);
    expect(validator.field).toBe(field);
  });

  test('handles missing field gracefully', () => {
    const originalConsoleError = console.error;
    let errorMsg = '';
    console.error = (msg) => { errorMsg = msg; };

    const validator = new FieldValidator('#non-existent');
    expect(validator.field).toBeNull();
    expect(errorMsg).toBe('FieldValidator: Field element not found');

    console.error = originalConsoleError;
  });

  test('validates single field successfully', () => {
    const validator = new FieldValidator(field, { rules: [VALIDATION_RULES.required] });

    field.value = 'hello';
    const result = validator.validate();

    expect(result.isValid).toBe(true);
  });

  test('single field validation fails on invalid input', () => {
    const validator = new FieldValidator(field, { rules: [VALIDATION_RULES.required] });

    field.value = '';
    const result = validator.validate();

    expect(result.isValid).toBe(false);
    expect(field.classList.contains('is-invalid')).toBe(true);
  });


  test('handles debounced input validation', async () => {
    new FieldValidator(field, {
      rules: [VALIDATION_RULES.required],
      timing: VALIDATION_TIMING.DEBOUNCED,
      debounceMs: 10
    });

    field.value = '';
    field.dispatchEvent(new Event('input'));

    expect(field.classList.contains('is-invalid')).toBe(false);

    await new Promise(r => setTimeout(r, 20));

    expect(field.classList.contains('is-invalid')).toBe(true);
  });

  test('shows success indicator', () => {
    const validator = new FieldValidator(field, {
      rules: [VALIDATION_RULES.required],
      showSuccess: true
    });

    field.value = 'valid';
    validator.stateManager.markDirty(validator.fieldId);
    validator.validate();

    expect(field.classList.contains('is-valid')).toBe(true);
    expect(field.getAttribute('aria-invalid')).toBe('false');
  });

  test('reset single field', () => {
    const validator = new FieldValidator(field, { rules: [VALIDATION_RULES.required] });

    field.value = '';
    validator.validate();
    expect(field.classList.contains('is-invalid')).toBe(true);

    validator.reset();
    expect(field.classList.contains('is-invalid')).toBe(false);
  });
});
