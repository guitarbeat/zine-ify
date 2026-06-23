import '../styles/index.css';
import 'gridstack/dist/gridstack.min.css';
import { GridStack } from 'gridstack';
import { AppController } from './AppController.js';
import { initPwa } from './pwa.js';
import {
  GRID_DIMENSION_MIN, GRID_DIMENSION_MAX,
  MARGIN_MIN, MARGIN_MAX
} from '../utils/config.js';

initPwa();
window.app = new AppController();

/* ── Settings input validation ─────────────────────────── */
function initSettingsValidation() {
  function clampInt(el, min, max) {
    const v = parseInt(el.value, 10);
    el.value = isNaN(v) ? min : Math.max(min, Math.min(max, v));
  }

  function updateGridTotal() {
    const rows = parseInt(document.querySelector('#grid-rows')?.value, 10) || 1;
    const cols = parseInt(document.querySelector('#grid-cols')?.value, 10) || 1;
    const totalEl = document.querySelector('#grid-total');
    if (totalEl) totalEl.textContent = `${rows * cols} slots`;
  }

  document.querySelector('#grid-rows')?.addEventListener('blur', e => {
    clampInt(e.target, GRID_DIMENSION_MIN, GRID_DIMENSION_MAX);
    updateGridTotal();
  });

  document.querySelector('#grid-cols')?.addEventListener('blur', e => {
    clampInt(e.target, GRID_DIMENSION_MIN, GRID_DIMENSION_MAX);
    updateGridTotal();
  });

  document.querySelector('#margin-input')?.addEventListener('blur', e => {
    clampInt(e.target, MARGIN_MIN, MARGIN_MAX);
  });
}

initSettingsValidation();

/* ── GridStack workspace ────────────────────────────────── */
const STORAGE_KEY = 'zine-grid-v1';
let grid = null;

function initGrid() {
  grid = GridStack.init({
    column: 12,
    cellHeight: 58,
    margin: 8,
    handle: '.snap-card-handle',
    float: false,
    animate: true,
    resizable: { handles: 'se' },
  });

  loadLayout();
  grid.on('change', saveLayout);
}

function saveLayout() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(grid.save(false)));
  } catch (_) {}
}

function loadLayout() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const items = JSON.parse(raw);
    if (Array.isArray(items) && items.length) grid.load(items);
  } catch (_) {}
}

initGrid();

/* ── Programmatic layout reset ──────────────────────────── */
window.__resetPanelLayout = function () {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
};
