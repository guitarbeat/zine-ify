import { normalizePreviewPage } from './previewHelpers.js';

export const MINI_ZINE_LAYOUT = [

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
