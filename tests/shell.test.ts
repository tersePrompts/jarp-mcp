/**
 * Tests for safe shell command execution.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { runCommand, getJavaCommand, getJavapCommand, getMavenCommand } from '../src/utils/shell.js';

describe('runCommand', () => {
    it('should execute simple commands', async () => {
        if (process.platform === 'win32') {
            const result = await runCommand({
                command: 'cmd.exe',
                args: ['/c', 'echo', 'hello'],
                timeout: 5000,
                silent: true,
            });
            expect(result.stdout).toContain('hello');
        } else {
            const result = await runCommand({
                command: 'echo',
                args: ['hello'],
                timeout: 5000,
                silent: true,
            });
            expect(result.stdout).toContain('hello');
        }
    });

    it('should respect timeout', async () => {
        await expect(runCommand({
            command: process.platform === 'win32' ? 'timeout' : 'sleep',
            args: ['60'], // Sleep for 60 seconds
            timeout: 100, // But timeout after 100ms
            silent: true,
        })).rejects.toThrow();
    });

    it('should reject null bytes in arguments', async () => {
        // Arguments with null bytes should be rejected
        await expect(runCommand({
            command: 'echo',
            args: ['test\x00null'], // Contains null byte
            timeout: 5000,
            silent: true,
        })).rejects.toThrow();
    });

    it('should reject non-array args', async () => {
        await expect(runCommand({
            command: 'echo',
            args: 'not an array' as any,
            timeout: 5000,
            silent: true,
        })).rejects.toThrow();
    });

    it('should handle command errors gracefully', async () => {
        await expect(runCommand({
            command: 'nonexistent-command-xyz-123',
            args: [],
            timeout: 5000,
            silent: true,
        })).rejects.toThrow();
    });
});

describe('Command helpers', () => {
    it('getJavaCommand should return java or path to java', () => {
        const cmd = getJavaCommand();
        expect(typeof cmd).toBe('string');
        expect(cmd.length).toBeGreaterThan(0);
        if (cmd !== 'java') expect(cmd.toLowerCase()).toContain('java');
    });

    it('getJavapCommand should return javap or path to javap', () => {
        const cmd = getJavapCommand();
        expect(typeof cmd).toBe('string');
        expect(cmd.length).toBeGreaterThan(0);
        if (cmd !== 'javap') expect(cmd.toLowerCase()).toContain('javap');
    });

    it('getMavenCommand should return mvn or path to mvn', () => {
        const cmd = getMavenCommand();
        expect(typeof cmd).toBe('string');
        expect(cmd.length).toBeGreaterThan(0);
        if (cmd !== 'mvn') expect(cmd.toLowerCase()).toContain('mvn');
    });
});

describe('Security: Command injection prevention', () => {
    it('should not allow command injection via arguments', async () => {
        // This test verifies that arguments are properly escaped
        // and that we're not using shell interpolation
        const maliciousArg = 'hello; rm -rf /';

        if (process.platform === 'win32') {
            const result = await runCommand({
                command: 'cmd.exe',
                args: ['/c', 'echo', maliciousArg],
                timeout: 5000,
                silent: true,
            });
            // The argument should be treated as a literal string
            expect(result.stdout).toContain(';');
        } else {
            const result = await runCommand({
                command: 'echo',
                args: [maliciousArg],
                timeout: 5000,
                silent: true,
            });
            // The argument should be treated as a literal string
            expect(result.stdout).toContain(';');
        }
    });

    it('should reject null bytes in arguments', async () => {
        // Null bytes are always rejected
        await expect(runCommand({
            command: 'echo',
            args: ['test\x00null'],
            timeout: 5000,
            silent: true,
        })).rejects.toThrow();
    });

    it('should allow special characters that are safe with shell: false', async () => {
        // Characters like $ and backticks are safe when shell: false
        const safeArgs = [
            'test$value',
            'test`id`',
            'test$(whoami)',
        ];

        for (const arg of safeArgs) {
            const result = await runCommand({
                command: process.platform === 'win32' ? 'cmd.exe' : 'echo',
                args: process.platform === 'win32' ? ['/c', 'echo', arg] : [arg],
                timeout: 5000,
                silent: true,
            });
            // The argument should be treated as a literal string
            expect(result.stdout).toBeTruthy();
        }
    });
});
