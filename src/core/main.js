import '../styles/index.css';
import { AppController } from './AppController.js';
import { initPwa } from './pwa.js';
import { initSettingsValidation } from '../services/FormValidationService.js';

initPwa();

// In Zine-ify, the AppController manages the high-level orchestration
// of PDF processing, UI state, and export operations.
// The entry point simply initializes the controller.
window.app = new AppController();

// Initialize form validation for the settings panel
// Uses user-friendly validation with immediate feedback
initSettingsValidation();
