export class ExportService {
  constructor(ui, state) {
    this.ui = ui;
    this.state = state;
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
}
