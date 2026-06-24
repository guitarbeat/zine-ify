# Innovative Input Widgets

Modern, accessible input components with enhanced UX for better user engagement.

## Widgets Overview

| Widget | Purpose | Best For |
|--------|---------|----------|
| **PageRangeSelector** | Visual page range selection | PDF page selection, date ranges |
| **SmartGridConfigurator** | Interactive grid picker | Layout configuration, matrix sizing |
| **WheelPicker** | iOS-style wheel picker | Single value selection from list |
| **SegmentedControl** | Enhanced segmented buttons | Binary/multi-option choice |
| **RadialMenu** | Circular quick actions | Context menus, tool palettes |
| **NumericDial** | Rotary knob input | Continuous value adjustment |

---

## PageRangeSelector

Visual page range selection with drag handles.

### Features

- Drag handles to adjust start/end of range
- Click pages to toggle selection
- Quick select buttons (First N, Last N, All)
- Keyboard accessible (Arrow keys, Home, End)
- Max selection limit enforcement

### Usage

```javascript
import { PageRangeSelector } from '../components/InnovativeInputs.js';

const selector = new PageRangeSelector('#container', {
  totalPages: 16,
  initialStart: 1,
  initialEnd: 8,
  maxSelection: 8,
  onRangeChange: (range) => {
    console.log('Selected pages:', range.pages);
    // { start: 1, end: 8, pages: [1,2,3,4,5,6,7,8] }
  }
});

// Get current selection
const range = selector.getRange();

// Programmatic control
selector.setRange(3, 10);
```

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `ArrowLeft/Right` | Move focused handle |
| `Home` | Move to first page |
| `End` | Move to last page |

---

## SmartGridConfigurator

Interactive grid picker with visual preview.

### Features

- Click grid cells to select dimensions
- Hover preview shows potential selection
- Preset buttons for common layouts
- Manual stepper controls
- Live slot count display

### Usage

```javascript
import { SmartGridConfigurator } from '../components/InnovativeInputs.js';

const gridConfig = new SmartGridConfigurator('#container', {
  minRows: 1,
  maxRows: 10,
  minCols: 1,
  maxCols: 10,
  initialRows: 2,
  initialCols: 4,
  presets: [
    { label: 'Mini Zine (2x4)', rows: 2, cols: 4 },
    { label: 'Standard (3x3)', rows: 3, cols: 3 },
    { label: 'Large (4x4)', rows: 4, cols: 4 }
  ],
  onChange: (config) => {
    console.log('Grid:', config.rows, 'x', config.cols, '=', config.total, 'slots');
  }
});

// Get current value
const config = gridConfig.getValue();

// Programmatic control
gridConfig.setValue(4, 6);
```

---

## WheelPicker

iOS-style wheel picker for selecting values.

### Features

- Drag to scroll through options
- Momentum scrolling with deceleration
- Snap to nearest value on release
- Mouse wheel support
- Keyboard navigation
- Loop option for infinite scroll

### Usage

```javascript
import { WheelPicker } from '../components/InnovativeInputs.js';

// Simple values
const picker = new WheelPicker('#container', {
  values: ['Option A', 'Option B', 'Option C', 'Option D'],
  initialValue: 'Option B',
  label: 'Select option',
  onChange: (value, index) => {
    console.log('Selected:', value, 'at index', index);
  }
});

// Object values with display key
const picker = new WheelPicker('#container', {
  values: [
    { id: 1, name: 'Letter' },
    { id: 2, name: 'A4' },
    { id: 3, name: 'Legal' }
  ],
  displayKey: 'name', // Which property to display
  onChange: (value) => {
    console.log('Selected:', value.id, value.name);
  }
});

// Disable looping
const noLoopPicker = new WheelPicker('#container', {
  values: [1, 2, 3, 4, 5],
  loop: false
});
```

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `ArrowUp` | Previous option |
| `ArrowDown` | Next option |
| `Home` | First option |
| `End` | Last option |

---

## SegmentedControl

Enhanced segmented buttons with smooth indicator animation.

### Features

- Animated sliding indicator
- Icon + label support
- Keyboard navigation
- Accessible radio group pattern

### Usage

```javascript
import { SegmentedControl } from '../components/InnovativeInputs.js';

const control = new SegmentedControl('#container', {
  segments: [
    { label: 'Landscape', value: 'landscape', icon: 'crop_landscape' },
    { label: 'Portrait', value: 'portrait', icon: 'crop_portrait' }
  ],
  initialValue: 'landscape',
  label: 'Orientation',
  onChange: (value) => {
    console.log('Selected:', value);
  }
});

// Get current value
const value = control.getValue();

// Programmatic control
control.setValue('portrait');
```

---

## RadialMenu

Circular radial menu for quick actions.

### Features

- Circular layout around center trigger
- Animated open/close
- Icons with hover labels
- Keyboard navigation
- Click outside to close

### Usage

```javascript
import { RadialMenu } from '../components/InnovativeInputs.js';

const menu = new RadialMenu('#container', {
  radius: 100, // Distance from center
  items: [
    { label: 'Export', icon: 'export' },
    { label: 'Preview', icon: 'preview' },
    { label: 'Settings', icon: 'settings' },
    { label: 'Help', icon: 'help' }
  ],
  onSelect: (item, index) => {
    console.log('Selected:', item.label);
  }
});

// Programmatic control
menu.open();
menu.close();
```

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `ArrowLeft/Right` | Navigate between items |
| `Escape` | Close menu |

---

## NumericDial

Rotary knob-style input for numeric values.

### Features

- Drag to rotate knob
- Visual arc progress
- Keyboard fine control
- Configurable min/max/step
- Optional suffix display

### Usage

```javascript
import { NumericDial } from '../components/InnovativeInputs.js';

const dial = new NumericDial('#container', {
  label: 'Scale',
  min: 0.5,
  max: 2.0,
  value: 1.0,
  step: 0.1,
  suffix: 'x',
  onChange: (value) => {
    console.log('Scale:', value);
  }
});

// Get current value
const value = dial.getValue();

// Programmatic control
dial.setValue(1.5);
```

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `ArrowUp/Right` | Increase by step |
| `ArrowDown/Left` | Decrease by step |
| `PageUp` | Increase by 10x step |
| `PageDown` | Decrease by 10x step |
| `Home` | Set to minimum |
| `End` | Set to maximum |

---

## Accessibility Features

All widgets include:

- Proper ARIA roles and labels
- Keyboard navigation
- Focus management
- Screen reader announcements
- High contrast support
- Reduced motion support (when `prefers-reduced-motion` is set)

## Responsive Design

- Touch-friendly targets (44px minimum)
- Mobile-optimized layouts
- Safe area inset support for notched devices
- Momentum scrolling on iOS
