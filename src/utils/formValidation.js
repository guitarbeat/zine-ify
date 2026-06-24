/* eslint-disable */
/**
 * Form Validation Utilities
 * User-friendly form validation with clear, immediate feedback
 */

import { debounce } from './helpers.js';

// Validation timing strategies
export const VALIDATION_TIMING = {
  IMMEDIATE: 'immediate',     // Validate on every input
  BLUR: 'blur',               // Validate when field loses focus
  SUBMIT: 'submit',           // Validate only on form submit
  DEBOUNCED: 'debounced'      // Validate after typing pauses (default 300ms)
};

// Field states
export const FIELD_STATE = {
  PRISTINE: 'pristine',       // Not yet interacted with
  DIRTY: 'dirty',             // Value has changed
  TOUCHED: 'touched',         // User has focused and left
  VALID: 'valid',
  INVALID: 'invalid'
};

// Common validation rules with helpful error messages
export const VALIDATION_RULES = {
  required: {
    validate: (value) => {
      if (value === null || value === undefined) {return false;}
      if (typeof value === 'string') {return value.trim().length > 0;}
      if (Array.isArray(value)) {return value.length > 0;}
      return true;
    },
    getMessage: (fieldName) => `${fieldName} is required`
  },

  email: {
    validate: (value) => {
      if (!value) {return true;} // Let required handle empty
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    getMessage: () => 'Please enter a valid email address (example@domain.com)'
  },

  integer: {
    validate: (value) => {
      if (!value && value !== 0) {return true;}
      return Number.isInteger(Number(value));
    },
    getMessage: () => 'Must be a whole number'
  },

  // Factory functions that return rule objects
  minLength(min) {
    return {
      validate: (value) => {
        if (!value) {return true;}
        return value.length >= min;
      },
      getMessage: () => `Must be at least ${min} characters`
    };
  },

  maxLength(max) {
    return {
      validate: (value) => {
        if (!value) {return true;}
        return value.length <= max;
      },
      getMessage: () => `Must be no more than ${max} characters`
    };
  },

  min(minValue) {
    return {
      validate: (value) => {
        const num = parseFloat(value);
        if (isNaN(num)) {return true;}
        return num >= minValue;
      },
      getMessage: () => `Must be at least ${minValue}`
    };
  },

  max(maxValue) {
    return {
      validate: (value) => {
        const num = parseFloat(value);
        if (isNaN(num)) {return true;}
        return num <= maxValue;
      },
      getMessage: () => `Must be no more than ${maxValue}`
    };
  },

  pattern(regex, message) {
    return {
      validate: (value) => {
        if (!value) {return true;}
        return regex.test(value);
      },
      getMessage: () => message || 'Invalid format'
    };
  },

  match(otherFieldName, getOtherValue) {
    return {
      validate: (value, formData) => {
        const otherValue = getOtherValue ? getOtherValue() : formData?.[otherFieldName];
        return value === otherValue;
      },
      getMessage: () => `Must match ${otherFieldName}`
    };
  },

  custom(validator, message) {
    return {
      validate: validator,
      getMessage: () => message
    };
  }
};

/**
 * Create a validation rule set for a field
 * @param {string} fieldName - Display name for the field
 * @param {Array} rules - Array of validation rules to apply
 * @param {Object} options - Validation options
 * @returns {Object} Field validation configuration
 */
export function createFieldValidation(fieldName, rules = [], options = {}) {
  return {
    fieldName,
    rules,
    timing: options.timing || VALIDATION_TIMING.DEBOUNCED,
    debounceMs: options.debounceMs || 300,
    showSuccess: options.showSuccess !== false,
    validateOnChange: options.validateOnChange ?? true,
    helpText: options.helpText || null,
    constraints: options.constraints || null // Pre-emptive constraint hints
  };
}

/**
 * Validate a single value against rules
 * @param {*} value - Value to validate
 * @param {Array} rules - Validation rules to apply
 * @param {Object} context - Additional context (formData, etc.)
 * @returns {Object} Validation result with isValid and errors
 */
export function validateValue(value, rules, context = {}) {
  const errors = [];

  for (const rule of rules) {
    const ruleObj = typeof rule === 'function' ? rule() : rule;

    if (!ruleObj) {continue;}

    const isValid = ruleObj.validate(value, context);

    if (!isValid) {
      errors.push(ruleObj.getMessage(context.fieldName || 'This field'));
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Field State Manager
 * Tracks validation state for individual form fields
 */
export class FieldStateManager {
  constructor() {
    this.fields = new Map();
  }

  register(fieldId, config) {
    this.fields.set(fieldId, {
      ...config,
      state: FIELD_STATE.PRISTINE,
      errors: [],
      isValid: null,
      isValidating: false
    });
  }

  unregister(fieldId) {
    this.fields.delete(fieldId);
  }

  getField(fieldId) {
    return this.fields.get(fieldId);
  }

  setState(fieldId, state) {
    const field = this.fields.get(fieldId);
    if (field) {
      field.state = state;
    }
  }

  setErrors(fieldId, errors) {
    const field = this.fields.get(fieldId);
    if (field) {
      field.errors = errors;
      field.isValid = errors.length === 0;
      if (field.state === FIELD_STATE.PRISTINE) {
        field.state = FIELD_STATE.DIRTY;
      }
    }
  }

  markTouched(fieldId) {
    const field = this.fields.get(fieldId);
    if (field && field.state !== FIELD_STATE.TOUCHED) {
      field.state = FIELD_STATE.TOUCHED;
    }
  }

  markDirty(fieldId) {
    const field = this.fields.get(fieldId);
    if (field && field.state === FIELD_STATE.PRISTINE) {
      field.state = FIELD_STATE.DIRTY;
    }
  }

  isValid(fieldId) {
    const field = this.fields.get(fieldId);
    return field?.isValid ?? null;
  }

  shouldShowErrors(fieldId) {
    const field = this.fields.get(fieldId);
    if (!field) {return false;}
    // Don't show errors for pristine fields
    return field.state !== FIELD_STATE.PRISTINE;
  }

  getAllErrors() {
    const allErrors = {};
    for (const [fieldId, field] of this.fields) {
      if (field.errors.length > 0 && this.shouldShowErrors(fieldId)) {
        allErrors[fieldId] = field.errors;
      }
    }
    return allErrors;
  }

  hasErrors() {
    for (const [fieldId, field] of this.fields) {
      if (field.errors.length > 0 && this.shouldShowErrors(fieldId)) {
        return true;
      }
    }
    return false;
  }

  isFormValid() {
    for (const [, field] of this.fields) {
      if (field.isValid === false || field.isValid === null) {
        return false;
      }
    }
    return true;
  }

  reset(fieldId) {
    const field = this.fields.get(fieldId);
    if (field) {
      field.state = FIELD_STATE.PRISTINE;
      field.errors = [];
      field.isValid = null;
    }
  }

  resetAll() {
    for (const [fieldId] of this.fields) {
      this.reset(fieldId);
    }
  }
}

/**
 * Character Counter Utility
 * Provides live feedback on character limits
 */
export function createCharacterCounter(maxLength, options = {}) {
  const warnAt = options.warnAt || Math.floor(maxLength * 0.8);
  const showAt = options.showAt || Math.floor(maxLength * 0.5);

  return {
    getStats: (currentLength) => {
      const remaining = maxLength - currentLength;
      const percentage = (currentLength / maxLength) * 100;

      let status = 'normal';
      if (percentage >= 100) {status = 'exceeded';} else if (percentage >= warnAt / maxLength * 100) {status = 'warning';} else if (percentage >= showAt / maxLength * 100) {status = 'visible';}

      return {
        current: currentLength,
        max: maxLength,
        remaining,
        percentage,
        status,
        shouldShow: currentLength >= showAt || status === 'warning' || status === 'exceeded'
      };
    }
  };
}

/**
 * Input Mask Utilities
 * Provides formatting and constraint hints for inputs
 */
export const InputMasks = {
  // Only allows digits
  numeric: {
    format: (value) => value.replace(/[^\d]/g, ''),
    hint: 'Only numbers allowed'
  },

  // Formats currency (simple)
  currency: {
    format: (value) => {
      const num = parseFloat(value.replace(/[^\d.]/g, ''));
      return isNaN(num) ? '' : num.toFixed(2);
    },
    hint: 'Enter an amount (e.g., 10.99)'
  },

  // Phone number formatting
  phone: {
    format: (value) => {
      const digits = value.replace(/\D/g, '').slice(0, 10);
      if (digits.length <= 3) {return digits;}
      if (digits.length <= 6) {return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;}
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    },
    hint: 'Format: (555) 123-4567'
  },

  // Prevents leading/trailing spaces
  trimmed: {
    format: (value) => value.trim(),
    hint: null
  }
};

/**
 * Create constraint hints to show before validation errors
 * @param {Object} constraints - Constraint configuration
 * @returns {string|null} Hint text or null
 */
export function createConstraintHint(constraints) {
  const hints = [];

  if (constraints.minLength && constraints.maxLength) {
    hints.push(`${constraints.minLength}-${constraints.maxLength} characters`);
  } else if (constraints.minLength) {
    hints.push(`At least ${constraints.minLength} characters`);
  } else if (constraints.maxLength) {
    hints.push(`Up to ${constraints.maxLength} characters`);
  }

  if (constraints.format) {
    hints.push(constraints.format);
  }

  if (constraints.pattern) {
    hints.push(constraints.pattern);
  }

  return hints.length > 0 ? hints.join(' · ') : null;
}

/**
 * Debounced validation wrapper
 * @param {Function} validator - Validation function
 * @param {number} wait - Debounce time in ms
 * @returns {Function} Debounced validator
 */
export function createDebouncedValidator(validator, wait = 300) {
  return debounce(validator, wait);
}
