import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs-extra';
import { readFile, readdir } from 'fs/promises';
import * as path from 'path';
import * as yauzl from 'yauzl';
import { fileURLToPath } from 'url';
import { createWriteStream } from 'fs';
import { DependencyScanner } from '../scanner/DependencyScanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

export class DecompilerService {
    private scanner: DependencyScanner;
    private cfrPath: string;

    constructor() {
        this.scanner = new DependencyScanner();
        this.cfrPath = '';
    }

    private async initializeCfrPath(): Promise<void> {
        if (!this.cfrPath) {
            this.cfrPath = await this.findCfrJar();
            if (!this.cfrPath) {
                throw new Error('CFR decompiler tool not found. Please download CFR jar to lib directory or set CFR_PATH environment variable');
            }
            console.error(`CFR tool path: ${this.cfrPath}`);
        }
    }

    /**
     * Decompile specified Java class file
     */
    async decompileClass(className: string, projectPath: string, useCache: boolean = true, cfrPath?: string): Promise<string> {
        try {
            // If external CFR path is specified, use external path
            if (cfrPath) {
                this.cfrPath = cfrPath;
                console.error(`Using externally specified CFR tool path: ${this.cfrPath}`);
            } else {
                await this.initializeCfrPath();
            }

            // 1. Check cache
            const cachePath = this.getCachePath(className, projectPath);
            if (useCache && await fs.pathExists(cachePath)) {
                console.error(`Using cached decompilation result: ${cachePath}`);
                return await readFile(cachePath, 'utf-8');
            }

            // 2. Find corresponding JAR package for class
            console.error(`Finding JAR package for class ${className}...`);

            // Add timeout handling
            const jarPath = await Promise.race([
                this.scanner.findJarForClass(className, projectPath),
                new Promise<null>((_, reject) =>
                    setTimeout(() => reject(new Error('JAR package lookup timeout')), 10000)
                )
            ]);

            if (!jarPath) {
                throw new Error(`JAR package for class ${className} not found, please run scan_dependencies first to build class index`);
            }
            console.error(`Found JAR package: ${jarPath}`);

            // 3. Extract .class file from JAR package
            const classFilePath = await this.extractClassFile(jarPath, className);

            // 4. Use CFR to decompile
            const sourceCode = await this.decompileWithCfr(classFilePath);

            // 5. Save to cache
            if (useCache) {
                await fs.ensureDir(path.dirname(cachePath));
                await fs.outputFile(cachePath, sourceCode, 'utf-8');
                console.error(`Decompilation result cached: ${cachePath}`);
            }

            // 6. Clean up temporary files (only when not using cache)
            if (!useCache) {
                try {
                    await fs.remove(classFilePath);
                    console.error(`Cleaning up temporary file: ${classFilePath}`);
                } catch (cleanupError) {
                    console.warn(`Failed to clean up temporary file: ${cleanupError}`);
                }
            }

            return sourceCode;
        } catch (error) {
            console.error(`Failed to decompile class ${className}:`, error);
            throw error; // Re-throw error for upper layer handling
        }
    }

    /**
     * Get cache file path
     */
    private getCachePath(className: string, projectPath: string): string {
        const packagePath = className.substring(0, className.lastIndexOf('.'));
        const simpleName = className.substring(className.lastIndexOf('.') + 1);
        const cacheDir = path.join(projectPath, '.mcp-decompile-cache');
        const packageDir = path.join(cacheDir, packagePath.replace(/\./g, path.sep));
        return path.join(packageDir, `${simpleName}.java`);
    }

    /**
     * Extract specified .class file from JAR package
     */
    private async extractClassFile(jarPath: string, className: string): Promise<string> {
        const classFileName = className.replace(/\./g, '/') + '.class';
        const tempDir = path.join(process.cwd(), '.mcp-class-temp');
        // Create directory structure by full package name path
        const packagePath = className.substring(0, className.lastIndexOf('.'));
        const packageDir = path.join(tempDir, packagePath.replace(/\./g, path.sep));
        const classFilePath = path.join(packageDir, `${className.substring(className.lastIndexOf('.') + 1)}.class`);

        await fs.ensureDir(packageDir);

        console.error(`Extracting class file from JAR package: ${jarPath} -> ${classFileName}`);

        return new Promise((resolve, reject) => {
            yauzl.open(jarPath, { lazyEntries: true }, (err: any, zipfile: any) => {
                if (err) {
                    reject(new Error(`Unable to open JAR package ${jarPath}: ${err.message}`));
                    return;
                }

                let found = false;
                zipfile.readEntry();

                const closeAndReject = (err: Error) => {
                    zipfile.close(() => {
                        reject(err);
                    });
                };

                zipfile.on('entry', (entry: any) => {
                    if (entry.fileName === classFileName) {
                        found = true;
                        zipfile.openReadStream(entry, (err: any, readStream: any) => {
                            if (err) {
                                closeAndReject(new Error(`Unable to read class file ${classFileName} from JAR package: ${err.message}`));
                                return;
                            }

                            const writeStream = createWriteStream(classFilePath);
                            readStream.pipe(writeStream);

                            writeStream.on('close', () => {
                                console.error(`Class file extracted successfully: ${classFilePath}`);
                                zipfile.close(() => {
                                    resolve(classFilePath);
                                });
                            });

                            writeStream.on('error', (err: any) => {
                                closeAndReject(new Error(`Failed to write temporary file: ${err.message}`));
                            });
                        });
                    } else {
                        zipfile.readEntry();
                    }
                });

                zipfile.on('end', () => {
                    if (!found) {
                        closeAndReject(new Error(`Class file ${classFileName} not found in JAR package ${jarPath}`));
                    }
                });

                zipfile.on('error', (err: any) => {
                    closeAndReject(new Error(`Failed to read JAR package: ${err.message}`));
                });
            });
        });
    }

