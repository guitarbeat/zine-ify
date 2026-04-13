import '../styles/index.css';
import { AppController } from './AppController.js';

// In Zine-ify, the AppController manages the high-level orchestration
// of PDF processing, UI state, and export operations.
// The entry point simply initializes the controller.
window.app = new AppController();
