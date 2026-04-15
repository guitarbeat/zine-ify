import { test, expect } from '@playwright/test';
import { getPageLabel, normalizePreviewPage } from '../../src/utils/previewHelpers.js';

test.describe('Preview Helpers', () => {
  test('normalizes the current preview page shape without legacy aliases', () => {
    expect(normalizePreviewPage({
      sourceUrl: 'source.png',
      previewUrl: 'preview.png',
      pageNumber: 4,
      slotIndex: 2
    })).toEqual({
      sourceUrl: 'source.png',
      previewUrl: 'preview.png',
      pageNumber: 4,
      slotIndex: 2
    });
  });

  test('uses the provided fallback page number for string and blank entries', () => {
    expect(normalizePreviewPage('page.png', 3)).toEqual({
      sourceUrl: 'page.png',
      previewUrl: 'page.png',
      pageNumber: 3,
      slotIndex: null
    });

    expect(normalizePreviewPage(null, 7)).toEqual({
      sourceUrl: null,
      previewUrl: null,
      pageNumber: 7,
      slotIndex: null
    });
  });

  test('fills missing source and preview URLs from the current object shape', () => {
    expect(normalizePreviewPage({ previewUrl: 'preview.png' }, 2)).toEqual({
      previewUrl: 'preview.png',
      sourceUrl: 'preview.png',
      pageNumber: 2,
      slotIndex: null
    });

    expect(normalizePreviewPage({ sourceUrl: 'source.png' }, 5)).toEqual({
      sourceUrl: 'source.png',
      previewUrl: 'source.png',
      pageNumber: 5,
      slotIndex: null
    });
  });

  test('labels cover, back, and interior pages consistently', () => {
    expect(getPageLabel(1, 8)).toBe('Cover');
    expect(getPageLabel(8, 8)).toBe('Back');
    expect(getPageLabel(3, 8)).toBe('Page 3');
    expect(getPageLabel(3, 8, true)).toBe('P3');
  });
});
