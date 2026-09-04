/**
 * Security-focused tests for command injection and path traversal prevention.
 */

import { describe, it, expect } from '@jest/globals';
import {
    validateClassName,
    validateProjectPath,
    validateJarPath,
    validateTimeout,
} from '../src/utils/validation.js';
import { runCommand } from '../src/utils/shell.js';

describe('Security: Command Injection Prevention', () => {
    describe('className validation', () => {
        const commandInjectionAttempts = [
            'com.example.Class && rm -rf /',
            'com.example.Class; cat /etc/passwd',
            'com.example.Class|whoami',
            'com.example.Class`id`',
            'com.example.Class$(whoami)',
            'com.example.Class\\x00malicious',
            'com.example.Class\nmalicious',
            'com.example.Class\rmalicious',
            '../../../etc/passwd',
            '..\\..\\..\\windows\\system32',
            'com.example.Class${ENV_VAR}',
        ];

        it.each(commandInjectionAttempts)('should reject: %s', (attempt) => {
            expect(() => validateClassName(attempt)).toThrow();
        });
    });

    describe('shell execution', () => {
        it('should not execute shell commands in arguments', async () => {
            // This verifies that arguments are not interpreted by the shell
            const args = ['hello', 'world'];

            if (process.platform === 'win32') {
                const result = await runCommand({
                    command: 'cmd.exe',
                    args: ['/c', 'echo', ...args],
                    timeout: 5000,
                    silent: true,
                });
                expect(result.exitCode).toBe(0);
            } else {
                const result = await runCommand({
                    command: 'echo',
                    args,
                    timeout: 5000,
                    silent: true,
                });
                expect(result.exitCode).toBe(0);
            }
        });

        it('should pass shell metacharacters as literal arguments', async () => {
            // runCommand uses spawn with shell: false, so metacharacters are
            // never interpreted by a shell - they must arrive literally.
            const metacharArgs = [
                'value$(whoami)',
                'value`id`',
                'value; rm -rf /',
            ];

            for (const arg of metacharArgs) {
                if (process.platform === 'win32') {
                    const result = await runCommand({
                        command: 'cmd.exe',
                        args: ['/c', 'echo', arg],
                        timeout: 5000,
                        silent: true,
                    });
                    expect(result.stdout).toContain(arg);
                } else {
                    const result = await runCommand({
                        command: 'echo',
                        args: [arg],
                        timeout: 5000,
                        silent: true,
                    });
                    expect(result.stdout).toContain(arg);
                }
            }
        });
    });
});

describe('Security: Path Traversal Prevention', () => {
    describe('projectPath validation', () => {
        const pathTraversalAttempts = [
            '../../../etc',
            '../../etc/passwd',
            '..\\..\\..\\windows\\system32',
            '/path/../../../etc',
            'C:\\path\\..\\..\\windows',
        ];

        it.each(pathTraversalAttempts)('should reject: %s', (attempt) => {
            expect(() => validateProjectPath(attempt)).toThrow();
        });
    });

    describe('jarPath validation', () => {
        const pathTraversalAttempts = [
            '../../../etc/passwd.jar',
            '../../malicious.jar',
            '..\\..\\system32\\malicious.jar',
        ];

        it.each(pathTraversalAttempts)('should reject: %s', (attempt) => {
            expect(() => validateJarPath(attempt)).toThrow();
        });

        it('should reject non-JAR files', () => {
            expect(() => validateJarPath('/path/to/file.txt')).toThrow();
            expect(() => validateJarPath('/path/to/file.sh')).toThrow();
            expect(() => validateJarPath('/path/to/file.exe')).toThrow();
        });
    });
});

describe('Security: Resource Limits', () => {
    it('should reject extremely long class names', () => {
        const longName = 'a'.repeat(2000);
        expect(() => validateClassName(longName)).toThrow();
    });

    it('should reject extremely long paths', () => {
        const longPath = '/a/'.repeat(200);
        expect(() => validateProjectPath(longPath)).toThrow();
    });

    it('should reject negative timeouts', () => {
        expect(() => validateTimeout(-1)).toThrow();
        expect(() => validateTimeout(0)).toThrow();
    });
});

describe('Security: Type Validation', () => {
    it('should reject non-string inputs', () => {
        expect(() => validateClassName(null as any)).toThrow();
        expect(() => validateClassName(undefined as any)).toThrow();
        expect(() => validateClassName(123 as any)).toThrow();
        expect(() => validateClassName({} as any)).toThrow();
        expect(() => validateClassName([] as any)).toThrow();

        expect(() => validateProjectPath(null as any)).toThrow();
        expect(() => validateProjectPath(undefined as any)).toThrow();
        expect(() => validateProjectPath(123 as any)).toThrow();

        expect(() => validateJarPath(null as any)).toThrow();
        expect(() => validateJarPath(undefined as any)).toThrow();
        expect(() => validateJarPath(123 as any)).toThrow();
    });
});

describe('Security: Special Cases', () => {
    it('should reject empty strings', () => {
        expect(() => validateClassName('')).toThrow();
        expect(() => validateProjectPath('')).toThrow();
        expect(() => validateJarPath('')).toThrow();
    });

    it('should reject null bytes', () => {
        expect(() => validateClassName('com.example\x00.Class')).toThrow();
        expect(() => validateProjectPath('/path\x00/name')).toThrow();
    });

    it('should handle Unicode in class names', () => {
        // Valid ASCII identifiers should work
        expect(() => validateClassName('com.example.MyClass')).not.toThrow();

        // Class name validation is ASCII-only (conservative policy):
        // non-ASCII letters are rejected even though Java allows them
        expect(() => validateClassName('com.example.MyClæss')).toThrow();
    });
});
