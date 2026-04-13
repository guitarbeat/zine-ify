/**
 * Templates.js
 * Centralized HTML templates for UI components
 */

export const PAGE_CELL_TEMPLATE = document.createElement('template');
PAGE_CELL_TEMPLATE.innerHTML = `
  <span class="page-label"></span>
  <div class="page-toolbar absolute top-1 right-1 flex flex-wrap justify-end gap-1 z-10 max-w-[calc(100%-0.5rem)] transition-opacity duration-200 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
     <button class="zoom-btn w-7 h-7 bg-white border-2 border-black text-black flex items-center justify-center transition-all duration-100 focus:outline-none hover:bg-[var(--primary-vibrant)] hover:text-white" style="box-shadow: 2px 2px 0px 0px black;" title="Quick Preview (Z)">
          <span class="material-symbols-outlined text-[16px]" aria-hidden="true">zoom_in</span>
     </button>
     <button class="crop-btn w-7 h-7 bg-white border-2 border-black text-black flex items-center justify-center transition-all duration-100 focus:outline-none hover:bg-[var(--primary-vibrant)] hover:text-white" style="box-shadow: 2px 2px 0px 0px black;" title="Toggle Crop/Zoom (C)">
          <span class="material-symbols-outlined text-[16px]" aria-hidden="true">crop_free</span>
     </button>
     <button class="flip-btn w-7 h-7 bg-white border-2 border-black text-black flex items-center justify-center transition-all duration-100 focus:outline-none hover:bg-[var(--primary-vibrant)] hover:text-white" style="box-shadow: 2px 2px 0px 0px black;" title="Flip 180° (R)">
          <span class="material-symbols-outlined text-[16px]" aria-hidden="true">rotate_right</span>
     </button>
     <button class="remove-btn w-7 h-7 bg-white border-2 border-black text-black flex items-center justify-center transition-all duration-100 focus:outline-none hover:bg-red-600 hover:text-white" style="box-shadow: 2px 2px 0px 0px black;" title="Remove Page (Backspace)">
          <span class="material-symbols-outlined text-[16px]" aria-hidden="true">close</span>
     </button>
  </div>
  <div class="page-placeholder flex flex-col items-center justify-center text-gray-400 gap-2 absolute inset-0">
     <span class="material-symbols-outlined text-3xl">note_stack</span>
     <span class="text-[10px] font-bold uppercase tracking-widest">Empty</span>
  </div>
  <img class="page-content-img w-full h-full object-contain hidden transition-transform duration-200 ease-in-out relative z-[5]" draggable="false" />
`;
