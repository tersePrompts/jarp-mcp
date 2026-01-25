import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import * as path from 'path';
import { parseString } from 'xml2js';
import * as yauzl from 'yauzl';

const execAsync = promisify(exec);
const parseXmlAsync = promisify(parseString);

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

export class DependencyScanner {
    private indexCache: Map<string, ClassIndexEntry[]> = new Map();

    /**
     * Scan all dependencies of a Maven project and build mapping index from class names to JAR packages
     */
    async scanProject(projectPath: string, forceRefresh: boolean = false): Promise<ScanResult> {
        const indexPath = path.join(projectPath, '.mcp-class-index.json');
        const isDebug = process.env.NODE_ENV === 'development';

        // If force refresh, delete old index file first
        if (forceRefresh && await fs.pathExists(indexPath)) {
            if (isDebug) {
                console.error('Force refresh: deleting old index file');
            }
            await fs.remove(indexPath);
        }

        // Check cache
        if (!forceRefresh && await fs.pathExists(indexPath)) {
            if (isDebug) {
                console.error('Using cached class index');
            }
            const cachedIndex = await fs.readJson(indexPath);
            return {
                jarCount: cachedIndex.jarCount,
                classCount: cachedIndex.classCount,
                indexPath,
                sampleEntries: cachedIndex.sampleEntries
            };
        }

        if (isDebug) {
            console.error('Starting Maven dependency scan...');
        }

        // 1. Get Maven dependency tree
        const dependencies = await this.getMavenDependencies(projectPath);
        console.error(`Found ${dependencies.length} dependency JARs`);

        // 2. Parse each JAR package and build class index
        const classIndex: ClassIndexEntry[] = [];
        let processedJars = 0;

        for (const jarPath of dependencies) {
            try {
                const classes = await this.extractClassesFromJar(jarPath);
                classIndex.push(...classes);
                processedJars++;

                if (processedJars % 10 === 0) {
                    console.error(`Processed ${processedJars}/${dependencies.length} JARs`);
                }
            } catch (error) {
                console.warn(`Failed to process JAR: ${jarPath}, error: ${error}`);
            }
        }

        // 3. Save index to file
        const result: ScanResult = {
            jarCount: processedJars,
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

        console.error(`Scan complete! Processed ${processedJars} JARs, indexed ${classIndex.length} classes`);

        return result;
    }

    /**
     * Get all JAR package paths from Maven dependency tree
     */
    private async getMavenDependencies(projectPath: string): Promise<string[]> {
        try {
            // Build Maven command path
            const mavenCmd = this.getMavenCommand();

            // Execute mvn dependency:tree command
            const { stdout } = await execAsync(`${mavenCmd} dependency:tree -DoutputType=text`, {
                cwd: projectPath,
                timeout: 60000 // 60 second timeout
            });

            // Parse output, extract JAR package paths
            const jarPaths = new Set<string>();
            const lines = stdout.split('\n');

            for (const line of lines) {
                // Match lines like: [INFO] +- com.example:my-lib:jar:1.0.0:compile
                const match = line.match(/\[INFO\].*?([a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+)/);
                if (match) {
                    const dependency = match[1];
                    // Build JAR package path
                    const jarPath = await this.resolveJarPath(dependency, projectPath);
                    if (jarPath && await fs.pathExists(jarPath)) {
                        jarPaths.add(jarPath);
                    }
                }
            }

            return Array.from(jarPaths);
        } catch (error) {
            console.error('Failed to get Maven dependencies:', error);
            // If Maven command fails, try scanning from local repository
            return await this.scanLocalMavenRepo(projectPath);
        }
    }

    /**
     * Scan JAR packages from local Maven repository
     */
    private async scanLocalMavenRepo(projectPath: string): Promise<string[]> {
        const mavenRepoPath = this.getMavenRepositoryPath();

        if (!await fs.pathExists(mavenRepoPath)) {
            throw new Error('Maven local repository does not exist');
        }

        const jarFiles: string[] = [];

        const scanDir = async (dir: string) => {
            const entries = await fs.readdir(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    await scanDir(fullPath);
                } else if (entry.isFile() && entry.name.endsWith('.jar')) {
                    jarFiles.push(fullPath);
                }
            }
        };

        await scanDir(mavenRepoPath);
        return jarFiles;
    }

    /**
     * Resolve dependency coordinates to get JAR package path
     */
    private async resolveJarPath(dependency: string, projectPath: string): Promise<string | null> {
        const [groupId, artifactId, type, version, scope] = dependency.split(':');

        if (type !== 'jar') {
            return null;
        }

        // Use unified Maven repository path getter method
        const mavenRepoPath = this.getMavenRepositoryPath();
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
     * Extract all class file information from JAR package
     */
    private async extractClassesFromJar(jarPath: string): Promise<ClassIndexEntry[]> {
        return new Promise((resolve, reject) => {
            const classes: ClassIndexEntry[] = [];

            yauzl.open(jarPath, { lazyEntries: true }, (err: any, zipfile: any) => {
                if (err) {
                    reject(err);
                    return;
                }

                zipfile.readEntry();

                zipfile.on('entry', (entry: any) => {
                    if (entry.fileName.endsWith('.class') && !entry.fileName.includes('$')) {
                        const className = entry.fileName
                            .replace(/\.class$/, '')
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
                    resolve(classes);
                });

                zipfile.on('error', (err: any) => {
                    reject(err);
                });
            });
        });
    }

    /**
     * Find corresponding JAR package path by class name
     */
    async findJarForClass(className: string, projectPath: string): Promise<string | null> {
        const indexPath = path.join(projectPath, '.mcp-class-index.json');

        if (!await fs.pathExists(indexPath)) {
            throw new Error('Class index does not exist, please run dependency scan first');
        }

        const indexData = await fs.readJson(indexPath);
        const classIndex: ClassIndexEntry[] = indexData.classIndex;

        const entry = classIndex.find(entry => entry.className === className);
        return entry ? entry.jarPath : null;
    }

    /**
     * Get all indexed class names
     */
    async getAllClassNames(projectPath: string): Promise<string[]> {
        const indexPath = path.join(projectPath, '.mcp-class-index.json');

        if (!await fs.pathExists(indexPath)) {
            return [];
        }

        const indexData = await fs.readJson(indexPath);
        const classIndex: ClassIndexEntry[] = indexData.classIndex;

        return classIndex.map(entry => entry.className);
    }

    /**
     * Get Maven command path
     */
    private getMavenCommand(): string {
        const mavenHome = process.env.MAVEN_HOME;
        if (mavenHome) {
            const mavenCmd = process.platform === 'win32' ? 'mvn.cmd' : 'mvn';
            return path.join(mavenHome, 'bin', mavenCmd);
        }
        return 'mvn'; // Fallback to mvn in PATH
    }

    /**
     * Get Maven local repository path
     */
    private getMavenRepositoryPath(): string {
        // 1. Prioritize repository path specified by MAVEN_REPO environment variable
        const mavenRepo = process.env.MAVEN_REPO;
        if (mavenRepo) {
            return mavenRepo;
        }

        // 2. Use default Maven local repository path
        const homeDir = process.env.HOME || process.env.USERPROFILE;
        return path.join(homeDir!, '.m2', 'repository');
    }
}
