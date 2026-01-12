/**
 * Centralized Logging Utility
 * Provides structured logging with timestamps and log levels
 */

declare const process: {
  env: {
    NODE_ENV?: string;
  };
};

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error;
}

class Logger {
  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private formatLog(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): string {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      message,
      ...(context && { context }),
      ...(error && { error: { name: error.name, message: error.message, stack: error.stack } }),
    };

    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    const errorStr = error ? ` | Error: ${error.name}: ${error.message}` : '';

    return `${prefix} ${message}${contextStr}${errorStr}`;
  }

  info(message: string, context?: Record<string, any>): void {
    console.log(this.formatLog('info', message, context));
  }

  warn(message: string, context?: Record<string, any>): void {
    console.warn(this.formatLog('warn', message, context));
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    console.error(this.formatLog('error', message, context, error));
  }

  debug(message: string, context?: Record<string, any>): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatLog('debug', message, context));
    }
  }
}

export const logger = new Logger();

