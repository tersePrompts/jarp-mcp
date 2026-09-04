/**
 * Centralized constants for the jarp-mcp server.
 * Single source of truth for all magic values.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get version from package.json (single source of truth).
 */
function getPackageVersion(): string {
    try {
        const packagePath = join(__dirname, '..', '..', 'package.json');
        const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
        return pkg.version || '1.0.0';
    } catch {
        return '1.0.0'; // Fallback
    }
}

const PACKAGE_VERSION = getPackageVersion();

/**
 * All magic strings and values used throughout the codebase.
 */
export const CONSTANTS = {
    // File and directory names
    CACHE_DIR_NAME: '.mcp-decompile-cache',
    INDEX_FILE_NAME: '.mcp-class-index.json',
    TEMP_DIR_NAME: '.mcp-class-temp',

    // Resource limits
    MAX_JAR_SIZE: 100 * 1024 * 1024, // 100MB
    MAX_CACHE_SIZE: 500 * 1024 * 1024, // 500MB
    MAX_INDEX_SIZE: 50 * 1024 * 1024, // 50MB
    MAX_CONCURRENT_DECOMPILE: 5,
    MAX_BATCH_SIZE: 100,
    MAX_CLASS_NAME_LENGTH: 1000,
    MAX_PROJECT_PATH_LENGTH: 500,

    // Archive/zip limits (to prevent zip bombs)
    MAX_ENTRIES_PER_JAR: 10000,
    MAX_UNCOMPRESSED_SIZE_PER_JAR: 1024 * 1024 * 1024, // 1GB

    // Timeouts (in milliseconds)
    DEFAULT_TIMEOUT: 30000, // 30 seconds
    MAVEN_TIMEOUT: 60000, // 60 seconds
    JAVAP_TIMEOUT: 10000, // 10 seconds
    CFR_TIMEOUT: 30000, // 30 seconds
    JAR_LOOKUP_TIMEOUT: 10000, // 10 seconds

    // Grace period before SIGKILL
    GRACE_PERIOD_MS: 2000,

    // Patterns
    CFR_JAR_PATTERN: /^cfr-.*\.jar$/,
    CFR_EXPECTED_SHA256: null, // TODO: Add expected SHA256 for CFR 0.152

    // File extensions
    CLASS_FILE_EXT: '.class',
    JAR_FILE_EXT: '.jar',
    JAVA_FILE_EXT: '.java',

    // Server info
    SERVER_NAME: 'java-class-analyzer',
    SERVER_VERSION: PACKAGE_VERSION,

    // Error codes
    ERROR_CODES: {
        INVALID_CLASS_NAME: 'INVALID_CLASS_NAME',
        INVALID_PROJECT_PATH: 'INVALID_PROJECT_PATH',
        CLASS_NOT_FOUND: 'CLASS_NOT_FOUND',
        JAR_NOT_FOUND: 'JAR_NOT_FOUND',
        CFR_NOT_FOUND: 'CFR_NOT_FOUND',
        DECOMPILATION_FAILED: 'DECOMPILATION_FAILED',
        ANALYSIS_FAILED: 'ANALYSIS_FAILED',
        MAVEN_FAILED: 'MAVEN_FAILED',
        TIMEOUT: 'TIMEOUT',
        RESOURCE_LIMIT_EXCEEDED: 'RESOURCE_LIMIT_EXCEEDED',
        INDEX_CORRUPTED: 'INDEX_CORRUPTED',
    } as const,
} as const;

/**
 * Type-safe error code values.
 */
export type ErrorCode = typeof CONSTANTS.ERROR_CODES[keyof typeof CONSTANTS.ERROR_CODES];

/**
 * Get the server version from package.json.
 */
export function getServerVersion(): string {
    return CONSTANTS.SERVER_VERSION;
}
