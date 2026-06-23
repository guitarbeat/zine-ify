import '../styles/index.css';
import { AppController } from './AppController.js';
import { initPwa } from './pwa.js';
import { initSettingsValidation } from '../services/FormValidationService.js';
import { initSnapGrid } from '../utils/snapGrid.js';

initPwa();
window.app = new AppController();
initSettingsValidation();

document.addEventListener('DOMContentLoaded', () => {
  initSnapGrid();
});
