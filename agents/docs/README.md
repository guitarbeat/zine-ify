# Component Documentation

This directory contains documentation for reusable components in the Zine-ify project.

## Templates

- [**Component Documentation Template**](./COMPONENT_TEMPLATE.md) - Use this template when documenting new components

## Components

### UI Components

- [**Toast**](./components/Toast.md) - Non-intrusive notification system for user feedback
- [**FormValidator**](./components/FormValidator.md) - Inline form validation with immediate feedback
- [**Accessible Components**](./components/AccessibleComponents.md) - Inclusive alternatives to problematic patterns
- [**Innovative Inputs**](./components/InnovativeInputs.md) - Modern input widgets with enhanced UX

### Accessibility Components

These components provide accessible alternatives to common problematic UI patterns:

| Pattern | Problem | Solution |
|---------|---------|----------|
| Carousel | Hidden content, motion issues | **AccessibleTabs** - All content visible, user-controlled |
| Infinite Scroll | No progress, trapped footer | **AccessibleList** - Load more with progress indicator |
| Complex Dropdown | Keyboard issues, no search | **AccessibleCombobox** - Full WAI-ARIA pattern |
| Accordion | JavaScript dependency | **Accordion** - Progressive enhancement with `<details>` |

### Utility Modules

- [**formValidation.js**](./utils/formValidation.md) - Core validation utilities and rule definitions

## Documentation Guidelines

### When to Document

Document a component when:
- It's reused across multiple features
- It has complex configuration options
- It has accessibility requirements
- It integrates with other components

### Documentation Structure

Each component document should include:

1. **Purpose** - What it does and when to use it
2. **Props/Parameters** - Complete API reference
3. **Usage Examples** - Practical code examples
4. **Accessibility** - ARIA, keyboard, and screen reader considerations
5. **Edge Cases** - How it handles unusual states

### Quick Start

To document a new component:

1. Copy `COMPONENT_TEMPLATE.md`
2. Rename to match your component (e.g., `Modal.md`)
3. Fill in all relevant sections
4. Add to the index above

## Contributing

When updating component documentation:
- Keep examples up to date with actual code
- Document breaking changes in the changelog
- Include dark mode considerations
- Test accessibility claims
