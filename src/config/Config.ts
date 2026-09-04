/**
 * Configuration management for the jarp-mcp server.
 * Handles environment variables, config files, and defaults.
 */

import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { CONSTANTS } from '../utils/constants.js';

/**
 * Configuration interface.
 */
export interface Config {
    // Platform/OS (auto-detected, can be overridden: 'win32', 'darwin', 'linux')
    platform?: string;

    // Java/Maven paths
    javaHome?: string;
    mavenHome?: string;
    mavenRepo?: string;
    cfrPath?: string;

    // Cache settings
    cacheEnabled: boolean;
    cacheDir?: string;
    maxCacheSize: number;

    // Resource limits
    maxJarSize: number;
    maxConcurrentOps: number;
    maxBatchSize: number;

    // Timeouts (milliseconds)
    defaultTimeout: number;
    mavenTimeout: number;
    javapTimeout: number;
    cfrTimeout: number;
    jarLookupTimeout: number;

    // Logging
    logLevel: string;
    jsonLogs: boolean;
    debugMode: boolean;

    // Server version (from constants)
    serverVersion: string;
}

/**
 * Config file schema validation.
 */
interface ConfigFileSchema {
    platform?: string;
    javaHome?: string;
    mavenHome?: string;
    mavenRepo?: string;
    cfrPath?: string;
    cacheEnabled?: boolean;
    cacheDir?: string;
    maxCacheSize?: number;
    maxJarSize?: number;
    maxConcurrentOps?: number;
    maxBatchSize?: number;
    defaultTimeout?: number;
    mavenTimeout?: number;
    javapTimeout?: number;
    cfrTimeout?: number;
    jarLookupTimeout?: number;
    logLevel?: string;
    jsonLogs?: boolean;
    debugMode?: boolean;
}

/**
 * Default configuration values.
 */
const DEFAULTS: Config = {
    cacheEnabled: true,
    maxCacheSize: CONSTANTS.MAX_CACHE_SIZE,
    maxJarSize: CONSTANTS.MAX_JAR_SIZE,
    maxConcurrentOps: CONSTANTS.MAX_CONCURRENT_DECOMPILE,
    maxBatchSize: CONSTANTS.MAX_BATCH_SIZE,
    defaultTimeout: CONSTANTS.DEFAULT_TIMEOUT,
    mavenTimeout: CONSTANTS.MAVEN_TIMEOUT,
    javapTimeout: CONSTANTS.JAVAP_TIMEOUT,
    cfrTimeout: CONSTANTS.CFR_TIMEOUT,
    jarLookupTimeout: CONSTANTS.JAR_LOOKUP_TIMEOUT,
    logLevel: 'INFO',
    jsonLogs: false,
    debugMode: false,
    serverVersion: CONSTANTS.SERVER_VERSION,
};

/**
 * Configuration file names to look for.
 */
const CONFIG_FILES = [
    'jarp-mcp.config.json',
    '.jarp-mcp.json',
];

/**
 * Cached configuration instance.
 */
let configInstance: Config | null = null;

/**
 * Parses a string boolean value.
 */
function parseBoolean(value: string | undefined): boolean {
    if (!value) return false;
    return value.toLowerCase() === 'true';
}

/**
 * Parses a string number value.
 */
