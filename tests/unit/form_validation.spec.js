import { test, expect } from '@playwright/test';
import {
  VALIDATION_TIMING,
  FIELD_STATE,
  VALIDATION_RULES,
  createFieldValidation,
  validateValue,
  FieldStateManager,
  createCharacterCounter
} from '../../src/utils/formValidation.js';

test.describe('Form Validation Utils', () => {
  test('VALIDATION_TIMING & FIELD_STATE exports', () => {
    expect(VALIDATION_TIMING.IMMEDIATE).toBe('immediate');
    expect(FIELD_STATE.PRISTINE).toBe('pristine');
  });

  test('createFieldValidation', () => {
    const config = createFieldValidation('Email', ['required', 'email']);
    expect(config.fieldName).toBe('Email');
    expect(config.rules).toEqual(['required', 'email']);
    expect(config.timing).toBe(VALIDATION_TIMING.DEBOUNCED);
    expect(config.debounceMs).toBe(300);
    expect(config.showSuccess).toBe(true);

    const customConfig = createFieldValidation('Age', ['integer'], {
      timing: VALIDATION_TIMING.BLUR,
      debounceMs: 500,
      showSuccess: false,
      validateOnChange: false
    });
    expect(customConfig.timing).toBe(VALIDATION_TIMING.BLUR);
    expect(customConfig.debounceMs).toBe(500);
    expect(customConfig.showSuccess).toBe(false);
    expect(customConfig.validateOnChange).toBe(false);
  });

  test('VALIDATION_RULES - required', () => {
    expect(VALIDATION_RULES.required.validate('test')).toBe(true);
    expect(VALIDATION_RULES.required.validate('')).toBe(false);
    expect(VALIDATION_RULES.required.validate('   ')).toBe(false);
    expect(VALIDATION_RULES.required.validate(null)).toBe(false);
    expect(VALIDATION_RULES.required.validate([])).toBe(false);
    expect(VALIDATION_RULES.required.validate(['item'])).toBe(true);
    expect(VALIDATION_RULES.required.getMessage('Name')).toBe('Name is required');
  });

  test('VALIDATION_RULES - email', () => {
    expect(VALIDATION_RULES.email.validate('test@example.com')).toBe(true);
    expect(VALIDATION_RULES.email.validate('invalid')).toBe(false);
    expect(VALIDATION_RULES.email.validate('')).toBe(true); // empty is handled by required
  });

  test('VALIDATION_RULES - integer', () => {
    expect(VALIDATION_RULES.integer.validate(5)).toBe(true);
    expect(VALIDATION_RULES.integer.validate('5')).toBe(true);
    expect(VALIDATION_RULES.integer.validate(5.5)).toBe(false);
    expect(VALIDATION_RULES.integer.validate('')).toBe(true);
    expect(VALIDATION_RULES.integer.validate(0)).toBe(true);
  });

  test('VALIDATION_RULES factories', () => {
    expect(VALIDATION_RULES.minLength(3).validate('abc')).toBe(true);
    expect(VALIDATION_RULES.minLength(3).validate('ab')).toBe(false);

    expect(VALIDATION_RULES.maxLength(3).validate('abc')).toBe(true);
    expect(VALIDATION_RULES.maxLength(3).validate('abcd')).toBe(false);

    expect(VALIDATION_RULES.min(10).validate(10)).toBe(true);
    expect(VALIDATION_RULES.min(10).validate(9)).toBe(false);

    expect(VALIDATION_RULES.max(10).validate(10)).toBe(true);
    expect(VALIDATION_RULES.max(10).validate(11)).toBe(false);
  });

  test('validateValue', () => {
    const context = { fieldName: 'Test Field' };

    // Valid case
    const res1 = validateValue('test@example.com', ['required', 'email'], context);
    expect(res1.isValid).toBe(true);
    expect(res1.errors).toEqual([]);

    // Invalid case string rules
    const res2 = validateValue('', ['required', 'email'], context);
    expect(res2.isValid).toBe(false);
    expect(res2.errors).toContain('Test Field is required');

    // Invalid case object rules
    const res3 = validateValue('a', [{ minLength: 3 }], context);
    expect(res3.isValid).toBe(false);
    expect(res3.errors).toContain('Must be at least 3 characters');

    // Factory object directly
    const res4 = validateValue('a', [VALIDATION_RULES.minLength(3)], context);
    expect(res4.isValid).toBe(false);

    // Factory function directly
    const res5 = validateValue('a', [() => VALIDATION_RULES.minLength(3)], context);
    expect(res5.isValid).toBe(false);
  });

  test('FieldStateManager', () => {
    const manager = new FieldStateManager();

    manager.register('email', { fieldName: 'Email' });
    expect(manager.getField('email').state).toBe(FIELD_STATE.PRISTINE);

    manager.markTouched('email');
    expect(manager.getField('email').state).toBe(FIELD_STATE.TOUCHED);

    manager.setState('email', FIELD_STATE.PRISTINE);

    manager.setErrors('email', ['Invalid email']);
    expect(manager.shouldShowErrors('email')).toBe(true);
    expect(manager.hasErrors()).toBe(true);
    expect(manager.getAllErrors()).toEqual({ email: ['Invalid email'] });
    expect(manager.isFormValid()).toBe(false);

    manager.reset('email');
    expect(manager.getField('email').state).toBe(FIELD_STATE.PRISTINE);
    expect(manager.hasErrors()).toBe(false);

    manager.unregister('email');
    expect(manager.getField('email')).toBeUndefined();
  });

  test('createCharacterCounter', () => {
    const counter = createCharacterCounter(100, { showAt: 50, warnAt: 80 });

    const stats1 = counter.getStats(10);
    expect(stats1.percentage).toBe(10);
    expect(stats1.status).toBe('normal');
    expect(stats1.shouldShow).toBe(false);

    const stats2 = counter.getStats(60);
    expect(stats2.status).toBe('visible');
    expect(stats2.shouldShow).toBe(true);

    const stats3 = counter.getStats(85);
    expect(stats3.status).toBe('warning');

    const stats4 = counter.getStats(105);
    expect(stats4.status).toBe('exceeded');
  });
});
