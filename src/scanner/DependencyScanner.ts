import fs from 'fs-extra';
import * as path from 'path';
import * as yauzl from 'yauzl';
import { runCommand, getMavenCommand } from '../utils/shell.js';
import { validateProjectPath, validateClassIndexEntry } from '../utils/validation.js';
import { CONSTANTS } from '../utils/constants.js';
import { createLogger } from '../utils/logger.js';
import { getConfig, getMavenRepositoryPath } from '../config/Config.js';

const logger = createLogger('DependencyScanner');

export interface ClassIndexEntry {
    className: string;
    jarPath: string;
    packageName: string;
    simpleName: string;
}

export interface ScanResult {
    jarCount: number;
    classCount: number;
    indexPath: string;
    sampleEntries: string[];
}

/**
 * Tracks scanning progress for logging.
 */
interface ScanProgress {
    processedJars: number;
    totalJars: number;
    failedJars: number;
}

/**
 * Tracks JAR processing limits (for zip bomb protection).
 */
interface JarProcessingState {
    entryCount: number;
    uncompressedSize: number;
}

export class DependencyScanner {
    private config = getConfig();

    /**
     * Scan all dependencies of a Maven project and build mapping index from class names to JAR packages.
     * @param projectPath - Path to the Maven project directory
     * @param forceRefresh - Whether to force rebuild the index
     * @returns Scan results with statistics
     */
    async scanProject(projectPath: string, forceRefresh: boolean = false): Promise<ScanResult> {
        // Validate input to prevent path traversal
        validateProjectPath(projectPath);

        const indexPath = path.join(projectPath, CONSTANTS.INDEX_FILE_NAME);
        const isDebug = this.config.debugMode;

        logger.info(`Starting Maven dependency scan`, { projectPath, forceRefresh });

        // If force refresh, delete old index file first
        if (forceRefresh && await fs.pathExists(indexPath)) {
            if (isDebug) {
                logger.debug('Force refresh: deleting old index file');
            }
            await fs.remove(indexPath);
        }

        // Check cache
        if (!forceRefresh && await fs.pathExists(indexPath)) {
            if (isDebug) {
                logger.debug('Using cached class index');
            }
            try {
                const cachedIndex = await fs.readJson(indexPath);
                // Validate index file size
                const indexSize = JSON.stringify(cachedIndex).length;
                if (indexSize > CONSTANTS.MAX_INDEX_SIZE) {
                    logger.warn('Index file exceeds maximum size, rebuilding');
                    await fs.remove(indexPath);
                } else {
                    // Validate index integrity before using
                    this.validateIndexData(cachedIndex);
                    return {
                        jarCount: cachedIndex.jarCount || 0,
                        classCount: cachedIndex.classCount || 0,
                        indexPath,
                        sampleEntries: cachedIndex.sampleEntries || []
                    };
                }
            } catch (error) {
                logger.warn('Failed to read cached index, rebuilding', { error });
            }
        }

        // 1. Get Maven dependency tree
        const dependencies = await this.getMavenDependencies(projectPath);
        logger.info(`Found ${dependencies.length} dependency JARs`);

        if (dependencies.length === 0) {
            throw new Error('No dependencies found. Please ensure this is a valid Maven project with dependencies.');
        }

        // 2. Parse each JAR package and build class index
        const classIndex: ClassIndexEntry[] = [];
        const progress: ScanProgress = {
            processedJars: 0,
            totalJars: dependencies.length,
            failedJars: 0
        };

        for (const jarPath of dependencies) {
            try {
                // Check JAR file size
                const stats = await fs.stat(jarPath);
                if (stats.size > this.config.maxJarSize) {
                    logger.warn(`Skipping JAR exceeding size limit`, { jarPath: path.basename(jarPath), size: stats.size });
                    progress.failedJars++;
                    continue;
                }

                const classes = await this.extractClassesFromJar(jarPath);
                classIndex.push(...classes);
                progress.processedJars++;

                if (progress.processedJars % 10 === 0) {
                    logger.debug(`Processed ${progress.processedJars}/${dependencies.length} JARs`);
                }
            } catch (error) {
                progress.failedJars++;
                logger.warn(`Failed to process JAR`, { jarPath: path.basename(jarPath), error: error instanceof Error ? error.message : String(error) });
            }
        }

        // 3. Save index to file
        const result: ScanResult = {
            jarCount: progress.processedJars,
            classCount: classIndex.length,
            indexPath,
            sampleEntries: classIndex.slice(0, 10).map(entry =>
                `${entry.className} -> ${path.basename(entry.jarPath)}`
            )
        };

        await fs.outputJson(indexPath, {
            ...result,
            classIndex,
            lastUpdated: new Date().toISOString()
        }, { spaces: 2 });

        logger.info(`Scan complete! Processed ${progress.processedJars} JARs, indexed ${classIndex.length} classes`, {
            failedJars: progress.failedJars
        });

        return result;
    }

