// eslint-disable-next-line no-unused-vars
import { createMagneticToggle, createMagneticToggleGroup } from './MagneticToggle.js';
import { createFluidSlider } from './FluidSlider.js';
// eslint-disable-next-line no-unused-vars
import { createActionOrb, createActionOrbGroup } from './ActionOrb.js';

export function createCommandDeck(emitter) {
  const deck = document.createElement('div');
  deck.className = 'command-deck';

  // ── SECTION: Orbs ──
  const orbSection = document.createElement('div');
  orbSection.className = 'command-deck__orbs';
  const orbs = createActionOrbGroup([
    {
      icon: 'print',
      label: 'Export',
      variant: 'primary',
      onClick: () => emitter.emit('showExportDialog'),
    },
    {
      icon: 'preview',
      label: 'Preview',
      variant: 'secondary',
      onClick: () => emitter.emit('showPreviewDialog'),
    },
    {
      icon: 'help',
      label: 'Guide',
      variant: 'secondary',
      onClick: () => emitter.emit('showGuide'),
    },
  ]);
  orbSection.appendChild(orbs);

  // ── SECTION: Controls ──
  const controlSection = document.createElement('div');
  controlSection.className = 'command-deck__controls';

  const toggles = createMagneticToggleGroup([
    {
      icon: 'dark_mode',
      label: 'Dark Mode',
      checked: document.documentElement.getAttribute('data-theme') === 'dark',
      onChange: (v) => emitter.emit('themeToggle', v),
    },
    {
      icon: 'auto_stories',
      label: 'Booklet',
      checked: false,
      onChange: (v) => emitter.emit('bookletPreviewToggle', v),
    },
  ]);
  controlSection.appendChild(toggles);

  const scaleSlider = createFluidSlider({
    label: 'Scale',
    min: 0.5,
    max: 2.0,
    value: 1.0,
    step: 0.05,
    suffix: 'x',
    onChange: (v) => emitter.emit('previewZoomChanged', v),
  });
  controlSection.appendChild(scaleSlider);

  const marginSlider = createFluidSlider({
    label: 'Margin',
    min: 0,
    max: 20,
    value: 0,
    step: 1,
    suffix: 'mm',
    onChange: (v) => emitter.emit('marginChanged', v),
  });
  controlSection.appendChild(marginSlider);

  // ── SECTION: Status ──
  const statusSection = document.createElement('div');
  statusSection.className = 'command-deck__status';
  const statusText = document.createElement('span');
  statusText.className = 'command-deck__status-text';
  statusText.textContent = 'Ready';
  statusSection.appendChild(statusText);

  deck.appendChild(orbSection);
  deck.appendChild(controlSection);
  deck.appendChild(statusSection);

  return { deck, statusText };
}
