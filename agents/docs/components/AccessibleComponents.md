# Accessible UI Components

This document describes accessible alternatives to common problematic UI patterns, designed with inclusive design principles.

## Inclusive Design Principles

These components follow these principles:

1. **Keyboard First** - All interactions work with keyboard alone
2. **Screen Reader Friendly** - Proper ARIA roles, labels, and live regions
3. **Progressive Enhancement** - Works without JavaScript where possible
4. **Reduced Motion** - Respects user's motion preferences
5. **High Contrast** - Supports high contrast mode
6. **Clear Focus** - Visible focus indicators for keyboard navigation

---

## AccessibleTabs

**Alternative to: Carousels/Sliders**

### Why Carousels Are Problematic

- Auto-play can't be paused, causing distraction and cognitive overload
- Content is hidden, requiring navigation to discover
- Keyboard users can't easily access all slides
- Motion causes vestibular issues for some users

### AccessibleTabs Features

- All content visible in organized sections
- Keyboard: Arrow keys, Home, End navigation
- Screen reader: Proper tab/tablist roles
- No auto-animation, user-controlled

### Usage

```javascript
import { AccessibleTabs } from '../components/AccessibleComponents.js';

// From existing HTML structure
const tabs = new AccessibleTabs('#container', {
  orientation: 'horizontal', // 'vertical' for sidebar-style
  activation: 'auto',         // 'manual' requires Enter to activate
  onChange: (index, tab, panel) => console.log('Tab changed:', index)
});

// Auto-create from container children
const tabs = new AccessibleTabs('#content-area', {
  tabListLabel: 'Article sections',
  defaultTab: 0
});
```

### HTML Structure

```html
<!-- Option 1: Pre-built structure -->
<div id="container">
  <div role="tablist" aria-label="Product features">
    <button role="tab" aria-controls="panel-1" aria-selected="true">Overview</button>
    <button role="tab" aria-controls="panel-2">Specs</button>
    <button role="tab" aria-controls="panel-3">Reviews</button>
  </div>
  <div id="panel-1" role="tabpanel" aria-labelledby="tab-1">
    Overview content...
  </div>
  <div id="panel-2" role="tabpanel" aria-labelledby="tab-2" hidden>
    Specs content...
  </div>
  <div id="panel-3" role="tabpanel" aria-labelledby="tab-3" hidden>
    Reviews content...
  </div>
</div>

<!-- Option 2: Auto-discover from children -->
<div id="container">
  <div data-tab-label="Section One">
    <h2>Section One</h2>
    <p>Content...</p>
  </div>
  <div data-tab-label="Section Two">
    <h2>Section Two</h2>
    <p>Content...</p>
  </div>
</div>
```

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `ArrowRight/Down` | Navigate to next tab |
| `ArrowLeft/Up` | Navigate to previous tab |
| `Home` | Go to first tab |
| `End` | Go to last tab |

---

## AccessibleList

**Alternative to: Infinite Scroll**

### Why Infinite Scroll Is Problematic

- No sense of progress or completion
- Can't skip to end or go back easily
- Footer content is unreachable
- Performance degrades withDOM growth
- Screen reader announcements don't work well

### AccessibleList Features

- "Load More" button with progress indicator
- Progress: "Showing 30 of 156 items"
- Keyboard: End key jumps to load more
- Announces loading state to screen readers

### Usage

```javascript
import { AccessibleList } from '../components/AccessibleComponents.js';

const list = new AccessibleList('#list-container', {
  pageSize: 20,
  loadMoreLabel: 'Load more products',
  progressLabel: 'Showing {shown} of {total} items',
  onLoadMore: async (page, pageSize) => {
    const response = await fetch(`/api/items?page=${page}&size=${pageSize}`);
    const data = await response.json();
    return {
      items: data.items,
      total: data.total,
      hasMore: data.hasMore
    };
  },
  renderItem: (item) => {
    const div = document.createElement('div');
    div.className = 'product-card';
    div.innerHTML = `
      <h3>${item.name}</h3>
      <p>${item.description}</p>
    `;
    return div;
  }
});

// Load all items
list.loadAll();

// Refresh list
list.refresh();
```

### Progressive Enhancement

Works without JavaScript: Just show a regular paginated list.

```html
<!-- Graceful degradation -->
<noscript>
  <a href="/items?page=2" class="load-more-link">Next Page →</a>
</noscript>
```

---

## AccessibleCombobox

**Alternative to: Complex Dropdowns**

### Why Complex Dropdowns Are Problematic

- Inconsistent keyboard navigation
- Screen readers may not announce options
- Long lists are hard to navigate
- Search/filter isn't always accessible

