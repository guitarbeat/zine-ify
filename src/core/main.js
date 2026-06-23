import '../styles/index.css';
import { AppController } from './AppController.js';
import { initPwa } from './pwa.js';
import {
  GRID_DIMENSION_MIN, GRID_DIMENSION_MAX,
  MARGIN_MIN, MARGIN_MAX
} from '../utils/config.js';
import Sortable from 'sortablejs';

initPwa();
window.app = new AppController();

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

const sidebar = document.getElementById('sidebar');
if (sidebar) {
  new Sortable(sidebar, {
    animation: 150,
    handle: '.snap-card-handle',
    ghostClass: 'sortable-ghost',
    dragClass: 'sortable-drag',
  });
}
