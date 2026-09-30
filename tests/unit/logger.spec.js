import { test, expect } from '@playwright/test';
import { logger } from '../../src/utils/logger.js';

test.describe('logger utility', () => {
  test('logger.warn forwards arguments to console.warn', () => {
    let captured = null;
    /* eslint-disable-next-line no-console */
    const originalWarn = console.warn;
    /* eslint-disable-next-line no-console */
    console.warn = (...args) => { captured = args; };

    try {
      logger.warn('test warning', { id: 1 });
      expect(captured).toEqual(['test warning', { id: 1 }]);
    } finally {
      /* eslint-disable-next-line no-console */
      console.warn = originalWarn;
    }
  });

  test('logger.error forwards arguments to console.error', () => {
    let captured = null;
    /* eslint-disable-next-line no-console */
    const originalError = console.error;
    /* eslint-disable-next-line no-console */
    console.error = (...args) => { captured = args; };

    try {
      logger.error('test error', new Error('fail'));
      expect(captured[0]).toBe('test error');
      expect(captured[1].message).toBe('fail');
    } finally {
      /* eslint-disable-next-line no-console */
      console.error = originalError;
    }
  });

  test('logger.info forwards arguments to console.info', () => {
    let captured = null;
    /* eslint-disable-next-line no-console */
    const originalInfo = console.info;
    /* eslint-disable-next-line no-console */
    console.info = (...args) => { captured = args; };

    try {
      logger.info('test info');
      expect(captured).toEqual(['test info']);
    } finally {
      /* eslint-disable-next-line no-console */
      console.info = originalInfo;
    }
  });

  test('logger.debug forwards arguments to console.debug', () => {
    let captured = null;
    /* eslint-disable-next-line no-console */
    const originalDebug = console.debug;
    /* eslint-disable-next-line no-console */
    console.debug = (...args) => { captured = args; };

    try {
      logger.debug('test debug');
      expect(captured).toEqual(['test debug']);
    } finally {
      /* eslint-disable-next-line no-console */
      console.debug = originalDebug;
    }
  });

  test('logger.log forwards arguments to console.log', () => {
    let captured = null;
    /* eslint-disable-next-line no-console */
    const originalLog = console.log;
    /* eslint-disable-next-line no-console */
    console.log = (...args) => { captured = args; };

    try {
      logger.log('test log');
      expect(captured).toEqual(['test log']);
    } finally {
      /* eslint-disable-next-line no-console */
      console.log = originalLog;
    }
  });
});