### AccessibleCombobox Features

- WAI-ARIA combobox pattern
- Type to filter/search
- Keyboard: Arrow keys, Enter, Escape
- Screen reader: Proper announcements
- Supports async search

### Usage

```javascript
import { AccessibleCombobox } from '../components/AccessibleComponents.js';

const combobox = new AccessibleCombobox('#select-wrapper', {
  label: 'Select country',
  placeholder: 'Type to search countries...',
  options: [
    { value: 'us', label: 'United States', description: 'North America' },
    { value: 'ca', label: 'Canada', description: 'North America' },
    { value: 'uk', label: 'United Kingdom', description: 'Europe' }
  ],
  onSelect: (option) => console.log('Selected:', option.value)
});

// Async search
const asyncCombobox = new AccessibleCombobox('#search-wrapper', {
  label: 'Search users',
  onSearch: async (query) => {
    const response = await fetch(`/api/users?q=${query}`);
    const users = await response.json();
    return users.map(u => ({ value: u.id, label: u.name }));
  }
});

// Get/set value
combobox.getValue();
combobox.setValue('ca');
```

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `ArrowDown` | Move to next option |
| `ArrowUp` | Move to previous option |
| `Enter` | Select focused option |
| `Escape` | Close dropdown, clear input |
| `Tab` | Close and move focus |

---

## Accordion

**Progressive Enhancement Pattern**

### Features

- Works without JavaScript (CSS + `<details>`)
- Keyboard accessible by default
- Single or multiple expansion
- Smooth collapse animation

### Usage

```javascript
import { Accordion } from '../components/AccessibleComponents.js';

const accordion = new Accordion('#faq', {
  allowMultiple: false,      // Only one open at a time
  defaultExpanded: [0],      // First item expanded by default
  onToggle: (item, isOpen) => console.log('Toggled:', item.id)
});

// Public methods
accordion.expand(2);
accordion.collapse(0);
accordion.expandAll();
accordion.collapseAll();
```

### HTML Structure

```html
<div id="faq">
  <details>
    <summary>What is your return policy?</summary>
    <p>Our return policy allows returns within 30 days...</p>
  </details>
  <details>
    <summary>How do I track my order?</summary>
    <p>You can track your order by...</p>
  </details>
</div>
```

### Progressive Enhancement

Without JavaScript:
- `<details>` elements work natively
- Users can click to expand/collapse
- All content is accessible

---

## FocusTrap

**Modal/Dialog Focus Management**

Traps focus within a container for modals and dialogs.

### Usage

```javascript
import { FocusTrap } from '../components/AccessibleComponents.js';

let focusTrap = null;

function openModal() {
  modal.classList.remove('hidden');
  focusTrap = new FocusTrap(modal, {
    initialFocus: '[data-focus-first]',
    returnFocus: true, // Return to trigger on close
    onEscape: closeModal
  });
}

function closeModal() {
  focusTrap?.deactivate();
  modal.classList.add('hidden');
}
```

---

## ScreenReaderAnnouncer

**Live Region Announcements**

### Usage

```javascript
import { getAnnouncer } from '../components/AccessibleComponents.js';

const announcer = getAnnouncer();

// Polite announcement (waits for user to finish)
announcer.announce('Item added to cart');

// Assertive announcement (interrupts)
announcer.assertive('Error: Please fix the form');
```

---

## SkipLink

**Navigation Aid for Keyboard Users**

### Usage

```javascript
import { createSkipLink } from '../components/AccessibleComponents.js';

// Add to page on load
createSkipLink('#main-content', 'Skip to main content');
```

Creates a link that's normally hidden but appears on focus (Tab from page start).

---

## Reduced Motion Check

```javascript
import { prefersReducedMotion, createMotionSafeAnimation } from '../components/AccessibleComponents.js';

if (prefersReducedMotion()) {
  // Skip animations
  element.style.opacity = '1';
} else {
  // Use animation
  createMotionSafeAnimation(element, [
    { opacity: 0 },
    { opacity: 1 }
  ], { duration: 300 });
}
```

---

## Best Practices Summary

### Do

- Use semantic HTML (button, a, input, etc.)
- Provide visible focus indicators
- Support keyboard navigation
- Use ARIA roles and labels appropriately
- Announce dynamic changes to screen readers
- Respects `prefers-reduced-motion`
- Test with screen readers (NVDA, VoiceOver, JAWS)

### Don't

- Use `div` or `span` for interactive elements
- Rely on color alone to convey information
- Auto-play animations or media
- Hide focus outlines
- Create keyboard traps unintentionally
- Use infinite scroll when total items matter
