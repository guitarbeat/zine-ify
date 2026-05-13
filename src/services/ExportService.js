import { PAPER_SIZES, ZINE_TEMPLATES } from '../utils/config.js';

const MM_TO_PX_300DPI = 300 / 25.4;

export class ExportService {
  constructor(ui, state) {
    this.ui = ui;
    this.state = state;
  }

  async handleExport() {
    const { rows, cols } = this.state.gridSize;
    const slotsPerSheet = rows * cols;
    const totalSlots = this.state.allPageImages.length;
    const sheetCount = Math.max(1, Math.ceil(totalSlots / slotsPerSheet));
    const template = rows === 2 && cols === 4 ? ZINE_TEMPLATES['mini-8'] : null;

    const filledSlots = this.state.allPageImages.filter(Boolean);
    if (!filledSlots.length) {
      throw new Error('No pages to export.');
    }

    const { jsPDF } = await import('jspdf').then((m) => m);

    const dims = this.getPaperDimensions();
    const isLandscape = this.state.orientation === 'landscape';

    const doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [dims.width, dims.height]
    });

    const marginMm = this.state.margin || 0;
    const marginPx = Math.round(marginMm * MM_TO_PX_300DPI);
    const canvasW = Math.round(dims.width * MM_TO_PX_300DPI);
    const canvasH = Math.round(dims.height * MM_TO_PX_300DPI);
    const drawW = canvasW - 2 * marginPx;
    const drawH = canvasH - 2 * marginPx;
    const cellW = drawW / cols;
    const cellH = drawH / rows;

    for (let sheetIndex = 0; sheetIndex < sheetCount; sheetIndex++) {
      const offscreen = document.createElement('canvas');
      offscreen.width = canvasW;
      offscreen.height = canvasH;
      const ctx = offscreen.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasW, canvasH);

      const draws = [];

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

        const pageIndex = (sheetIndex * slotsPerSheet) + (pageNum - 1);
        const url = this.state.allPageImages[pageIndex];
        if (!url) {continue;}

        const isFlipped = !!this.state.pageFlips[pageIndex];
        const isZoomed = !!this.state.pageZooms[pageIndex];
        const rotateDeg = (upsideDown !== isFlipped) ? 180 : 0;
        const scale = isZoomed ? 1.1 : 1;
        const objectFit = isZoomed ? 'cover' : 'contain';

        const row = Math.floor(slot / cols);
        const col = slot % cols;
        const cellX = marginPx + col * cellW;
        const cellY = marginPx + row * cellH;

        draws.push({ url, cellX, cellY, rotateDeg, scale, objectFit });
      }

      await Promise.all(
        draws.map(({ url, cellX, cellY, rotateDeg, scale, objectFit }) =>
          this._loadImage(url).then((img) => {
            this._drawCell(ctx, img, cellX, cellY, cellW, cellH, rotateDeg, scale, objectFit);
          })
        )
      );

      const imgData = offscreen.toDataURL('image/jpeg', 0.92);
      if (sheetIndex > 0) {
        doc.addPage([dims.width, dims.height], isLandscape ? 'landscape' : 'portrait');
      }
      doc.addImage(imgData, 'JPEG', 0, 0, dims.width, dims.height);
    }

    doc.save('zine.pdf');
  }

  _loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  _drawCell(ctx, img, cellX, cellY, cellW, cellH, rotateDeg, scale, objectFit) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(cellX, cellY, cellW, cellH);
    ctx.clip();

    const cx = cellX + cellW / 2;
    const cy = cellY + cellH / 2;
    ctx.translate(cx, cy);

    if (rotateDeg) {
      ctx.rotate((rotateDeg * Math.PI) / 180);
    }

    const imgAspect = img.naturalWidth / img.naturalHeight;
    const cellAspect = cellW / cellH;
    let drawW, drawH;

    if (objectFit === 'cover') {
      if (imgAspect > cellAspect) {
        drawH = cellH * scale;
        drawW = drawH * imgAspect;
      } else {
        drawW = cellW * scale;
        drawH = drawW / imgAspect;
      }
    } else {
      if (imgAspect > cellAspect) {
        drawW = cellW * scale;
        drawH = drawW / imgAspect;
      } else {
        drawH = cellH * scale;
        drawW = drawH * imgAspect;
      }
    }

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }

  async handlePrint() {
    const dims = this.getPaperDimensions();
    const sheetsHtml = this.buildSheetsHtml();
    const html = this.buildPrintHtml(sheetsHtml, dims);
    await this.openPrintWindow(html);
  }

  buildSheetsHtml() {
    const { rows, cols } = this.state.gridSize;
    const slotsPerSheet = rows * cols;
    const isMini8 = rows === 2 && cols === 4;
    const template = isMini8 ? ZINE_TEMPLATES['mini-8'] : null;
    const totalSlots = this.state.allPageImages.length;
    const sheetCount = Math.max(1, Math.ceil(totalSlots / slotsPerSheet));
    const dims = this.getPaperDimensions();
    const marginMm = this.state.margin || 0;
    const gridW = dims.width - 2 * marginMm;
    const gridH = dims.height - 2 * marginMm;

    const gridStyle = template?.gridAreas
      ? `display:grid;grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},1fr);grid-template-areas:${template.gridAreas.trim().split('\n').map((l) => l.trim()).join(' ')};width:${gridW}mm;height:${gridH}mm;`
      : `display:grid;grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},1fr);width:${gridW}mm;height:${gridH}mm;`;

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

        const rotateDeg = (upsideDown !== isFlipped) ? 180 : 0;
        const scale = isZoomed ? '1.1' : '1';
        const objectFit = isZoomed ? 'cover' : 'contain';

        const areaStyle = template?.gridAreas ? `grid-area:page${pageNum};` : '';
        const cellStyle = `position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;${areaStyle}`;
        const imgStyle = `width:100%;height:100%;object-fit:${objectFit};transform:rotate(${rotateDeg}deg) scale(${scale});`;

        cells += url
          ? `<div style="${cellStyle}"><img src="${url}" style="${imgStyle}" alt="Page ${pageNum}"></div>`
          : `<div style="${cellStyle};background:#f0f0f0;"></div>`;
      }

      html += `<div class="sheet" style="width:${dims.width}mm;height:${dims.height}mm;overflow:hidden;page-break-after:always;display:flex;align-items:center;justify-content:center;"><div style="${gridStyle}">${cells}</div></div>`;
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
      ? { width: paper.height, height: paper.width }
      : { width: paper.width, height: paper.height };
  }

  async openPrintWindow(html) {
    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
      await new Promise((resolve) => setTimeout(resolve, 500));
      win.print();
      return;
    }

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.setAttribute('aria-hidden', 'true');
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentDocument;
    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    await new Promise((resolve) => {
      printFrame.onload = resolve;
      setTimeout(resolve, 300);
    });

    printFrame.contentWindow?.focus();
    printFrame.contentWindow?.print();

    setTimeout(() => {
      printFrame.remove();
    }, 1000);
  }
}
