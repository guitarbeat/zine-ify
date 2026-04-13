import { normalizePreviewPage } from './previewHelpers.js';

export const MINI_ZINE_LAYOUT = [5, 4, 3, 2, 6, 7, 8, 1];
export const MINI_ZINE_UPSIDE_DOWN_PAGES = [2, 3, 4, 5];

export const MINI_ZINE_BOOKLET_SLOT_STATES = [
  { label: 'Cover', leftSlot: null, rightSlot: 7 },
  { label: 'Pages 2-3', leftSlot: 3, rightSlot: 2 },
  { label: 'Pages 4-5', leftSlot: 1, rightSlot: 0 },
  { label: 'Pages 6-7', leftSlot: 4, rightSlot: 5 },
  { label: 'Back', leftSlot: 6, rightSlot: null }
];

export function buildMiniZineSlotPages(previewPages, cellPageIndexes) {
  return cellPageIndexes.map((pageIndex, slotIndex) => {
    const fallbackPageNumber = Number.isInteger(pageIndex) ? pageIndex + 1 : slotIndex + 1;
    const page = normalizePreviewPage(previewPages[pageIndex], fallbackPageNumber);

    return {
      ...page,
      pageIndex,
      pageNumber: page.pageNumber,
      slotIndex
    };
  });
}

export function buildMiniZineBookletStates(slotPages) {
  return MINI_ZINE_BOOKLET_SLOT_STATES.map((state) => ({
    label: state.label,
    left: state.leftSlot === null ? null : slotPages[state.leftSlot] ?? null,
    right: state.rightSlot === null ? null : slotPages[state.rightSlot] ?? null
  }));
}
