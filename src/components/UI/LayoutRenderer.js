import { getPageLabel } from '../../utils/previewHelpers.js';

const TOOLBAR_BUTTONS = [
  {
    selector: '.crop-btn',
    title: (label) => `Fit / Fill ${label} — toggle between showing the full page or filling the slot`,
    ariaLabel: (label) => `Toggle fit or fill for ${label} (C)`
  },
  {
    selector: '.flip-btn',
    title: (label) => `Rotate ${label} 180° — flip the page upside-down`,
    ariaLabel: (label) => `Rotate ${label} 180 degrees (R)`
  }
];

/**
 * LayoutRenderer.js
 * Handles the rendering of zine sheets and grids
 */
export class LayoutRenderer {
  constructor(container, cellTemplate) {
    this.container = container;
    this.cellTemplate = cellTemplate;
  }

  render(numPages, template, options, handlers, paper = {}) {
    this.container.innerHTML = '';
    
    // Determine number of sheets needed based on template and pages
    const slotsPerSheet = template.grid.rows * template.grid.cols;
    const sheetCount = Math.max(1, Math.ceil(numPages / slotsPerSheet));

    for (let s = 0; s < sheetCount; s++) {
      const { sheetWrapper, grid } = this.createSheetGrid({
        sheetNumber: s + 1,
        template,
        id: `zine-grid-sheet-${s + 1}`,
        paper
      });

      if (template.gridAreas) {
        grid.style.gridTemplateAreas = template.gridAreas;
      }

      // Fill grid based on template layout or sequential order
      for (let i = 0; i < slotsPerSheet; i++) {
        const slotConfig = this.normalizeSlotConfig(template, i);
        const pageNumberInSheet = slotConfig.page;
        const pageIndex = (s * slotsPerSheet) + (pageNumberInSheet - 1);
        const overallPageNumber = pageIndex + 1;

        const labelText = getPageLabel(overallPageNumber, numPages, true);
        const accessibleLabelText = getPageLabel(overallPageNumber, numPages, false);

        const cell = this.createPageCell({
          pageIndex,
          pageNumber: pageNumberInSheet,
          labelText,
          accessibleLabelText,
          altText: `${accessibleLabelText} preview`,
          upsideDown: slotConfig.upsideDown,
          options,
          handlers
        });

        if (template.gridAreas) {
          cell.style.gridArea = `page${pageNumberInSheet}`;
        }
        
        grid.appendChild(cell);
      }

      if (template.cutLines?.horizontal) {
        const { afterRow, fromPct = 0, toPct = 100 } = template.cutLines.horizontal;
        const cutLine = document.createElement('div');
        cutLine.className = 'sheet-cut-line sheet-cut-line-h';
        cutLine.setAttribute('aria-hidden', 'true');
        cutLine.style.top = `${(afterRow / template.grid.rows) * 100}%`;
        cutLine.style.left = `${fromPct}%`;
        cutLine.style.right = `${100 - toPct}%`;
        const label = document.createElement('span');
        label.className = 'sheet-cut-line-label';
        label.textContent = 'Cut here';
        cutLine.appendChild(label);
        grid.appendChild(cutLine);
      }

      sheetWrapper.appendChild(grid);
      this.container.appendChild(sheetWrapper);
    }
  }

  normalizeSlotConfig(template, index) {
    const rawSlot = template.layout ? template.layout[index] : null;
    if (typeof rawSlot === 'number') {
      return {
        page: rawSlot,
        upsideDown: Array.isArray(template.upsideDownPages) && template.upsideDownPages.includes(rawSlot)
      };
    }

    if (rawSlot && typeof rawSlot === 'object') {
      return {
        page: rawSlot.page,
        upsideDown: !!rawSlot.upsideDown
      };
    }

    return { page: index + 1, upsideDown: false };
  }

