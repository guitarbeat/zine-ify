/**
 * Templates.js
 * Centralized HTML templates for UI components
 */

export const PAGE_CELL_TEMPLATE = document.createElement('template');
PAGE_CELL_TEMPLATE.innerHTML = `
  <span class="page-label"></span>
  <div class="page-toolbar absolute top-2 right-2 flex flex-wrap justify-end gap-2 z-10 max-w-[calc(100%-1rem)] transition-opacity duration-200 opacity-0 group-hover:opacity-100 focus-within:opacity-100" data-layout="row">
     <button class="zoom-btn w-8 h-8 bg-white border-2 border-black text-black flex items-center justify-center transition-all duration-100 focus:outline-none hover:bg-[var(--primary-vibrant)] hover:text-white" style="box-shadow: var(--shadow-sm);" aria-label="Quick Preview (Z)" title="Quick Preview (Z)">
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">zoom_in</span>
     </button>
     <button class="crop-btn w-8 h-8 bg-white border-2 border-black text-black flex items-center justify-center transition-all duration-100 focus:outline-none hover:bg-[var(--primary-vibrant)] hover:text-white" style="box-shadow: var(--shadow-sm);" aria-label="Toggle Crop/Zoom (C)" title="Toggle Crop/Zoom (C)">
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">crop_free</span>
     </button>
     <button class="flip-btn w-8 h-8 bg-white border-2 border-black text-black flex items-center justify-center transition-all duration-100 focus:outline-none hover:bg-[var(--primary-vibrant)] hover:text-white" style="box-shadow: var(--shadow-sm);" aria-label="Flip 180° (R)" title="Flip 180° (R)">
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">rotate_right</span>
     </button>
     <button class="remove-btn w-8 h-8 bg-white border-2 border-black text-black flex items-center justify-center transition-all duration-100 focus:outline-none hover:bg-red-500 hover:text-white" style="box-shadow: var(--shadow-sm);" aria-label="Remove Page (Backspace)" title="Remove Page (Backspace)">
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
     </button>
  </div>
  <div class="page-placeholder flex flex-col items-center justify-center gap-2 absolute inset-0">
     <span class="material-symbols-outlined text-3xl">note_stack</span>
     <span class="text-[10px] font-bold uppercase tracking-[0.18em]">Slot Empty</span>
  </div>
  <img class="page-content-img w-full h-full object-contain hidden transition-transform duration-200 ease-in-out relative z-[5] border-black" draggable="false" />
`;
