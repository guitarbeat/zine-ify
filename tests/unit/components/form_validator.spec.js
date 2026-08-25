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

test.describe('FormValidator Component', () => {
  let form;
  let FormValidator, FieldValidator, createFormValidator, createFieldValidator;
  let FIELD_STATE, VALIDATION_TIMING, VALIDATION_RULES;

  test.beforeAll(async () => {
    const FV = await import('../../../src/components/FormValidator.js');
    FormValidator = FV.FormValidator;
    FieldValidator = FV.FieldValidator;
    createFormValidator = FV.createFormValidator;
    createFieldValidator = FV.createFieldValidator;

    const util = await import('../../../src/utils/formValidation.js');
    FIELD_STATE = util.FIELD_STATE;
    VALIDATION_TIMING = util.VALIDATION_TIMING;
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
    expect(errorMsg).toBe('FormValidator: Form element not found');

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

  test('adds a rule dynamically', () => {
    const validator = new FormValidator(form);
    validator.addRule('name', VALIDATION_RULES.email);
    expect(validator.fieldConfigs.get('name').rules).toContain(VALIDATION_RULES.email);
  });
});

test.describe('FieldValidator Component', () => {
  let field;
  let FieldValidator, createFieldValidator, VALIDATION_RULES;

  test.beforeAll(async () => {
    const FV = await import('../../../src/components/FormValidator.js');
    FieldValidator = FV.FieldValidator;
    createFieldValidator = FV.createFieldValidator;
    const util = await import('../../../src/utils/formValidation.js');
    VALIDATION_RULES = util.VALIDATION_RULES;
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

  test('reset single field', () => {
    const validator = new FieldValidator(field, { rules: [VALIDATION_RULES.required] });

    field.value = '';
    validator.validate();
    expect(field.classList.contains('is-invalid')).toBe(true);

    validator.reset();
    expect(field.classList.contains('is-invalid')).toBe(false);
  });
});
