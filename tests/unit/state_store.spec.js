import { test, expect } from '@playwright/test';
import { StateStore } from '../../src/core/StateStore.js';

test.describe('StateStore', () => {
  test('constructor initializes with default values', () => {
    const store = new StateStore();
    expect(store.allPageImages).toHaveLength(8);
    expect(store.allPageImages.every(img => img === null)).toBe(true);
    expect(store._blankPageUrl).toBeNull();
    expect(store.pageFlips).toEqual({});
    expect(store.pageZooms).toEqual({});
    expect(store.gridSize).toEqual({ rows: 2, cols: 4 });
    expect(store.uploadedFiles).toEqual([]);
    expect(store.totalPages).toBe(0);
    expect(store.fileQueue).toEqual([]);
    expect(store.isProcessingQueue).toBe(false);
    expect(store.workflowPreviewed).toBe(false);
    expect(store.workflowExported).toBe(false);
    expect(store.paperSize).toBe('letter');
    expect(store.orientation).toBe('landscape');
  });

  test('getFilledPageCount identifies highest filled index', () => {
    const store = new StateStore();
    store._blankPageUrl = 'blank-url';
    
    // Empty
    expect(store.getFilledPageCount()).toBe(0);

    // One image
    store.allPageImages[0] = 'img1';
    expect(store.getFilledPageCount()).toBe(1);

    // Blank page should not count as filled if it's the last one
    store.allPageImages[1] = 'blank-url';
    expect(store.getFilledPageCount()).toBe(1);

    // Image after blank page
    store.allPageImages[2] = 'img2';
    expect(store.getFilledPageCount()).toBe(3);

    // Multiple images
    store.allPageImages[7] = 'img7';
    expect(store.getFilledPageCount()).toBe(8);
  });

  test('getRequiredPageCapacity calculates correct slots', () => {
    const store = new StateStore();
    
    // Default 2x4 (8 slots)
    store.gridSize = { rows: 2, cols: 4 };
    
    store.totalPages = 0;
    expect(store.getRequiredPageCapacity()).toBe(8);

    store.totalPages = 5;
    expect(store.getRequiredPageCapacity()).toBe(8);

    store.totalPages = 8;
    expect(store.getRequiredPageCapacity()).toBe(8);

    store.totalPages = 9;
    expect(store.getRequiredPageCapacity()).toBe(16);

    // Custom 3x3 (9 slots)
    store.gridSize = { rows: 3, cols: 3 };
    store.totalPages = 5;
    expect(store.getRequiredPageCapacity()).toBe(9);

    store.totalPages = 10;
    expect(store.getRequiredPageCapacity()).toBe(18);
  });

  test('isMiniZineLayout identifies 2x4 grid', () => {
    const store = new StateStore();
    
    // Default is 2x4
    expect(store.isMiniZineLayout()).toBe(true);

    store.gridSize = { rows: 1, cols: 1 };
    expect(store.isMiniZineLayout()).toBe(false);

    store.gridSize = { rows: 2, cols: 4 };
    expect(store.isMiniZineLayout()).toBe(true);
  });

  test('workflow status methods update flags correctly', () => {
    const store = new StateStore();
    
    store.markPreviewed();
    expect(store.workflowPreviewed).toBe(true);
    expect(store.workflowExported).toBe(false);

    store.markExported();
    expect(store.workflowExported).toBe(true);

    store.resetWorkflowStatus();
    expect(store.workflowPreviewed).toBe(false);
    expect(store.workflowExported).toBe(false);

    store.markExported();
    store.markPreviewed(); // should reset exported
    expect(store.workflowPreviewed).toBe(true);
    expect(store.workflowExported).toBe(false);
  });

  test('updatePaperSettings updates only provided values', () => {
    const store = new StateStore();
    
    store.updatePaperSettings({ paperSize: 'a4' });
    expect(store.paperSize).toBe('a4');
    expect(store.orientation).toBe('landscape'); // unchanged

    store.updatePaperSettings({ orientation: 'portrait' });
    expect(store.paperSize).toBe('a4'); // preserved
    expect(store.orientation).toBe('portrait');

    store.updatePaperSettings({ paperSize: 'letter', orientation: 'landscape' });
    expect(store.paperSize).toBe('letter');
    expect(store.orientation).toBe('landscape');
  });
});
