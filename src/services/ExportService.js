import { PAPER_SIZES, ZINE_TEMPLATES } from '../utils/config.js';

const MM_TO_PX_300DPI = 300 / 25.4;

export class ExportService {
  constructor(ui, state) {
    this.ui = ui;
    this.state = state;
  }

  async _generatePdf() {
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

        // ⚡ Bolt: Process sheet canvases concurrently to improve export speed
    const sheetPromises = Array.from({ length: sheetCount }, async (_, sheetIndex) => {
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
        if (!url) { continue; }

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
            this._drawCell(ctx, img, { cellX, cellY, cellW, cellH, rotateDeg, scale, objectFit });
          })
        )
      );

      return offscreen.toDataURL('image/jpeg', 0.92);
    });

    const sheetImages = await Promise.all(sheetPromises);

    for (let sheetIndex = 0; sheetIndex < sheetImages.length; sheetIndex++) {
      if (sheetIndex > 0) {
        doc.addPage([dims.width, dims.height], isLandscape ? 'landscape' : 'portrait');
      }
      doc.addImage(sheetImages[sheetIndex], 'JPEG', 0, 0, dims.width, dims.height);
    }

    return doc;
  }

  async handleExport() {
    const doc = await this._generatePdf();
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

  _drawCell(ctx, img, config) {
    const { cellX, cellY, cellW, cellH, rotateDeg, scale, objectFit } = config;
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
    const doc = await this._generatePdf();
    doc.autoPrint();
    const blobUrl = doc.output('bloburl');
    await this.openPrintWindow(blobUrl);
  }

  getPaperDimensions() {
    const paper = PAPER_SIZES[this.state.paperSize] || PAPER_SIZES.letter;
    const isLandscape = this.state.orientation === 'landscape';
    return isLandscape
      ? { width: paper.height, height: paper.width }
      : { width: paper.width, height: paper.height };
  }

  async openPrintWindow(blobUrl) {
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.setAttribute('aria-hidden', 'true');
    printFrame.src = blobUrl;
    document.body.appendChild(printFrame);

    await new Promise((resolve) => {
      printFrame.onload = resolve;
      // Also resolve after a timeout just in case
      setTimeout(resolve, 1000);
    });

    // We don't need to manually call .print() because doc.autoPrint() was used,
    // which injects JS into the PDF to trigger print automatically when opened.
    // However, for iframes sometimes it's necessary, but we'll try without,
    // or just let the PDF handle it if supported. Some browsers require manual trigger.
    try {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
    } catch (e) { // eslint-disable-line no-unused-vars
      // Ignored: cross-origin frame access might throw depending on blob handling
    }

    // Give it time to open the print dialog before removing the iframe
    setTimeout(() => {
      printFrame.remove();
      URL.revokeObjectURL(blobUrl);
    }, 5000);
  }
}