function parseNumber(value: string | undefined, defaultValue: number): number {
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Validates that a config value is of the expected type.
 */
function validateConfigValue(key: string, value: unknown, expectedType: string): void {
    if (value === null || value === undefined) {
        return; // Optional values are fine
    }

    switch (expectedType) {
        case 'string':
            if (typeof value !== 'string') {
                throw new Error(`Config option '${key}' must be a string, got ${typeof value}`);
            }
            break;
        case 'number':
            if (typeof value !== 'number') {
                throw new Error(`Config option '${key}' must be a number, got ${typeof value}`);
            }
            break;
        case 'boolean':
            if (typeof value !== 'boolean') {
                throw new Error(`Config option '${key}' must be a boolean, got ${typeof value}`);
            }
            break;
    }
}

/**
 * Loads configuration from environment variables and config file.
 */
export function loadConfig(): Config {
    if (configInstance) {
        return configInstance;
    }

    // Start with defaults
    const config: Config = { ...DEFAULTS };

    // Platform: auto-detect with manual override option
    // User can set JARP_OS or JARP_PLATFORM environment variable
    // Valid values: 'win32', 'darwin' (macOS), 'linux', 'freebsd', 'openbsd', 'sunos'
    config.platform = process.env.JARP_OS || process.env.JARP_PLATFORM || process.platform;

    // Override from environment variables
    if (process.env.JAVA_HOME) config.javaHome = process.env.JAVA_HOME;
    if (process.env.MAVEN_HOME) config.mavenHome = process.env.MAVEN_HOME;
    if (process.env.MAVEN_REPO) config.mavenRepo = process.env.MAVEN_REPO;
    if (process.env.CFR_PATH) config.cfrPath = process.env.CFR_PATH;

    if (process.env.CACHE_ENABLED !== undefined) {
        config.cacheEnabled = parseBoolean(process.env.CACHE_ENABLED);
    }
    if (process.env.CACHE_DIR) config.cacheDir = process.env.CACHE_DIR;
    if (process.env.MAX_CACHE_SIZE) {
        config.maxCacheSize = parseNumber(process.env.MAX_CACHE_SIZE, DEFAULTS.maxCacheSize);
    }
    if (process.env.MAX_JAR_SIZE) {
        config.maxJarSize = parseNumber(process.env.MAX_JAR_SIZE, DEFAULTS.maxJarSize);
    }
    if (process.env.MAX_CONCURRENT_OPS) {
        config.maxConcurrentOps = parseNumber(process.env.MAX_CONCURRENT_OPS, DEFAULTS.maxConcurrentOps);
    }
    if (process.env.MAX_BATCH_SIZE) {
        config.maxBatchSize = parseNumber(process.env.MAX_BATCH_SIZE, DEFAULTS.maxBatchSize);
    }

    if (process.env.DEFAULT_TIMEOUT) {
        config.defaultTimeout = parseNumber(process.env.DEFAULT_TIMEOUT, DEFAULTS.defaultTimeout);
    }
    if (process.env.MAVEN_TIMEOUT) {
        config.mavenTimeout = parseNumber(process.env.MAVEN_TIMEOUT, DEFAULTS.mavenTimeout);
    }
    if (process.env.JAVAP_TIMEOUT) {
        config.javapTimeout = parseNumber(process.env.JAVAP_TIMEOUT, DEFAULTS.javapTimeout);
    }
    if (process.env.CFR_TIMEOUT) {
        config.cfrTimeout = parseNumber(process.env.CFR_TIMEOUT, DEFAULTS.cfrTimeout);
    }
    if (process.env.JAR_LOOKUP_TIMEOUT) {
        config.jarLookupTimeout = parseNumber(process.env.JAR_LOOKUP_TIMEOUT, DEFAULTS.jarLookupTimeout);
    }

    if (process.env.LOG_LEVEL) config.logLevel = process.env.LOG_LEVEL.toUpperCase();
    if (process.env.JSON_LOGS !== undefined) {
        config.jsonLogs = parseBoolean(process.env.JSON_LOGS);
    }
    if (process.env.DEBUG_MODE !== undefined) {
        config.debugMode = parseBoolean(process.env.DEBUG_MODE);
    }

    // Set debug mode from NODE_ENV
    if (process.env.NODE_ENV === 'development') {
        config.debugMode = true;
        config.logLevel = 'DEBUG';
    }

    // Override from config file if it exists (with validation)
    const cwdConfigPath = findConfigFile(process.cwd());
    if (cwdConfigPath) {
        try {
            const fileConfig: ConfigFileSchema = fs.readJsonSync(cwdConfigPath);

            // Validate each config value
            if (fileConfig.platform !== undefined) {
                validateConfigValue('platform', fileConfig.platform, 'string');
                config.platform = fileConfig.platform;
            }
            if (fileConfig.javaHome !== undefined) {
                validateConfigValue('javaHome', fileConfig.javaHome, 'string');
                config.javaHome = fileConfig.javaHome;
            }
            if (fileConfig.mavenHome !== undefined) {
                validateConfigValue('mavenHome', fileConfig.mavenHome, 'string');
                config.mavenHome = fileConfig.mavenHome;
            }
            if (fileConfig.mavenRepo !== undefined) {
                validateConfigValue('mavenRepo', fileConfig.mavenRepo, 'string');
                config.mavenRepo = fileConfig.mavenRepo;
            }
            if (fileConfig.cfrPath !== undefined) {
                validateConfigValue('cfrPath', fileConfig.cfrPath, 'string');
                config.cfrPath = fileConfig.cfrPath;
            }
            if (fileConfig.cacheEnabled !== undefined) {
                validateConfigValue('cacheEnabled', fileConfig.cacheEnabled, 'boolean');
                config.cacheEnabled = fileConfig.cacheEnabled;
            }
            if (fileConfig.cacheDir !== undefined) {
                validateConfigValue('cacheDir', fileConfig.cacheDir, 'string');
                config.cacheDir = fileConfig.cacheDir;
            }
            if (fileConfig.maxCacheSize !== undefined) {
                validateConfigValue('maxCacheSize', fileConfig.maxCacheSize, 'number');
                config.maxCacheSize = Math.min(fileConfig.maxCacheSize, CONSTANTS.MAX_CACHE_SIZE);
            }
            if (fileConfig.maxJarSize !== undefined) {
                validateConfigValue('maxJarSize', fileConfig.maxJarSize, 'number');
                config.maxJarSize = Math.min(fileConfig.maxJarSize, CONSTANTS.MAX_JAR_SIZE);
            }
            if (fileConfig.maxConcurrentOps !== undefined) {
                validateConfigValue('maxConcurrentOps', fileConfig.maxConcurrentOps, 'number');
                config.maxConcurrentOps = Math.min(fileConfig.maxConcurrentOps, 50); // Hard cap at 50
            }
            if (fileConfig.maxBatchSize !== undefined) {
                validateConfigValue('maxBatchSize', fileConfig.maxBatchSize, 'number');
                config.maxBatchSize = Math.min(fileConfig.maxBatchSize, 1000); // Hard cap at 1000
            }
            if (fileConfig.logLevel !== undefined) {
                validateConfigValue('logLevel', fileConfig.logLevel, 'string');
                config.logLevel = fileConfig.logLevel.toUpperCase();
            }
            if (fileConfig.jsonLogs !== undefined) {
                validateConfigValue('jsonLogs', fileConfig.jsonLogs, 'boolean');
                config.jsonLogs = fileConfig.jsonLogs;
            }
            if (fileConfig.debugMode !== undefined) {
                validateConfigValue('debugMode', fileConfig.debugMode, 'boolean');
                config.debugMode = fileConfig.debugMode;
            }
        } catch (error) {
            console.warn(`[Config] Failed to load config file ${cwdConfigPath}: ${error}`);
        }
    }

    // Set default cache dir if not specified
    if (!config.cacheDir && config.cacheEnabled) {
        config.cacheDir = path.join(os.tmpdir(), 'jarp-mcp-cache');
    }

    configInstance = config;
    return config;
}

/**
 * Finds a config file in the specified directory.
 */
function findConfigFile(dir: string): string | null {
    for (const filename of CONFIG_FILES) {
        const configPath = path.join(dir, filename);
        try {
            if (fs.existsSync(configPath) && fs.statSync(configPath).isFile()) {
                return configPath;
            }
        } catch {
            // Ignore errors
        }
    }
    return null;
}

/**
 * Gets the current configuration (loads if not already loaded).
 */
export function getConfig(): Config {
    if (!configInstance) {
        return loadConfig();
    }
    return configInstance;
}

/**
 * Resets the configuration (mainly for testing).
 */
export function resetConfig(): void {
    configInstance = null;
}

/**
 * Gets the Maven repository path.
 */
export function getMavenRepositoryPath(): string {
    const config = getConfig();
    if (config.mavenRepo) {
        return config.mavenRepo;
    }

    // Use default Maven local repository path
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (!homeDir) {
        throw new Error('Cannot determine home directory for Maven repository');
    }
    return path.join(homeDir, '.m2', 'repository');
}
