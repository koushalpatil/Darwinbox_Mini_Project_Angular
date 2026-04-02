import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Centralized logging service that respects environment log level.
 * In production, only errors are logged; in dev, all levels are active.
 */
@Injectable({ providedIn: 'root' })
export class LoggerService {
  private readonly minLevel: number;

  constructor() {
    const level = (environment.logLevel || 'debug') as LogLevel;
    this.minLevel = LOG_LEVEL_PRIORITY[level] ?? 0;
  }

  /** Log debug-level messages (dev only). */
  debug(message: string, ...args: any[]): void {
    if (this.minLevel <= LOG_LEVEL_PRIORITY.debug) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  /** Log informational messages. */
  info(message: string, ...args: any[]): void {
    if (this.minLevel <= LOG_LEVEL_PRIORITY.info) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  /** Log warning messages. */
  warn(message: string, ...args: any[]): void {
    if (this.minLevel <= LOG_LEVEL_PRIORITY.warn) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  /** Log error messages. */
  error(message: string, ...args: any[]): void {
    if (this.minLevel <= LOG_LEVEL_PRIORITY.error) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }
}
