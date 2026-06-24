import { GridStack } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';

const STORAGE_KEY_DESKTOP = 'zine-grid-v1';
const STORAGE_KEY_MOBILE = 'zine-grid-mobile-v1';
const MOBILE_BREAKPOINT = 768;
const CELL_HEIGHT = 32;



let grid = null;
let gridEl = null;
let resizeObserver = null;
let resizeFrame = null;

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

function resizeAllPanels() {
  if (!grid) return;
  grid.batchUpdate(true);
  grid.getGridItems().forEach((el) => grid.resizeToContent(el));
  grid.batchUpdate(false);
}

function applyMobileLayout() {
  if (!grid) return;
  grid.compact('list');
  resizeAllPanels();
}

function loadLayout() {
  if (!grid) return;

  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) {
      if (isMobile()) applyMobileLayout();
      else resizeAllPanels();
      return;
    }

    const items = JSON.parse(raw);
    if (Array.isArray(items) && items.length) {
      grid.load(items);
      requestAnimationFrame(resizeAllPanels);
    } else if (isMobile()) {
      applyMobileLayout();
    } else {
      resizeAllPanels();
    }
  } catch (_) {
    if (isMobile()) applyMobileLayout();
    else resizeAllPanels();
  }
}

function scheduleResizeAll() {
  if (resizeFrame) cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    resizeAllPanels();
    resizeFrame = null;
  });
}

function observePanelSizes() {
  if (resizeObserver) resizeObserver.disconnect();

  resizeObserver = new ResizeObserver(() => scheduleResizeAll());

  gridEl?.querySelectorAll('.grid-stack-item .snap-card').forEach((card) => {
    resizeObserver.observe(card);
  });
}

function syncGridMetrics() {
  if (!grid) return;
  grid.cellHeight(CELL_HEIGHT);
  grid.margin(isMobile() ? 6 : 8);
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
      layout: 'compact',
      breakpoints: [{ w: MOBILE_BREAKPOINT, c: 1, layout: 'list' }]
    }
  }, gridEl);

  grid.on('change', saveLayout);

  observePanelSizes();
  setInteractionMode();

  window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).addEventListener('change', setInteractionMode);

  window.__resetPanelLayout = () => {
    localStorage.removeItem(STORAGE_KEY_DESKTOP);
    localStorage.removeItem(STORAGE_KEY_MOBILE);
    location.reload();
  };

  window.__resizePanels = resizeAllPanels;
}