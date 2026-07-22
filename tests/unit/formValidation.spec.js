import { test, expect } from '@playwright/test';
import {
  VALIDATION_TIMING,
  FIELD_STATE,
  VALIDATION_RULES,
  createFieldValidation,
  validateValue,
  FieldStateManager,
  createCharacterCounter,
  InputMasks,
  createConstraintHint,
  createDebouncedValidator
} from '../../src/utils/formValidation.js';

test.describe('Form Validation Utilities', () => {
  test.describe('VALIDATION_RULES', () => {
    test('required rule', () => {
      const rule = VALIDATION_RULES.required;
      expect(rule.validate(null)).toBe(false);
      expect(rule.validate(undefined)).toBe(false);
      expect(rule.validate('')).toBe(false);
      expect(rule.validate('   ')).toBe(false);
      expect(rule.validate([])).toBe(false);

      expect(rule.validate('value')).toBe(true);
      expect(rule.validate(0)).toBe(true);
      expect(rule.validate([1])).toBe(true);
      expect(rule.getMessage('Field')).toBe('Field is required');
    });

    test('email rule', () => {
      const rule = VALIDATION_RULES.email;
      expect(rule.validate('')).toBe(true); // Let required handle empty
      expect(rule.validate('invalid')).toBe(false);
      expect(rule.validate('invalid@')).toBe(false);
      expect(rule.validate('invalid@domain')).toBe(false);
      expect(rule.validate('test@example.com')).toBe(true);
      expect(rule.getMessage()).toContain('valid email address');
    });

    test('integer rule', () => {
      const rule = VALIDATION_RULES.integer;
      expect(rule.validate('')).toBe(true);
      expect(rule.validate('1.5')).toBe(false);
      expect(rule.validate('abc')).toBe(false);
      expect(rule.validate(1.5)).toBe(false);
      expect(rule.validate(42)).toBe(true);
      expect(rule.validate('42')).toBe(true);
      expect(rule.validate(0)).toBe(true);
      expect(rule.getMessage()).toBe('Must be a whole number');
    });

    test('minLength rule', () => {
      const rule = VALIDATION_RULES.minLength(3);
      expect(rule.validate('')).toBe(true);
      expect(rule.validate('ab')).toBe(false);
      expect(rule.validate('abc')).toBe(true);
      expect(rule.validate('abcd')).toBe(true);
      expect(rule.getMessage()).toBe('Must be at least 3 characters');
    });

    test('maxLength rule', () => {
      const rule = VALIDATION_RULES.maxLength(3);
      expect(rule.validate('')).toBe(true);
      expect(rule.validate('abcd')).toBe(false);
      expect(rule.validate('abc')).toBe(true);
      expect(rule.validate('ab')).toBe(true);
      expect(rule.getMessage()).toBe('Must be no more than 3 characters');
    });

    test('min rule', () => {
      const rule = VALIDATION_RULES.min(10);
      expect(rule.validate('not a number')).toBe(true); // isNaN returns true
      expect(rule.validate(9)).toBe(false);
      expect(rule.validate('9')).toBe(false);
      expect(rule.validate(10)).toBe(true);
      expect(rule.validate(11)).toBe(true);
      expect(rule.getMessage()).toBe('Must be at least 10');
    });

    test('max rule', () => {
      const rule = VALIDATION_RULES.max(10);
      expect(rule.validate('not a number')).toBe(true); // isNaN returns true
      expect(rule.validate(11)).toBe(false);
      expect(rule.validate('11')).toBe(false);
      expect(rule.validate(10)).toBe(true);
      expect(rule.validate(9)).toBe(true);
      expect(rule.getMessage()).toBe('Must be no more than 10');
    });

    test('pattern rule', () => {
      const rule = VALIDATION_RULES.pattern(/^[A-Z]+$/, 'Must be uppercase');
      expect(rule.validate('')).toBe(true);
      expect(rule.validate('abc')).toBe(false);
      expect(rule.validate('ABC')).toBe(true);
      expect(rule.getMessage()).toBe('Must be uppercase');

      const defaultRule = VALIDATION_RULES.pattern(/^[A-Z]+$/);
      expect(defaultRule.getMessage()).toBe('Invalid format');
    });

    test('match rule', () => {
      const ruleWithCallback = VALIDATION_RULES.match('password', () => 'secret');
      expect(ruleWithCallback.validate('wrong')).toBe(false);
      expect(ruleWithCallback.validate('secret')).toBe(true);
      expect(ruleWithCallback.getMessage()).toBe('Must match password');

      const ruleWithFormData = VALIDATION_RULES.match('password');
      expect(ruleWithFormData.validate('wrong', { password: 'secret' })).toBe(false);
      expect(ruleWithFormData.validate('secret', { password: 'secret' })).toBe(true);
    });

    test('custom rule', () => {
      const rule = VALIDATION_RULES.custom((val) => val === 'magic', 'Not magic');
      expect(rule.validate('ordinary')).toBe(false);
      expect(rule.validate('magic')).toBe(true);
      expect(rule.getMessage()).toBe('Not magic');
    });
  });

  test.describe('createFieldValidation', () => {
    test('creates default validation configuration', () => {
      const config = createFieldValidation('Username');
      expect(config).toEqual({
        fieldName: 'Username',
        rules: [],
        timing: VALIDATION_TIMING.DEBOUNCED,
        debounceMs: 300,
        showSuccess: true,
        validateOnChange: true,
        helpText: null,
        constraints: null
      });
    });

    test('creates validation configuration with options', () => {
      const rules = [VALIDATION_RULES.required];
      const config = createFieldValidation('Password', rules, {
        timing: VALIDATION_TIMING.BLUR,
        debounceMs: 500,
        showSuccess: false,
        validateOnChange: false,
        helpText: 'Enter a strong password',
        constraints: { minLength: 8 }
      });
      expect(config).toEqual({
        fieldName: 'Password',
        rules,
        timing: VALIDATION_TIMING.BLUR,
        debounceMs: 500,
        showSuccess: false,
        validateOnChange: false,
        helpText: 'Enter a strong password',
        constraints: { minLength: 8 }
      });
    });
  });

  test.describe('validateValue', () => {
    test('returns valid when no rules are provided', () => {
      const result = validateValue('test', []);
      expect(result).toEqual({ isValid: true, errors: [] });
    });

    test('validates value against provided rules', () => {
      const rules = [
        VALIDATION_RULES.required,
        VALIDATION_RULES.minLength(5)
      ];

      const invalidResult1 = validateValue('', rules, { fieldName: 'Username' });
      expect(invalidResult1.isValid).toBe(false);
      expect(invalidResult1.errors).toContain('Username is required');

      const invalidResult2 = validateValue('abc', rules, { fieldName: 'Username' });
      expect(invalidResult2.isValid).toBe(false);
      expect(invalidResult2.errors).toContain('Must be at least 5 characters');

      const validResult = validateValue('abcdef', rules, { fieldName: 'Username' });
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors.length).toBe(0);
    });

    test('ignores falsy rule objects (e.g. from conditional factories)', () => {
      const rules = [
        VALIDATION_RULES.required,
        () => null // simulated conditional rule that doesn't apply
      ];
      const result = validateValue('valid', rules, { fieldName: 'Field' });
      expect(result.isValid).toBe(true);
    });
  });

  test.describe('FieldStateManager', () => {
    let manager;

    test.beforeEach(() => {
      manager = new FieldStateManager();
    });

    test('registers and unregisters fields', () => {
      manager.register('username', { fieldName: 'Username' });
      expect(manager.getField('username')).toMatchObject({
        fieldName: 'Username',
        state: FIELD_STATE.PRISTINE,
        errors: [],
        isValid: null,
        isValidating: false
      });

      manager.unregister('username');
      expect(manager.getField('username')).toBeUndefined();
    });

    test('manages states properly', () => {
      manager.register('username', { fieldName: 'Username' });

      manager.setState('username', FIELD_STATE.TOUCHED);
      expect(manager.getField('username').state).toBe(FIELD_STATE.TOUCHED);

      manager.markTouched('username');
      expect(manager.getField('username').state).toBe(FIELD_STATE.TOUCHED);

      manager.markDirty('username'); // should not override TOUCHED based on markDirty impl
      // wait markDirty only changes if it's PRISTINE
      expect(manager.getField('username').state).toBe(FIELD_STATE.TOUCHED);

      manager.setState('username', FIELD_STATE.PRISTINE);
      manager.markDirty('username');
      expect(manager.getField('username').state).toBe(FIELD_STATE.DIRTY);
    });

    test('sets errors and updates validity', () => {
      manager.register('username', { fieldName: 'Username' });

      manager.setErrors('username', ['Error 1']);
      expect(manager.getField('username').errors).toEqual(['Error 1']);
      expect(manager.getField('username').isValid).toBe(false);
      expect(manager.getField('username').state).toBe(FIELD_STATE.DIRTY); // transitioned from pristine

      manager.setErrors('username', []);
      expect(manager.getField('username').isValid).toBe(true);
    });

    test('checks form validity', () => {
      manager.register('field1', { fieldName: 'F1' });
      manager.register('field2', { fieldName: 'F2' });

      expect(manager.isFormValid()).toBe(false); // isValid is null initially

      manager.setErrors('field1', []);
      manager.setErrors('field2', []);
      expect(manager.isFormValid()).toBe(true);

      manager.setErrors('field1', ['Error']);
      expect(manager.isFormValid()).toBe(false);
    });

    test('shouldShowErrors and getAllErrors and hasErrors', () => {
      manager.register('field1', { fieldName: 'F1' });

      // Initially pristine
      manager.setErrors('field1', ['Error']); // sets to DIRTY
      expect(manager.shouldShowErrors('field1')).toBe(true);
      expect(manager.hasErrors()).toBe(true);
      expect(manager.getAllErrors()).toEqual({ field1: ['Error'] });

      // If we manually set to pristine, errors shouldn't show
      manager.setState('field1', FIELD_STATE.PRISTINE);
      expect(manager.shouldShowErrors('field1')).toBe(false);
      expect(manager.hasErrors()).toBe(false);
      expect(manager.getAllErrors()).toEqual({});
    });

    test('resets fields', () => {
      manager.register('field1', { fieldName: 'F1' });
      manager.setErrors('field1', ['Error']);

      manager.reset('field1');
      expect(manager.getField('field1').state).toBe(FIELD_STATE.PRISTINE);
      expect(manager.getField('field1').errors).toEqual([]);
      expect(manager.getField('field1').isValid).toBeNull();

      manager.setErrors('field1', ['Error']);
      manager.resetAll();
      expect(manager.getField('field1').state).toBe(FIELD_STATE.PRISTINE);
    });
  });

  test.describe('createCharacterCounter', () => {
    test('calculates stats correctly', () => {
      const counter = createCharacterCounter(10, { warnAt: 8, showAt: 5 });

      let stats = counter.getStats(3);
      expect(stats.remaining).toBe(7);
      expect(stats.status).toBe('normal');
      expect(stats.shouldShow).toBe(false);

      stats = counter.getStats(5);
      expect(stats.status).toBe('visible');
      expect(stats.shouldShow).toBe(true);

      stats = counter.getStats(8);
      expect(stats.status).toBe('warning');
      expect(stats.shouldShow).toBe(true);

      stats = counter.getStats(11);
      expect(stats.status).toBe('exceeded');
      expect(stats.shouldShow).toBe(true);
    });
  });

  test.describe('InputMasks', () => {
    test('numeric mask', () => {
      expect(InputMasks.numeric.format('1a2b3c')).toBe('123');
      expect(InputMasks.numeric.hint).toBe('Only numbers allowed');
    });

    test('currency mask', () => {
      expect(InputMasks.currency.format('$1,234.56a')).toBe('1234.56');
      expect(InputMasks.currency.format('abc')).toBe('');
      expect(InputMasks.currency.hint).toBe('Enter an amount (e.g., 10.99)');
    });

    test('phone mask', () => {
      expect(InputMasks.phone.format('12')).toBe('12');
      expect(InputMasks.phone.format('12345')).toBe('(123) 45');
      expect(InputMasks.phone.format('1234567890')).toBe('(123) 456-7890');
      expect(InputMasks.phone.format('1234567890123')).toBe('(123) 456-7890'); // limits to 10 digits
      expect(InputMasks.phone.hint).toBe('Format: (555) 123-4567');
    });

    test('trimmed mask', () => {
      expect(InputMasks.trimmed.format('  hello  ')).toBe('hello');
      expect(InputMasks.trimmed.hint).toBeNull();
    });
  });

  test.describe('createConstraintHint', () => {
    test('creates hints based on constraints', () => {
      expect(createConstraintHint({ minLength: 5, maxLength: 10 })).toBe('5-10 characters');
      expect(createConstraintHint({ minLength: 5 })).toBe('At least 5 characters');
      expect(createConstraintHint({ maxLength: 10 })).toBe('Up to 10 characters');

      expect(createConstraintHint({ format: 'Must be an email' })).toBe('Must be an email');
      expect(createConstraintHint({ pattern: 'Only letters' })).toBe('Only letters');

      expect(createConstraintHint({ minLength: 5, format: 'Email', pattern: 'Regex' }))
        .toBe('At least 5 characters · Email · Regex');

      expect(createConstraintHint({})).toBeNull();
    });
  });

  test.describe('createDebouncedValidator', () => {
    test('wraps validator in debounce function', () => {
      const validator = () => {};
      const debounced = createDebouncedValidator(validator, 100);
      expect(typeof debounced).toBe('function');
    });
  });
});
