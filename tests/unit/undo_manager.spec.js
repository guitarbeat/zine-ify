import { test, expect } from '@playwright/test';
import { UndoManager } from '../../src/core/UndoManager.js';

test.describe('UndoManager', () => {
  test('constructor initializes with default values', () => {
    const manager = new UndoManager();
    expect(manager.size).toBe(0);
    expect(manager.isEmpty).toBe(true);
    expect(manager._max).toBe(20);
  });

  test('push adds entry to stack', () => {
    const manager = new UndoManager();
    manager.push({
      description: 'Test action',
      allPageImages: ['image1'],
      pageFlips: {},
      pageZooms: {}
    });
    expect(manager.size).toBe(1);
    expect(manager.isEmpty).toBe(false);
  });

  test('pop removes and returns top entry', () => {
    const manager = new UndoManager();
    const entry = {
      description: 'Test action',
      allPageImages: ['image1'],
      pageFlips: {},
      pageZooms: {}
    };
    manager.push(entry);

    const popped = manager.pop();
    expect(popped).toEqual(expect.objectContaining({
        description: 'Test action',
        allPageImages: ['image1']
    }));
    expect(manager.size).toBe(0);
  });

  test('pop returns null when empty', () => {
    const manager = new UndoManager();
    expect(manager.pop()).toBeNull();
  });

  test('prunes oldest entry when max history is exceeded', () => {
    const manager = new UndoManager(2); // Set max history to 2
    let prunedCount = 0;
    const onPrune = () => prunedCount++;

    manager.push({ description: '1', onPrune });
    manager.push({ description: '2', onPrune });
    expect(manager.size).toBe(2);
    expect(prunedCount).toBe(0);

    // This should push out the first entry
    manager.push({ description: '3', onPrune });
    expect(manager.size).toBe(2);
    expect(prunedCount).toBe(1);

    // Verify the remaining entries
    const pop1 = manager.pop();
    expect(pop1.description).toBe('3');
    const pop2 = manager.pop();
    expect(pop2.description).toBe('2');
  });

  test('clear empties stack and calls onPrune for all entries', () => {
    const manager = new UndoManager();
    let prunedCount = 0;
    const onPrune = () => prunedCount++;

    manager.push({ description: '1', onPrune });
    manager.push({ description: '2', onPrune });
    manager.push({ description: '3', onPrune });

    expect(manager.size).toBe(3);
    manager.clear();

    expect(manager.size).toBe(0);
    expect(manager.isEmpty).toBe(true);
    expect(prunedCount).toBe(3);
  });

  test('push retains all snapshot properties', () => {
    const manager = new UndoManager();
    const entry = {
      description: 'Test properties',
      allPageImages: ['img1'],
      pageFlips: { 0: false },
      pageZooms: { 0: 2.0 },
      onPrune: () => {}
    };

    manager.push(entry);
    const popped = manager.pop();

    expect(popped.description).toBe('Test properties');
    expect(popped.allPageImages).toEqual(['img1']);
    expect(popped.pageFlips).toEqual({ 0: false });
    expect(popped.pageZooms).toEqual({ 0: 2.0 });
    expect(popped.onPrune).toBe(entry.onPrune);
  });

  test('pop does not call onPrune', () => {
    const manager = new UndoManager();
    let pruneCalled = false;
    manager.push({
      description: 'Test pop',
      onPrune: () => { pruneCalled = true; }
    });

    manager.pop();
    expect(pruneCalled).toBe(false);
  });

  test('clear does nothing and does not throw on empty stack', () => {
    const manager = new UndoManager();
    expect(() => manager.clear()).not.toThrow();
    expect(manager.size).toBe(0);
  });

  test('push handles maxHistory of 0 by immediately pruning', () => {
    const manager = new UndoManager(0);
    let pruneCalled = false;

    manager.push({
      description: 'Test max 0',
      onPrune: () => { pruneCalled = true; }
    });

    expect(manager.size).toBe(0);
    expect(pruneCalled).toBe(true);
  });

  test('push throws TypeError if no arguments are provided', () => {
    const manager = new UndoManager();
    expect(() => manager.push()).toThrow(TypeError);
  });

  test('crop-toggle scenario: push snapshot, verify size, pop, verify size and description', () => {
    // NOTE: This test covers the UndoManager data structure only (push/pop round-trip).
    // Testing the full AppController.handleUndo path (which restores state.pageZooms)
    // requires a complete DOM environment (window, document, canvas, PDF.js, etc.) that
    // is not available in unit tests. The state restoration logic is in
    // AppController.handleUndo and is not currently covered by automated tests.
    const manager = new UndoManager();

    manager.push({
      description: 'Page 1 crop applied',
      allPageImages: ['img1', 'img2'],
      pageFlips: { 0: false },
      pageZooms: { 0: 1.0 }
    });

    expect(manager.size).toBe(1);

    const popped = manager.pop();

    expect(manager.size).toBe(0);
    expect(popped.description).toBe('Page 1 crop applied');
  });

  test('push correctly handles missing properties by destructuring undefined', () => {
    const manager = new UndoManager();
    manager.push({});
    const popped = manager.pop();
    expect(popped.description).toBeUndefined();
    expect(popped.allPageImages).toBeUndefined();
    expect(popped.pageFlips).toBeUndefined();
    expect(popped.pageZooms).toBeUndefined();
    expect(popped.onPrune).toBeNull();
  });
  test('push correctly handles partial properties and defaults missing ones', () => {
    const manager = new UndoManager();
    manager.push({ description: 'Only description' });
    const popped = manager.pop();
    expect(popped.description).toBe('Only description');
    expect(popped.allPageImages).toBeUndefined();
    expect(popped.pageFlips).toBeUndefined();
    expect(popped.pageZooms).toBeUndefined();
    expect(popped.onPrune).toBeNull();
  });

  test('prunes entry with missing or default onPrune without throwing', () => {
    const manager = new UndoManager(1);
    manager.push({ description: 'First entry with no onPrune' });
    expect(() => manager.push({ description: 'Second entry' })).not.toThrow();
    expect(manager.size).toBe(1);
    expect(manager.pop().description).toBe('Second entry');
  });
});
