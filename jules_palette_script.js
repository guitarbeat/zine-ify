const ui = {
  elements: {
    exportPdfBtn: { disabled: false, setAttribute: () => {}, querySelector: () => {} }
  }
};
// Add aria-busy logic to UIManager and AppController or just the button?
// AppController handles the click and calls exportService.
// Let's modify handleExport in AppController to set aria-busy="true" and disabled on the button itself.
