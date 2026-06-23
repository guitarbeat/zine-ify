import '../styles/index.css';
import { AppController } from './AppController.js';
import { initPwa } from './pwa.js';
import { initSettingsValidation } from '../services/FormValidationService.js';
import { makeDraggable } from '../utils/draggable.js';

initPwa();

window.app = new AppController();
initSettingsValidation();

document.addEventListener('DOMContentLoaded', () => {
  const panel = document.getElementById('control-rail');
  const handle = document.getElementById('float-panel-handle');
  const body = document.getElementById('float-panel-body');
  const collapseBtn = document.getElementById('float-panel-collapse');
  const collapseIcon = document.getElementById('float-panel-collapse-icon');

  if (panel && handle) {
    makeDraggable(panel, handle);
  }

  if (collapseBtn && body && collapseIcon) {
    collapseBtn.addEventListener('click', () => {
      const collapsed = panel.classList.toggle('is-collapsed');
      collapseIcon.textContent = collapsed ? 'expand_more' : 'expand_less';
      collapseBtn.setAttribute('aria-label', collapsed ? 'Expand panel' : 'Collapse panel');
    });
  }
});
