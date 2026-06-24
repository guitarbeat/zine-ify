# FormValidator

> Inline form validation component with immediate user feedback

### Purpose

**What it does:**  
Manages real-time validation for form fields with configurable timing strategies, visual feedback (error/success states), and accessible error messages. Tracks field state (pristine, dirty, touched) to provide contextual feedback.

**When to use it:**  
- Validating form inputs before submission
- Providing immediate feedback on invalid data
- Preventing form abandonment with helpful error messages
- Implementing constraint hints and character counters

**When NOT to use it:**  
- Simple forms where native validation is sufficient
- Server-side validation (use in conjunction, not replacement)
- Non-form interactive elements

### Props / Parameters

#### FormValidator Constructor

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `formElement` | `HTMLElement \| string` | Yes | - | Form element or CSS selector |
| `options.validateOnSubmit` | `boolean` | No | `true` | Validate all fields on submit |
| `options.showSuccessState` | `boolean` | No | `true` | Show checkmark on valid fields |
| `options.toastOnSuccess` | `boolean` | No | `true` | Show success toast on valid submission |
| `options.scrollToError` | `boolean` | No | `true` | Scroll first error into view |
| `options.focusFirstError` | `boolean` | No | `true` | Focus first error field |

#### register() Configuration

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `fieldSelector` | `string` | Yes | - | CSS selector for the field |
| `config.fieldName` | `string` | No | Label text | Display name for error messages |
| `config.rules` | `Array` | No | `[]` | Array of validation rules |
| `config.timing` | `string` | No | `'blur'` | When to validate: `'immediate'`, `'blur'`, `'submit'`, `'debounced'` |
| `config.debounceMs` | `number` | No | `300` | Debounce time for `'debounced'` timing |
| `config.showSuccess` | `boolean` | No | `true` | Show success indicator |
| `config.constraints` | `object` | No | `null` | Constraint hints (min, max, format) |
| `config.onValidationChange` | `function` | No | `null` | Callback(result, field) |

### Public Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `register(selector, config)` | `string`, `object` | `this` | Register a field for validation |
| `validate()` | None | `{ isValid, errors }` | Validate all registered fields |
| `validateField(fieldId)` | `string` | `{ isValid, errors }` | Validate single field programmatically |
| `reset()` | None | `void` | Reset all fields to pristine state |
| `addRule(fieldId, rule)` | `string`, `object` | `void` | Add validation rule dynamically |
| `getState()` | None | `object` | Get current validation state |

### Validation Rules

Built-in rules available from `VALIDATION_RULES`:

| Rule | Validates | Example |
|------|-----------|---------|
| `required` | Value is not empty | `VALIDATION_RULES.required` |
| `email` | Valid email format | `VALIDATION_RULES.email` |
| `integer` | Whole number | `VALIDATION_RULES.integer` |
| `minLength(n)` | Minimum string length | `VALIDATION_RULES.minLength(8)` |
| `maxLength(n)` | Maximum string length | `VALIDATION_RULES.maxLength(100)` |
| `min(n)` | Minimum numeric value | `VALIDATION_RULES.min(1)` |
| `max(n)` | Maximum numeric value | `VALIDATION_RULES.max(10)` |
| `pattern(regex, msg)` | Custom regex match | `VALIDATION_RULES.pattern(/^\d+$/, 'Numbers only')` |
| `match(field, getter)` | Match another field | `VALIDATION_RULES.match('password', () => pwd.value)` |
| `custom(fn, msg)` | Custom validator | `VALIDATION_RULES.custom(v => v >0, 'Must be positive')` |

### Usage Examples

#### Basic Setup

```javascript
import { FormValidator, VALIDATION_RULES } from '../components/FormValidator.js';

const validator = new FormValidator('#my-form');

validator.register('#email', {
  fieldName: 'Email',
  rules: [VALIDATION_RULES.required, VALIDATION_RULES.email],
  timing: 'blur'
});

validator.register('#password', {
  fieldName: 'Password',
  rules: [
    VALIDATION_RULES.required,
    VALIDATION_RULES.minLength(8)
  ],
  timing: 'debounced',
  constraints: { minLength: 8,format: 'uppercase, lowercase, number' }
});
```

#### Numeric Field with Constraints

```javascript
import { VALIDATION_RULES } from '../utils/formValidation.js';

validator.register('#quantity', {
  fieldName: 'Quantity',
  rules: [
    VALIDATION_RULES.required,
    VALIDATION_RULES.integer,
    VALIDATION_RULES.min(1),
    VALIDATION_RULES.max(100)
  ],
  timing: 'blur',
  constraints: { min: 1, max: 100 },
  onValidationChange: (result, field) => {
    if (!result.isValid) {
      // Auto-fix invalid values
      const value = parseInt(field.value, 10);
      if (isNaN(value) || value < 1) field.value = 1;
      else if (value > 100) field.value = 100;
    }
  }
});
```

#### Password Confirmation

