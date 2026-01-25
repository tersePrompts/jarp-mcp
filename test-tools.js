#!/usr/bin/env node

// Direct test of MCP tools, bypassing MCP client
import { DependencyScanner } from './dist/scanner/DependencyScanner.js';
import { DecompilerService } from './dist/decompiler/DecompilerService.js';
import { JavaClassAnalyzer } from './dist/analyzer/JavaClassAnalyzer.js';

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const config = {
        tool: 'all', // Test all tools by default
        projectPath: 'd:\\my-project',
        className: 'com.alibaba.excel.EasyExcelFactory',
        forceRefresh: true,
        useCache: true, // Use cache by default
        cfrPath: undefined // CFR path, optional
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '--tool':
            case '-t':
                config.tool = args[++i];
                break;
            case '--project':
            case '-p':
                config.projectPath = args[++i];
                break;
            case '--class':
            case '-c':
                config.className = args[++i];
                break;
            case '--no-refresh':
                config.forceRefresh = false;
                break;
            case '--no-cache':
                config.useCache = false;
                break;
            case '--cfr-path':
                config.cfrPath = args[++i];
                break;
            case '--help':
            case '-h':
                showHelp();
                process.exit(0);
                break;
        }
    }

    return config;
}

function showHelp() {
    console.log(`
Usage: node test-tools.js [options]

Options:
  -t, --tool <tool name>      Specify tool to test (scan|decompile|analyze|all)
  -p, --project <path>        Project path (default: d:\\my-project)
  -c, --class <class name>    Class name to analyze (default: com.alibaba.excel.EasyExcelFactory)
  --no-refresh               Do not force refresh dependency index
  --no-cache                 Do not use decompilation cache
  --cfr-path <path>           Specify CFR decompiler jar path
  --include-deps             Include dependency analysis
  -h, --help                 Show help information

Examples:
  node test-tools.js                                    # Test all tools
  node test-tools.js -t scan -p /path/to/project       # Test dependency scanning only
  node test-tools.js -t decompile -c java.lang.String  # Test decompilation only
  node test-tools.js -t analyze --include-deps         # Test class analysis with dependencies
`);
}

async function testScanDependencies(config) {
    console.log('=== Testing Dependency Scanning ===');
console.log(`Project path: ${config.projectPath}`);
    console.log(`Force refresh: ${config.forceRefresh}\n`);

    const scanner = new DependencyScanner();
    const scanResult = await scanner.scanProject(config.projectPath, config.forceRefresh);

    console.log('Scan result:', {
        jarCount: scanResult.jarCount,
        classCount: scanResult.classCount,
        indexPath: scanResult.indexPath
    });
console.log('Sample entries:', scanResult.sampleEntries.slice(0, 3));
    console.log('✅ Dependency scanning complete\n');

    return scanResult;
}

async function testDecompileClass(config) {
console.log('=== Testing Class Decompilation ===');
    console.log(`Class name: ${config.className}`);
    console.log(`Project path: ${config.projectPath}`);
    console.log(`Use cache: ${config.useCache !== false}`);
    console.log(`CFR path: ${config.cfrPath || 'auto-detect'}\n`);

    const decompiler = new DecompilerService();
    const sourceCode = await decompiler.decompileClass(config.className, config.projectPath, config.useCache !== false, config.cfrPath);

console.log('Decompilation result length:', sourceCode.length);
    console.log('Source preview:', sourceCode.substring(0, 200) + '...');
    console.log('✅ Decompilation complete\n');

    return sourceCode;
}

async function testAnalyzeClass(config) {
console.log('=== Testing Class Analysis ===');
    console.log(`Class name: ${config.className}`);
    console.log(`Project path: ${config.projectPath}`);

    const analyzer = new JavaClassAnalyzer();
    const analysis = await analyzer.analyzeClass(config.className, config.projectPath);

    console.log('Class analysis result:', {
        className: analysis.className,
        packageName: analysis.packageName,
        modifiers: analysis.modifiers,
        fields: analysis.fields.length,
        methods: analysis.methods.length
    });

    if (analysis.methods.length > 0) {
        console.log('\nMethod list:');
        analysis.methods.forEach((method, index) => {
            console.log(`${index + 1}. ${method.modifiers.join(' ')} ${method.returnType} ${method.name}(${method.parameters.join(', ')})`);
        });
    }

    if (analysis.fields.length > 0) {
        console.log('\nField list:');
        analysis.fields.forEach((field, index) => {
            console.log(`${index + 1}. ${field.modifiers.join(' ')} ${field.type} ${field.name}`);
        });
    }

    console.log('✅ Class analysis complete\n');

    return analysis;
}

async function testClassLookup(config) {
console.log('=== Testing Class Lookup ===');
    console.log(`Class name: ${config.className}`);
    console.log(`Project path: ${config.projectPath}\n`);

    const scanner = new DependencyScanner();
    const jarPath = await scanner.findJarForClass(config.className, config.projectPath);

console.log(`JAR for class ${config.className}:`, jarPath);
    console.log('✅ Class lookup complete\n');

    return jarPath;
}

async function testTools() {
    const config = parseArgs();

    console.log('=== Direct MCP Tools Test ===');
    console.log('Configuration:', config);
    console.log('');

    try {
        switch (config.tool) {
            case 'scan':
                await testScanDependencies(config);
                break;
            case 'decompile':
                await testDecompileClass(config);
                break;
            case 'analyze':
                await testAnalyzeClass(config);
                break;
            case 'lookup':
                await testClassLookup(config);
                break;
            case 'all':
            default:
                // Test all tools in sequence
                await testScanDependencies(config);
                await testClassLookup(config);
                await testDecompileClass(config);
                await testAnalyzeClass(config);
                console.log('🎉 All tests passed!');
                break;
        }

    } catch (error) {
console.error('❌ Test failed:', error.message);
        console.error('Error details:', error);
        process.exit(1);
    }
}

testTools();
