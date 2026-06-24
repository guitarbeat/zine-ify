import { GridStack } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';

const STORAGE_KEY = 'zine-grid-v1';
const MOBILE_BREAKPOINT = 768;

/** Fixed stack order for narrow viewports (full-width, no overlap). */
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

function saveLayout() {
  if (!grid || isMobile()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(grid.save(false)));
  } catch (_) {}
}

function loadLayout() {
  if (!grid || isMobile()) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const items = JSON.parse(raw);
    if (Array.isArray(items) && items.length) {
      grid.load(items);
    }
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

  if (mobile) {
    grid.disable();
    applyMobileLayout();
  } else {
    grid.enable();
    loadLayout();
  }
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
    animate: !mobile,
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
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  };
}