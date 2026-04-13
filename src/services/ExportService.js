/**
 * ExportService.js
 * Handles PDF export and Printing logic
 */
export class ExportService {
  constructor(ui, state, pdfProcessor) {
    this.ui = ui;
    this.state = state;
    this.pdfProcessor = pdfProcessor;
    this.exportDependenciesPromise = null;
  }

  async getExportDependencies() {
    if (!this.exportDependenciesPromise) {
      this.exportDependenciesPromise = Promise.all([
        import('jspdf'),
        import('html2canvas')
      ]).then(([jspdfModule, html2canvasModule]) => ({
        jsPDF: jspdfModule.jsPDF,
        html2canvas: html2canvasModule.default
      }));
    }
    return this.exportDependenciesPromise;
  }

  handlePrint(referenceImageUrl) {
    if (!this.ui.hasContent()) {
      return false;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      return false;
    }

    const zineSheets = [];
    document.querySelectorAll('.zine-grid').forEach((grid) => {
      const gridClone = grid.cloneNode(true);
      gridClone.querySelectorAll('button, .page-label, .page-placeholder, .guidelines').forEach((el) => {
        el.remove();
      });

      gridClone.querySelectorAll('.page-cell').forEach((cell) => {
        cell.style.position = 'relative';
        cell.style.display = 'flex';
        cell.style.alignItems = 'center';
        cell.style.justifyContent = 'center';
        cell.style.overflow = 'hidden';
        cell.style.border = 'none';
      });

      gridClone.querySelectorAll('.page-content-img').forEach((img) => {
        img.style.display = 'block';
        img.style.width = '100%';
        img.style.height = '100%';
      });

      zineSheets.push(gridClone.outerHTML);
    });

    const dimensions = this.ui.getPaperDimensions(this.state.paperSize, this.state.orientation);
    const { rows, cols } = this.state.gridSize;
    const gridCss = `
      grid-template-columns: repeat(${cols}, 1fr);
      grid-template-rows: repeat(${rows}, 1fr);
      grid-template-areas: none !important;
    `;

    const sheetsHtml = zineSheets.map((content) => `
      <div class="sheet">
        ${content}
      </div>
      <div class="sheet"><div class="back-side" style="width: 100%; height: 100%; background-image: url('${referenceImageUrl}'); background-size: contain; background-position: center; background-repeat: no-repeat; transform: rotate(180deg);"></div></div>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data: blob:; object-src 'none'; base-uri 'none'; form-action 'none';">
        <title>Print Zine</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { size: ${dimensions.width}mm ${dimensions.height}mm; margin: 0; }
          body { background: white; width: ${dimensions.width}mm; height: ${dimensions.height}mm; overflow: hidden; }
          .sheet { width: 100%; height: 100%; page-break-after: always; display: block; overflow: hidden; position: relative; }
          .zine-grid { display: grid; ${gridCss} height: ${dimensions.height}mm; width: ${dimensions.width}mm; justify-content: stretch; align-content: stretch; }
          .page-cell { position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; border: none; }
          .page-content-img { width: 100%; height: 100%; object-fit: contain; transform: rotate(var(--page-image-rotation, 0deg)) scale(var(--page-image-scale, 1)); }
          .page-zoomed .page-content-img { object-fit: cover; --page-image-scale: 1.1; }
          .page-cell.is-flipped .page-content-img { --page-image-rotation: 180deg; }
          .page-label, .page-placeholder, .zoom-btn, .crop-btn, .remove-btn, .flip-btn { display: none !important; }
        </style>
      </head>
      <body>
        ${sheetsHtml}
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();

    const waitForImagesToLoad = () => {
      const images = printWindow.document.querySelectorAll('img');
      if (images.length === 0) return Promise.resolve();
      const loadingPromises = Array.from(images).map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = img.onerror = resolve;
        });
      });
      return Promise.race([Promise.all(loadingPromises), new Promise(r => setTimeout(r, 2500))]);
    };

    waitForImagesToLoad().finally(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    });

    return true;
  }

  async handleExport(referenceImageUrl) {
    const { jsPDF, html2canvas } = await this.getExportDependencies();
    const doc = new jsPDF({
      orientation: this.state.orientation || 'landscape',
      unit: 'mm',
      format: this.state.paperSize || 'letter'
    });

    const dimensions = this.ui.getPaperDimensions(this.state.paperSize, this.state.orientation);
    let cachedBackSideUrl = null;

    const captureZine = async (sheetNum) => {
      const grid = document.querySelector(`#zine-grid-sheet-${sheetNum}`);
      if (!grid) return;

      const canvas = await html2canvas(grid, { scale: 2, allowTaint: true, backgroundColor: '#ffffff', logging: false });
      if (sheetNum > 1) doc.addPage();
      doc.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, dimensions.width, dimensions.height);

      doc.addPage();
      if (!cachedBackSideUrl) {
        const backCanvas = document.createElement('canvas');
        backCanvas.width = canvas.width;
        backCanvas.height = canvas.height;
        const bctx = backCanvas.getContext('2d');
        const refImg = new Image();
        await new Promise((resolve, reject) => {
          refImg.onload = resolve;
          refImg.onerror = reject;
          refImg.src = referenceImageUrl;
        });
        bctx.translate(backCanvas.width / 2, backCanvas.height / 2);
        bctx.rotate(Math.PI);
        bctx.drawImage(refImg, -backCanvas.width / 2, -backCanvas.height / 2, backCanvas.width, backCanvas.height);
        cachedBackSideUrl = backCanvas.toDataURL('image/jpeg', 0.9);
      }
      doc.addImage(cachedBackSideUrl, 'JPEG', 0, 0, dimensions.width, dimensions.height);
    };

    const grids = Array.from(document.querySelectorAll('.zine-grid'));
    for (let i = 0; i < grids.length; i++) {
      await captureZine(i + 1);
    }

    doc.save(`zine-${Date.now()}.pdf`);
    return true;
  }
}
