import { GridStack } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';

const STORAGE_KEY = 'zine-grid-v1';

let grid = null;

function saveLayout() {
  if (!grid) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(grid.save(false)));
  } catch (_) {}
}

function loadLayout() {
  if (!grid) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const items = JSON.parse(raw);
    if (Array.isArray(items) && items.length) {
      grid.load(items);
    }
  } catch (_) {}
}

export function initGridStack() {
  const el = document.querySelector('.grid-stack');
  if (!el) return;

  grid = GridStack.init({
    column: 12,
    cellHeight: 58,
    margin: 8,
    handle: '.snap-card-handle',
    float: false,
    animate: true,
    resizable: { handles: 'se' }
  }, el);

  loadLayout();
  grid.on('change', saveLayout);

  window.__resetPanelLayout = () => {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  };
}