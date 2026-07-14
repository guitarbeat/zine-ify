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
} from '../../../src/utils/formValidation.js';

test.describe('Form Validation Utils', () => {

  test.describe('createFieldValidation', () => {
    test('creates default validation configuration', () => {
      const config = createFieldValidation('Username');
      expect(config.fieldName).toBe('Username');
      expect(config.rules).toEqual([]);
      expect(config.timing).toBe(VALIDATION_TIMING.DEBOUNCED);
      expect(config.debounceMs).toBe(300);
      expect(config.showSuccess).toBe(true);
      expect(config.validateOnChange).toBe(true);
      expect(config.helpText).toBeNull();
      expect(config.constraints).toBeNull();
    });

    test('accepts custom options', () => {
      const config = createFieldValidation('Email', ['required', 'email'], {
        timing: VALIDATION_TIMING.BLUR,
        debounceMs: 500,
        showSuccess: false,
        validateOnChange: false,
        helpText: 'Enter email',
        constraints: { format: 'email' }
      });
      expect(config.fieldName).toBe('Email');
      expect(config.rules).toEqual(['required', 'email']);
      expect(config.timing).toBe(VALIDATION_TIMING.BLUR);
      expect(config.debounceMs).toBe(500);
      expect(config.showSuccess).toBe(false);
      expect(config.validateOnChange).toBe(false);
      expect(config.helpText).toBe('Enter email');
      expect(config.constraints).toEqual({ format: 'email' });
    });
  });

  test.describe('VALIDATION_RULES', () => {
    test('required rule', () => {
      const rule = VALIDATION_RULES.required;
      expect(rule.validate(null)).toBe(false);
      expect(rule.validate(undefined)).toBe(false);
      expect(rule.validate('')).toBe(false);
      expect(rule.validate('  ')).toBe(false);
      expect(rule.validate([])).toBe(false);

      expect(rule.validate('hello')).toBe(true);
      expect(rule.validate(['item'])).toBe(true);
      expect(rule.validate(0)).toBe(true);
      expect(rule.getMessage('Field')).toBe('Field is required');
    });

    test('email rule', () => {
      const rule = VALIDATION_RULES.email;
      expect(rule.validate('')).toBe(true); // Let required handle empty
      expect(rule.validate('invalid')).toBe(false);
      expect(rule.validate('test@example')).toBe(false);
      expect(rule.validate('test@example.com')).toBe(true);
      expect(rule.getMessage()).toContain('valid email address');
    });

    test('integer rule', () => {
      const rule = VALIDATION_RULES.integer;
      expect(rule.validate('')).toBe(true);
      expect(rule.validate(0)).toBe(true);
      expect(rule.validate(1.5)).toBe(false);
      expect(rule.validate('10')).toBe(true);
      expect(rule.validate('abc')).toBe(false);
      expect(rule.getMessage()).toBe('Must be a whole number');
    });

    test('minLength rule', () => {
      const rule = VALIDATION_RULES.minLength(3);
      expect(rule.validate('')).toBe(true);
      expect(rule.validate('ab')).toBe(false);
      expect(rule.validate('abc')).toBe(true);
      expect(rule.getMessage()).toBe('Must be at least 3 characters');
    });

    test('maxLength rule', () => {
      const rule = VALIDATION_RULES.maxLength(3);
      expect(rule.validate('')).toBe(true);
      expect(rule.validate('abc')).toBe(true);
      expect(rule.validate('abcd')).toBe(false);
      expect(rule.getMessage()).toBe('Must be no more than 3 characters');
    });

    test('min rule', () => {
      const rule = VALIDATION_RULES.min(10);
      expect(rule.validate('')).toBe(true);
      expect(rule.validate('abc')).toBe(true);
      expect(rule.validate(9)).toBe(false);
      expect(rule.validate(10)).toBe(true);
      expect(rule.validate(11)).toBe(true);
      expect(rule.getMessage()).toBe('Must be at least 10');
    });

    test('max rule', () => {
      const rule = VALIDATION_RULES.max(10);
      expect(rule.validate('')).toBe(true);
      expect(rule.validate(11)).toBe(false);
      expect(rule.validate(10)).toBe(true);
      expect(rule.getMessage()).toBe('Must be no more than 10');
    });

    test('pattern rule', () => {
      const rule = VALIDATION_RULES.pattern(/^[A-Z]+$/, 'Must be uppercase');
      expect(rule.validate('')).toBe(true);
      expect(rule.validate('abc')).toBe(false);
      expect(rule.validate('ABC')).toBe(true);
      expect(rule.getMessage()).toBe('Must be uppercase');
    });

    test('match rule', () => {
      const formData = { password: 'pass', confirm: 'pass' };
      const rule1 = VALIDATION_RULES.match('password');
      expect(rule1.validate('pass', formData)).toBe(true);
      expect(rule1.validate('wrong', formData)).toBe(false);
      expect(rule1.getMessage()).toBe('Must match password');

      const rule2 = VALIDATION_RULES.match('password', () => 'dynamic');
      expect(rule2.validate('dynamic')).toBe(true);
      expect(rule2.validate('pass')).toBe(false);
    });

    test('custom rule', () => {
      const rule = VALIDATION_RULES.custom((val) => val === 'magic', 'Not magic');
      expect(rule.validate('magic')).toBe(true);
      expect(rule.validate('muggle')).toBe(false);
      expect(rule.getMessage()).toBe('Not magic');
    });
  });

  test.describe('validateValue', () => {
    test('validates valid value against string rules', () => {
      const result = validateValue('test@example.com', ['required', 'email'], { fieldName: 'Email' });
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('validates invalid value against string rules', () => {
      const result = validateValue('', ['required', 'email'], { fieldName: 'Email' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Email is required']);
    });

    test('validates against factory object rules', () => {
      const result = validateValue('ab', [{ minLength: 3 }], { fieldName: 'Username' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Must be at least 3 characters']);
    });

    test('validates against multiple rules, capturing all errors', () => {
      const result = validateValue('invalid', ['required', 'email', { minLength: 10 }], { fieldName: 'Email' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Please enter a valid email address (example@domain.com)');
      expect(result.errors).toContain('Must be at least 10 characters');
    });

    test('ignores missing or malformed rules', () => {
      const result = validateValue('test', ['nonexistent', null, undefined], { fieldName: 'Test' });
      expect(result.isValid).toBe(true);
    });
  });

  test.describe('FieldStateManager', () => {
    let manager;

    test.beforeEach(() => {
      manager = new FieldStateManager();
    });

    test('registers and unregisters fields', () => {
      manager.register('email', { fieldName: 'Email' });
      expect(manager.getField('email')).toMatchObject({
        fieldName: 'Email',
        state: FIELD_STATE.PRISTINE,
        errors: [],
        isValid: null
      });

      manager.unregister('email');
      expect(manager.getField('email')).toBeUndefined();
    });

    test('sets state', () => {
      manager.register('email', {});
      manager.setState('email', FIELD_STATE.DIRTY);
      expect(manager.getField('email').state).toBe(FIELD_STATE.DIRTY);
    });

    test('sets errors and updates validity and state', () => {
      manager.register('email', {});

      manager.setErrors('email', ['Invalid']);
      expect(manager.getField('email').errors).toEqual(['Invalid']);
      expect(manager.getField('email').isValid).toBe(false);
      expect(manager.getField('email').state).toBe(FIELD_STATE.DIRTY);

      manager.setErrors('email', []);
      expect(manager.getField('email').isValid).toBe(true);
    });

    test('marks touched and dirty', () => {
      manager.register('email', {});
      manager.markTouched('email');
      expect(manager.getField('email').state).toBe(FIELD_STATE.TOUCHED);

      manager.register('name', {});
      manager.markDirty('name');
      expect(manager.getField('name').state).toBe(FIELD_STATE.DIRTY);
    });

    test('checks form validity', () => {
      manager.register('email', {});
      manager.register('name', {});

      expect(manager.isFormValid()).toBe(false);

      manager.setErrors('email', []);
      manager.setErrors('name', []);
      expect(manager.isFormValid()).toBe(true);

      manager.setErrors('email', ['Error']);
      expect(manager.isFormValid()).toBe(false);
    });

    test('shouldShowErrors and hasErrors', () => {
      manager.register('email', {});
      manager.setErrors('email', ['Error']);
      expect(manager.shouldShowErrors('email')).toBe(true);
      expect(manager.hasErrors()).toBe(true);

      manager.setState('email', FIELD_STATE.PRISTINE);
      expect(manager.shouldShowErrors('email')).toBe(false);
      expect(manager.hasErrors()).toBe(false);
    });

    test('getAllErrors', () => {
      manager.register('email', {});
      manager.setErrors('email', ['Email is invalid']);

      manager.register('name', {});
      manager.setErrors('name', ['Name is required']);
      manager.setState('name', FIELD_STATE.PRISTINE); // should hide errors

      const errors = manager.getAllErrors();
      expect(errors).toEqual({
        email: ['Email is invalid']
      });
    });

    test('resets fields', () => {
      manager.register('email', {});
      manager.setErrors('email', ['Error']);

      manager.reset('email');
      const field = manager.getField('email');
      expect(field.state).toBe(FIELD_STATE.PRISTINE);
      expect(field.errors).toEqual([]);
      expect(field.isValid).toBeNull();

      manager.setErrors('email', ['Error']);
      manager.register('name', {});
      manager.setErrors('name', ['Error2']);

      manager.resetAll();
      expect(manager.getField('email').isValid).toBeNull();
      expect(manager.getField('name').isValid).toBeNull();
    });
  });

  test.describe('createCharacterCounter', () => {
    test('calculates stats properly', () => {
      const counter = createCharacterCounter(100);

      let stats = counter.getStats(0);
      expect(stats.current).toBe(0);
      expect(stats.max).toBe(100);
      expect(stats.remaining).toBe(100);
      expect(stats.status).toBe('normal');
      expect(stats.shouldShow).toBe(false);

      stats = counter.getStats(50);
      expect(stats.status).toBe('visible');
      expect(stats.shouldShow).toBe(true);

      stats = counter.getStats(80);
      expect(stats.status).toBe('warning');
      expect(stats.shouldShow).toBe(true);

      stats = counter.getStats(100);
      expect(stats.status).toBe('exceeded');
      expect(stats.shouldShow).toBe(true);
    });

    test('respects custom showAt and warnAt options', () => {
      const counter = createCharacterCounter(100, { warnAt: 90, showAt: 80 });
      let stats = counter.getStats(70);
      expect(stats.status).toBe('normal');

      stats = counter.getStats(85);
      expect(stats.status).toBe('visible');

      stats = counter.getStats(95);
      expect(stats.status).toBe('warning');
    });
  });

  test.describe('InputMasks', () => {
    test('numeric format', () => {
      expect(InputMasks.numeric.format('1a2b3c')).toBe('123');
    });

    test('currency format', () => {
      expect(InputMasks.currency.format('10.999')).toBe('11.00');
      expect(InputMasks.currency.format('abc')).toBe('');
    });

    test('phone format', () => {
      expect(InputMasks.phone.format('123')).toBe('123');
      expect(InputMasks.phone.format('123456')).toBe('(123) 456');
      expect(InputMasks.phone.format('1234567890')).toBe('(123) 456-7890');
      expect(InputMasks.phone.format('1234567890123')).toBe('(123) 456-7890');
    });

    test('trimmed format', () => {
      expect(InputMasks.trimmed.format('  hello  ')).toBe('hello');
    });
  });

  test.describe('createConstraintHint', () => {
    test('returns null if no constraints', () => {
      expect(createConstraintHint({})).toBeNull();
    });

    test('combines minLength and maxLength', () => {
      expect(createConstraintHint({ minLength: 3, maxLength: 10 })).toBe('3-10 characters');
    });

    test('handles minLength only', () => {
      expect(createConstraintHint({ minLength: 3 })).toBe('At least 3 characters');
    });

    test('handles maxLength only', () => {
      expect(createConstraintHint({ maxLength: 10 })).toBe('Up to 10 characters');
    });

    test('includes format and pattern', () => {
      expect(createConstraintHint({ format: 'email', pattern: 'lowercase' })).toBe('email · lowercase');
    });

    test('combines all', () => {
      expect(createConstraintHint({ minLength: 3, maxLength: 10, format: 'email' })).toBe('3-10 characters · email');
    });
  });

  test.describe('createDebouncedValidator', () => {
    test('returns a function', () => {
      const validator = () => {};
      const debounced = createDebouncedValidator(validator, 100);
      expect(typeof debounced).toBe('function');
    });
  });
});
