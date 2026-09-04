/**
 * Tests for input validation utilities.
 */

import { describe, it, expect } from '@jest/globals';
import {
    validateClassName,
    validateProjectPath,
    validateJarPath,
    validateFilePath,
    validateTimeout,
    sanitizeForLog,
    sanitizePath,
    CLASS_NAME_REGEX,
} from '../src/utils/validation.js';

describe('validateClassName', () => {
    it('should accept valid class names', () => {
        const validNames = [
            'com.example.MyClass',
            'org.test.package.Class',
            'SingleClass',
            '_ClassName',
            '$ClassName',
            'com.example._Inner',
            'com.example.$Inner',
            'package123.Class456',
        ];

        for (const name of validNames) {
            expect(() => validateClassName(name)).not.toThrow();
        }
    });

    it('should reject class names with path traversal', () => {
        const maliciousNames = [
            '../../etc/passwd',
            '..\\..\\windows\\system32',
            'com.example.../../../etc/passwd',
            'Class${malicious}',
            'Class;rm -rf /',
            'Class && cat /etc/passwd',
            'Class`whoami`',
        ];

        for (const name of maliciousNames) {
            expect(() => validateClassName(name)).toThrow();
        }
    });

    it('should reject invalid class name formats', () => {
        const invalidNames = [
            '',
            '123.StartWithNumber',
            'com..example.DoubleDot',
            'com.example.Class.', // Trailing dot
            '.com.example.Class', // Leading dot
            'com.example.Class@',
            'com.example.Class#',
            'a'.repeat(2000), // Too long
        ];

        for (const name of invalidNames) {
            expect(() => validateClassName(name)).toThrow();
        }
    });
});

describe('validateProjectPath', () => {
    it('should accept valid paths', () => {
        const validPaths = [
            '/home/user/project',
            'C:\\Users\\user\\project',
            './my-project',
            '/absolute/path',
        ];

        for (const path of validPaths) {
            expect(() => validateProjectPath(path)).not.toThrow();
        }
    });

    it('should reject paths with parent directory references', () => {
        const suspiciousPaths = [
            '../other-project',
            '../../../etc',
            'path/../../../etc/passwd',
            '/path/../../../etc',
        ];

        for (const path of suspiciousPaths) {
            expect(() => validateProjectPath(path)).toThrow();
        }
    });

    it('should reject empty or non-string paths', () => {
        expect(() => validateProjectPath('')).toThrow();
        expect(() => validateProjectPath(null as any)).toThrow();
    });
});

describe('validateJarPath', () => {
    it('should accept valid JAR paths', () => {
        const validPaths = [
            '/path/to/file.jar',
            'C:\\path\\to\\file.jar',
            './lib/cfr-0.152.jar',
        ];

        for (const path of validPaths) {
            expect(() => validateJarPath(path)).not.toThrow();
        }
    });

    it('should reject non-JAR paths', () => {
        const invalidPaths = [
            '/path/to/file.txt',
            '/path/to/file',
            '/path/to.jar.exe',
        ];

        for (const path of invalidPaths) {
            expect(() => validateJarPath(path)).toThrow();
        }
    });

    it('should reject paths with parent references', () => {
        const invalidPaths = [
            '../etc/passwd.jar',
            'path/../../file.jar',
        ];

        for (const path of invalidPaths) {
            expect(() => validateJarPath(path)).toThrow();
        }
    });
});

describe('validateFilePath', () => {
    it('should accept valid file paths', () => {
        expect(() => validateFilePath('/path/to/file.txt')).not.toThrow();
        expect(() => validateFilePath('/path/to/file.jar', ['.jar'])).not.toThrow();
    });

    it('should enforce extension restrictions', () => {
        expect(() => validateFilePath('/path/to/file.txt', ['.jar', '.class'])).toThrow();
        expect(() => validateFilePath('/path/to/file.jar', ['.jar', '.class'])).not.toThrow();
    });
});

describe('validateTimeout', () => {
    it('should accept valid timeouts', () => {
        expect(() => validateTimeout(1000)).not.toThrow();
        expect(() => validateTimeout(30000)).not.toThrow();
        expect(() => validateTimeout(300000)).not.toThrow();
    });

    it('should reject invalid timeouts', () => {
        expect(() => validateTimeout(0)).toThrow();
        expect(() => validateTimeout(-1)).toThrow();
        expect(() => validateTimeout(99)).toThrow();
        expect(() => validateTimeout(500000)).toThrow();
        expect(() => validateTimeout(NaN)).toThrow();
    });
});

describe('sanitizeForLog', () => {
    it('should remove newlines and control characters', () => {
        expect(sanitizeForLog('test\nmessage\rhere')).toBe('test message here');
        expect(sanitizeForLog('test\x00null\x1Fbyte')).toBe('testnullbyte');
    });

    it('should handle non-string input', () => {
        expect(sanitizeForLog(123)).toBe('123');
        expect(sanitizeForLog(null)).toBe('null');
        expect(sanitizeForLog(undefined)).toBe('undefined');
    });
});

describe('sanitizePath', () => {
    it('should return only the filename', () => {
        expect(sanitizePath('/path/to/MyClass.java')).toBe('MyClass.java');
        expect(sanitizePath('C:\\Users\\user\\project\\file.jar')).toBe('file.jar');
    });
});

describe('CLASS_NAME_REGEX', () => {
    it('should match valid Java class names', () => {
        const valid = [
            'MyClass',
            'com.example.MyClass',
            '_Class',
            '$Class',
            'Class123',
            'a.b.c.d.Class',
        ];

        for (const name of valid) {
            expect(CLASS_NAME_REGEX.test(name)).toBe(true);
        }
    });

    it('should not match invalid class names', () => {
        const invalid = [
            '123Class',
            'My.Class..Name',
            'My.Class@',
            'My Class',
            '',
        ];

        for (const name of invalid) {
            expect(CLASS_NAME_REGEX.test(name)).toBe(false);
        }
    });
});
