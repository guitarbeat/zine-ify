/* eslint-disable */
/**
 * FormValidator.js
 * Inline form validation with immediate visual feedback
 */

import { toast } from './Toast.js';
import {
  FieldStateManager,
  VALIDATION_TIMING,
  FIELD_STATE,
  validateValue,
  createCharacterCounter,
  createConstraintHint
} from '../utils/formValidation.js';
import { debounce, sanitizeHTML } from '../utils/helpers.js';

/**
 * FormValidator - Manages inline validation for forms
 * Provides immediate feedback, error prevention, and helpful messages
 */
export class FormValidator {
  constructor(formElement, options = {}) {
    this.form = typeof formElement === 'string'
      ? document.querySelector(formElement)
      : formElement;

    if (!this.form) {
      console.error('FormValidator: Form element not found');
      return;
    }

    this.options = {
      validateOnSubmit: true,
      showSuccessState: true,
      toastOnSuccess: true,
      scrollToError: true,
      focusFirstError: true,
      ...options
    };

    this.stateManager = new FieldStateManager();
    this.fieldConfigs = new Map();
    this.debounceTimers = new Map();
    this.validators = new Map();

    this._init();
  }

  _init() {
    // Set up form submit handler
    this.form.setAttribute('novalidate', '');
    this.form.addEventListener('submit', this._handleSubmit.bind(this));

    // Discover and set up fields with validation
    this._discoverFields();
  }

  /**
   * Register a field for validation
   * @param {string} fieldSelector - CSS selector for the field
   * @param {Object} config - Validation configuration
   */
  register(fieldSelector, config) {
    const field = this.form.querySelector(fieldSelector);
    if (!field) {
      console.warn(`FormValidator: Field "${fieldSelector}" not found`);
      return this;
    }

    const fieldId = field.id || field.name || fieldSelector;

    // Create field configuration
    const fieldConfig = {
      field,
      fieldId,
      fieldName: config.fieldName || field.labels?.[0]?.textContent || 'Field',
      rules: config.rules || [],
      timing: config.timing || VALIDATION_TIMING.BLUR,
      debounceMs: config.debounceMs || 300,
      showSuccess: config.showSuccess ?? this.options.showSuccessState,
      helpText: config.helpText || null,
      constraints: config.constraints || null,
      onValidationChange: config.onValidationChange || null
    };

    this.fieldConfigs.set(fieldId, fieldConfig);
    this.stateManager.register(fieldId, fieldConfig);

    // Set up event listeners
    this._setupFieldListeners(field, fieldConfig);

    // Add constraint hint if provided
    if (fieldConfig.constraints) {
      this._addConstraintHint(field, fieldConfig.constraints);
    }

    // Initialize character counter if applicable
    if (fieldConfig.constraints?.maxLength) {
      this._setupCharacterCounter(field, fieldConfig);
    }

    return this;
  }

  /**
   * Set up event listeners for a field
   */
  _setupFieldListeners(field, config) {
    const { fieldId, timing, debounceMs } = config;

    // Validate on blur (most common strategy)
    if (timing === VALIDATION_TIMING.BLUR || timing === VALIDATION_TIMING.DEBOUNCED) {
      field.addEventListener('blur', () => {
        this.stateManager.markTouched(fieldId);
        if (timing === VALIDATION_TIMING.BLUR) {
          this._validateField(fieldId);
        }
      });
    }

    // Validate on input (immediate or debounced)
    if (timing === VALIDATION_TIMING.IMMEDIATE || timing === VALIDATION_TIMING.DEBOUNCED) {
      const validateFn = timing === VALIDATION_TIMING.DEBOUNCED
        ? debounce(() => {
            this.stateManager.markDirty(fieldId);
            if (this.stateManager.shouldShowErrors(fieldId)) {
              this._validateField(fieldId);
            }
          }, debounceMs)
        : () => {
            this.stateManager.markDirty(fieldId);
            if (this.stateManager.shouldShowErrors(fieldId)) {
              this._validateField(fieldId);
            }
          };

      field.addEventListener('input', validateFn);
    }

    // Clear errors on focus
    field.addEventListener('focus', () => {
      this._clearFieldError(fieldId);
    });
  }

