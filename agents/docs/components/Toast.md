# Toast

> Non-intrusive notification component for user feedback

### Purpose

**What it does:**  
Displays temporary notification messages (success, error, warning, info) that appear briefly and auto-dismiss. Toasts stack vertically and provide visual feedback for user actions without interrupting workflow.

**When to use it:**  
- Confirming successful operations (file uploaded, settings saved)
- Displaying error messages that don't require user action
- Warning users about potential issues
- Providing informational updates

**When NOT to use it:**  
- Critical errors that require user action (use a modal instead)
- Persistent status information (use a status bar or inline message)
- Form validation errors (useinline validation instead)

### Props / Parameters

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `type` | `'success' \| 'error' \| 'warning' \| 'info'` | Yes | - | Visual style and icon for the toast |
| `title` | `string` | Yes | - | Main message displayed prominently |
| `message` | `string` | No | `''` | Secondary detail text |
| `duration` | `number` | No | `5000` | Time in ms before auto-dismiss (0 = no auto-dismiss) |

### Public Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `show(type, title, message?, duration?)` | See props above | `HTMLElement` | Generic method to show any toast type |
| `success(title, message?, duration?)` | See props above | `HTMLElement` | Convenience method for success toasts |
| `error(title, message?, duration?)` | See props above | `HTMLElement` | Convenience method for error toasts |
| `warning(title, message?, duration?)` | See props above | `HTMLElement` | Convenience method for warning toasts |
| `info(title, message?, duration?)` | See props above | `HTMLElement` | Convenience method for info toasts |
| `remove(toastElement)` | `HTMLElement` | `void` | Programmatically dismiss a toast |

### Events / Callbacks

Toast does not emit custom events. User interaction is limited to:
- Click on close button (×) dismisses the toast
- Auto-dismiss after duration expires

### Usage Examples

#### Basic Success Toast

```javascript
import { toast } from '../components/Toast.js';

toast.success('File Uploaded', 'Your PDF has been processed successfully.');
```

#### Error Toast with Extended Duration

```javascript
toast.error(
  'Export Failed',
  'The PDF could not be generated. Please try again.',
  10000 // 10 seconds
);
```

#### Warning Without Auto-Dismiss

```javascript
toast.warning(
  'Large File',
  'Processing may take longer than usual.',
  0 // Don't auto-dismiss
);
```

#### Store Reference for Manual Dismissal

```javascript
// Show toast and store reference
const processingToast = toast.info('Processing...', 'Please wait', 0);

// Later, dismiss programmatically
doAsyncWork().finally(() => {
  toast.remove(processingToast);
});
```

#### Integration with Error Handling

```javascript
import { toast } from '../components/Toast.js';

async function handleExport() {
  try {
    await exportService.generatePDF();
    toast.success('Export Complete', 'Your zine PDF is ready for download.');
  } catch (error) {
    toast.error('Export Failed', error.message || 'An unexpected error occurred.');
  }
}
```

### Accessibility

#### ARIA Attributes
- `aria-live="polite"`: Screen readers announce changes without interrupting
- `aria-atomic="true"`: Entire toast content is announced as one unit
- `role="alert"` (error toasts): Higher priority announcement for errors
- `role="status"` (other types): Standard status announcement
- `aria-label="Close notification"`: Accessible label for dismiss button

#### Keyboard Navigation
| Key | Action |
|-----|--------|
| `Tab` | Moves focus between toast close buttons (if multiple visible) |
| `Enter` / `Space` | Dismisses focused toast when close button is focused |

#### Screen Reader Considerations
- Errors use `role="alert"`for immediate announcement
- Other types use `role="status"` for polite announcement
- Container has `aria-live="polite"` so new toasts are announced
- Toasts are grouped in a labeled region (`aria-label="Notifications"`)

#### Focus Management
- Toasts do not receive focus on appearance (non-modal pattern)
- User can Tab to close button if needed
- Focus is not trapped within toast

### Styling

#### CSS Classes

| Class | Purpose |
|-------|---------|
| `.toast-container` | Fixed positioning container for all toasts |
| `.toast` | Base styling for individual toast |
| `.toast-visible` | Animation state when toast is shown |
| `.toast-success`, `.toast-error`, `.toast-warning`, `.toast-info` | Type-specific colors |
| `.toast-icon` | Icon container styling |
| `.toast-content` | Text content container |
| `.toast-title` | Primary message styling |
| `.toast-message` | Secondary message styling |
| `.toast-close` | Dismiss button styling |

#### CSS Custom Properties (Theming)

| Variable | Default | Description |
|----------|---------|-------------|
| `--surface-bg` | `#faf6ef` | Toast background color |
| `--border-color` | `rgba(61,52,40,0.14)` | Toast border |
| `--shadow-lg` | `0 10px 28px...` | Toast shadow |

#### Dark Mode
- Automatically adapts via CSS custom properties defined in `[data-theme="dark"]`
- Background shifts to darker surface
- Text colors adjust for contrast
- Icons maintain visibility

### Edge Cases

#### Empty State
N/A - Toast is created on demand, no empty state exists.

#### Loading State
N/A - Toast is instantaneous, no loading state.

#### Error State
Toast displays the error message itself. If `message` is empty, message section is removed entirely.

#### Maximum Limits
- No hard limit on concurrent toasts
- Container stacks them vertically with `gap-3` (0.75rem)
- On mobile, toasts use full width

#### Minimum Limits
- `title` should be provided (required parameter)
- Empty `title` will still render but looks empty

#### XSS Protection
- All user-provided content is sanitized via `sanitizeHTML()`
- Only allows safe inline HTML tags: `<b>`, `<strong>`, `<i>`, `<em>`, `<u>`, `<br>`, `<code>`, `<span>`
- Scripts and dangerous elements are stripped

### Dependencies

- **Required:** 
  - `sanitizeHTML` from `../utils/helpers.js`
- **Optional:** None

### Performance Considerations

- Uses HTML template cloning for efficient DOM creation
- Single container element reused for all toasts
- Auto-cleanup on dismiss with 300ms transition delay
- No external dependencies beyond utility functions

### Related Components

- [`FormValidator`](./FormValidator.md) - Uses toast for form submission feedback
- `PagePicker` - Uses toast for selection limit warnings
- `AppController` - Uses toast for operation status feedback

### Changelog

| Version | Changes |
|---------|---------|
| `2.0.0` | Added template-based rendering for performance |
| `1.1.0` | Added XSS sanitization for user content |
| `1.0.0` | Initial implementation with success/error/warning/info types |

---

## Quick Reference

```javascript
import { toast } from '../components/Toast.js';

// Success
toast.success('Saved', 'Changes have been applied.');

// Error
toast.error('Failed', 'Could not complete operation.');

// Warning
toast.warning('Warning', 'This action cannot be undone.');

// Info
toast.info('Info', 'New updates are available.');
```
