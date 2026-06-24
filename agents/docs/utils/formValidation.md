# formValidation.js

> Core validation utilities and rule definitions

### Purpose

**What it does:**  
Provides validation primitives, state management, and helper utilities for building form validation systems. This is the foundation used by `FormValidator` and `FieldValidator` components.

**When to use it:**  
- Building custom validation components
- Creating standalone field validators
- Defining reusable validation rules
- Implementing character counters or input masks

**When NOT to use it:**  
- For simple forms where native HTML validation is sufficient
- When you need pre-built UI (use `FormValidator` instead)

---

## Exports

### Constants

#### VALIDATION_TIMING

```javascript
export const VALIDATION_TIMING = {
  IMMEDIATE: 'immediate', // Validate on every input
  BLUR: 'blur',           // Validate when field loses focus
  SUBMIT: 'submit',       // Validate only on form submit
  DEBOUNCED: 'debounced'  // Validate after typing pauses
};
```

#### FIELD_STATE

```javascript
export const FIELD_STATE = {
  PRISTINE: 'pristine',  // Not yet interacted with
  DIRTY: 'dirty',        // Value has changed
  TOUCHED: 'touched',    // User has focused and left
  VALID: 'valid',
  INVALID: 'invalid'
};
```

#### VALIDATION_RULES

Object containing validation rule factories:

```javascript
import { VALIDATION_RULES } from '../utils/formValidation.js';

// Static rules
VALIDATION_RULES.required
VALIDATION_RULES.email
VALIDATION_RULES.integer

// Factory rules (call with parameter)
VALIDATION_RULES.minLength(8)
VALIDATION_RULES.maxLength(100)
VALIDATION_RULES.min(0)
VALIDATION_RULES.max(100)
VALIDATION_RULES.pattern(/^[A-Z]+$/, 'Uppercase only')
VALIDATION_RULES.match('password', () => passwordInput.value)
VALIDATION_RULES.custom(value => value >0, 'Must be positive')
```

---

## Functions

### createFieldValidation(fieldName, rules, options)

Creates a field validation configuration object.

**Parameters:**
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `fieldName` | `string` | Yes | - | Display name for the field |
| `rules` | `Array` | No | `[]` | Array of validation rules |
| `options.timing` | `string` | No | `'debounced'` | Validation timing strategy |
| `options.debounceMs` | `number` | No | `300` | Debounce time in ms |
| `options.showSuccess` | `boolean` | No | `true` | Show success state |
| `options.constraints` | `object` | No | `null` | Constraint hints |

**Returns:** `object` - Field validation configuration

**Example:**

```javascript
import { createFieldValidation, VALIDATION_RULES } from '../utils/formValidation.js';

const emailValidation = createFieldValidation('Email', [
  VALIDATION_RULES.required,
  VALIDATION_RULES.email
], {
  timing: 'blur',
  constraints: { format: 'example@domain.com' }
});
```

---

### validateValue(value, rules, context)

Validates a value against an array of rules.

**Parameters:**
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `value` | `any` | Yes | - | Value to validate |
| `rules` | `Array` | Yes | - | Array of validation rules |
| `context` | `object` | No | `{}` | Additional context (formData, fieldName) |

**Returns:** `{ isValid: boolean, errors: string[] }`

**Example:**

```javascript
import { validateValue, VALIDATION_RULES } from '../utils/formValidation.js';

const result = validateValue('test@example.com', [
  VALIDATION_RULES.required,
  VALIDATION_RULES.email
]);

console.log(result);
// { isValid: true, errors: [] }
```

---

### createCharacterCounter(maxLength, options)

Creates a character counter for tracking input length.

**Parameters:**
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `maxLength` | `number` | Yes | - | Maximum allowed characters |
| `options.warnAt`| `number` | No | `80%` | Percentage to show warning |
| `options.showAt` | `number` | No | `50%` | Percentage to start showing |

**Returns:** `object` with `getStats(currentLength)` method

**Example:**

```javascript
import { createCharacterCounter } from '../utils/formValidation.js';

const counter = createCharacterCounter(500);

const stats = counter.getStats(420);
console.log(stats);
// {
//   current: 420,
//   max: 500,
//   remaining: 80,
//   percentage: 84,
//   status: 'warning',
//   shouldShow: true
// }
```

---

### createConstraintHint(constraints)

Generates a hint string from constraint configuration.

**Parameters:**
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `constraints` | `object` | Yes | - | Constraint configuration |

**Returns:** `string | null` - Formatted hint or null

**Example:**

```javascript
import { createConstraintHint } from '../utils/formValidation.js';

const hint = createConstraintHint({
  minLength: 8,
  maxLength: 64,
  format: 'uppercase, lowercase, number'
});
// "8-64 characters · uppercase, lowercase, number"
```

---

### createDebouncedValidator(validator, wait)

Wraps a validator function with debouncing.

**Parameters:**
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `validator` | `Function` | Yes | - | Validation function |
| `wait` | `number` | No | `300` | Debounce time in ms |

**Returns:** `Function` - Debounced validator

