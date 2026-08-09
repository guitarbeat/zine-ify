import { GridStack } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';

const STORAGE_KEY_DESKTOP = 'zine-grid-v8';
const STORAGE_KEY_MOBILE = 'zine-grid-mobile-v8';
const MOBILE_BREAKPOINT = 768;
const CELL_HEIGHT = 32;
const MOBILE_CELL_HEIGHT = 24;

const DEFAULT_LAYOUT = [
  { id: 'brand', x: 0, y: 0, w: 4, h: 3 },
  { id: 'canvas', x: 0, y: 3, w: 9, h: 10 },
  { id: 'upload', x: 9, y: 3, w: 3, h: 4 },
  { id: 'settings', x: 9, y: 7, w: 3, h: 10 },
  { id: 'display', x: 9, y: 11, w: 3, h: 2 },
  { id: 'fold-viewer', x: 0, y: 15, w: 6, h: 6 },
  { id: 'fold-booklet', x: 6, y: 15, w: 3, h: 4 },
  { id: 'fold-guide', x: 9, y: 15, w: 3, h: 4 }
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
  if (a.id === b.id) { return false; }
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
      if (nodesOverlap(nodes[i], nodes[j])) { return true; }
    }
  }
  return false;
}

function saveLayout() {
  if (!grid || isRelayouting) { return; }
  try {
    localStorage.setItem(storageKey(), JSON.stringify(grid.save(false)));
  } catch {
    // ignore storage errors
  }
}

function compactLayout() {
  if (!grid || !isMobile()) { return; }
  grid.compact('list');
}

function relayoutPanels() {
  if (!grid) { return; }
  isRelayouting = true;

  grid.getGridItems().forEach((el) => {
    if (el.querySelector('.grid-stack-item-content')?.firstElementChild) {
      grid.resizeToContent(el);
    }
  });
  compactLayout();

  isRelayouting = false;
}

function resetToDefaults() {
  if (!grid) { return; }
  localStorage.removeItem(storageKey());

  grid.batchUpdate(true);
  DEFAULT_LAYOUT.forEach(({ id, x, y, w, h }) => {
    const el = gridEl.querySelector(`[gs-id="${id}"]`);
    if (el) { grid.update(el, { x, y, w, h }); }
  });
  grid.batchUpdate(false);

  if (isMobile()) { compactLayout(); }
  relayoutPanels();
}

function loadLayout() {
  if (!grid) { return; }

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

    const validIds = new Set(
      [...gridEl.querySelectorAll('.grid-stack-item')].map((el) => el.getAttribute('gs-id'))
    );
    grid.load(items.filter((item) => validIds.has(item.id)));
    relayoutPanels();
    saveLayout();

    if (layoutHasOverlaps()) {
      resetToDefaults();
    }
  } catch {
    resetToDefaults();
  }
}

function scheduleRelayout() {
  if (resizeFrame) { cancelAnimationFrame(resizeFrame); }
  resizeFrame = requestAnimationFrame(() => {
    relayoutPanels();
    if (layoutHasOverlaps()) { compactLayout(); }
    resizeFrame = null;
  });
}

function observePanelSizes() {
  if (resizeObserver) { resizeObserver.disconnect(); }

  resizeObserver = new ResizeObserver(() => scheduleRelayout());

  gridEl?.querySelectorAll('.grid-stack-item .snap-card').forEach((card) => {
    resizeObserver.observe(card);
  });
}

function syncGridMetrics() {
  if (!grid) { return; }
  const mobile = isMobile();
  grid.cellHeight(mobile ? MOBILE_CELL_HEIGHT : CELL_HEIGHT);
  grid.margin(mobile ? 4 : 8);
  grid.float(!mobile);
}

function setInteractionMode() {
  if (!grid) { return; }
  const mobile = isMobile();
  document.body.classList.toggle('layout-mobile', mobile);
  syncGridMetrics();
  grid.enableMove(true);
  grid.enableResize(true);
  loadLayout();
}

export function initGridStack() {
  gridEl = document.querySelector('.grid-stack');
  if (!gridEl) { return; }

  grid = GridStack.init({
    column: 12,
    cellHeight: CELL_HEIGHT,
    margin: isMobile() ? 6 : 8,
    float: !isMobile(),
    animate: true,
    sizeToContent: true,
    resizable: { handles: 'se', autoHide: false },
    columnOpts: {
      breakpointForWindow: true,
      layout: 'list',
      breakpoints: [{ w: MOBILE_BREAKPOINT, c: 1, layout: 'list' }]
    }
  }, gridEl);

  grid.float(!isMobile());

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
    localStorage.removeItem('zine-grid-v2');
    localStorage.removeItem('zine-grid-mobile-v2');
    location.reload();
  };

  window.__resizePanels = relayoutPanels;
}
