/**
 * UndoManager.js
 * Lightweight undo stack for page-level operations.
 * Each entry is a snapshot of allPageImages / pageFlips / pageZooms.
 * onPrune is called when an entry is pushed off the bottom of the stack,
 * giving the caller a chance to free resources (e.g. revoke blob URLs).
 */
export class UndoManager {
  constructor(maxHistory = 20) {
    this._stack = [];
    this._max = maxHistory;
  }

  /** Push a snapshot onto the stack. Prunes the oldest entry if full. */
  push({ description, allPageImages, pageFlips, pageZooms, onPrune = null }) {
    this._stack.push({ description, allPageImages, pageFlips, pageZooms, onPrune });
    if (this._stack.length > this._max) {
      const pruned = this._stack.shift();
      pruned.onPrune?.();
    }
  }

  /** Pop the most-recent snapshot (returns null when empty). */
  pop() {
    return this._stack.pop() ?? null;
  }

  /** Clear the entire stack, calling onPrune for each entry. */
  clear() {
    while (this._stack.length) {
      this._stack.pop()?.onPrune?.();
    }
  }

  get size() { return this._stack.length; }
  get isEmpty() { return this._stack.length === 0; }
}
