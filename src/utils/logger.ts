/**
 * Logger Utility
 * Centralized logging using loglevel package
 */

import log from 'loglevel';

// Type guard for browser environment using globalThis
const isBrowser = (): boolean => {
  return typeof globalThis !== 'undefined' && 'window' in globalThis;
};

// Type guard for Node.js environment
const isNode = (): boolean => {
  return typeof globalThis !== 'undefined' && 'process' in globalThis && 
         typeof (globalThis as any).process !== 'undefined' && 
         (globalThis as any).process.versions?.node !== undefined;
};

// Configure log level based on environment
// Works in both browser and Node.js
const getLogLevel = (): log.LogLevelDesc => {
  // Check browser environment - disable all logging in browser
  if (isBrowser()) {
    return 'silent'; // No logs in browser console
  }
  
  // Check Node.js environment - allow logging in server/terminal
  if (isNode()) {
    const proc = (globalThis as any).process;
    if (proc?.env?.NODE_ENV === 'production') {
      return 'warn';
    }
    return 'debug'; // Show all logs in development
  }
  
  return 'silent';
};

log.setLevel(getLogLevel());

// Create namespaced loggers
export const createLogger = (namespace: string) => {
  return {
    trace: (...args: any[]) => log.trace(`[${namespace}]`, ...args),
    debug: (...args: any[]) => log.debug(`[${namespace}]`, ...args),
    info: (...args: any[]) => log.info(`[${namespace}]`, ...args),
    warn: (...args: any[]) => log.warn(`[${namespace}]`, ...args),
    error: (...args: any[]) => log.error(`[${namespace}]`, ...args),
  };
};

// Default logger
export const logger = createLogger('App');

// Supabase logger
export const supabaseLogger = createLogger('Supabase');

// Export loglevel instance for advanced usage
export { log };
export default log;