    /**
     * Use CFR to decompile .class file
     */
    private async decompileWithCfr(classFilePath: string): Promise<string> {
        if (!this.cfrPath) {
            throw new Error('CFR decompiler tool not found, please ensure CFR jar is in classpath');
        }

        try {
            const javaCmd = this.getJavaCommand();
            // If Java path contains spaces, need to wrap with quotes
            const quotedJavaCmd = javaCmd.includes(' ') ? `"${javaCmd}"` : javaCmd;
            console.error(`Executing CFR decompilation: ${quotedJavaCmd} -jar "${this.cfrPath}" "${classFilePath}"`);

            const { stdout, stderr } = await execAsync(

                `${quotedJavaCmd} -jar "${this.cfrPath}" "${classFilePath}" --silent true`,
                { timeout: 30000 }
            );

            if (stderr && stderr.trim()) {
                console.warn('CFR warning:', stderr);
            }

            if (!stdout || stdout.trim() === '') {
                throw new Error('CFR decompilation returned empty result, possibly due to corrupted class file or incompatible CFR version');
            }

            return stdout;
        } catch (error) {
            console.error('CFR decompilation execution failed:', error);
            if (error instanceof Error && error.message.includes('timeout')) {
                throw new Error('CFR decompilation timeout, please check Java environment and CFR tool');
            }
            throw new Error(`CFR decompilation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get package root directory (works with npx, npm install -g, and local dev)
     */
    private getPackageRoot(): string {
        // When running from compiled dist/decompiler/DecompilerService.js
        // __dirname = dist/decompiler/, so we go up 3 levels to get package root
        const distDir = path.dirname(__dirname); // dist/
        return path.dirname(distDir); // package root
    }

    /**
     * Find CFR jar package path
     */
    private async findCfrJar(): Promise<string> {
        // 1. Check CFR_PATH env var first (allows custom CFR version)
        if (process.env.CFR_PATH && await fs.pathExists(process.env.CFR_PATH)) {
            return process.env.CFR_PATH;
        }

        // 2. Try bundled CFR at package root lib/ (works with npx and npm install)
        const bundledLibPath = path.join(this.getPackageRoot(), 'lib');
        if (await fs.pathExists(bundledLibPath)) {
            const files = await readdir(bundledLibPath);
            const cfrJar = files.find(file => /^cfr-.*\.jar$/.test(file));
            if (cfrJar) {
                return path.join(bundledLibPath, cfrJar);
            }
        }

        // 3. Try current working directory lib/ (for local development)
        const cwdLibPath = path.join(process.cwd(), 'lib');
        if (await fs.pathExists(cwdLibPath)) {
            const files = await readdir(cwdLibPath);
            const cfrJar = files.find(file => /^cfr-.*\.jar$/.test(file));
            if (cfrJar) {
                return path.join(cwdLibPath, cfrJar);
            }
        }

        // 4. Try CLASSPATH (legacy support)
        const classpath = process.env.CLASSPATH || '';
        const classpathEntries = classpath.split(path.delimiter);
        for (const entry of classpathEntries) {
            if (entry.includes('cfr') && entry.endsWith('.jar') && await fs.pathExists(entry)) {
                return entry;
            }
        }

        return '';
    }

    /**
     * Batch decompile multiple classes
     */
    async decompileClasses(classNames: string[], projectPath: string, useCache: boolean = true, cfrPath?: string): Promise<Map<string, string>> {
        const results = new Map<string, string>();

        for (const className of classNames) {
            try {
                const sourceCode = await this.decompileClass(className, projectPath, useCache, cfrPath);
                results.set(className, sourceCode);
            } catch (error) {
                console.warn(`Failed to decompile class ${className}: ${error}`);
                results.set(className, `// Decompilation failed: ${error}`);
            }
        }

        return results;
    }


    /**
     * Get Java command path
     */
    private getJavaCommand(): string {
        const javaHome = process.env.JAVA_HOME;
        if (javaHome) {
            const javaCmd = process.platform === 'win32' ? 'java.exe' : 'java';
            return path.join(javaHome, 'bin', javaCmd);
        }
        return 'java'; // Fallback to java in PATH
    }
}