---

## Classes

### FieldStateManager

Manages validation state for multiple fields.

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `register(fieldId, config)` | `string`, `object` | `void` | Register a new field |
| `unregister(fieldId)` | `string` | `void` | Remove a field |
| `getField(fieldId)` | `string` | `object\|undefined` | Get field state |
| `setState(fieldId, state)` | `string`, `string` | `void` | Set field state |
| `setErrors(fieldId, errors)` | `string`, `string[]` | `void` | Set field errors |
| `markTouched(fieldId)` | `string` | `void` | Mark field as touched |
| `markDirty(fieldId)` | `string` | `void` | Mark field as dirty |
| `isValid(fieldId)` | `string` | `boolean\|null` | Check if field is valid |
| `shouldShowErrors(fieldId)` | `string` | `boolean` | Should errors be shown |
| `getAllErrors()` | None | `object` | Get all errors by field ID |
| `hasErrors()` | None | `boolean` | Check if any field has errors |
| `isFormValid()` | None | `boolean` | Check if all fields are valid |
| `reset(fieldId)` | `string` | `void` | Reset single field |
| `resetAll()` | None | `void` | Reset all fields |

**Example:**

```javascript
import { FieldStateManager, FIELD_STATE } from '../utils/formValidation.js';

const manager = new FieldStateManager();

// Register fields
manager.register('email', { rules: [] });
manager.register('password', { rules: [] });

// Update state
manager.markTouched('email');
manager.setErrors('email', ['Invalid email format']);

// Check state
console.log(manager.shouldShowErrors('email')); // true
console.log(manager.hasErrors()); // true
console.log(manager.isFormValid()); // false

// Reset
manager.resetAll();
```

---

## Input Masks

Pre-built input formatters for common patterns.

```javascript
import { InputMasks } from '../utils/formValidation.js';

// Numeric only
InputMasks.numeric.format('abc123')// '123'
InputMasks.numeric.hint // 'Only numbers allowed'

// Phone number
InputMasks.phone.format('5551234567') // '(555) 123-4567'
InputMasks.phone.hint// 'Format: (555) 123-4567'

// Currency
InputMasks.currency.format('123.4') // '123.40'
InputMasks.currency.hint // 'Enter an amount (e.g., 10.99)'

// Trimmed
InputMasks.trimmed.format('  hello ') // 'hello'
```

---

## Validation Rule Details

### required

```javascript
VALIDATION_RULES.required
```

Validates that a value is present:
- Strings: Must have non-whitespace characters
- Arrays: Must have at least one item
- Other: Must not be null/undefined

**Error message:** `"{fieldName} is required"`

---

### email

```javascript
VALIDATION_RULES.email
```

Validates basic email format using regex.

**Error message:** `"Please enter a valid email address (example@domain.com)"`

---

### integer

```javascript
VALIDATION_RULES.integer
```

Validates that value is a whole number.

**Error message:** `"Must be a whole number"`

---

### minLength(min)

```javascript
VALIDATION_RULES.minLength(8)
```

Validates minimum string length.

**Error message:** `"Must be at least {min} characters"`

---

### maxLength(max)

```javascript
VALIDATION_RULES.maxLength(100)
```

Validates maximum string length.

**Error message:** `"Must be no more than {max} characters"`

---

### min(minValue)

```javascript
VALIDATION_RULES.min(1)
```

Validates minimum numeric value.

**Error message:** `"Must be at least {minValue}"`

---

### max(maxValue)

```javascript
VALIDATION_RULES.max(100)
```

Validates maximum numeric value.

**Error message:** `"Must be no more than {maxValue}"`

---

### pattern(regex, message)

```javascript
VALIDATION_RULES.pattern(/^[A-Z]+$/, 'Uppercase letters only')
```

Validates value against a regex.

**Error message:** Custom message or `"Invalid format"`

---

### match(otherFieldName, getOtherValue)

```javascript
VALIDATION_RULES.match('Password', () => passwordInput.value)
```

Validates that value matches another field's value.

**Error message:** `"Must match {otherFieldName}"`

---

### custom(validator, message)

```javascript
VALIDATION_RULES.custom(value => value > 0, 'Must be positive')
```

Custom validation function. Return `true` for valid, `false` for invalid.

**Error message:** Custom message provided

---

## Dependencies

- `debounce` from `./helpers.js`

---

## Quick Reference

```javascript
import {
  VALIDATION_RULES,
  VALIDATION_TIMING,
  FIELD_STATE,
  FieldStateManager,
  validateValue,
  createCharacterCounter,
  createConstraintHint,
  InputMasks
} from '../utils/formValidation.js';

// Validate a value
const result = validateValue('test@example.com', [
  VALIDATION_RULES.required,
  VALIDATION_RULES.email
]);

// Create character counter
const counter = createCharacterCounter(500);
const stats = counter.getStats(text.length);

// Use input mask
const formatted = InputMasks.phone.format(rawInput);

// Manage field state
const manager = new FieldStateManager();
manager.register('field1', {});
manager.markTouched('field1');
```
