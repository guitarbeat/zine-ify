const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/core/AppController.js');
let code = fs.readFileSync(filePath, 'utf8');

const target = `    this.ui.modal.showProgress(true, 'Generating PDF...');
    try {
      await this.exportService.handleExport();`;

const replacement = `    // Provide localized loading state directly on the button per memory instructions
    if (this.ui.elements.exportPdfBtn) {
      this.ui.elements.exportPdfBtn.setAttribute('aria-busy', 'true');
      this.ui.elements.exportPdfBtn.disabled = true;
      this.ui.elements.exportPdfBtn.innerHTML = '<span class="material-symbols-outlined animate-spin" aria-hidden="true">sync</span><span class="text-sm font-semibold">Generating PDF...</span>';
    }

    this.ui.modal.showProgress(true, 'Generating PDF...');
    try {
      await this.exportService.handleExport();`;

code = code.replace(target, replacement);

const targetFinally = `    } catch (error) {
      toast.error('Export Failed', error.message);
    } finally {
      this.ui.modal.showProgress(false);
    }`;

const replacementFinally = `    } catch (error) {
      toast.error('Export Failed', error.message);
    } finally {
      this.ui.modal.showProgress(false);

      // Restore button state
      if (this.ui.elements.exportPdfBtn) {
        this.ui.elements.exportPdfBtn.removeAttribute('aria-busy');
        this.ui.elements.exportPdfBtn.disabled = false;
        this.ui.elements.exportPdfBtn.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">print</span><span class="text-sm font-semibold">Export PDF</span>';
      }
    }`;

code = code.replace(targetFinally, replacementFinally);

fs.writeFileSync(filePath, code, 'utf8');
console.log('Patched AppController.js');