```javascript
const passwordField = document.querySelector('#password');
const confirmField = document.querySelector('#confirm-password');

validator.register('#confirm-password', {
  fieldName: 'Confirm Password',
  rules: [
    VALIDATION_RULES.required,
    VALIDATION_RULES.match('Password', () => passwordField.value)
  ],
  timing: 'debounced',
  constraints: { format: 'must match password' }
});
```

#### Custom Validation

```javascript
validator.register('#username', {
  fieldName: 'Username',
  rules: [
    VALIDATION_RULES.required,
    VALIDATION_RULES.minLength(3),
    VALIDATION_RULES.maxLength(20),
    VALIDATION_RULES.pattern(
      /^[a-zA-Z0-9_]+$/,
      'Only letters, numbers, and underscores'
    ),
    VALIDATION_RULES.custom(async (value) => {
      // Async validation example
      const response = await fetch(`/api/check-username?u=${value}`);
      const { available } = await response.json();
      return available;
    }, 'Username is already taken')
  ],
  timing: 'debounced',
  debounceMs:500
});
```

#### Auto-Discovery with data-validate

```html
<!-- HTML: Fields with data-validate are auto-discovered -->
<form id="settings-form">
  <input type="email" id="email" data-validate="required,email" />
  <input type="number" id="count" data-validate="required,integer" min="1" max="10" />
</form>
```

```javascript
// JavaScript: Just create validator - fields are auto-registered
const validator = new FormValidator('#settings-form');
```

### Accessibility

#### ARIA Attributes
- `aria-invalid="true/false"`: Set on field based on validation state
- `aria-describedby`: Links field to error message
- `role="alert"`: Error messages announce immediately
- `aria-live="polite"`: Character counters announce changes politely

#### Keyboard Navigation
| Key | Action |
|-----|--------|
| `Tab` | Navigate between fields |
| `Enter` | Submit form (if valid) or trigger validation |
| `Escape` | Clear focused field's error state |

#### Screen Reader Considerations
- Error messages use `role="alert"` for immediate announcement
- Character counters use `aria-live="polite"` for non-intrusive updates
- Success indicators are hidden from screen readers (`aria-hidden="true"`)
- Field labels should describe the field; error messages describe the problem

#### Focus Management
- Focus stays on field after validation
- On submit with errors, focus moves to first invalid field
- `scrollIntoView` brings first error into viewport

### Styling

#### CSS Classes

| Class | Purpose |
|-------|---------|
| `.is-invalid` | Applied to field with validation error |
| `.is-valid` | Applied to valid field (after interaction) |
| `.form-error` | Error message container |
| `.form-success-icon` | Animated checkmark indicator |
| `.form-char-counter` | Character count display |
| `.form-constraint-hint` | Pre-emptive constraint hints |
| `.form-validation-summary` | Aggregate error display |

#### CSS Custom Properties

| Variable | Default | Description |
|----------|---------|-------------|
| Uses theme palette | - | Inherits from theme.css |

#### Dark Mode
- All validation states adapt to dark theme
- Error colors shift to lighter reds for visibility
- Success colors shift to lighter greens

### Edge Cases

#### Empty State
Fields start in pristine state - no validation shown until interaction.

#### Loading State
N/A - Validation is synchronous by default. For async validators, consider showing a loading indicator separately.

#### Error State
- Multiple errors per field: Only first error is displayed
- Cross-field validation: Re-validates when dependencies change

#### Maximum Limits
- No limit on registered fields
- Character counter shows exceeded state in red

#### Minimum Limits
- Empty required fields show "is required" message
- Zeros and false are valid values (not empty)

### Dependencies

- **Required:**
  - `VALIDATION_RULES`, `VALIDATION_TIMING`, `validateValue`, `FieldStateManager` from `../utils/formValidation.js`
  - `debounce` from `../utils/helpers.js`
  - `toast` from `./Toast.js`
- **Optional:** None

### Performance Considerations

- Debounced validation prevents excessive validation calls
- Field state manager uses Map for O(1) lookups
- Event listeners attached once per field
- No DOM polling or intervals

### Related Components

- [`Toast`](./Toast.md) - Used for form submission feedback
- [`formValidation.js`](./formValidation.md) - Core validation utilities
- `FieldValidator` - Standalone single-field validator

### Changelog

| Version | Changes |
|---------|---------|
| `1.0.0` | Initial implementation with full validation system |

---

## Quick Reference

```javascript
import { FormValidator, VALIDATION_RULES } from '../components/FormValidator.js';

// Create validator
const validator = new FormValidator('#my-form');

// Register fields
validator.register('#email', {
  rules: [VALIDATION_RULES.required, VALIDATION_RULES.email]
});

validator.register('#amount', {
  rules: [VALIDATION_RULES.required, VALIDATION_RULES.min(1), VALIDATION_RULES.max(100)],
  constraints: { min: 1, max: 100 }
});

// Validate all
const { isValid, errors } = validator.validate();

// Reset
validator.reset();
```
