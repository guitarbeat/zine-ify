export class ExportService {
  constructor(ui, state) {
    this.ui = ui;
    this.state = state;
  }

  async handlePrint(referenceImageUrl) {
    const html = this.buildPrintHtml(
      this.buildSheetsHtml(referenceImageUrl),
      this.getPaperDimensions(),
      this.getGridCss()
    );
    this.openPrintWindow(html);
  }

  async handleExport(referenceImageUrl) {
    const pdf = await import('jspdf');
    const { jsPDF } = pdf;
    const doc = new jsPDF({
      orientation: this.state.orientation === 'landscape' ? 'landscape' : 'portrait',
      unit: 'mm',
      format: this.state.paperSize || 'letter'
    });

    const sheetsHtml = this.buildSheetsHtml(referenceImageUrl);
    const dimensions = this.getPaperDimensions();
    const gridCss = this.getGridCss();
    const printHtml = this.buildPrintHtml(sheetsHtml, dimensions, gridCss);
    doc.html(printHtml, {
      callback: (generated) => generated.save('zine.pdf'),
      autoPaging: 'text',
      margin: 0,
      html2canvas: { scale: 1 }
    });
  }

  buildPrintHtml(sheetsHtml, dimensions, gridCss) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
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
          .page-label, .page-placeholder, .crop-btn, .remove-btn, .flip-btn { display: none !important; }
        </style>
      </head>
      <body>
        ${sheetsHtml}
      </body>
      </html>
    `;
  }

  buildSheetsHtml(referenceImageUrl) {
    return `<div class="sheet"><img alt="Reference" src="${referenceImageUrl}"></div>`;
  }

  getPaperDimensions() {
    return this.state.paperSize === 'letter'
      ? { width: 216, height: 279 }
      : { width: 210, height: 297 };
  }

  getGridCss() {
    return 'grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(4, 1fr);';
  }

  openPrintWindow(html) {
    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (!win) {
      throw new Error('Unable to open print window.');
    }

    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }
}
