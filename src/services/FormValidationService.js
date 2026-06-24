
/* eslint-disable */
/**
 * Validation integration for Zine-ify form controls
 * Demonstrates user-friendly validation for existing settings
 */

import { FormValidator } from '../components/FormValidator.js';
import { VALIDATION_TIMING, VALIDATION_RULES } from '../utils/formValidation.js';
import { GRID_DIMENSION_MAX, GRID_DIMENSION_MIN, MARGIN_MAX, MARGIN_MIN } from './../utils/config.js';
import { toast } from '../components/Toast.js';

/**
 * Initialize validation for the settings panel
 * @param {HTMLElement} container - The settings container element
 * @returns {FormValidator} The configured validator instance
 */
export function initSettingsValidation(container = document) {
  const form = container.querySelector('#settings-group') || container.querySelector('.rail-settings-panel');
  if (!form) {
        return null;
  }

  const validator = new FormValidator(form, {
    validateOnSubmit: false, // Settings are auto-applied, no submit button
    showSuccessState: true,
    toastOnSuccess: false,
    focusFirstError: false
  });

  // Grid rows validation
  const gridRowsInput = container.querySelector('#grid-rows');
  if (gridRowsInput) {
    validator.register('#grid-rows', {
      fieldName: 'Rows',
      rules: [
        VALIDATION_RULES.required,
        VALIDATION_RULES.integer,
        VALIDATION_RULES.min(GRID_DIMENSION_MIN),
        VALIDATION_RULES.max(GRID_DIMENSION_MAX)
      ],
      timing: VALIDATION_TIMING.BLUR,
      constraints: {
        min: GRID_DIMENSION_MIN,
        max: GRID_DIMENSION_MAX,
        format: 'whole numbers only'
      },
      onValidationChange: (result, field) => {
        // Clamp invalid values
        if (!result.isValid) {
          const value = parseInt(field.value, 10);
          if (isNaN(value) || value < GRID_DIMENSION_MIN) {
            field.value = GRID_DIMENSION_MIN;
          } else if (value > GRID_DIMENSION_MAX) {
            field.value = GRID_DIMENSION_MAX;
          }
          // Update the grid total display
          updateGridTotal();
        }
      }
    });
  }

  // Grid columns validation
  const gridColsInput = container.querySelector('#grid-cols');
  if (gridColsInput) {
    validator.register('#grid-cols', {
      fieldName: 'Columns',
      rules: [
        VALIDATION_RULES.required,
        VALIDATION_RULES.integer,
        VALIDATION_RULES.min(GRID_DIMENSION_MIN),
        VALIDATION_RULES.max(GRID_DIMENSION_MAX)
      ],
      timing: VALIDATION_TIMING.BLUR,
      constraints: {
        min: GRID_DIMENSION_MIN,
        max: GRID_DIMENSION_MAX,
        format: 'whole numbers only'
      },
      onValidationChange: (result, field) => {
        if (!result.isValid) {
          const value = parseInt(field.value, 10);
          if (isNaN(value) || value < GRID_DIMENSION_MIN) {
            field.value = GRID_DIMENSION_MIN;
          } else if (value > GRID_DIMENSION_MAX) {
            field.value = GRID_DIMENSION_MAX;
          }
          updateGridTotal();
        }
      }
    });
  }

  // Margin validation
  const marginInput = container.querySelector('#margin-input');
  if (marginInput) {
    validator.register('#margin-input', {
      fieldName: 'Margin',
      rules: [
        VALIDATION_RULES.required,
        VALIDATION_RULES.integer,
        VALIDATION_RULES.min(MARGIN_MIN),
        VALIDATION_RULES.max(MARGIN_MAX)
      ],
      timing: VALIDATION_TIMING.BLUR,
      constraints: {
        min: MARGIN_MIN,
        max: MARGIN_MAX,
        format: 'mm'
      },
      onValidationChange: (result, field) => {
        if (!result.isValid) {
          const value = parseInt(field.value, 10);
          if (isNaN(value) || value < MARGIN_MIN) {
            field.value = MARGIN_MIN;
          } else if (value > MARGIN_MAX) {
            field.value = MARGIN_MAX;
          }
        }
      }
    });
  }

  // Paper size select - always valid since it's a dropdown
  const paperSizeSelect = container.querySelector('#paper-size-select');
  if (paperSizeSelect) {
    validator.register('#paper-size-select', {
      fieldName: 'Paper Size',
      rules: [VALIDATION_RULES.required],
      timing: VALIDATION_TIMING.BLUR
    });
  }

  return validator;
}

/**
 * Create an email validation example (for reference)
 * Demonstrates classic form validation patterns
 */
export function createEmailValidationExample() {
  // Example validator for an email input
  return {
    rules: [
      VALIDATION_RULES.required,
      VALIDATION_RULES.email
    ],
    timing: VALIDATION_TIMING.DEBOUNCED,
    constraints: {
      format: 'example@domain.com'
    }
  };
}

/**
 * Create a password validation example
 * Demonstrates multi-rule validation with helpful constraints
 */
