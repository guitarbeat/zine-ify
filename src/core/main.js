import '../styles/index.css';
import { AppController } from './AppController.js';
import { initPwa } from './pwa.js';
import { initSettingsValidation } from '../services/FormValidationService.js';
import { initGridStack } from '../utils/gridStack.js';

function initThemeToggle() {
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');

  if (!themeToggle || !themeIcon) {
    return;
  }

  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('zine-theme', newTheme);
    themeIcon.textContent = newTheme === 'dark' ? 'light_mode' : 'dark_mode';
  });
}

initPwa();
window.app = new AppController();
initSettingsValidation(document, window.app?.ui);
initThemeToggle();

document.addEventListener('DOMContentLoaded', () => {
  initGridStack();
});
