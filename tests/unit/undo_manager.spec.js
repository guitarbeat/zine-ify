import { test, expect } from '@playwright/test';
import { UndoManager } from '../../src/core/UndoManager.js';

test.describe('UndoManager', () => {
  test('constructor initializes with default values', () => {
    const manager = new UndoManager();
    expect(manager.size).toBe(0);
    expect(manager.isEmpty).toBe(true);
    expect(manager._max).toBe(20);
  });

  test('constructor allows setting custom maxHistory', () => {
    const manager = new UndoManager(5);
    expect(manager._max).toBe(5);
  });

  test('push adds an entry to the stack', () => {
    const manager = new UndoManager();
    const entry = {
      description: 'Test entry',
      allPageImages: ['image1', 'image2'],
      pageFlips: { 1: true },
      pageZooms: { 1: 1.5 },
    };

    manager.push(entry);

    expect(manager.size).toBe(1);
    expect(manager.isEmpty).toBe(false);
  });

  test('pop returns the most recent entry and removes it', () => {
    const manager = new UndoManager();
    const entry1 = { description: 'Entry 1' };
    const entry2 = { description: 'Entry 2' };

    manager.push(entry1);
    manager.push(entry2);

    expect(manager.size).toBe(2);

    const popped = manager.pop();
    expect(popped).toEqual(expect.objectContaining({ description: 'Entry 2' }));
    expect(manager.size).toBe(1);
  });

  test('pop returns null when stack is empty', () => {
    const manager = new UndoManager();
    expect(manager.pop()).toBeNull();
  });

  test('push prunes oldest entry when maxHistory is exceeded and calls onPrune', () => {
    const manager = new UndoManager(2);
    let pruneCount = 0;

    manager.push({ description: 'Entry 1', onPrune: () => pruneCount++ });
    manager.push({ description: 'Entry 2' });

    // Stack is full (size 2)
    expect(manager.size).toBe(2);
    expect(pruneCount).toBe(0);

    // Push a 3rd entry, should prune Entry 1
    manager.push({ description: 'Entry 3' });

    expect(manager.size).toBe(2);
    expect(pruneCount).toBe(1);

    // The remaining entries should be Entry 2 and Entry 3
    const topEntry = manager.pop();
    expect(topEntry.description).toBe('Entry 3');

    const bottomEntry = manager.pop();
    expect(bottomEntry.description).toBe('Entry 2');
  });

  test('push handles onPrune being null/undefined when pruning', () => {
    const manager = new UndoManager(1);
    // Push an entry with no onPrune
    manager.push({ description: 'Entry 1' });

    // Push another to force prune, should not throw
    expect(() => {
      manager.push({ description: 'Entry 2' });
    }).not.toThrow();

    expect(manager.size).toBe(1);
    expect(manager.pop().description).toBe('Entry 2');
  });

  test('clear empties the stack and calls onPrune for all entries', () => {
    const manager = new UndoManager();
    let pruneCount = 0;

    manager.push({ description: 'Entry 1', onPrune: () => pruneCount++ });
    manager.push({ description: 'Entry 2' }); // No onPrune
    manager.push({ description: 'Entry 3', onPrune: () => pruneCount++ });

    expect(manager.size).toBe(3);

    manager.clear();

    expect(manager.size).toBe(0);
    expect(manager.isEmpty).toBe(true);
    // Entry 1 and Entry 3 had onPrune callbacks
    expect(pruneCount).toBe(2);
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
});