  /**
   * Validate a single field
   */
  _validateField(fieldId) {
    const config = this.fieldConfigs.get(fieldId);
    if (!config) {return { isValid: true, errors: [] };}

    const { field, fieldName, rules } = config;
    const value = this._getFieldValue(field);

    // Get form context for cross-field validation
    const formData = this._getFormData();

    // Run validation
    const result = validateValue(value, rules, {
      fieldName,
      formData
    });

    // Update state
    this.stateManager.setErrors(fieldId, result.errors);

    // Update UI
    this._updateFieldUI(fieldId, result);

    // Notify callback
    if (config.onValidationChange) {
      config.onValidationChange(result, field);
    }

    return result;
  }

  /**
   * Get field value (handles different input types)
   */
  _getFieldValue(field) {
    if (field.type === 'checkbox') {return field.checked;}
    if (field.type === 'radio') {
      const radioGroup = this.form.querySelectorAll(`input[name="${field.name}"]`);
      for (const radio of radioGroup) {
        if (radio.checked) {return radio.value;}
      }
      return null;
    }
    if (field.type === 'select-multiple') {
      return Array.from(field.selectedOptions).map(opt => opt.value);
    }
    return field.value;
  }

  /**
   * Get all form data for cross-field validation
   */
  _getFormData() {
    const data = {};
    for (const [fieldId, config] of this.fieldConfigs) {
      data[fieldId] = this._getFieldValue(config.field);
    }
    return data;
  }

  /**
   * Update field UI with validation result
   */
  _updateFieldUI(fieldId, result) {
    const config = this.fieldConfigs.get(fieldId);
    if (!config) {return;}

    const { field, showSuccess } = config;

    // Update ARIA attributes
    field.setAttribute('aria-invalid', (!result.isValid).toString());

    // Remove existing states
    field.classList.remove('is-valid', 'is-invalid');
    this._removeErrorElement(fieldId);

    if (!result.isValid) {
      // Show error state
      field.classList.add('is-invalid');
      this._showFieldError(fieldId, result.errors[0]);
    } else if (showSuccess && this.stateManager.shouldShowErrors(fieldId)) {
      // Only show success if field has been interacted with
      field.classList.add('is-valid');
      this._showSuccessIndicator(fieldId);
    }
  }

  /**
   * Show error message for a field
   */
  _showFieldError(fieldId, error) {
    const config = this.fieldConfigs.get(fieldId);
    if (!config) {return;}

    const { field } = config;

    // Find or create error container
    let errorElement = this._getErrorElement(fieldId);
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.className = 'form-error';
      errorElement.setAttribute('role', 'alert');
      errorElement.setAttribute('aria-live', 'polite');

      // Insert after field or after field's parent for grid items
      const insertPoint = field.closest('.workspace-config-field')?.querySelector('.stepper')
        ? field.closest('.workspace-config-field')
        : field;
      insertPoint.insertAdjacentElement('afterend', errorElement);
    }

