/**
 * Templates.js
 * Centralized HTML templates for UI components
 */

export const PAGE_CELL_TEMPLATE = document.createElement('template');
PAGE_CELL_TEMPLATE.innerHTML = `
  <span class="page-label"></span>
  <div class="page-toolbar absolute top-1.5 right-1.5 flex items-center gap-1 z-10" data-layout="row">
    <button class="crop-btn page-tool-btn" aria-label="Toggle fit or fill for this page (C)" title="Fit — make the whole page visible. Fill — zoom to cover the slot. (C)">
      <span class="material-symbols-outlined page-tool-icon" aria-hidden="true">fit_screen</span>
      <span class="page-tool-label">Fit</span>
    </button>
    <button class="flip-btn page-tool-btn" aria-label="Rotate page 180 degrees (R)" title="Rotate 180° — flip the page upside-down. (R)">
      <span class="material-symbols-outlined page-tool-icon" aria-hidden="true">rotate_right</span>
      <span class="page-tool-label">Rotate</span>
    </button>
    <button class="remove-btn page-tool-btn page-tool-btn--danger" aria-label="Remove this page from the slot (Backspace)" title="Remove this page from the slot. (Backspace)">
      <span class="material-symbols-outlined page-tool-icon" aria-hidden="true">delete</span>
      <span class="page-tool-label">Remove</span>
    </button>
  </div>
  <div class="page-placeholder flex flex-col items-center justify-center gap-2 absolute inset-0">
     <span class="material-symbols-outlined text-3xl">note_stack</span>
     <span class="text-[10px] font-bold uppercase tracking-[0.18em]">Slot Empty</span>
  </div>
  <img class="page-content-img w-full h-full object-contain hidden transition-transform duration-200 ease-in-out relative z-[5]" draggable="false" />
`;