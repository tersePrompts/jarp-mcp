/**
 * Safe shell command execution utilities.
 * Uses spawn with argument arrays to prevent command injection.
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { getConfig as getServerConfig } from '../config/Config.js';

const execAsync = promisify(exec);

/**
 * Get the current platform, allowing for manual override via config.
 * @returns Platform identifier ('win32', 'darwin', 'linux', etc.)
 */
export function getPlatform(): string {
    const config = getServerConfig();
    return config.platform || process.platform;
}

/**
 * Options for running a command.
 */
export interface CommandOptions {
    /** Command to execute */
    command: string;
    /** Command arguments (passed directly, no shell interpretation) */
    args: string[];
    /** Working directory */
    cwd?: string;
    /** Timeout in milliseconds (default: 30000) */
    timeout?: number;
    /** Environment variables (merged with process.env) */
    env?: NodeJS.ProcessEnv;
    /** Whether to log output (default: false) */
    silent?: boolean;
}

/**
 * Result of a command execution.
 */
export interface CommandResult {
    /** Standard output */
    stdout: string;
    /** Standard error output */
    stderr: string;
    /** Exit code (0 = success) */
    exitCode: number | null;
}

/**
 * Error thrown when a command fails.
 */
export class CommandError extends Error {
    public readonly exitCode: number | null;
    public readonly stderr: string;
    public readonly stdout: string;

    constructor(message: string, exitCode: number | null, stderr: string, stdout: string) {
        super(message);
        this.name = 'CommandError';
        this.exitCode = exitCode;
        this.stderr = stderr;
        this.stdout = stdout;
    }
}

/**
 * Error thrown when a command times out.
 */
export class CommandTimeoutError extends Error {
    public readonly timeout: number;

    constructor(timeout: number) {
        super(`Command timed out after ${timeout}ms`);
        this.name = 'CommandTimeoutError';
        this.timeout = timeout;
    }
}

/**
 * Safely executes a command.
 * Uses exec for Windows batch files, spawn for everything else.
 *
 * @param options - Command execution options
 * @returns Promise resolving to command output
 * @throws CommandError if command fails
 * @throws CommandTimeoutError if command times out
 */
export async function runCommand(options: CommandOptions): Promise<CommandResult> {
    const {
        command,
        args,
        cwd,
        timeout = 30000,
        env,
        silent = false
    } = options;

    // Validate inputs
    if (!command || typeof command !== 'string') {
        throw new Error('command must be a non-empty string');
    }

    if (!Array.isArray(args)) {
        throw new Error('args must be an array');
    }

    // Validate timeout
    if (typeof timeout !== 'number' || timeout < 100) {
        throw new Error('timeout must be at least 100ms');
    }

    // On Windows, batch files require exec (spawn with shell has issues)
    const platform = getPlatform();
    const needsExec = platform === 'win32' &&
        (command.endsWith('.cmd') || command.endsWith('.bat') || command === 'mvn');

    if (needsExec) {
        // Use exec for batch files on Windows
        return runCommandWithExec(command, args, { cwd, timeout, env, silent });
    }

    return runCommandWithSpawn(command, args, { cwd, timeout, env, silent });
}

/**
 * Run command using exec (for Windows batch files).
 */
function runCommandWithExec(
    command: string,
    args: string[],
    options: { cwd?: string; timeout: number; env?: NodeJS.ProcessEnv; silent: boolean }
): Promise<CommandResult> {
    const { cwd, timeout, env, silent } = options;

    // On Windows, convert backslashes to forward slashes to avoid escape issues
    // Windows accepts forward slashes in paths
    const normalizedCommand = command.replace(/\\/g, '/');

    // Build command line
    const escapedArgs = args.map(arg => {
        // For Windows cmd: wrap in double quotes if contains spaces
        if (arg.includes(' ')) {
            return `"${arg}"`;
        }
        return arg;
    });

    // Quote the command to handle paths with spaces/special chars
    const cmdLine = `"${normalizedCommand}" ${escapedArgs.join(' ')}`;

    if (!silent) {
        process.stderr.write(`[DEBUG] Executing: ${cmdLine}\n`);
    }

    // Set a timeout to kill the process
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new CommandTimeoutError(timeout)), timeout);
    });

    const execPromise = execAsync(cmdLine, {
        cwd,
        env: { ...process.env, ...env },
        timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        windowsHide: true,
    });

    return Promise.race([timeoutPromise, execPromise])
        .then(({ stdout, stderr }) => ({
            stdout: String(stdout),
            stderr: String(stderr),
            exitCode: 0
        }))
        .catch((err: any) => {
            if (err.killed || err.signal === 'SIGTERM' || err.signal === 'SIGKILL') {
                throw new CommandTimeoutError(timeout);
            }
            throw new CommandError(
                err.message || 'Command failed',
                err.code || null,
                err.stderr || '',
                err.stdout || ''
            );
        });
}

