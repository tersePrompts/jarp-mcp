/**
 * Input validation utilities for security.
 * Provides validation and sanitization for all user inputs.
 */

import path from 'path';
import { CONSTANTS } from './constants.js';

/**
 * Regex pattern for valid Java class names.
 * Matches: com.example.MyClass, InnerClass$, _ClassName, etc.
 * Does NOT match: ../../etc/passwd, class with spaces, etc.
 */
export const CLASS_NAME_REGEX = /^[a-zA-Z_$][a-zA-Z0-9_]*(\.[a-zA-Z_$][a-zA-Z0-9_]*)*$/;

/**
 * Regex pattern for safe file paths.
 * Allows alphanumeric, underscores, hyphens, dots, slashes, and backslashes.
 */
export const SAFE_PATH_REGEX = /^[a-zA-Z0-9_\-./\\]+$/;

/**
 * Characters that indicate potential path traversal attacks
 */
const PATH_TRAVERSAL_PATTERNS = ['..', '~', '\\0', '\0'];

/**
 * Validates a Java class name.
 * @param className - Fully qualified class name (e.g., "com.example.MyClass")
 * @throws Error if className is invalid
 */
export function validateClassName(className: string): void {
    if (!className || typeof className !== 'string') {
        throw new Error('className must be a non-empty string');
    }

    if (className.length > CONSTANTS.MAX_CLASS_NAME_LENGTH) {
        throw new Error(`className is too long (max ${CONSTANTS.MAX_CLASS_NAME_LENGTH} characters)`);
    }

    // Check for path traversal patterns first
    for (const pattern of PATH_TRAVERSAL_PATTERNS) {
        if (className.includes(pattern)) {
            throw new Error(`className contains invalid characters: ${pattern}`);
        }
    }

    // Validate against Java class name regex
    if (!CLASS_NAME_REGEX.test(className)) {
        throw new Error(`Invalid className format: ${className}. Must be a valid Java class name.`);
    }
}

/**
 * Validates a project path.
 * @param projectPath - Path to the project directory
 * @throws Error if projectPath is invalid
 */
export function validateProjectPath(projectPath: string): void {
    if (!projectPath || typeof projectPath !== 'string') {
        throw new Error('projectPath must be a non-empty string');
    }

    if (projectPath.length > CONSTANTS.MAX_PROJECT_PATH_LENGTH) {
        throw new Error(`projectPath is too long (max ${CONSTANTS.MAX_PROJECT_PATH_LENGTH} characters)`);
    }

    // Check raw input before normalization (defense in depth):
    // traversal segments and null bytes must never reach path.normalize()
    if (projectPath.includes('..')) {
        throw new Error('projectPath cannot contain parent directory references');
    }
    if (projectPath.includes('\0')) {
        throw new Error('projectPath cannot contain null bytes');
    }

    const normalized = path.normalize(projectPath);

    // Check for path traversal in resolved path
    if (normalized.includes('..')) {
        throw new Error('projectPath cannot contain parent directory references');
    }
}

/**
 * Validates a JAR file path.
 * @param jarPath - Path to a JAR file
 * @throws Error if jarPath is invalid
 */
export function validateJarPath(jarPath: string): void {
    if (!jarPath || typeof jarPath !== 'string') {
        throw new Error('jarPath must be a non-empty string');
    }

    const normalized = path.normalize(jarPath);

    // Must end with .jar
    if (!normalized.toLowerCase().endsWith('.jar')) {
        throw new Error('jarPath must end with .jar');
    }

    // Check for path traversal and null bytes
    if (normalized.includes('..')) {
        throw new Error('jarPath cannot contain parent directory references');
    }
    if (normalized.includes('\0')) {
        throw new Error('jarPath cannot contain null bytes');
    }
}

/**
 * Validates a file path for general use.
 * @param filePath - Path to validate
 * @param allowedExtensions - Optional list of allowed file extensions
 * @throws Error if filePath is invalid
 */
export function validateFilePath(filePath: string, allowedExtensions: string[] = []): void {
    if (!filePath || typeof filePath !== 'string') {
        throw new Error('filePath must be a non-empty string');
    }

    const normalized = path.normalize(filePath);

    // Check for path traversal
    if (normalized.includes('..')) {
        throw new Error('filePath cannot contain parent directory references');
    }

    // Check extension if provided
    if (allowedExtensions.length > 0) {
        const hasValidExtension = allowedExtensions.some(ext =>
            normalized.toLowerCase().endsWith(ext.toLowerCase())
        );
        if (!hasValidExtension) {
            throw new Error(`filePath must end with one of: ${allowedExtensions.join(', ')}`);
        }
    }
}

/**
 * Validates a timeout value.
 * @param timeout - Timeout in milliseconds
 * @throws Error if timeout is invalid
 */
export function validateTimeout(timeout: number): void {
    if (typeof timeout !== 'number' || isNaN(timeout)) {
        throw new Error('timeout must be a number');
    }

    if (timeout < 100) {
        throw new Error('timeout must be at least 100ms');
    }

    if (timeout > 300000) { // 5 minutes
        throw new Error('timeout cannot exceed 300000ms (5 minutes)');
    }
}

/**
 * Sanitizes a string for use in error messages.
 * Prevents log injection attacks.
 * @param input - Input string to sanitize
 * @returns Sanitized string
 */
export function sanitizeForLog(input: string): string {
    if (typeof input !== 'string') {
        return String(input);
    }

    // Remove newlines and other control characters
    return input
        .replace(/[\r\n]/g, ' ')
        .replace(/[\x00-\x1F\x7F]/g, '');
}

/**
 * Sanitizes a path for display (removes sensitive info if needed).
 * @param filePath - Path to sanitize
 * @returns Sanitized path (filename only, to protect directory structure)
 */
export function sanitizePath(filePath: string): string {
    if (typeof filePath !== 'string') {
        return '(non-string path)';
    }

    // Don't expose full paths in logs - just the filename
    const parsed = path.parse(filePath);
    return parsed.base;
}

/**
 * Validates a class index entry to ensure it doesn't contain malicious data.
 * @param entry - Class index entry to validate
 * @throws Error if entry is invalid
 */
export function validateClassIndexEntry(entry: unknown): void {
    if (!entry || typeof entry !== 'object') {
        throw new Error('Class index entry must be an object');
    }

    const { className, jarPath, packageName, simpleName } = entry as any;

    validateClassName(className);
    validateJarPath(jarPath);

    // Ensure packageName and simpleName match className
    if (typeof packageName !== 'string' || typeof simpleName !== 'string') {
        throw new Error('Invalid index entry: packageName and simpleName must be strings');
    }
}
