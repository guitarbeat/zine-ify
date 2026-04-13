export const MINI_ZINE_LAYOUT = [
  { page: 5, upsideDown: true },
  { page: 4, upsideDown: true },
  { page: 3, upsideDown: true },
  { page: 2, upsideDown: true },
  { page: 6, upsideDown: false },
  { page: 7, upsideDown: false },
  { page: 8, upsideDown: false },
  { page: 1, upsideDown: false }
];

export const MINI_ZINE_UPSIDE_DOWN_PAGES = MINI_ZINE_LAYOUT
  .filter((item) => item.upsideDown)
  .map((item) => item.page);

export const MINI_ZINE_BOOKLET_SLOT_STATES = [
  { label: 'Cover', leftSlot: null, rightSlot: 7 },
  { label: 'Pages 2-3', leftSlot: 3, rightSlot: 2 },
  { label: 'Pages 4-5', leftSlot: 1, rightSlot: 0 },
  { label: 'Pages 6-7', leftSlot: 4, rightSlot: 5 },
  { label: 'Back', leftSlot: 6, rightSlot: null }
];

function normalizePreviewPage(page, fallbackPageNumber) {
  if (!page) {
    return {
      sourceUrl: null,
      previewUrl: null,
      pageNumber: fallbackPageNumber
    };
  }

  return {
    ...page,
    pageNumber: page.pageNumber ?? (Number.isInteger(page.pageIndex) ? page.pageIndex + 1 : fallbackPageNumber)
  };
}

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
