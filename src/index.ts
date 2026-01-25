#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { JavaClassAnalyzer } from './analyzer/JavaClassAnalyzer.js';
import { DependencyScanner } from './scanner/DependencyScanner.js';
import { DecompilerService } from './decompiler/DecompilerService.js';

export class JavaClassAnalyzerMCPServer {
    private server: Server;
    private analyzer: JavaClassAnalyzer;
    private scanner: DependencyScanner;
    private decompiler: DecompilerService;

    constructor() {
        this.server = new Server(
            {
                name: 'java-class-analyzer',
                version: '1.0.0',
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        this.analyzer = new JavaClassAnalyzer();
        this.scanner = new DependencyScanner();
        this.decompiler = new DecompilerService();

        this.setupHandlers();
    }

    private setupHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: 'scan_dependencies',
                        description: 'Scan all dependencies of a Maven project and build mapping index from class names to JAR packages',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                projectPath: {
                                    type: 'string',
                                    description: 'Maven project root directory path',
                                },
                                forceRefresh: {
                                    type: 'boolean',
                                    description: 'Whether to force refresh index',
                                    default: false,
                                },
                            },
                            required: ['projectPath'],
                        },
                    },
                    {
                        name: 'decompile_class',
                        description: 'Decompile specified Java class file and return Java source code',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                className: {
                                    type: 'string',
                                    description: 'Fully qualified name of the Java class to decompile, e.g., com.example.QueryBizOrderDO',
                                },
                                projectPath: {
                                    type: 'string',
                                    description: 'Maven project root directory path',
                                },
                                useCache: {
                                    type: 'boolean',
                                    description: 'Whether to use cache, default true',
                                    default: true,
                                },
                                cfrPath: {
                                    type: 'string',
                                    description: 'JAR package path of CFR decompilation tool, optional',
                                },
                            },
                            required: ['className', 'projectPath'],
                        },
                    },
                    {
                        name: 'analyze_class',
                        description: 'Analyze structure, methods, fields and other information of a Java class',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                className: {
                                    type: 'string',
                                    description: 'Fully qualified name of the Java class to analyze',
                                },
                                projectPath: {
                                    type: 'string',
                                    description: 'Maven project root directory path',
                                },
                            },
                            required: ['className', 'projectPath'],
                        },
                    },
                ],
            };
        });

        this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
            const { name, arguments: args } = request.params;

            try {
                switch (name) {
                    case 'scan_dependencies':
                        return await this.handleScanDependencies(args);
                    case 'decompile_class':
                        return await this.handleDecompileClass(args);
                    case 'analyze_class':
                        return await this.handleAnalyzeClass(args);
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            } catch (error) {
                console.error(`Tool call exception [${name}]:`, error);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Tool call failed: ${error instanceof Error ? error.message : String(error)}\n\nSuggestions:\n1. Check if input parameters are correct\n2. Ensure necessary preparations have been completed\n3. Check server logs for detailed information`,
                        },
                    ],
                };
            }
        });
    }

    private async handleScanDependencies(args: any) {
        const { projectPath, forceRefresh = false } = args;

        const result = await this.scanner.scanProject(projectPath, forceRefresh);

        return {
            content: [
                {
                    type: 'text',
                    text: `Dependency scanning complete!\n\n` +
                        `Scanned JAR count: ${result.jarCount}\n` +
                        `Indexed class count: ${result.classCount}\n` +
                        `Index file path: ${result.indexPath}\n\n` +
                        `Sample index entries:\n${result.sampleEntries.slice(0, 5).join('\n')}`,
                },
            ],
        };
    }

    private async handleDecompileClass(args: any) {
        const { className, projectPath, useCache = true, cfrPath } = args;

        try {
            console.error(`Starting decompilation of class: ${className}, project path: ${projectPath}, use cache: ${useCache}, CFR path: ${cfrPath || 'auto-detect'}`);

            // Check if index exists, create if not
            await this.ensureIndexExists(projectPath);

            const sourceCode = await this.decompiler.decompileClass(className, projectPath, useCache, cfrPath);

            if (!sourceCode || sourceCode.trim() === '') {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Warning: Decompilation result for class ${className} is empty, possibly due to CFR tool issues or corrupted class file`,
                        },
                    ],
                };
            }

            return {
                content: [
                    {
                        type: 'text',
                        text: `Decompiled source code for class ${className}:\n\n\`\`\`java\n${sourceCode}\n\`\`\``,
                    },
                ],
            };
        } catch (error) {
            console.error(`Failed to decompile class ${className}:`, error);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Decompilation failed: ${error instanceof Error ? error.message : String(error)}\n\nSuggestions:\n1. Ensure scan_dependencies has been run to build class index\n2. Check if CFR tool is properly installed\n3. Verify class name is correct`,
                    },
                ],
            };
        }
    }

    private async handleAnalyzeClass(args: any) {
        const { className, projectPath } = args;

        // Check if index exists, create if not
        await this.ensureIndexExists(projectPath);

        const analysis = await this.analyzer.analyzeClass(className, projectPath);

        let result = `Analysis result for class ${className}:\n\n`;
result += `Package name: ${analysis.packageName}\n`;
        result += `Class name: ${analysis.className}\n`;
        result += `Modifiers: ${analysis.modifiers.join(' ')}\n`;
        result += `Super class: ${analysis.superClass || 'None'}\n`;
        result += `Implemented interfaces: ${analysis.interfaces.join(', ') || 'None'}\n\n`;

        if (analysis.fields.length > 0) {
            result += `Fields (${analysis.fields.length}):\n`;
            analysis.fields.forEach(field => {
                result += `  - ${field.modifiers.join(' ')} ${field.type} ${field.name}\n`;
            });
            result += '\n';
        }

        if (analysis.methods.length > 0) {
            result += `Methods (${analysis.methods.length}):\n`;
            analysis.methods.forEach(method => {
                result += `  - ${method.modifiers.join(' ')} ${method.returnType} ${method.name}(${method.parameters.join(', ')})\n`;
            });
            result += '\n';
        }

        return {
            content: [
                {
                    type: 'text',
                    text: result,
                },
            ],
        };
    }

    /**
     * Ensure index file exists, create automatically if not
     */
    private async ensureIndexExists(projectPath: string): Promise<void> {
        const fs = await import('fs-extra');
        const path = await import('path');

        const indexPath = path.join(projectPath, '.mcp-class-index.json');

        if (!(await fs.pathExists(indexPath))) {
            console.error('Index file does not exist, creating automatically...');
            try {
                await this.scanner.scanProject(projectPath, false);
                console.error('Index file creation complete');
            } catch (error) {
                console.error('Failed to create index automatically:', error);
                throw new Error(`Unable to create class index file: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    }

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);

        const env = process.env.NODE_ENV || 'development';
        if (env === 'development') {
            console.error('Java Class Analyzer MCP Server running on stdio (DEBUG MODE)');
        } else {
            console.error('Java Class Analyzer MCP Server running on stdio');
        }
    }
}

const mcpServer = new JavaClassAnalyzerMCPServer();

// Add global exception handling to prevent server crashes
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    // Don't exit process, continue running
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Promise rejection:', reason);
    // Don't exit process, continue running
});

mcpServer.run().catch((error) => {
    console.error('Server startup failed:', error);
    process.exit(1);
});
