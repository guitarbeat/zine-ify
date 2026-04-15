import { test, expect } from '@playwright/test';
import {
  MINI_ZINE_LAYOUT,
  MINI_ZINE_UPSIDE_DOWN_PAGES,
  buildMiniZineSlotPages,
  buildMiniZineBookletStates
} from '../../src/utils/miniZineLayout.js';

test.describe('Mini Zine Layout', () => {
  test('matches the standard one-sheet imposition', () => {
    expect(MINI_ZINE_LAYOUT).toEqual([5, 4, 3, 2, 6, 7, 8, 1]);
    expect(MINI_ZINE_UPSIDE_DOWN_PAGES).toEqual([2, 3, 4, 5]);
  });

  test('derives booklet spreads from physical slot order', () => {
    const previewPages = Array.from({ length: 8 }, (_, index) => ({
      pageNumber: index + 1,
      previewUrl: `page-${index + 1}`
    }));
    const sheetSlotPageIndexes = [4, 3, 2, 1, 5, 6, 7, 0];

    const slotPages = buildMiniZineSlotPages(previewPages, sheetSlotPageIndexes);
    const bookletStates = buildMiniZineBookletStates(slotPages);

    expect(bookletStates.map((state) => state.label)).toEqual([
      'Cover',
      'Pages 2-3',
      'Pages 4-5',
      'Pages 6-7',
      'Back'
    ]);
    expect(bookletStates[0].right.pageNumber).toBe(1);
    expect(bookletStates[1].left.pageNumber).toBe(2);
    expect(bookletStates[1].right.pageNumber).toBe(3);
    expect(bookletStates[2].left.pageNumber).toBe(4);
    expect(bookletStates[2].right.pageNumber).toBe(5);
    expect(bookletStates[3].left.pageNumber).toBe(6);
    expect(bookletStates[3].right.pageNumber).toBe(7);
    expect(bookletStates[4].left.pageNumber).toBe(8);
  });

  test('cover changes when the physical slot order changes', () => {
    const previewPages = Array.from({ length: 8 }, (_, index) => ({
      pageNumber: index + 1,
      previewUrl: `page-${index + 1}`
    }));
    const swappedSheetSlotPageIndexes = [0, 3, 2, 1, 5, 6, 7, 4];

    const slotPages = buildMiniZineSlotPages(previewPages, swappedSheetSlotPageIndexes);
    const bookletStates = buildMiniZineBookletStates(slotPages);

    expect(bookletStates[0].right.pageNumber).toBe(5);
  });
});
