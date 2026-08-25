import { test, expect } from '@playwright/test';
import {
    toMm,
    fromMm,
    formatDimension,
    resolvePaperSize
} from '../../src/utils/config.js';

test.describe('Config Utilities', () => {

    test.describe('toMm', () => {
        test('converts inches to mm correctly', () => {
            expect(toMm(1, 'in')).toBe(25.4);
            expect(toMm('2', 'in')).toBe(50.8);
        });

        test('returns same value for mm', () => {
            expect(toMm(10, 'mm')).toBe(10);
            expect(toMm('15.5', 'mm')).toBe(15.5);
        });

        test('returns 0 for non-numeric or falsy values', () => {
            expect(toMm('abc', 'in')).toBe(0);
            expect(toMm(null, 'mm')).toBe(0);
            expect(toMm(undefined, 'in')).toBe(0);
            expect(toMm(NaN, 'mm')).toBe(0);
        });
    });

    test.describe('fromMm', () => {
        test('converts mm to inches correctly', () => {
            expect(fromMm(25.4, 'in')).toBe(1);
            expect(fromMm('50.8', 'in')).toBe(2);
        });

        test('returns same value for mm', () => {
            expect(fromMm(10, 'mm')).toBe(10);
            expect(fromMm('15.5', 'mm')).toBe(15.5);
        });

        test('returns 0 for non-numeric or falsy values', () => {
            expect(fromMm('abc', 'in')).toBe(0);
            expect(fromMm(null, 'mm')).toBe(0);
            expect(fromMm(undefined, 'in')).toBe(0);
            expect(fromMm(NaN, 'mm')).toBe(0);
        });
    });

    test.describe('formatDimension', () => {
        test('formats in inches with 2 decimals', () => {
            expect(formatDimension(25.4, 'in')).toBe('1');
            expect(formatDimension(25.4 * 1.5, 'in')).toBe('1.5');
            // 25.4 * 1.555 = 39.497. 1.555 rounding can be 1.56
            expect(formatDimension(39.497, 'in')).toBe('1.56');
        });

        test('formats in mm with 0 decimals', () => {
            expect(formatDimension(10.4, 'mm')).toBe('10');
            expect(formatDimension(10.5, 'mm')).toBe('11');
            expect(formatDimension(10.6, 'mm')).toBe('11');
        });

        test('falls back to mm for unknown unit', () => {
            expect(formatDimension(10.5, 'unknown')).toBe('11');
        });
    });

    test.describe('resolvePaperSize', () => {
        test('resolves known paper sizes', () => {
            expect(resolvePaperSize('a4')).toEqual({ label: 'A4', width: 210, height: 297 });
            expect(resolvePaperSize('letter')).toEqual({ label: 'Letter', width: 215.9, height: 279.4 });
        });

        test('falls back to letter for unknown paper sizes', () => {
            expect(resolvePaperSize('unknown_size')).toEqual({ label: 'Letter', width: 215.9, height: 279.4 });
        });

        test('resolves valid custom paper size', () => {
            const customPaper = { width: 100, height: 150 };
            expect(resolvePaperSize('custom', customPaper)).toEqual({
                label: 'Custom',
                width: 100,
                height: 150
            });
        });

        test('falls back to letter if custom paper is missing or invalid', () => {
            expect(resolvePaperSize('custom', null)).toEqual({ label: 'Letter', width: 215.9, height: 279.4 });
            expect(resolvePaperSize('custom', { width: 0, height: 100 })).toEqual({ label: 'Letter', width: 215.9, height: 279.4 });
            expect(resolvePaperSize('custom', { width: 100, height: -5 })).toEqual({ label: 'Letter', width: 215.9, height: 279.4 });
        });
    });
});
