import { PAPER_SIZES, ZINE_TEMPLATES } from '../utils/config.js';

export class ExportService {
  constructor(ui, state) {
    this.ui = ui;
    this.state = state;
  }

  async handleExport() {
    const sheets = Array.from(
      this.ui.elements.zineSheetsContainer?.querySelectorAll('.print-sheet') || []
    );

    if (!sheets.length) {
      throw new Error('No sheets found to export.');
    }

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf').then((m) => m)
    ]);

    const dims = this.getPaperDimensions();
    const isLandscape = this.state.orientation === 'landscape';

    const doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [dims.width, dims.height]
    });

    for (let i = 0; i < sheets.length; i++) {
      const sheet = sheets[i];
      const canvas = await html2canvas(sheet, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.92);

      if (i > 0) {
        doc.addPage([dims.width, dims.height], isLandscape ? 'landscape' : 'portrait');
      }

      doc.addImage(imgData, 'JPEG', 0, 0, dims.width, dims.height);
    }

    doc.save('zine.pdf');
  }

  async handlePrint() {
    const dims = this.getPaperDimensions();
    const sheetsHtml = this.buildSheetsHtml();
    const html = this.buildPrintHtml(sheetsHtml, dims);
    this.openPrintWindow(html);
  }

  buildSheetsHtml() {
    const { rows, cols } = this.state.gridSize;
    const slotsPerSheet = rows * cols;
    const isMini8 = rows === 2 && cols === 4;
    const template = isMini8 ? ZINE_TEMPLATES['mini-8'] : null;
    const totalSlots = this.state.allPageImages.length;
    const sheetCount = Math.max(1, Math.ceil(totalSlots / slotsPerSheet));
    const dims = this.getPaperDimensions();

    const gridStyle = template?.gridAreas
      ? `display:grid;grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},1fr);grid-template-areas:${template.gridAreas.trim().split('\n').map((l) => l.trim()).join(' ')};width:${dims.width}mm;height:${dims.height}mm;`
      : `display:grid;grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},1fr);width:${dims.width}mm;height:${dims.height}mm;`;

    let html = '';

    for (let s = 0; s < sheetCount; s++) {
      let cells = '';

      for (let slot = 0; slot < slotsPerSheet; slot++) {
        const rawSlot = template?.layout ? template.layout[slot] : null;
        let pageNum, upsideDown;

        if (typeof rawSlot === 'number') {
          pageNum = rawSlot;
          upsideDown = template.upsideDownPages?.includes(rawSlot) ?? false;
        } else if (rawSlot && typeof rawSlot === 'object') {
          pageNum = rawSlot.page;
          upsideDown = !!rawSlot.upsideDown;
        } else {
          pageNum = slot + 1;
          upsideDown = false;
        }

        const pageIndex = (s * slotsPerSheet) + (pageNum - 1);
        const url = this.state.allPageImages[pageIndex] || null;
        const isFlipped = !!this.state.pageFlips[pageIndex];
        const isZoomed = !!this.state.pageZooms[pageIndex];

        const rotation = (upsideDown && isFlipped) ? '0deg' : upsideDown ? '180deg' : isFlipped ? '180deg' : '0deg';
        const scale = isZoomed ? '1.1' : '1';
        const objectFit = isZoomed ? 'cover' : 'contain';

        const areaStyle = template?.gridAreas ? `grid-area:page${pageNum};` : '';
        const cellStyle = `position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;${areaStyle}`;
        const imgStyle = `width:100%;height:100%;object-fit:${objectFit};transform:rotate(${rotation}) scale(${scale});`;

        cells += url
          ? `<div style="${cellStyle}"><img src="${url}" style="${imgStyle}" alt="Page ${pageNum}"></div>`
          : `<div style="${cellStyle};background:#f0f0f0;"></div>`;
      }

      html += `<div class="sheet" style="width:${dims.width}mm;height:${dims.height}mm;overflow:hidden;page-break-after:always;"><div style="${gridStyle}">${cells}</div></div>`;
    }

    return html;
  }

  buildPrintHtml(sheetsHtml, dims) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Print Zine</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: ${dims.width}mm ${dims.height}mm; margin: 0; }
    body { background: white; }
    .sheet { page-break-after: always; }
  </style>
</head>
<body>${sheetsHtml}</body>
</html>`;
  }

  getPaperDimensions() {
    const paper = PAPER_SIZES[this.state.paperSize] || PAPER_SIZES.letter;
    const isLandscape = this.state.orientation === 'landscape';
    return isLandscape
      ? { width: paper.width, height: paper.height }
      : { width: paper.height, height: paper.width };
  }

  openPrintWindow(html) {
    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (!win) {
      throw new Error('Unable to open print window. Please allow popups for this site.');
    }

    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  }
}
