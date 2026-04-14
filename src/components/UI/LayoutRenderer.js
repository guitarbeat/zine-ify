import { getPageLabel } from '../../utils/previewHelpers.js';

/**
 * LayoutRenderer.js
 * Handles the rendering of zine sheets and grids
 */
export class LayoutRenderer {
  constructor(container, cellTemplate) {
    this.container = container;
    this.cellTemplate = cellTemplate;
  }

  render(numPages, template, options, handlers) {
    this.container.innerHTML = '';
    
    // Determine number of sheets needed based on template and pages
    const slotsPerSheet = template.grid.rows * template.grid.cols;
    const sheetCount = Math.max(1, Math.ceil(numPages / slotsPerSheet));

    for (let s = 0; s < sheetCount; s++) {
      const { sheetWrapper, grid } = this.createSheetGrid({
        sheetNumber: s + 1,
        template: template.label,
        columns: template.grid.cols,
        rows: template.grid.rows,
        id: `zine-grid-sheet-${s + 1}`
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

        const cell = this.createPageCell({
          pageIndex,
          pageNumber: pageNumberInSheet,
          labelText,
          altText: `Page ${overallPageNumber}`,
          upsideDown: slotConfig.upsideDown,
          options,
          handlers
        });

        if (template.gridAreas) {
          cell.style.gridArea = `page${pageNumberInSheet}`;
        }
        
        grid.appendChild(cell);
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

  createSheetGrid({ sheetNumber, template, columns, rows, id }) {
    const sheetWrapper = document.createElement('div');
    sheetWrapper.className = 'print-sheet w-full p-0 relative overflow-hidden rounded-sm';
    sheetWrapper.setAttribute('data-sheet', sheetNumber);
    sheetWrapper.setAttribute('data-template', template);

    const grid = document.createElement('div');
    grid.className = 'zine-grid';
    grid.id = id;
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    return { sheetWrapper, grid };
  }

  createPageCell({ pageIndex, pageNumber, labelText, altText, upsideDown, options, handlers }) {
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

    // Attach handlers
    cell.addEventListener('dragstart', (e) => handlers.onDragStart(e, cell));
    cell.addEventListener('dragover', (e) => handlers.onDragOver(e, cell));
    cell.addEventListener('dragleave', () => handlers.onDragLeave(cell));
    cell.addEventListener('drop', (e) => handlers.onDrop(e, cell));
    cell.addEventListener('dragend', () => handlers.onDragEnd(cell));
    cell.addEventListener('click', (e) => handlers.onClick(e, pageIndex));

    const toolbar = cell.querySelector('.page-toolbar');
    toolbar.querySelector('.flip-btn').onclick = (e) => { e.stopPropagation(); handlers.onFlip(pageIndex); };
    toolbar.querySelector('.zoom-btn').onclick = (e) => { e.stopPropagation(); handlers.onZoom(pageIndex); };
    toolbar.querySelector('.crop-btn').onclick = (e) => { e.stopPropagation(); handlers.onCrop(pageIndex); };
    toolbar.querySelector('.remove-btn').onclick = (e) => { e.stopPropagation(); handlers.onRemove(pageIndex); };

    return cell;
  }
}
