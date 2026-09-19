import { test, expect } from '@playwright/test';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="toast-container"></div></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.requestAnimationFrame = (cb) => cb();
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.Event = dom.window.Event;
global.CustomEvent = dom.window.CustomEvent;

if (!dom.window.HTMLElement.prototype.scrollIntoView) {
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
}

let toast;
test.beforeAll(async () => {
  const toastModule = await import('../../../src/components/Toast.js');
  toast = toastModule.toast;
});

test.describe('FormValidator Component', () => {
  let form;
  let FormValidator, createFormValidator, VALIDATION_RULES;

  test.beforeAll(async () => {
    const FV = await import('../../../src/components/FormValidator.js');
    FormValidator = FV.FormValidator;
    createFormValidator = FV.createFormValidator;
    const util = await import('../../../src/utils/formValidation.js');
    VALIDATION_RULES = util.VALIDATION_RULES;
    // VALIDATION_TIMING imported in FieldValidator suite
  });

  test.beforeEach(() => {
    document.body.innerHTML = `
      <div id="toast-container"></div>
      <form id="test-form">
        <div class="workspace-config-field">
          <label for="name">Name</label>
          <input type="text" id="name" name="name" data-validate="required" />
        </div>
        <div class="workspace-config-field">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" data-validate="email" />
        </div>
        <div class="workspace-config-field">
          <label for="age">Age</label>
          <input type="number" id="age" name="age" data-validate="integer" />
        </div>
        <div class="workspace-config-field">
          <label for="username">Username</label>
          <input type="text" id="username" name="username" data-validate="required" />
        </div>
        <input type="text" id="no-validation" name="no-validation" />
      </form>
    `;
    form = document.getElementById('test-form');
    const usernameField = document.getElementById('username');
    usernameField.maxLength = 20;
  });

  test('initializes with form element correctly', () => {
    const validator = new FormValidator(form);
    expect(validator.form).toBe(form);
    expect(validator.fieldConfigs.size).toBeGreaterThan(0);
  });

  test('initializes with string selector', () => {
    const validator = new FormValidator('#test-form');
    expect(validator.form).toBe(form);
  });

  test('handles missing form gracefully', () => {
    const validator = new FormValidator('#non-existent');
    expect(validator.form).toBeNull();
  });

  test('discovers fields and sets up validation', () => {
    const validator = new FormValidator(form);

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

  test('validates fields successfully', () => {
    const validator = new FormValidator(form);

    const emailField = document.getElementById('email');
    emailField.value = 'john@example.com';

    const result = validator.validateField('email');
    expect(result.isValid).toBe(true);
  });

  test('validation fails on invalid input', () => {
    const validator = new FormValidator(form);

    const emailField = document.getElementById('email');
    emailField.value = 'invalid-email';

    const result = validator.validateField('email');

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);

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

  test('parses parameterized rules and constraint attributes during field discovery', () => {
    const bioField = document.createElement('input');
    bioField.type = 'text';
    bioField.id = 'bio';
    bioField.name = 'bio';
    bioField.dataset.validate = 'minLength:8, maxLength:20';

    const scoreField = document.createElement('input');
    scoreField.type = 'number';
    scoreField.id = 'score';
    scoreField.name = 'score';
    scoreField.dataset.validate = 'min:5, max:100';
    scoreField.required = true;

    form.innerHTML = '';
    form.appendChild(bioField);
    form.appendChild(scoreField);

    const validator = new FormValidator(form);
    const bioConfig = validator.fieldConfigs.get('bio');
    expect(bioConfig.rules).toEqual([{ minLength: 8 }, { maxLength: 20 }]);

    const scoreConfig = validator.fieldConfigs.get('score');
    expect(scoreConfig.rules).toEqual([{ min: 5 }, { max: 100 }, 'required', 'integer']);
  });

  test('shows and removes success indicators', () => {
    const validator = new FormValidator(form, { showSuccessState: true });
    const emailField = document.getElementById('email');
    emailField.value = 'john@example.com';

    validator.stateManager.markDirty('email');
    validator.validateField('email');

    expect(emailField.classList.contains('is-valid')).toBe(true);
    const icon = form.querySelector('.form-success-icon[data-field-id="email"]');
    expect(icon).toBeTruthy();

    validator.reset();
    expect(form.querySelector('.form-success-icon[data-field-id="email"]')).toBeNull();
  });

  test('adds constraint hint if constraints are provided in field config', () => {
    form.innerHTML = '<div class="workspace-config-field"><input type="text" id="custom" name="custom" /></div>';
    const validator = new FormValidator(form);
    validator.register('#custom', {
      constraints: { minLength: 5, maxLength: 20 }
    });
    const hint = form.querySelector('.form-constraint-hint');
    expect(hint).toBeTruthy();
    expect(hint.textContent).toBe('5-20 characters');
  });

  test('clears errors on field focus', () => {
    const validator = new FormValidator(form);
    const emailField = document.getElementById('email');
    emailField.value = 'invalid-email';

    validator.validateField('email');
    expect(emailField.classList.contains('is-invalid')).toBe(true);

    emailField.dispatchEvent(new Event('focus'));
    expect(emailField.classList.contains('is-invalid')).toBe(false);
  });

  test('handles radio buttons with single and multiple options', () => {
    form.innerHTML = `
      <input type="radio" id="single-radio" name="singleRadio" value="yes" checked />
      <input type="radio" id="radio1" name="multiRadio" value="opt1" />
      <input type="radio" id="radio2" name="multiRadio" value="opt2" checked />
    `;
    const validator = new FormValidator(form);
    const singleRadio = document.getElementById('single-radio');
    const radio1 = document.getElementById('radio1');

    expect(validator._getFieldValue(singleRadio)).toBe('yes');
    expect(validator._getFieldValue(radio1)).toBe('opt2');
  });

  test('executes onValidationChange callback when validating field', () => {
    let callbackCalled = false;
    let callbackResult = null;

    const validator = new FormValidator(form);
    validator.register('#name', {
      rules: ['required'],
      onValidationChange: (result) => {
        callbackCalled = true;
        callbackResult = result;
      }
    });

    validator.validateField('name');
    expect(callbackCalled).toBe(true);
    expect(callbackResult.isValid).toBe(false);
  });

  test('focuses and scrolls to first error on submission error', async () => {
    let focusCalled = false;
    let scrollCalled = false;

    const validator = new FormValidator(form, {
      focusFirstError: true,
      scrollToError: true,
      toastOnSuccess: true
    });

    const nameField = document.getElementById('name');
    nameField.focus = () => { focusCalled = true; };
    nameField.scrollIntoView = () => { scrollCalled = true; };

    const event = new Event('submit', { cancelable: true });
    event.preventDefault = () => {};
    event.stopImmediatePropagation = () => {};

    const origError = toast.error;
    toast.error = () => {};

    await validator._handleSubmit(event);

    expect(focusCalled).toBe(true);
    expect(scrollCalled).toBe(true);

    toast.error = origError;
  });

  test('handles registering a non-existent field selector gracefully', () => {
    const validator = new FormValidator(form);
    const res = validator.register('#does-not-exist', { rules: [] });
    expect(res).toBe(validator);
  });

  test('defaults fieldName to label text or fallback if not provided in config', () => {
    form.innerHTML = `
      <label for="labeled-input">My Label</label>
      <input type="text" id="labeled-input" />
      <input type="text" id="unlabeled-input" />
    `;
    const validator = new FormValidator(form);
    validator.register('#labeled-input', {});
    validator.register('#unlabeled-input', {});

    expect(validator.fieldConfigs.get('labeled-input').fieldName).toBe('My Label');
    expect(validator.fieldConfigs.get('unlabeled-input').fieldName).toBe('Field');
  });

  test('supports custom insertPoint and stepper insertion target', () => {
    form.innerHTML = `
      <div class="workspace-config-field">
        <input type="text" id="stepper-input" />
        <div class="stepper"></div>
      </div>
      <div id="custom-insert"></div>
      <input type="text" id="custom-target-input" />
    `;
    const validator = new FormValidator(form);
    validator.register('#stepper-input', {});
    validator.register('#custom-target-input', {
      insertPoint: form.querySelector('#custom-insert')
    });

    const stepperConfig = validator.fieldConfigs.get('stepper-input');
    expect(stepperConfig.insertPoint.classList.contains('workspace-config-field')).toBe(true);

    const customConfig = validator.fieldConfigs.get('custom-target-input');
    expect(customConfig.insertPoint).toBeTruthy();
  });

  test('returns default valid result for non-existent field validation', () => {
    const validator = new FormValidator(form);
    const result = validator._validateField('non-existent');
    expect(result).toEqual({ isValid: true, errors: [] });
  });

  test('supports passedFormData parameter in _validateField', () => {
    const validator = new FormValidator(form);
    validator.register('#name', { rules: ['required'] });
    document.getElementById('name').value = 'John';

    const customFormData = { age: '30' };
    const result = validator._validateField('name', customFormData);
    expect(result.isValid).toBe(true);
  });

  test('handles addRule for non-existent field gracefully', () => {
    const validator = new FormValidator(form);
    expect(() => validator.addRule('non-existent', 'required')).not.toThrow();
  });

  test('handles getFieldValue for unchecked checkbox, radioCache hit/miss, and unselected radios', () => {
    form.innerHTML = `
      <input type="checkbox" id="uncheck" name="uncheck" />
      <input type="radio" name="opts" value="a" />
      <input type="radio" name="opts" value="b" />
    `;
    const validator = new FormValidator(form);
    const checkbox = form.querySelector('#uncheck');
    const radioA = form.querySelectorAll('input[name="opts"]')[0];

    expect(validator._getFieldValue(checkbox)).toBe(false);

    const radioCache = new Map();
    expect(validator._getFieldValue(radioA, radioCache)).toBeNull();
    expect(radioCache.has('opts')).toBe(true);
    expect(radioCache.get('opts')).toBeNull();

    // Secondary lookup uses cache
    expect(validator._getFieldValue(radioA, radioCache)).toBeNull();
  });

  test('prevents duplicate error element and success icon creation', () => {
    const validator = new FormValidator(form, { showSuccessState: true });
    validator.register('#name', { rules: ['required'] });

    validator._showFieldError('name', 'Error 1');
    validator._showFieldError('name', 'Error 2');
    const errors = form.querySelectorAll('.form-error[data-field-id="name"]');
    expect(errors.length).toBe(1);

    validator._showSuccessIndicator('name');
    validator._showSuccessIndicator('name');
    const icons = form.querySelectorAll('.form-success-icon[data-field-id="name"]');
    expect(icons.length).toBe(1);
  });

  test('handles submission options toastOnSuccess, scrollToError, focusFirstError when false', async () => {
    let toastSuccessCalled = false;
    const origSuccess = toast.success;
    toast.success = () => { toastSuccessCalled = true; };

    form.innerHTML = '<input type="text" id="name" name="name" data-validate="required" />';
    document.getElementById('name').value = 'Valid Name';

    const validator = new FormValidator(form, { toastOnSuccess: false });

    const event = new Event('submit', { cancelable: true });
    await validator._handleSubmit(event);

    expect(toastSuccessCalled).toBe(false);

    toast.success = origSuccess;
  });

  test('triggers IMMEDIATE validation listener on input when field is dirty/touched', async () => {
    const validator = new FormValidator(form);
    const util = await import('../../../src/utils/formValidation.js');
    validator.register('#name', {
      rules: ['required'],
      timing: util.VALIDATION_TIMING.IMMEDIATE
    });

    const nameField = document.getElementById('name');
    validator.stateManager.markTouched('name');
    validator.stateManager.markDirty('name');

    nameField.value = '';
    nameField.dispatchEvent(new Event('input'));

    expect(nameField.classList.contains('is-invalid')).toBe(true);
  });

  test('triggers DEBOUNCED validation listener on input when field is dirty/touched', async () => {
    const validator = new FormValidator(form);
    const util = await import('../../../src/utils/formValidation.js');
    validator.register('#name', {
      rules: ['required'],
      timing: util.VALIDATION_TIMING.DEBOUNCED,
      debounceMs: 10
    });

    const nameField = document.getElementById('name');
    validator.stateManager.markTouched('name');
    validator.stateManager.markDirty('name');

    nameField.value = '';
    nameField.dispatchEvent(new Event('input'));

    expect(nameField.classList.contains('is-invalid')).toBe(false);

    await new Promise(r => setTimeout(r, 20));

    expect(nameField.classList.contains('is-invalid')).toBe(true);
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
    /* eslint-disable-next-line no-console */
    const originalConsoleError = console.error;
    let errorMsg = '';
    /* eslint-disable-next-line no-console */
    console.error = (msg) => { errorMsg = msg; };

    const validator = new FieldValidator('#non-existent');
    expect(validator.field).toBeNull();
    expect(errorMsg).toBe('');

    /* eslint-disable-next-line no-console */
    console.error = originalConsoleError;
  });

  test('validates single field successfully', () => {
    const validator = new FieldValidator(field, { rules: [VALIDATION_RULES.required] });

    field.value = 'hello';
    const result = validator.validate();

    expect(result.isValid).toBe(true);
  });

  test('single field validation fails on invalid input and shows role alert', () => {
    const validator = new FieldValidator(field, { rules: [VALIDATION_RULES.required] });

    field.value = '';
    const result = validator.validate();

    expect(result.isValid).toBe(false);
    expect(field.classList.contains('is-invalid')).toBe(true);

    const errorEl = field.parentElement.querySelector('.form-error');
    expect(errorEl).toBeTruthy();
    expect(errorEl.getAttribute('role')).toBe('alert');
  });

  test('handles immediate input validation', () => {
    new FieldValidator(field, {
      rules: [VALIDATION_RULES.required],
      timing: VALIDATION_TIMING.IMMEDIATE
    });

    field.value = '';
    field.dispatchEvent(new Event('input'));

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

  test('shows success indicator on valid input', () => {
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
    expect(field.hasAttribute('aria-invalid')).toBe(false);
  });

  test('handles blur event listener to mark touched and validate field', () => {
    const validator = new FieldValidator(field, {
      rules: [VALIDATION_RULES.required],
      timing: VALIDATION_TIMING.BLUR
    });

    field.value = '';
    field.dispatchEvent(new Event('blur'));

    expect(field.classList.contains('is-invalid')).toBe(true);
  });
});