export function createPasswordValidationExample() {
  return {
    rules: [
      VALIDATION_RULES.required,
      VALIDATION_RULES.minLength(8),
      VALIDATION_RULES.maxLength(64),
      VALIDATION_RULES.pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Must include uppercase, lowercase, and a number'
      )
    ],
    timing: VALIDATION_TIMING.DEBOUNCED,
    constraints: {
      minLength: 8,
      maxLength: 64,
      format: 'uppercase, lowercase, and number'
    }
  };
}

/**
 * Update grid total display helper
 */
function updateGridTotal() {
  const rowsInput = document.querySelector('#grid-rows');
  const colsInput = document.querySelector('#grid-cols');
  const totalEl = document.querySelector('#grid-total');

  if (rowsInput && colsInput && totalEl) {
    const rows = parseInt(rowsInput.value, 10) || 1;
    const cols = parseInt(colsInput.value, 10) || 1;
    const total = rows * cols;
    totalEl.textContent = `${total} slots`;
  }
}

/**
 * Form validation demo component
 * Shows a complete working example with all features
 */
export function createValidationDemo(container) {
  const html = `
    <div class="validation-demo base-panel space-y-4">
      <h3 class="text-sm font-semibold">Form Validation Demo</h3>

      <div class="workspace-config-field workspace-config-field-wide">
        <label class="workspace-config-label" for="demo-email">Email</label>
        <input type="email" id="demo-email" class="workspace-config-input"
          placeholder="your@email.com" data-validate="required,email" />
      </div>

      <div class="workspace-config-field workspace-config-field-wide">
        <label class="workspace-config-label" for="demo-password">Password</label>
        <input type="password" id="demo-password" class="workspace-config-input"
          placeholder="Create a password" minlength="8" maxlength="64" data-validate="required" />
      </div>

      <div class="workspace-config-field workspace-config-field-wide">
        <label class="workspace-config-label" for="demo-comment">Comment</label>
        <textarea id="demo-comment" class="workspace-config-input" rows="3"
          placeholder="Optional feedback" maxlength="500"></textarea>
      </div>

      <button type="button" id="demo-submit" class="action-button w-full py-2 px-4 bg-zinc-900 text-white font-semibold">
        Submit Demo Form
      </button>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', html);

  // Initialize validator
  const demoValidator = new FormValidator(container.querySelector('.validation-demo'), {
    showSuccessState: true,
    toastOnSuccess: true
  });

  // Custom password field registration
  demoValidator.register('#demo-password', {
    fieldName: 'Password',
    rules: [
      VALIDATION_RULES.required,
      VALIDATION_RULES.minLength(8),
      VALIDATION_RULES.maxLength(64),
      VALIDATION_RULES.pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Must include uppercase, lowercase, and a number'
      )
    ],
    timing: VALIDATION_TIMING.DEBOUNCED,
    constraints: {
      minLength: 8,
      maxLength: 64,
      format: 'uppercase, lowercase, and number'
    }
  });

  // Custom comment field with character counter
  demoValidator.register('#demo-comment', {
    fieldName: 'Comment',
    rules: [VALIDATION_RULES.maxLength(500)],
    timing: VALIDATION_TIMING.DEBOUNCED,
    constraints: { maxLength: 500 }
  });

  // Handle submit
  const submitBtn = container.querySelector('#demo-submit');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      const result = demoValidator.validate();
      if (result.isValid) {
        toast.success('Demo Submitted', 'All fields validated successfully!');
      }
    });
  }

  return demoValidator;
}

/**
 * Show validation error with custom action
 * Demonstrates error message with recovery guidance
 */
export function showValidationErrorWithAction(fieldId, message, action) {
  const field = document.querySelector(`#${fieldId}`);
  if (!field) {return;}

  // Mark invalid
  field.classList.add('is-invalid');
  field.setAttribute('aria-invalid', 'true');

  // Remove existing error
  const existingError = field.parentElement.querySelector('.form-error');
  if (existingError) {existingError.remove();}

  // Create error with action link
  const errorEl = document.createElement('div');
  errorEl.className = 'form-error';
  errorEl.setAttribute('role', 'alert');

  const textSpan = document.createElement('span');
  textSpan.textContent = message;
  errorEl.appendChild(textSpan);

  if (action) {
    const actionBtn = document.createElement('button');
    actionBtn.type = 'button';
    actionBtn.className = 'ml-2 text-underline font-semibold hover:opacity-80';
    actionBtn.textContent = action.label;
    actionBtn.onclick = action.handler;
    errorEl.appendChild(actionBtn);
  }

  field.insertAdjacentElement('afterend', errorEl);
}

/**
 * Form validation hooks for cross-field validation
 * Example: password confirmation
 */
export function setupPasswordConfirmation(passwordId, confirmId) {
  const passwordField = document.querySelector(`#${passwordId}`);
  const confirmField = document.querySelector(`#${confirmId}`);

  if (!passwordField || !confirmField) {return;}

  const getFieldValue = (selector) => {
    const field = document.querySelector(selector);
    return field ? field.value : '';
  };

  return {
    rules: [
      VALIDATION_RULES.required,
      VALIDATION_RULES.match('Password', () => getFieldValue(`#${passwordId}`))
    ],
    timing: VALIDATION_TIMING.DEBOUNCED,
    constraints: {
      format: 'must match password'
    }
  };
}
