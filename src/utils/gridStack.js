import { GridStack } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';

const STORAGE_KEY_DESKTOP = 'zine-grid-v1';
const STORAGE_KEY_MOBILE = 'zine-grid-mobile-v1';
const MOBILE_BREAKPOINT = 768;

/** Default stack order when no mobile layout is saved yet. */
const MOBILE_LAYOUT = [
  { id: 'canvas', x: 0, y: 0, w: 1, h: 9 },
  { id: 'upload', x: 0, y: 9, w: 1, h: 4 },
  { id: 'settings', x: 0, y: 13, w: 1, h: 4 },
  { id: 'display', x: 0, y: 17, w: 1, h: 3 },
  { id: 'export', x: 0, y: 20, w: 1, h: 3 }
];

let grid = null;
let gridEl = null;

function isMobile() {
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches;
}

function storageKey() {
  return isMobile() ? STORAGE_KEY_MOBILE : STORAGE_KEY_DESKTOP;
}

function saveLayout() {
  if (!grid) return;
  try {
    localStorage.setItem(storageKey(), JSON.stringify(grid.save(false)));
  } catch (_) {}
}

function getItemById(id) {
  return gridEl?.querySelector(`[gs-id="${id}"]`) ?? null;
}

function applyMobileLayout() {
  if (!grid) return;
  MOBILE_LAYOUT.forEach(({ id, x, y, w, h }) => {
    const item = getItemById(id);
    if (item) grid.update(item, { x, y, w, h });
  });
}

function loadLayout() {
  if (!grid) return;

  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) {
      if (isMobile()) applyMobileLayout();
      return;
    }

    const items = JSON.parse(raw);
    if (Array.isArray(items) && items.length) {
      grid.load(items);
    } else if (isMobile()) {
      applyMobileLayout();
    }
  } catch (_) {
    if (isMobile()) applyMobileLayout();
  }
}

function syncGridMetrics() {
  if (!grid) return;
  const mobile = isMobile();
  grid.cellHeight(mobile ? 44 : 58);
  grid.margin(mobile ? 6 : 8);
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

  const mobile = isMobile();

  grid = GridStack.init({
    column: 12,
    cellHeight: mobile ? 44 : 58,
    margin: mobile ? 6 : 8,
    handle: '.snap-card-handle',
    float: false,
    animate: true,
    resizable: { handles: 'se', autoHide: true },
    columnOpts: {
      breakpointForWindow: true,
      layout: 'compact',
      breakpoints: [{ w: MOBILE_BREAKPOINT, c: 1, layout: 'list' }]
    }
  }, gridEl);

  grid.on('change', saveLayout);

  setInteractionMode();

  window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).addEventListener('change', setInteractionMode);

  window.__resetPanelLayout = () => {
    localStorage.removeItem(STORAGE_KEY_DESKTOP);
    localStorage.removeItem(STORAGE_KEY_MOBILE);
    location.reload();
  };
}