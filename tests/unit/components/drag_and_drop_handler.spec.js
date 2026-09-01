import { test, expect } from '@playwright/test';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

test.describe('DragAndDropHandler', () => {
  let DragAndDropHandler;
  let dom;
  let emitter;
  let elements;
  let emitCalls = [];

  test.beforeAll(async () => {
    dom = new JSDOM('<!DOCTYPE html><body></body>', { url: 'http://localhost/' });
    global.window = dom.window;
    global.document = dom.window.document;
    // global.navigator = dom.window.navigator;
    global.HTMLElement = dom.window.HTMLElement;

    const module = await import('../../../src/components/UI/DragAndDropHandler.js');
    DragAndDropHandler = module.DragAndDropHandler;
  });

  test.afterAll(() => {
    delete global.window;
    delete global.document;
    delete global.navigator;
    delete global.HTMLElement;
  });

  test.beforeEach(() => {
    document.body.innerHTML = '<div id="unified-drop-zone"></div>';

    elements = {
      uploadZone: document.createElement('div')
    };

    emitCalls = [];
    emitter = {
      emit: (event, data) => emitCalls.push({ event, data })
    };
  });

  test('initializes properties correctly', () => {
    const handler = new DragAndDropHandler(elements, emitter);
    expect(handler.elements).toBe(elements);
    expect(handler.emitter).toBe(emitter);
    expect(handler._sortables).toEqual([]);
  });

  test('setupEventListeners handles uploadZone dragover', () => {
    const handler = new DragAndDropHandler(elements, emitter);
    handler.setupEventListeners();

    const dragoverEvent = new dom.window.Event('dragover');
    let preventDefaultCalled = false;
    dragoverEvent.preventDefault = () => { preventDefaultCalled = true; };

    elements.uploadZone.dispatchEvent(dragoverEvent);

    expect(preventDefaultCalled).toBe(true);
    expect(elements.uploadZone.classList.contains('dragover')).toBe(true);
  });

  test('setupEventListeners handles uploadZone dragleave', () => {
    const handler = new DragAndDropHandler(elements, emitter);
    handler.setupEventListeners();

    elements.uploadZone.classList.add('dragover');
    elements.uploadZone.dispatchEvent(new dom.window.Event('dragleave'));

    expect(elements.uploadZone.classList.contains('dragover')).toBe(false);
  });

  test('setupEventListeners handles uploadZone drop', () => {
    const handler = new DragAndDropHandler(elements, emitter);
    handler.setupEventListeners();

    elements.uploadZone.classList.add('dragover');
    const dropEvent = new dom.window.Event('drop');
    dropEvent.preventDefault = () => {};
    dropEvent.dataTransfer = {
      files: [{ name: 'test.pdf' }]
    };

    elements.uploadZone.dispatchEvent(dropEvent);

    expect(elements.uploadZone.classList.contains('dragover')).toBe(false);
    expect(emitCalls.length).toBe(1);
    expect(emitCalls[0].event).toBe('filesDropped');
    expect(emitCalls[0].data).toEqual([{ name: 'test.pdf' }]);
  });

  test('setupEventListeners ignores uploadZone drop with empty files', () => {
    const handler = new DragAndDropHandler(elements, emitter);
    handler.setupEventListeners();

    const dropEvent = new dom.window.Event('drop');
    dropEvent.preventDefault = () => {};
    dropEvent.dataTransfer = { files: [] };

    elements.uploadZone.dispatchEvent(dropEvent);
    expect(emitCalls.length).toBe(0);
  });

  test('setupEventListeners handles unified-drop-zone dragover', () => {
    const handler = new DragAndDropHandler(elements, emitter);
    handler.setupEventListeners();
    const zone = document.getElementById('unified-drop-zone');

    const dragoverEvent = new dom.window.Event('dragover');
    let preventDefaultCalled = false;
    dragoverEvent.preventDefault = () => { preventDefaultCalled = true; };
    dragoverEvent.dataTransfer = { types: ['Files'], dropEffect: 'none' };

    zone.dispatchEvent(dragoverEvent);

    expect(preventDefaultCalled).toBe(true);
    expect(dragoverEvent.dataTransfer.dropEffect).toBe('copy');
    expect(zone.classList.contains('drag-active')).toBe(true);
  });

  test('setupEventListeners ignores unified-drop-zone dragover if text/plain is included', () => {
    const handler = new DragAndDropHandler(elements, emitter);
    handler.setupEventListeners();
    const zone = document.getElementById('unified-drop-zone');

    const dragoverEvent = new dom.window.Event('dragover');
    let preventDefaultCalled = false;
    dragoverEvent.preventDefault = () => { preventDefaultCalled = true; };
    dragoverEvent.dataTransfer = { types: ['text/plain', 'Files'] };

    zone.dispatchEvent(dragoverEvent);

    expect(preventDefaultCalled).toBe(false);
    expect(zone.classList.contains('drag-active')).toBe(false);
  });

  test('setupEventListeners handles unified-drop-zone dragleave', () => {
    const handler = new DragAndDropHandler(elements, emitter);
    handler.setupEventListeners();
    const zone = document.getElementById('unified-drop-zone');
    zone.classList.add('drag-active');

    const dragleaveEvent = new dom.window.Event('dragleave');
    // Not related target inside the zone
    dragleaveEvent.relatedTarget = document.body;

    zone.dispatchEvent(dragleaveEvent);

    expect(zone.classList.contains('drag-active')).toBe(false);
  });

  test('setupEventListeners does not remove drag-active on dragleave if relatedTarget is inside', () => {
    const handler = new DragAndDropHandler(elements, emitter);
    handler.setupEventListeners();
    const zone = document.getElementById('unified-drop-zone');
    const child = document.createElement('div');
    zone.appendChild(child);
    zone.classList.add('drag-active');

    const dragleaveEvent = new dom.window.Event('dragleave');
    dragleaveEvent.relatedTarget = child;

    zone.dispatchEvent(dragleaveEvent);

    expect(zone.classList.contains('drag-active')).toBe(true);
  });

  test('setupEventListeners handles unified-drop-zone drop', () => {
    const handler = new DragAndDropHandler(elements, emitter);
    handler.setupEventListeners();
    const zone = document.getElementById('unified-drop-zone');
    zone.classList.add('drag-active');

    const dropEvent = new dom.window.Event('drop');
    let preventDefaultCalled = false;
    dropEvent.preventDefault = () => { preventDefaultCalled = true; };
    dropEvent.dataTransfer = { files: [{ name: 'external.pdf' }] };

    zone.dispatchEvent(dropEvent);

    expect(zone.classList.contains('drag-active')).toBe(false);
    expect(preventDefaultCalled).toBe(true);
    expect(emitCalls.length).toBe(1);
    expect(emitCalls[0].event).toBe('filesDropped');
    expect(emitCalls[0].data).toEqual([{ name: 'external.pdf' }]);
  });

  test('initSortable returns early if no gridEl provided', () => {
    const handler = new DragAndDropHandler(elements, emitter);
    const s = handler.initSortable(null);
    expect(s).toBeUndefined();
    expect(handler._sortables.length).toBe(0);
  });

  test('initSortable sets up Sortable and triggers onStart, onMove, onEnd events properly', () => {
    const handler = new DragAndDropHandler(elements, emitter);
    const gridEl = document.createElement('div');
    const s = handler.initSortable(gridEl);

    expect(s).toBeDefined();
    expect(handler._sortables.length).toBe(1);
    expect(handler._sortables[0]).toBe(s);

    expect(s.options.animation).toBe(160);

    // Test onStart
    const item = document.createElement('div');
    item.dataset.pageIndex = '1';
    s.options.onStart({ item });

    // Test onMove to another cell
    const rel = document.createElement('div');
    rel.classList.add('page-cell');
    rel.dataset.pageIndex = '3';
    const moveResult = s.options.onMove({ related: rel });
    expect(moveResult).toBe(true);

    // Test onEnd
    s.options.onEnd();

    expect(emitCalls.length).toBe(1);
    expect(emitCalls[0].event).toBe('pagesSwapped');
    expect(emitCalls[0].data).toEqual({ fromIndex: 1, toIndex: 3 });
  });

  test('initSortable onMove ignores non-page-cells', () => {
    const handler = new DragAndDropHandler(elements, emitter);
    const gridEl = document.createElement('div');
    const s = handler.initSortable(gridEl);

    const item = document.createElement('div');
    item.dataset.pageIndex = '1';
    s.options.onStart({ item });

    // Move to something that is NOT a page-cell
    const rel = document.createElement('div');
    s.options.onMove({ related: rel });

    s.options.onEnd();

    // Should NOT emit since targetPageIndex would be null
    expect(emitCalls.length).toBe(0);
  });

  test('initSortable onEnd does not emit if fromIndex and toIndex are same', () => {
    const handler = new DragAndDropHandler(elements, emitter);
    const gridEl = document.createElement('div');
    const s = handler.initSortable(gridEl);

    const item = document.createElement('div');
    item.dataset.pageIndex = '2';
    s.options.onStart({ item });

    const rel = document.createElement('div');
    rel.classList.add('page-cell');
    rel.dataset.pageIndex = '2'; // Same index
    s.options.onMove({ related: rel });

    s.options.onEnd();

    expect(emitCalls.length).toBe(0);
  });

  test('destroySortables destroys all tracked sortables', () => {
    const handler = new DragAndDropHandler(elements, emitter);
    const gridEl1 = document.createElement('div');
    const gridEl2 = document.createElement('div');

    const s1 = handler.initSortable(gridEl1);
    const s2 = handler.initSortable(gridEl2);

    expect(handler._sortables.length).toBe(2);

    let destroy1Called = false;
    let destroy2Called = false;

    // Override destroy method to test it's being called
    s1.destroy = () => { destroy1Called = true; };
    s2.destroy = () => { destroy2Called = true; };

    handler.destroySortables();

    expect(destroy1Called).toBe(true);
    expect(destroy2Called).toBe(true);
    expect(handler._sortables.length).toBe(0);
  });
});
