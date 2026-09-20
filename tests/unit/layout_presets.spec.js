import { test, expect } from '@playwright/test';
import { getLayoutPreset, mapReadingPageToPrint, buildPrintSheets, normalizeLayoutPreset, buildPrintCheck, getPresetOptions } from '../../src/utils/layoutPresets.js';

test.describe('layout presets', () => {
  test('mini zine maps reading pages to print slots', async () => {
    const preset = getLayoutPreset('mini-8');
    expect(preset.readingToPrintOrder).toEqual([5, 4, 3, 2, 6, 7, 8, 1]);
    expect(mapReadingPageToPrint(2, preset)).toEqual({ readingPage: 2, sheetIndex: 0, slotIndex: 3, rotation: 180 });
    expect(buildPrintSheets(preset, []).at(0).slots).toHaveLength(8);
  });

  test('unknown presets fall back safely', async () => {
    expect(getLayoutPreset('missing').id).toBe('layout-12');
    expect(normalizeLayoutPreset('custom', { rows: 3, cols: 2 }).capacity).toBe(6);
  });

  test('print check summarizes the active imposition', () => {
    const check = buildPrintCheck({ preset: 'mini-8', paperSize: 'letter', pageCount: 8, margin: 6 });
    expect(check.sheetCount).toBe(1);
    expect(check.duplex).toBe(true);
    expect(check.margins).toBe(6);
  });

  test('getPresetOptions returns non-custom layout options', () => {
    const options = getPresetOptions();
    expect(Array.isArray(options)).toBe(true);
    expect(options.length).toBeGreaterThan(0);
    expect(options.some((preset) => preset.id === 'custom')).toBe(false);
    expect(options.map((preset) => preset.id)).toEqual(
      expect.arrayContaining(['layout-12', 'mini-8', 'folded-4', 'booklet-8'])
    );
    options.forEach((preset) => {
      expect(preset).toHaveProperty('id');
      expect(preset).toHaveProperty('name');
      expect(preset).toHaveProperty('pageCount');
      expect(preset).toHaveProperty('sheetGrid');
    });
  });
});

// This file is intentionally kept small; the pure model is also consumed by browser tests.
export {};
