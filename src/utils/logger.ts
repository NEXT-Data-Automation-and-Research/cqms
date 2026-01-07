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
  // Check browser environment
  if (isBrowser()) {
    // Type-safe access to browser APIs via globalThis
    const browserWindow = (globalThis as any).window;
    const browserStorage = (globalThis as any).localStorage;
    
    if (browserWindow && browserStorage) {
      // In browser, check for development mode via URL or localStorage
      const isDev = 
        browserWindow.location.hostname === 'localhost' || 
        browserWindow.location.hostname === '127.0.0.1' ||
        browserWindow.location.search.includes('debug=true') ||
        browserStorage.getItem('LOG_LEVEL') === 'debug';
      
      // Check for explicit log level override
      const overrideLevel = browserStorage.getItem('LOG_LEVEL');
      if (overrideLevel && ['trace', 'debug', 'info', 'warn', 'error', 'silent'].includes(overrideLevel)) {
        return overrideLevel as log.LogLevelDesc;
      }
      
      if (isDev) {
        // Development: show debug logs in browser console
        return 'debug';
      }
      // Production browser: only show warnings and errors
      return 'warn';
    }
    
    // Fallback if browser APIs not available
    return 'warn';
  }
  
  // Check Node.js environment - allow logging in server/terminal
  if (isNode()) {
    const proc = (globalThis as any).process;
    
    // Check for explicit log level override via environment variable
    if (proc?.env?.LOG_LEVEL) {
      const envLevel = proc.env.LOG_LEVEL.toLowerCase();
      if (['trace', 'debug', 'info', 'warn', 'error', 'silent'].includes(envLevel)) {
        return envLevel as log.LogLevelDesc;
      }
    }
    
    if (proc?.env?.NODE_ENV === 'production') {
      return 'warn';
    }
    return 'debug'; // Show all logs in development
  }
  
  return 'silent';
};

const initialLogLevel = getLogLevel();
log.setLevel(initialLogLevel);

// Log the initial log level for debugging (only in browser dev mode)
if (isBrowser()) {
  const browserWindow = (globalThis as any).window;
  if (browserWindow && (browserWindow.location.hostname === 'localhost' || browserWindow.location.hostname === '127.0.0.1')) {
    // Use console directly here since logger might not be ready yet
    console.log('[Logger] Initialized with log level:', initialLogLevel);
  }
}

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