    /**
     * Get all JAR package paths from Maven dependency tree.
     * @param projectPath - Path to the Maven project
     * @returns Array of JAR file paths
     */
    private async getMavenDependencies(projectPath: string): Promise<string[]> {
        try {
            const mavenCmd = getMavenCommand();

            logger.debug(`Running Maven dependency tree`, { projectPath, mavenCmd });

            const { stdout } = await runCommand({
                command: mavenCmd,
                args: ['dependency:tree', '-DoutputType=text'],
                cwd: projectPath,
                timeout: this.config.mavenTimeout,
                silent: true,
            });

            // Parse output, extract JAR package paths
            const jarPaths = new Set<string>();
            const lines = stdout.split('\n');

            for (const line of lines) {
                // Match lines like: [INFO] +- com.example:my-lib:jar:1.0.0:compile
                const match = line.match(/\[INFO\].*?([a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+)/);
                if (match) {
                    const dependency = match[1];
                    // Validate dependency format before processing
                    const parts = dependency.split(':');
                    if (parts.length >= 4 && parts.every(p => p.length > 0)) {
                        const jarPath = await this.resolveJarPath(dependency);
                        if (jarPath && await fs.pathExists(jarPath)) {
                            jarPaths.add(jarPath);
                        }
                    }
                }
            }

            return Array.from(jarPaths);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('Failed to get Maven dependencies', { error: errorMsg });

            // Provide helpful error message if Maven is not found
            if (errorMsg.includes('not recognized') || errorMsg.includes('not found')) {
                throw new Error(
                    'Maven command not found. Please install Maven or set MAVEN_HOME environment variable. ' +
                    'You can also pass MAVEN_HOME in your MCP server config: "env": { "MAVEN_HOME": "path/to/maven" }'
                );
            }

            // If Maven command fails, try scanning from local repository
            return await this.scanLocalMavenRepo();
        }
    }

    /**
     * Scan JAR packages from local Maven repository.
     * Note: This is a fallback method and may be slow.
     * @returns Array of JAR file paths
     */
    private async scanLocalMavenRepo(): Promise<string[]> {
        const mavenRepoPath = getMavenRepositoryPath();

        logger.warn(`Maven scan failed, falling back to local repository scan`, { mavenRepoPath });

        if (!await fs.pathExists(mavenRepoPath)) {
            throw new Error('Maven local repository does not exist and Maven command failed');
        }

        // Limit the scan to avoid performance issues
        const jarFiles: string[] = [];
        let scannedDirs = 0;
        const MAX_DIRS = 1000; // Safety limit

        const scanDir = async (dir: string, depth: number = 0): Promise<void> => {
            if (scannedDirs > MAX_DIRS || depth > 10) {
                return; // Prevent infinite recursion and excessive scanning
            }

            scannedDirs++;

            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);

                    if (entry.isDirectory()) {
                        await scanDir(fullPath, depth + 1);
                    } else if (entry.isFile() && entry.name.endsWith('.jar')) {
                        jarFiles.push(fullPath);
                    }
                }
            } catch (error) {
                // Skip directories we can't read
                logger.debug(`Skipping directory`, { dir, error });
            }
        };

        await scanDir(mavenRepoPath);
        logger.info(`Found ${jarFiles.length} JARs in local repository`);

        return jarFiles;
    }

    /**
     * Resolve dependency coordinates to get JAR package path.
     * @param dependency - Maven dependency string (groupId:artifactId:type:version:scope)
     * @returns Resolved JAR file path or null
     */
    private async resolveJarPath(dependency: string): Promise<string | null> {
        const parts = dependency.split(':');
        if (parts.length < 4) {
            return null;
        }

        const [groupId, artifactId, type, version] = parts;

        // Validate all parts are non-empty
        if (!groupId || !artifactId || !type || !version) {
            return null;
        }

        if (type !== 'jar') {
            return null;
        }

        // Use Maven repository path
        const mavenRepoPath = getMavenRepositoryPath();
        const groupPath = groupId.replace(/\./g, '/');
        const jarPath = path.join(
            mavenRepoPath,
            groupPath,
            artifactId,
            version,
            `${artifactId}-${version}.jar`
        );

        return jarPath;
    }

    /**
     * Extract all class file information from JAR package with archive bomb protection.
     * @param jarPath - Path to JAR file
     * @returns Array of class index entries
     */
    private async extractClassesFromJar(jarPath: string): Promise<ClassIndexEntry[]> {
        return new Promise((resolve, reject) => {
            const classes: ClassIndexEntry[] = [];
            const state: JarProcessingState = {
                entryCount: 0,
                uncompressedSize: 0,
            };

            yauzl.open(jarPath, { lazyEntries: true }, (err: any, zipfile: any) => {
                if (err) {
                    reject(err);
                    return;
                }

                zipfile.readEntry();

                zipfile.on('entry', (entry: any) => {
                    // Archive bomb protection
                    state.entryCount++;
                    if (state.entryCount > CONSTANTS.MAX_ENTRIES_PER_JAR) {
                        zipfile.close(() => {
                            reject(new Error(`JAR file exceeds maximum entry count (${CONSTANTS.MAX_ENTRIES_PER_JAR}): possible zip bomb`));
                        });
                        return;
                    }

                    if (entry.uncompressedSize) {
                        state.uncompressedSize += entry.uncompressedSize;
                        if (state.uncompressedSize > CONSTANTS.MAX_UNCOMPRESSED_SIZE_PER_JAR) {
                            zipfile.close(() => {
                                reject(new Error(`JAR file exceeds maximum uncompressed size (${CONSTANTS.MAX_UNCOMPRESSED_SIZE_PER_JAR}): possible zip bomb`));
                            });
                            return;
                        }
                    }

                    if (entry.fileName.endsWith(CONSTANTS.CLASS_FILE_EXT) && !entry.fileName.includes('$')) {
                        const className = entry.fileName
                            .replace(CONSTANTS.CLASS_FILE_EXT, '')
                            .replace(/\//g, '.');

                        const lastDotIndex = className.lastIndexOf('.');
                        const packageName = lastDotIndex > 0 ? className.substring(0, lastDotIndex) : '';
                        const simpleName = lastDotIndex > 0 ? className.substring(lastDotIndex + 1) : className;

                        classes.push({
                            className,
                            jarPath,
                            packageName,
                            simpleName
                        });
                    }

                    zipfile.readEntry();
                });

                zipfile.on('end', () => {
                    zipfile.close((closeErr: any) => {
                        if (closeErr) {
                            logger.warn(`Failed to close JAR file`, { jarPath: path.basename(jarPath), error: closeErr });
                        }
                        resolve(classes);
                    });
                });

                zipfile.on('error', (err: any) => {
                    zipfile.close(() => {
                        reject(err);
                    });
                });
            });
        });
    }

    /**
     * Validate index data structure and integrity.
     * @param indexData - Index data to validate
     * @throws Error if index is corrupted
     */
    private validateIndexData(indexData: any): void {
        if (!indexData || typeof indexData !== 'object') {
            throw new Error('Index file is corrupted: invalid root object');
        }

        if (!Array.isArray(indexData.classIndex)) {
            throw new Error('Index file is corrupted: classIndex is not an array');
        }

        // Validate each entry
        for (const entry of indexData.classIndex) {
            try {
                validateClassIndexEntry(entry);
            } catch (error) {
                throw new Error(`Index file is corrupted: invalid entry - ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    }

    /**
     * Find corresponding JAR package path by class name.
     * @param className - Fully qualified class name
     * @param projectPath - Path to the project directory
     * @returns JAR file path or null if not found
     */
    async findJarForClass(className: string, projectPath: string): Promise<string | null> {
        validateProjectPath(projectPath);

        const indexPath = path.join(projectPath, CONSTANTS.INDEX_FILE_NAME);

        if (!await fs.pathExists(indexPath)) {
            throw new Error('Class index does not exist, please run dependency scan first');
        }

        try {
            const indexData = await fs.readJson(indexPath);

            // Validate index before using
            this.validateIndexData(indexData);

            const classIndex: ClassIndexEntry[] = indexData.classIndex || [];

            const entry = classIndex.find(entry => entry.className === className);
            return entry ? entry.jarPath : null;
        } catch (error) {
            if (error instanceof Error && error.message.includes('corrupted')) {
                throw error;
            }
            logger.error('Failed to read class index', { error });
            throw new Error('Failed to read class index file');
        }
    }

    /**
     * Get all indexed class names.
     * @param projectPath - Path to the project directory
     * @returns Array of class names
     */
    async getAllClassNames(projectPath: string): Promise<string[]> {
        validateProjectPath(projectPath);

        const indexPath = path.join(projectPath, CONSTANTS.INDEX_FILE_NAME);

        if (!await fs.pathExists(indexPath)) {
            return [];
        }

        try {
            const indexData = await fs.readJson(indexPath);

            // Validate index before using
            this.validateIndexData(indexData);

            const classIndex: ClassIndexEntry[] = indexData.classIndex || [];

            return classIndex.map(entry => entry.className);
        } catch (error) {
            logger.error('Failed to read class index', { error });
            return [];
        }
    }
}

