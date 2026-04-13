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
    
    if (template.pages === 16 && template.grid.rows === 4) {
      this.generateAccordionLayout(template, options, handlers);
    } else {
      this.generateMiniZineLayout(numPages, template, options, handlers);
    }
  }

  generateAccordionLayout(template, options, handlers) {
    const { sheetWrapper, grid } = this.createSheetGrid({
      sheetNumber: 1,
      template: 'accordion-16',
      columns: 4,
      rows: 4,
      id: 'zine-grid-sheet-1'
    });

    grid.classList.add('accordion-16');
    grid.style.gridTemplateAreas = template.gridAreas;

    for (let i = 0; i < 16; i++) {
      const pageIndex = i;
      const pageNum = i + 1;
      const labelText = pageNum === 1 ? 'Cover' : pageNum === 16 ? 'Back' : `P${pageNum}`;
      const cell = this.createPageCell({
        pageIndex,
        pageNumber: pageNum,
        labelText,
        altText: `Page ${pageNum}`,
        options,
        handlers
      });
      grid.appendChild(cell);
    }

    sheetWrapper.appendChild(grid);
    this.container.appendChild(sheetWrapper);
  }

  generateMiniZineLayout(numPages, template, options, handlers) {
    const sheetCount = Math.max(1, Math.ceil(numPages / 8));
    for (let s = 0; s < sheetCount; s++) {
      const { sheetWrapper, grid } = this.createSheetGrid({
        sheetNumber: s + 1,
        template: 'mini-8',
        columns: 4,
        rows: 2,
        id: `zine-grid-sheet-${s + 1}`
      });

      grid.classList.add('mini-zine');
      grid.style.gridTemplateAreas = template.gridAreas;

      for (let i = 0; i < 8; i++) {
        const pageIndex = (s * 8) + i;
        const pageNum = pageIndex + 1;
        const labelText = pageNum === 1 ? 'Cover' : pageNum === 8 ? 'Back' : `P${pageNum}`;
        const cell = this.createPageCell({
          pageIndex,
          pageNumber: i + 1,
          labelText,
          altText: `Page ${pageNum}`,
          options,
          handlers
        });
        grid.appendChild(cell);
      }

      sheetWrapper.appendChild(grid);
      this.container.appendChild(sheetWrapper);
    }
  }

  generateCustomGrid(rows, cols, totalPages, options, handlers) {
    this.container.innerHTML = '';
    const totalSlots = rows * cols;
    const sheetCount = Math.max(1, Math.ceil(totalPages / totalSlots));

    for (let s = 0; s < sheetCount; s++) {
      const { sheetWrapper, grid } = this.createSheetGrid({
        sheetNumber: s + 1,
        template: `custom-${rows}x${cols}`,
        columns: cols,
        rows,
        id: `zine-grid-sheet-${s + 1}`
      });

      for (let i = 0; i < totalSlots; i++) {
        const pageIndex = (s * totalSlots) + i;
        const pageNum = pageIndex + 1;
        const cell = this.createPageCell({
          pageIndex,
          pageNumber: i + 1,
          labelText: `P${pageNum}`,
          altText: `Page ${pageNum}`,
          options,
          handlers
        });
        grid.appendChild(cell);
      }

      sheetWrapper.appendChild(grid);
      this.container.appendChild(sheetWrapper);
    }
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

  createPageCell({ pageIndex, pageNumber, labelText, altText, options, handlers }) {
    const cell = document.createElement('div');
    cell.className = 'page-cell h-full w-full bg-white relative flex items-center justify-center overflow-hidden transition-all duration-200 group';
    cell.setAttribute('data-page-index', pageIndex);
    cell.setAttribute('data-page', pageNumber);
    cell.setAttribute('draggable', 'true');

    cell.replaceChildren(this.cellTemplate.content.cloneNode(true));
    const label = cell.querySelector('.page-label');
    label.textContent = labelText;
    if (!options.pageNumbersVisible) label.classList.add('hidden');

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