    // Set error content safely
    errorElement.textContent = error;
    errorElement.dataset.fieldId = fieldId;
  }

  /**
   * Get existing error element for a field
   */
  _getErrorElement(fieldId) {
    return this.form.querySelector(`.form-error[data-field-id="${fieldId}"]`);
  }

  /**
   * Remove error element
   */
  _removeErrorElement(fieldId) {
    const errorElement = this._getErrorElement(fieldId);
    if (errorElement) {
      errorElement.remove();
    }
  }

  /**
   * Clear error state for a field
   */
  _clearFieldError(fieldId) {
    const config = this.fieldConfigs.get(fieldId);
    if (!config) {return;}

    config.field.classList.remove('is-invalid');
    this._removeErrorElement(fieldId);
    this._removeSuccessIndicator(fieldId);
  }

  /**
   * Show success indicator for a field
   */
  _showSuccessIndicator(fieldId) {
    const config = this.fieldConfigs.get(fieldId);
    if (!config) {return;}

    const { field } = config;

    // Don't add if already exists
    if (field.parentElement.querySelector('.form-success-icon')) {return;}

    const successIcon = document.createElement('span');
    successIcon.className = 'form-success-icon';
    successIcon.setAttribute('aria-hidden', 'true');
    successIcon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
      <polyline points="20,6 9,17 4,12"/>
    </svg>`;

    // Position it appropriately
    const container = field.closest('.workspace-config-field') || field.parentElement;
    container.style.position = 'relative';
    container.appendChild(successIcon);
    successIcon.dataset.fieldId = fieldId;
  }

  /**
   * Remove success indicator
   */
  _removeSuccessIndicator(fieldId) {
    const indicator = this.form.querySelector(`.form-success-icon[data-field-id="${fieldId}"]`);
    if (indicator) {indicator.remove();}
  }

  /**
   * Add constraint hint below a field
   */
  _addConstraintHint(field, constraints) {
    const hint = createConstraintHint(constraints);
    if (!hint) {return;}

    const hintElement = document.createElement('span');
    hintElement.className = 'form-constraint-hint';
    hintElement.textContent = hint;

    const container = field.closest('.workspace-config-field') || field.parentElement;
    container.appendChild(hintElement);
  }

  /**
   * Set up character counter for a field
   */
  _setupCharacterCounter(field, config) {
    const maxLength = config.constraints.maxLength;
    const counter = createCharacterCounter(maxLength);

    const counterElement = document.createElement('span');
    counterElement.className = 'form-char-counter';
    counterElement.setAttribute('aria-live', 'polite');

    const updateCounter = () => {
      const stats = counter.getStats(field.value.length);
      counterElement.textContent = `${field.value.length}/${maxLength}`;
      counterElement.dataset.status = stats.status;
      counterElement.hidden = !stats.shouldShow;
    };

    field.addEventListener('input', updateCounter);
    updateCounter();

    const container = field.closest('.workspace-config-field') || field.parentElement;
    container.appendChild(counterElement);
  }

  /**
   * Discover existing fields with validation attributes
   */
  _discoverFields() {
    const fields = this.form.querySelectorAll('[data-validate]');
    fields.forEach(field => {
      const rules = [];

      // Parse validation rules from data attribute
      const rulesConfig = field.dataset.validate;
      if (rulesConfig) {
        rulesConfig.split(',').map(r => r.trim()).forEach(rule => {
          // Handle parameterized rules like minLength:8
          const [ruleName, param] = rule.split(':');
          if (param) {
            const numParam = parseFloat(param);
            const ruleFactory = {
              minLength: () => ({ minLength: parseInt(param) }),
              maxLength: () => ({ maxLength: parseInt(param) }),
              min: () => ({ min: numParam }),
              max: () => ({ max: numParam })
            }[ruleName];
            if (ruleFactory) {
              Object.assign(rules, ruleFactory());
            }
          } else {
            rules.push(rule);
          }
        });
      }

      // Auto-detect common validation attributes
      if (field.required) {rules.push('required');}
      if (field.type === 'email') {rules.push('email');}
      if (field.type === 'number' || field.dataset.type === 'number') {rules.push('integer');}

      // Auto-detect constraints from attributes
      const constraints = {};
      if (field.minLength) {constraints.minLength = field.minLength;}
      if (field.maxLength) {constraints.maxLength = field.maxLength;}
      if (field.min !== null) {constraints.min = parseFloat(field.min);}
      if (field.max !== null) {constraints.max = parseFloat(field.max);}

      this.register(`#${field.id || field.name}`, {
        rules,
        constraints: Object.keys(constraints).length > 0 ? constraints : null
      });
    });
  }

  /**
   * Handle form submission
   */
  async _handleSubmit(event) {
    // Validate all fields
    let hasErrors = false;
    let firstErrorField = null;

    for (const [fieldId] of this.fieldConfigs) {
      this.stateManager.setState(fieldId, FIELD_STATE.TOUCHED);
      const result = this._validateField(fieldId);
      if (!result.isValid && !firstErrorField) {
        firstErrorField = this.fieldConfigs.get(fieldId)?.field;
        hasErrors = true;
      }
    }

    if (hasErrors) {
      event.preventDefault();
      event.stopImmediatePropagation();

      if (firstErrorField && this.options.focusFirstError) {
        firstErrorField.focus();
      }

      if (this.options.scrollToError && firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      toast.error('Validation Failed', 'Please correct the highlighted fields');

      return false;
    }

    if (this.options.toastOnSuccess) {
      toast.success('Success', 'Form submitted successfully!');
    }

    return true;
  }

  /**
   * Validate all fields and return result
   */
  validate() {
    let isValid = true;
    const allErrors = {};

    for (const [fieldId] of this.fieldConfigs) {
      this.stateManager.setState(fieldId, FIELD_STATE.TOUCHED);
      const result = this._validateField(fieldId);
      if (!result.isValid) {
        isValid = false;
        allErrors[fieldId] = result.errors;
      }
    }

    return { isValid, errors: allErrors };
  }

  /**
   * Reset all field states
   */
  reset() {
    for (const [fieldId, config] of this.fieldConfigs) {
      this.stateManager.reset(fieldId);
      config.field.classList.remove('is-valid', 'is-invalid');
      this._removeErrorElement(fieldId);
      this._removeSuccessIndicator(fieldId);
    }
  }

  /**
   * Validate a specific field programmatically
   */
  validateField(fieldId) {
    this.stateManager.setState(fieldId, FIELD_STATE.TOUCHED);
    return this._validateField(fieldId);
  }

  /**
   * Add a validation rule dynamically
   */
  addRule(fieldId, rule) {
    const config = this.fieldConfigs.get(fieldId);
    if (config) {
      config.rules.push(rule);
    }
  }

  /**
   * Get current validation state
   */
  getState() {
    return {
      isValid: this.stateManager.isFormValid(),
      hasErrors: this.stateManager.hasErrors(),
      fields: Object.fromEntries(this.stateManager.fields)
    };
  }
}

