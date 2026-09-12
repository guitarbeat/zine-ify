import { test, expect } from '@playwright/test';
import { createRequire } from 'module';
import DOMPurify from 'dompurify';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

test.describe('Templates Component', () => {
  let dom;
  let originalWindow;
  let originalDocument;
  let originalPurifySanitize;
  let PAGE_CELL_TEMPLATE;

  test.beforeEach(async () => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost/'
    });

    originalWindow = global.window;
    originalDocument = global.document;
    originalPurifySanitize = DOMPurify.sanitize;

    global.window = dom.window;
    global.document = dom.window.document;

    const purify = DOMPurify(global.window);
    DOMPurify.sanitize = purify.sanitize;

    const templatesModule = await import('../../../../src/components/UI/Templates.js?test=' + Date.now());
    PAGE_CELL_TEMPLATE = templatesModule.PAGE_CELL_TEMPLATE;
  });

  test.afterEach(() => {
    global.window = originalWindow;
    global.document = originalDocument;
    DOMPurify.sanitize = originalPurifySanitize;
  });

  test('PAGE_CELL_TEMPLATE is an HTMLTemplateElement instance', () => {
    expect(PAGE_CELL_TEMPLATE).toBeDefined();
    expect(PAGE_CELL_TEMPLATE.nodeName).toBe('TEMPLATE');
    expect(PAGE_CELL_TEMPLATE.content).toBeDefined();
    expect(PAGE_CELL_TEMPLATE.content.nodeType).toBe(11); // DocumentFragment nodeType
  });

  test('PAGE_CELL_TEMPLATE contains required UI structure and elements', () => {
    const fragment = PAGE_CELL_TEMPLATE.content;

    // Check page label span
    const pageLabel = fragment.querySelector('.page-label');
    expect(pageLabel).not.toBeNull();

    // Check page toolbar and action buttons
    const pageToolbar = fragment.querySelector('.page-toolbar');
    expect(pageToolbar).not.toBeNull();
    const cropBtn = pageToolbar.querySelector('.crop-btn');
    expect(cropBtn).not.toBeNull();
    expect(cropBtn.getAttribute('aria-label')).toContain('Toggle fit or fill');
    const flipBtn = pageToolbar.querySelector('.flip-btn');
    expect(flipBtn).not.toBeNull();
    expect(flipBtn.getAttribute('aria-label')).toContain('Rotate page 180 degrees');

    // Check page placeholder
    const placeholder = fragment.querySelector('.page-placeholder');
    expect(placeholder).not.toBeNull();
    expect(placeholder.querySelector('.page-placeholder-hint').textContent).toBe('click to add');

    // Check remove button
    const removeBtn = fragment.querySelector('.page-cell-remove-hint');
    expect(removeBtn).not.toBeNull();
    expect(removeBtn.getAttribute('aria-label')).toBe('Remove page');

    // Check image element
    const img = fragment.querySelector('img.page-content-img');
    expect(img).not.toBeNull();
    expect(img.getAttribute('draggable')).toBe('false');
  });

  test('PAGE_CELL_TEMPLATE can be cloned properly', () => {
    const clone = PAGE_CELL_TEMPLATE.content.cloneNode(true);
    expect(clone).toBeDefined();
    expect(clone.querySelector('.page-label')).not.toBeNull();
    expect(clone.querySelector('.crop-btn')).not.toBeNull();
    expect(clone.querySelector('.page-content-img')).not.toBeNull();
  });
});