  createSheetGrid({ sheetNumber, template, id, paper }) {
    const sheetWrapper = document.createElement('div');
    sheetWrapper.className = 'print-sheet w-full p-0 relative overflow-hidden rounded-sm';
    sheetWrapper.setAttribute('data-sheet', sheetNumber);
    sheetWrapper.setAttribute('data-template', template.label);

    if (paper?.paperSize) {
      sheetWrapper.setAttribute('data-paper-size', paper.paperSize);
    }

    if (paper?.orientation) {
      sheetWrapper.setAttribute('data-paper-orientation', paper.orientation);
    }

    if (paper?.width && paper?.height) {
      const aspectRatio = `${paper.width} / ${paper.height}`;
      sheetWrapper.style.aspectRatio = aspectRatio;
    }

    if (paper?.width && paper?.height) {
      const scale = this.getResponsiveSheetScale(paper.width, paper.height);
      sheetWrapper.style.setProperty('--sheet-scale', String(scale));
    }

    const grid = document.createElement('div');
    grid.className = 'zine-grid';
    grid.id = id;
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(${template.grid.cols}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${template.grid.rows}, 1fr)`;

    if (paper?.margin > 0 && paper?.width && paper?.height) {
      const padX = (paper.margin / paper.width) * 100;
      const padY = (paper.margin / paper.height) * 100;
      grid.style.position = 'absolute';
      grid.style.left = `${padX}%`;
      grid.style.right = `${padX}%`;
      grid.style.top = `${padY}%`;
      grid.style.bottom = `${padY}%`;
      grid.style.width = 'auto';
      grid.style.height = 'auto';
    } else {
      grid.style.position = 'relative';
    }

    return { sheetWrapper, grid };
  }

  getResponsiveSheetScale(width, height) {
    if (!width || !height) {
      return 1;
    }

    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || width;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || height;
    const usableWidth = Math.max(320, viewportWidth - 32);
    const usableHeight = Math.max(320, viewportHeight - 180);
    const sheetRatio = width / height;
    const viewportRatio = usableWidth / usableHeight;

    if (sheetRatio > viewportRatio) {
      return Math.min(1, usableWidth / width);
    }

    return Math.min(1, usableHeight / height);
  }

  createPageCell(config) {
    const { pageIndex, pageNumber, labelText, accessibleLabelText, altText, upsideDown, options, handlers } = config;
    const cell = document.createElement('div');
    cell.className = 'page-cell h-full w-full bg-white relative flex items-center justify-center overflow-hidden transition-all duration-200 group';
    cell.setAttribute('data-page-index', pageIndex);
    cell.setAttribute('data-page', pageNumber);
    cell.setAttribute('draggable', 'true');

    if (upsideDown) {
      cell.classList.add('is-template-upside-down');
    }

    cell.replaceChildren(this.cellTemplate.content.cloneNode(true));
    const label = cell.querySelector('.page-label');
    label.textContent = labelText;
    if (!options.pageNumbersVisible) {
      label.classList.add('hidden');
    }

    const img = cell.querySelector('.page-content-img');
    img.alt = altText;

    cell.addEventListener('dragstart', (e) => handlers.onDragStart(e, cell));
    cell.addEventListener('dragover', (e) => handlers.onDragOver(e, cell));
    cell.addEventListener('dragleave', (e) => handlers.onDragLeave(cell, e));
    cell.addEventListener('drop', (e) => handlers.onDrop(e, cell));
    cell.addEventListener('dragend', () => handlers.onDragEnd(cell));
    cell.addEventListener('click', (e) => handlers.onClick(e, pageIndex));

    const toolbar = cell.querySelector('.page-toolbar');
    TOOLBAR_BUTTONS.forEach(({ selector, title, ariaLabel }) => {
      const button = toolbar.querySelector(selector);
      if (!button) {
        return;
      }

      button.type = 'button';
      button.setAttribute('title', title(accessibleLabelText));
      button.setAttribute('aria-label', ariaLabel(accessibleLabelText));
    });

    const flipBtn = toolbar.querySelector('.flip-btn');
    if (flipBtn) {flipBtn.onclick = (e) => { e.stopPropagation(); handlers.onFlip(pageIndex); };}

    const cropBtn = toolbar.querySelector('.crop-btn');
    if (cropBtn) {cropBtn.onclick = (e) => { e.stopPropagation(); handlers.onCrop(pageIndex); };}

    return cell;
  }
}
