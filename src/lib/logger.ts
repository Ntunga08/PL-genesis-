/**
 * Production-safe logging utility
 * Only logs in development mode, suppresses in production
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {

    }
  },
  
  info: (...args: any[]) => {
    if (isDevelopment) {

    }
  },
  
  warn: (...args: any[]) => {
    // Always log warnings

  },
  
  error: (...args: any[]) => {
    // Always log errors

  },
  
  debug: (...args: any[]) => {
    if (isDevelopment) {

    }
  },
  
  table: (data: any) => {
    if (isDevelopment) {
      console.table(data);
    }
  }
};

// Export individual functions for convenience
export const { log, info, warn, error, debug } = logger;
