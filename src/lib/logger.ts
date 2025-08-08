/**
 * Logger utility for lint-safe logging
 * Dev: forwards to console
 * Prod: no-op
 */

interface Logger {
  error: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  debug: (message: string, ...args: unknown[]) => void;
}

const createLogger = (): Logger => {
  if (__DEV__) {
    return {
      // eslint-disable-next-line no-console
      error: (message: string, ...args: unknown[]) => console.error(message, ...args),
      // eslint-disable-next-line no-console
      warn: (message: string, ...args: unknown[]) => console.warn(message, ...args),
      // eslint-disable-next-line no-console
      info: (message: string, ...args: unknown[]) => console.info(message, ...args),
      // eslint-disable-next-line no-console
      debug: (message: string, ...args: unknown[]) => console.log(message, ...args),
    };
  }

  // Production: no-op
  return {
    error: () => {},
    warn: () => {},
    info: () => {},
    debug: () => {},
  };
};

export const logger = createLogger();