/**
 * Run command using spawn (for regular executables).
 */
function runCommandWithSpawn(
    command: string,
    args: string[],
    options: { cwd?: string; timeout: number; env?: NodeJS.ProcessEnv; silent: boolean }
): Promise<CommandResult> {
    const { cwd, timeout, env, silent } = options;

    // Validate all args are strings
    for (const arg of args) {
        if (typeof arg !== 'string') {
            throw new Error(`All args must be strings, got: ${typeof arg}`);
        }
        if (arg.includes('\0')) {
            throw new Error('Argument cannot contain null bytes');
        }
    }

    return new Promise<CommandResult>((resolve, reject) => {
        let stdout = '';
        let stderr = '';
        let done = false;
        const timers: NodeJS.Timeout[] = [];

        const cleanup = () => timers.forEach(clearTimeout);

        const finish = (fn: () => void) => {
            if (done) return;
            done = true;
            cleanup();
            fn();
        };

        const child = spawn(command, args, {
            cwd,
            env: { ...process.env, ...env },
            shell: false,
            windowsHide: true,
        });

        // Timeout: SIGTERM, then SIGKILL after 2s
        timers.push(setTimeout(() => {
            child.pid && process.kill(child.pid, 'SIGTERM');
            timers.push(setTimeout(() => {
                finish(() => reject(new CommandTimeoutError(timeout)));
            }, 2000));
        }, timeout));

        child.stdout?.on('data', (d) => {
            stdout += d;
            silent || process.stderr.write(`[stdout] ${d}`);
        });

        child.stderr?.on('data', (d) => {
            stderr += d;
            silent || process.stderr.write(`[stderr] ${d}`);
        });

        child.on('close', (code) => finish(() =>
            code === 0
                ? resolve({ stdout, stderr, exitCode: code })
                : reject(new CommandError(`Command failed with exit code ${code}`, code, stderr, stdout))
        ));

        child.on('error', (err) => finish(() =>
            reject(new CommandError(`Failed to spawn: ${err.message}`, null, stderr, stdout))
        ));
    });
}

/**
 * Platform-aware executable path construction.
 * @param baseDir - Base directory (e.g., JAVA_HOME/bin)
 * @param exeName - Executable name (e.g., 'java')
 * @returns Full path to executable
 */
function getExecutablePath(baseDir: string | undefined, exeName: string): string {
    if (!baseDir) {
        return exeName;
    }

    // Platform-specific extension handling
    // Windows executables typically have .exe extension, but not always (e.g., scripts in bin/)
    // Try with extension first, then without
    const platform = process.platform;
    const exePath = path.join(baseDir, exeName);

    // On Windows, if no extension, try .exe
    if (platform === 'win32' && !path.extname(exePath)) {
        return exePath + '.exe';
    }

    return exePath;
}

/**
 * Builds a Java command path based on platform and JAVA_HOME.
 */
export function getJavaCommand(): string {
    const javaHome = getConfig().javaHome;
    return javaHome ? getExecutablePath(path.join(javaHome, 'bin'), 'java') : 'java';
}

/**
 * Builds a javap command path based on platform and JAVA_HOME.
 */
export function getJavapCommand(): string {
    const javaHome = getConfig().javaHome;
    return javaHome ? getExecutablePath(path.join(javaHome, 'bin'), 'javap') : 'javap';
}

/**
 * Builds a Maven command path based on platform and MAVEN_HOME.
 * Cross-platform support for Windows (mvn.cmd), macOS/Linux (mvn).
 */
export function getMavenCommand(): string {
    const config = getServerConfig();
    const mavenHome = config.mavenHome;
    const platform = getPlatform();

    if (mavenHome) {
        // Platform-specific script names
        // Windows: mvn.cmd
        // macOS/Linux: mvn
        const scriptName = platform === 'win32' ? 'mvn.cmd' : 'mvn';
        return path.join(mavenHome, 'bin', scriptName);
    }
    // Fallback: rely on PATH environment variable
    return 'mvn';
}

/**
 * Reset cached config (for testing).
 */
export function resetConfigCache(): void {
    configCache = null;
}

/**
 * Cached config to avoid repeated imports.
 */
let configCache: any = null;
function getConfig(): any {
    if (!configCache) {
        // Read directly from env - simple and avoids circular dependency
        configCache = {
            javaHome: process.env.JAVA_HOME,
            mavenHome: process.env.MAVEN_HOME,
        };
    }
    return configCache;
}
