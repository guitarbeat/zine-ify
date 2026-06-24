import { GridStack } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';

const STORAGE_KEY_DESKTOP = 'zine-grid-v2';
const STORAGE_KEY_MOBILE = 'zine-grid-mobile-v2';
const MOBILE_BREAKPOINT = 768;
const CELL_HEIGHT = 32;

const DEFAULT_LAYOUT = [
  { id: 'canvas', x: 0, y: 0, w: 8, h: 10 },
  { id: 'upload', x: 8, y: 0, w: 4, h: 4 },
  { id: 'settings', x: 8, y: 4, w: 4, h: 4 },
  { id: 'display', x: 8, y: 8, w: 4, h: 2 },
  { id: 'export', x: 0, y: 10, w: 8, h: 2 }
];

let grid = null;
let gridEl = null;
let resizeObserver = null;
let resizeFrame = null;
let isRelayouting = false;

function isMobile() {
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches;
}

function storageKey() {
  return isMobile() ? STORAGE_KEY_MOBILE : STORAGE_KEY_DESKTOP;
}

function nodesOverlap(a, b) {
  if (a.id === b.id) return false;
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  );
}

function layoutHasOverlaps() {
  const nodes = grid?.engine?.nodes ?? [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (nodesOverlap(nodes[i], nodes[j])) return true;
    }
  }
  return false;
}

function saveLayout() {
  if (!grid || isRelayouting) return;
  try {
    localStorage.setItem(storageKey(), JSON.stringify(grid.save(false)));
  } catch (_) {}
}

function compactLayout() {
  if (!grid) return;
  grid.compact('list');
}

function relayoutPanels() {
  if (!grid) return;
  isRelayouting = true;

  grid.getGridItems().forEach((el) => grid.resizeToContent(el));
  compactLayout();

  isRelayouting = false;
}

function resetToDefaults() {
  if (!grid) return;
  localStorage.removeItem(storageKey());

  grid.batchUpdate(true);
  DEFAULT_LAYOUT.forEach(({ id, x, y, w, h }) => {
    const el = gridEl.querySelector(`[gs-id="${id}"]`);
    if (el) grid.update(el, { x, y, w, h });
  });
  grid.batchUpdate(false);

  if (isMobile()) compactLayout();
  relayoutPanels();
}

function loadLayout() {
  if (!grid) return;

  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) {
      relayoutPanels();
      return;
    }

    const items = JSON.parse(raw);
    if (!Array.isArray(items) || !items.length) {
      relayoutPanels();
      return;
    }

    grid.load(items);
    relayoutPanels();

    if (layoutHasOverlaps()) {
      resetToDefaults();
    }
  } catch (_) {
    resetToDefaults();
  }
}

function scheduleRelayout() {
  if (resizeFrame) cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    relayoutPanels();
    if (layoutHasOverlaps()) compactLayout();
    resizeFrame = null;
  });
}

function observePanelSizes() {
  if (resizeObserver) resizeObserver.disconnect();

  resizeObserver = new ResizeObserver(() => scheduleRelayout());

  gridEl?.querySelectorAll('.grid-stack-item .snap-card').forEach((card) => {
    resizeObserver.observe(card);
  });
}

function syncGridMetrics() {
  if (!grid) return;
  grid.cellHeight(CELL_HEIGHT);
  grid.margin(isMobile() ? 6 : 8);
  grid.float(false);
}

function setInteractionMode() {
  if (!grid) return;
  const mobile = isMobile();
  document.body.classList.toggle('layout-mobile', mobile);
  syncGridMetrics();
  grid.enableMove(true);
  grid.enableResize(!mobile);
  loadLayout();
}

export function initGridStack() {
  gridEl = document.querySelector('.grid-stack');
  if (!gridEl) return;

  grid = GridStack.init({
    column: 12,
    cellHeight: CELL_HEIGHT,
    margin: isMobile() ? 6 : 8,
    handle: '.snap-card-handle',
    float: false,
    animate: true,
    sizeToContent: true,
    resizable: { handles: 'se', autoHide: true },
    columnOpts: {
      breakpointForWindow: true,
      layout: 'list',
      breakpoints: [{ w: MOBILE_BREAKPOINT, c: 1, layout: 'list' }]
    }
  }, gridEl);

  grid.float(false);

  grid.on('change', saveLayout);
  grid.on('dragstop resizestop', () => scheduleRelayout());

  observePanelSizes();
  setInteractionMode();

  window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).addEventListener('change', setInteractionMode);

  window.__resetPanelLayout = () => {
    localStorage.removeItem(STORAGE_KEY_DESKTOP);
    localStorage.removeItem(STORAGE_KEY_MOBILE);
    localStorage.removeItem('zine-grid-v1');
    localStorage.removeItem('zine-grid-mobile-v1');
    location.reload();
  };

  window.__resizePanels = relayoutPanels;
}