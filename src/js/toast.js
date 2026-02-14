// Modern toast notification system

class Toast {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    // Check if container already exists
    this.container = document.getElementById('toast-container');

    // Create toast container if it doesn't exist
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container fixed bottom-6 right-6 z-[300] flex flex-col gap-4 font-typewriter pointer-events-none';
      this.container.setAttribute('aria-live', 'polite');
      document.body.appendChild(this.container);
    }
  }

  /**
   * Show a toast notification
   * @param {string} type - Toast type: 'success', 'error', 'warning', 'info'
   * @param {string} title - Toast title
   * @param {string} message - Toast message (optional)
   * @param {number} duration - Duration in milliseconds (default: 5000)
   */
  show(type, title, message = '', duration = 5000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');

    const icon = this.getIcon(type);

    // Create toast structure safely
    const iconContainer = document.createElement('div');
    iconContainer.className = 'toast-icon';
    iconContainer.innerHTML = icon; // SVG is safe static content

    const contentContainer = document.createElement('div');
    contentContainer.className = 'toast-content';

    const titleEl = document.createElement('div');
    titleEl.className = 'toast-title';
    titleEl.textContent = title; // Safe from XSS
    contentContainer.appendChild(titleEl);

    if (message) {
      const messageEl = document.createElement('div');
      messageEl.className = 'toast-message';
      messageEl.textContent = message; // Safe from XSS
      contentContainer.appendChild(messageEl);
    }

    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.setAttribute('aria-label', 'Close notification');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => this.remove(toast));

    toast.appendChild(iconContainer);
    toast.appendChild(contentContainer);
    toast.appendChild(closeBtn);

    this.container.appendChild(toast);

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        if (toast.parentNode) {
          this.remove(toast);
        }
      }, duration);
    }

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.add('toast-visible');
      // Add slight random rotation for chaos
      const rotation = Math.random() * 4 - 2;
      toast.style.transform = `translateX(0) rotate(${rotation}deg)`;
    });

    return toast;
  }

  /**
   * Remove a toast notification
   * @param {Element} toast - Toast element to remove
   */
  remove(toast) {
    toast.classList.remove('toast-visible');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300); // Match CSS transition duration
  }

  /**
   * Get icon SVG for toast type
   * @param {string} type - Toast type
   * @returns {string} SVG icon HTML
   */
  getIcon(type) {
    const icons = {
      success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22,4 12,14.01 9,11.01"/>
      </svg>`,
      error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>`,
      warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>`,
      info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 16v-4"/>
        <path d="M12 8h.01"/>
      </svg>`
    };
    return icons[type] || icons.info;
  }

  // Convenience methods
  success(title, message, duration) {
    return this.show('success', title, message, duration);
  }

  error(title, message, duration) {
    return this.show('error', title, message, duration);
  }

  warning(title, message, duration) {
    return this.show('warning', title, message, duration);
  }

  info(title, message, duration) {
    return this.show('info', title, message, duration);
  }
}

// Export singleton instance
export const toast = new Toast();