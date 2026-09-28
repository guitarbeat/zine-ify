import { test, expect } from '@playwright/test';
import { logger } from '../../../src/utils/logger.js';

test.describe('Logger Utility', () => {
  test('warn calls console.warn', () => {
    let warnArgs = null;
    const origWarn = console.warn;
    /* eslint-disable-next-line no-console */
    console.warn = (...args) => { warnArgs = args; };

    try {
      logger.warn('test warning', { id: 123 });
      expect(warnArgs).toEqual(['test warning', { id: 123 }]);
    } finally {
      /* eslint-disable-next-line no-console */
      console.warn = origWarn;
    }
  });

  test('error calls console.error', () => {
    let errorArgs = null;
    const origError = console.error;
    /* eslint-disable-next-line no-console */
    console.error = (...args) => { errorArgs = args; };

    try {
      logger.error('test error', new Error('boom'));
      expect(errorArgs[0]).toBe('test error');
      expect(errorArgs[1].message).toBe('boom');
    } finally {
      /* eslint-disable-next-line no-console */
      console.error = origError;
    }
  });

  test('info calls console.info', () => {
    let infoArgs = null;
    const origInfo = console.info;
    /* eslint-disable-next-line no-console */
    console.info = (...args) => { infoArgs = args; };

    try {
      logger.info('test info');
      expect(infoArgs).toEqual(['test info']);
    } finally {
      /* eslint-disable-next-line no-console */
      console.info = origInfo;
    }
  });

  test('debug calls console.debug', () => {
    let debugArgs = null;
    const origDebug = console.debug;
    /* eslint-disable-next-line no-console */
    console.debug = (...args) => { debugArgs = args; };

    try {
      logger.debug('test debug');
      expect(debugArgs).toEqual(['test debug']);
    } finally {
      /* eslint-disable-next-line no-console */
      console.debug = origDebug;
    }
  });
});
