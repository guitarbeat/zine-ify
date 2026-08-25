/**
 * StateStore.js
 * Centralized state management for the Zine-ify application
 */
export class StateStore {
  constructor() {
    this.allPageImages = new Array(8).fill(null);
    this._blankPageUrl = null;
    this.pageFlips = {}; // { pageIndex: boolean }
    this.pageZooms = {}; // { pageIndex: boolean }
    this.gridSize = { rows: 2, cols: 4 };
    this.uploadedFiles = [];
    this.totalPages = 0;
    this.fileQueue = [];
    this.isProcessingQueue = false;
    this.workflowPreviewed = false;
    this.workflowExported = false;
    this.paperSize = 'letter';
    this.orientation = 'landscape';
    this.margin = 0;
  }

  getFilledPageCount() {
    let count = 0;
    for (let i = 0; i < this.allPageImages.length; i++) {
      if (this.allPageImages[i] && this.allPageImages[i] !== this._blankPageUrl) {
        count = i + 1;
      }
    }
    return count;
  }

  getRequiredPageCapacity() {
    const { rows, cols } = this.gridSize;
    const slotsPerSheet = rows * cols;
    return Math.max(slotsPerSheet, Math.ceil(Math.max(this.totalPages, 1) / slotsPerSheet) * slotsPerSheet);
  }

  isMiniZineLayout() {
    return (this.gridSize.rows === 2 && this.gridSize.cols === 4);
  }

  resetWorkflowStatus() {
    this.workflowPreviewed = false;
    this.workflowExported = false;
  }

  markExported() {
    this.workflowExported = true;
  }

  markPreviewed() {
    this.workflowPreviewed = true;
    this.workflowExported = false;
  }

  updatePaperSettings({ paperSize, orientation }) {
    if (paperSize) {
      this.paperSize = paperSize;
    }
    if (orientation) {
      this.orientation = orientation;
    }
  }
}
