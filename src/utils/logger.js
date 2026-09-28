/**
 * Logger utility to encapsulate console logging calls and avoid ad-hoc ESLint overrides.
 */
export const logger = {
  warn(...args) {
    /* eslint-disable-next-line no-console */
    console.warn(...args);
  },
  error(...args) {
    /* eslint-disable-next-line no-console */
    console.error(...args);
  },
  info(...args) {
    /* eslint-disable-next-line no-console */
    console.info(...args);
  },
  debug(...args) {
    /* eslint-disable-next-line no-console */
    console.debug(...args);
  }
};

export default logger;
