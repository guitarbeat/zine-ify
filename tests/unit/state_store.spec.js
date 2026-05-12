import { test, expect } from '@playwright/test';
import { StateStore } from '../../src/core/StateStore.js';

test.describe('StateStore', () => {
  let store;

  test.beforeEach(() => {
    store = new StateStore();
  });

  test('constructor initializes with correct default state', () => {
    expect(store.allPageImages.length).toBe(8);
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

  test('getFilledPageCount calculates correctly', () => {
    // Initially empty
    expect(store.getFilledPageCount()).toBe(0);

    // With a blank page url
    store._blankPageUrl = 'blank-url';
    store.allPageImages[0] = 'blank-url';
    expect(store.getFilledPageCount()).toBe(0);

    // With real pages
    store.allPageImages[0] = 'img1.jpg';
    expect(store.getFilledPageCount()).toBe(1);

    store.allPageImages[3] = 'img4.jpg';
    expect(store.getFilledPageCount()).toBe(4);

    // Check with null gaps
    store.allPageImages[2] = null;
    expect(store.getFilledPageCount()).toBe(4); // still 4 because index 3 is filled

    store.allPageImages[7] = 'img8.jpg';
    expect(store.getFilledPageCount()).toBe(8);
  });

  test('getRequiredPageCapacity calculates correctly based on grid size and total pages', () => {
    // Default 2x4 grid = 8 slots per sheet
    expect(store.getRequiredPageCapacity()).toBe(8); // min 1 sheet

    store.totalPages = 5;
    expect(store.getRequiredPageCapacity()).toBe(8);

    store.totalPages = 8;
    expect(store.getRequiredPageCapacity()).toBe(8);

    store.totalPages = 9;
    expect(store.getRequiredPageCapacity()).toBe(16); // needs 2 sheets

    // Change grid size to 1x2 = 2 slots per sheet
    store.gridSize = { rows: 1, cols: 2 };
    store.totalPages = 1;
    expect(store.getRequiredPageCapacity()).toBe(2);

    store.totalPages = 3;
    expect(store.getRequiredPageCapacity()).toBe(4);
  });

  test('isMiniZineLayout identifies 2x4 grid', () => {
    expect(store.isMiniZineLayout()).toBe(true); // Default is 2x4

    store.gridSize = { rows: 2, cols: 2 };
    expect(store.isMiniZineLayout()).toBe(false);

    store.gridSize = { rows: 4, cols: 2 };
    expect(store.isMiniZineLayout()).toBe(false);
  });

  test('workflow status markers update correctly', () => {
    expect(store.workflowPreviewed).toBe(false);
    expect(store.workflowExported).toBe(false);

    store.markPreviewed();
    expect(store.workflowPreviewed).toBe(true);
    expect(store.workflowExported).toBe(false);

    store.markExported();
    expect(store.workflowPreviewed).toBe(true);
    expect(store.workflowExported).toBe(true);

    store.resetWorkflowStatus();
    expect(store.workflowPreviewed).toBe(false);
    expect(store.workflowExported).toBe(false);
  });

  test('updatePaperSettings updates only provided values', () => {
    store.updatePaperSettings({ paperSize: 'a4' });
    expect(store.paperSize).toBe('a4');
    expect(store.orientation).toBe('landscape'); // unchanged

    store.updatePaperSettings({ orientation: 'portrait' });
    expect(store.paperSize).toBe('a4'); // unchanged
    expect(store.orientation).toBe('portrait');

    store.updatePaperSettings({ paperSize: 'legal', orientation: 'landscape' });
    expect(store.paperSize).toBe('legal');
    expect(store.orientation).toBe('landscape');
  });
});