/**
 * Factory function to create a FormValidator
 */
export function createFormValidator(formSelector, options) {
  return new FormValidator(formSelector, options);
}

/**
 * Standalone field validator for single fields
 */
export class FieldValidator {
  constructor(field, options = {}) {
    this.field = typeof field === 'string'
      ? document.querySelector(field)
      : field;

    if (!this.field) {
      console.error('FieldValidator: Field element not found');
      return;
    }

    this.options = {
      rules: [],
      timing: VALIDATION_TIMING.BLUR,
      showSuccess: true,
      ...options
    };

    this.stateManager = new FieldStateManager();
    this.fieldId = this.field.id || this.field.name || 'field';
    this.stateManager.register(this.fieldId, { rules: this.options.rules });

    this._init();
  }

  _init() {
    // Set up event listeners
    const { timing } = this.options;

    if (timing === VALIDATION_TIMING.BLUR || timing === VALIDATION_TIMING.DEBOUNCED) {
      this.field.addEventListener('blur', () => {
        this.stateManager.markTouched(this.fieldId);
        this.validate();
      });
    }

    if (timing === VALIDATION_TIMING.IMMEDIATE || timing === VALIDATION_TIMING.DEBOUNCED) {
      const validateFn = timing === VALIDATION_TIMING.DEBOUNCED
        ? debounce(() => this.validate(), this.options.debounceMs || 300)
        : () => this.validate();

      this.field.addEventListener('input', () => {
        this.stateManager.markDirty(this.fieldId);
        if (this.stateManager.shouldShowErrors(this.fieldId)) {
          validateFn();
        }
      });
    }
  }

  validate() {
    const value = this.field.value;
    const result = validateValue(value, this.options.rules, {
      fieldName: this.options.fieldName || 'Field'
    });

    this.stateManager.setErrors(this.fieldId, result.errors);

    // Update UI
    this.field.classList.remove('is-valid', 'is-invalid');
    const existingError = this.field.parentElement.querySelector('.form-error');
    if (existingError) {existingError.remove();}

    if (!result.isValid) {
      this.field.classList.add('is-invalid');
      this.field.setAttribute('aria-invalid', 'true');

      const errorEl = document.createElement('div');
      errorEl.className = 'form-error';
      errorEl.setAttribute('role', 'alert');
      errorEl.textContent = result.errors[0];
      this.field.insertAdjacentElement('afterend', errorEl);
    } else if (this.options.showSuccess && this.stateManager.shouldShowErrors(this.fieldId)) {
      this.field.classList.add('is-valid');
      this.field.setAttribute('aria-invalid', 'false');
    }

    return result;
  }

  reset() {
    this.stateManager.reset(this.fieldId);
    this.field.classList.remove('is-valid', 'is-invalid');
    this.field.removeAttribute('aria-invalid');
    const error = this.field.parentElement.querySelector('.form-error');
    if (error) {error.remove();}
  }
}

export function createFieldValidator(selector, options) {
  return new FieldValidator(selector, options);
}
