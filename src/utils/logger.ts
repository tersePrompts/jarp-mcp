/**
 * Structured logging utilities for the jarp-mcp server.
 * Provides consistent logging across all modules.
 */

/**
 * Log levels in order of severity.
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

/**
 * Structure of a log entry.
 */
export interface LogEntry {
    /** Log level */
    level: string;
    /** Log message */
    message: string;
    /** ISO timestamp */
    timestamp: string;
    /** Optional metadata */
    meta?: Record<string, unknown>;
    /** Module that created the log */
    module?: string;
}

/**
 * Configuration for the logger.
 */
export interface LoggerConfig {
    /** Minimum log level to output */
    level: LogLevel;
    /** Prefix for log messages */
    prefix: string;
    /** Module name for this logger */
    module?: string;
    /** Whether to output JSON (true) or plain text (false) */
    jsonOutput: boolean;
}

/**
 * Default logger configuration.
 */
const DEFAULT_CONFIG: LoggerConfig = {
    level: LogLevel.INFO,
    prefix: 'jarp-mcp',
    jsonOutput: false,
};

/**
 * Logger class for structured logging.
 * All output goes to stderr to comply with MCP protocol.
 */
export class Logger {
    private config: LoggerConfig;

    constructor(config: Partial<LoggerConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.config.level = this.parseLogLevel(process.env.LOG_LEVEL);
        this.config.jsonOutput = process.env.JSON_LOGS === 'true';

        // Enable debug in development mode
        if (process.env.NODE_ENV === 'development') {
            this.config.level = LogLevel.DEBUG;
        }
    }

    /**
     * Parses log level from environment variable.
     */
    private parseLogLevel(level?: string): LogLevel {
        if (!level) return DEFAULT_CONFIG.level;

        const upper = level.toUpperCase();
        if (upper in LogLevel) {
            return LogLevel[upper as keyof typeof LogLevel];
        }
        return DEFAULT_CONFIG.level;
    }

    /**
     * Determines if a message should be logged based on level.
     */
    private shouldLog(level: LogLevel): boolean {
        return level >= this.config.level;
    }

    /**
     * Formats a log entry as JSON.
     */
    private formatJson(level: string, message: string, meta?: Record<string, unknown>): string {
        const entry: LogEntry = {
            level,
            message,
            timestamp: new Date().toISOString(),
            meta,
            module: this.config.module,
        };
        return JSON.stringify(entry);
    }

    /**
     * Formats a log entry as plain text.
     */
    private formatText(level: string, message: string, meta?: Record<string, unknown>): string {
        const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
        const prefix = `[${timestamp}] [${level}]`;
        const module = this.config.module ? `[${this.config.module}]` : '';
        const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
        return `${prefix}${module} ${message}${metaStr}`;
    }

    /**
     * Internal log method.
     */
    private log(level: LogLevel, levelName: string, message: string, meta?: Record<string, unknown>): void {
        if (!this.shouldLog(level)) {
            return;
        }

        const formatted = this.config.jsonOutput
            ? this.formatJson(levelName, message, meta)
            : this.formatText(levelName, message, meta);

        // Always use stderr for MCP protocol compliance
        console.error(formatted);
    }

    /**
     * Logs a debug message.
     */
    debug(message: string, meta?: Record<string, unknown>): void {
        this.log(LogLevel.DEBUG, 'DEBUG', message, meta);
    }

    /**
     * Logs an info message.
     */
    info(message: string, meta?: Record<string, unknown>): void {
        this.log(LogLevel.INFO, 'INFO', message, meta);
    }

    /**
     * Logs a warning message.
     */
    warn(message: string, meta?: Record<string, unknown>): void {
        this.log(LogLevel.WARN, 'WARN', message, meta);
    }

    /**
     * Logs an error message.
     */
    error(message: string, meta?: Record<string, unknown>): void {
        this.log(LogLevel.ERROR, 'ERROR', message, meta);
    }

    /**
     * Creates a child logger with a module name.
     */
    withModule(moduleName: string): Logger {
        return new Logger({
            ...this.config,
            module: moduleName,
        });
    }

    /**
     * Sets the log level.
     */
    setLevel(level: LogLevel): void {
        this.config.level = level;
    }

    /**
     * Gets the current log level.
     */
    getLevel(): LogLevel {
        return this.config.level;
    }
}

/**
 * Default global logger instance.
 */
export const logger = new Logger();

/**
 * Creates a logger for a specific module.
 */
export function createLogger(moduleName: string): Logger {
    return logger.withModule(moduleName);
}
