# Java Class Analyzer MCP Server

A Java class analysis service based on Model Context Protocol (MCP) that can scan Maven project dependencies, decompile Java class files, retrieve class method lists and other detailed information, and provide them to LLMs for code analysis.

## Use Cases
AI tools like Cursor directly generate code that calls second-party (internal) or third-party (external) package interfaces. However, since AI cannot read the source code of dependencies not opened in the current project, the generated code is often riddled with errors or even hallucinatory coding.

To solve this problem, developers typically copy source code content to feed to the LLM, or place source files in the current project before referencing them in conversations.

The local decompilation MCP solution is the most effective approach, accurately parsing classes and methods in JAR packages, significantly improving the accuracy and usability of code generation.

## Features

- **🚀 Easy to Use**: MCP service implemented in TypeScript, packaged with npm for easy distribution and installation with minimal environment dependencies
- 🔍 **Dependency Scanning**: Automatically scans all dependency JAR packages in Maven projects
- 📦 **Class Indexing**: Establishes mapping index from fully qualified class names to JAR package paths
- 🔄 **Decompilation**: Uses the built-in CFR tool to decompile .class files to Java source code in real-time
- 📊 **Class Analysis**: Analyzes Java class structure, methods, fields, inheritance relationships, etc.
- 💾 **Smart Caching**: Caches decompilation results by package name structure with cache control support
- 🚀 **Auto Indexing**: Automatically checks and creates indexes before analysis
- ⚙️ **Flexible Configuration**: Supports external specification of CFR tool path
- 🤖 **LLM Integration**: Provides Java code analysis capabilities to LLMs through MCP protocol

## Usage Examples
### Register MCP Service in IDE
![Tool List](./doc/mcp-tools.jpg)

### Use MCP in Agent Conversations
![Example](./doc/mcp-use-case.jpg)

## Instructions

### MCP Service Installation

#### Global Installation (Recommended)

```bash
npm install -g java-class-analyzer-mcp-server
```

After installation, you can directly use the `java-class-analyzer-mcp` command.

#### Local Installation

```bash
npm install java-class-analyzer-mcp-server
```

#### Install from Source

```bash
git clone https://github.com/handsomestWei/java-class-analyzer-mcp-server.git
cd java-class-analyzer-mcp-server
npm install
npm run build
```

### MCP Service Configuration

#### Method 1: Use Generated Configuration (Recommended)

Run the following command to generate a configuration template:
```bash
java-class-analyzer-mcp config -o mcp-client-config.json
```

Then add the generated configuration content to your MCP client configuration file.

#### Method 2: Manual Configuration

Refer to the following configuration examples and add them to your MCP client configuration file:

**Configuration after Global Installation:**
```json
{
    "mcpServers": {
        "java-class-analyzer": {
            "command": "java-class-analyzer-mcp",
            "args": ["start"],
            "env": {
                "NODE_ENV": "production",
                "MAVEN_REPO": "D:/maven/repository",
                "JAVA_HOME": "C:/Program Files/Java/jdk-11"
            }
        }
    }
}
```

**Configuration after Local Installation:**
```json
{
    "mcpServers": {
        "java-class-analyzer": {
            "command": "node",
            "args": [
                "node_modules/java-class-analyzer-mcp-server/dist/index.js"
            ],
            "env": {
                "NODE_ENV": "production",
                "MAVEN_REPO": "D:/maven/repository",
                "JAVA_HOME": "C:/Program Files/Java/jdk-11"
            }
        }
    }
}
```

#### Parameter Description
- `command`: Command to run the MCP server, using `node` here
- `args`: Arguments passed to Node.js, pointing to the file in the dist folder compiled by `npm run build`
- `env`: Environment variable settings

#### Environment Variable Description
- `NODE_ENV`: Runtime environment identifier
  - `production`: Production environment, reduces log output, enables performance optimization
  - `development`: Development environment, outputs detailed debugging information
  - `test`: Test environment
- `MAVEN_REPO`: Maven local repository path (optional)
  - If set, the program will use the specified repository path to scan JAR packages
  - If not set, the program will use the default `~/.m2/repository` path
- `JAVA_HOME`: Java installation path (optional)
  - If set, the program will use `${JAVA_HOME}/bin/java` to execute Java commands (for CFR decompilation)
  - If not set, the program will use the `java` command in PATH
- `CFR_PATH`: Path to CFR decompilation tool (optional, program will automatically find it)

### Available Tools

#### 1. scan_dependencies
Scans all dependencies of a Maven project and builds a class name to JAR package mapping index.

**Parameters:**
- `projectPath` (string): Maven project root directory path
- `forceRefresh` (boolean, optional): Whether to force refresh the index, default false

**Example:**
```json
{
  "name": "scan_dependencies",
  "arguments": {
    "projectPath": "/path/to/your/maven/project",
    "forceRefresh": false
  }
}
```

#### 2. decompile_class
Decompiles a specified Java class file and returns the Java source code.

**Parameters:**
- `className` (string): Fully qualified name of the Java class to decompile, e.g., com.example.QueryBizOrderDO
- `projectPath` (string): Maven project root directory path
- `useCache` (boolean, optional): Whether to use cache, default true. Avoids repeated generation each time.
- `cfrPath` (string, optional): Path to CFR decompilation tool JAR package. Already built-in, can specify additional version.

**Example:**
```json
{
  "name": "decompile_class",
  "arguments": {
    "className": "com.example.QueryBizOrderDO",
    "projectPath": "/path/to/your/maven/project",
    "useCache": true,
    "cfrPath": "/path/to/cfr-0.152.jar"
  }
}
```

#### 3. analyze_class
Analyzes the structure, methods, fields, and other information of a Java class.

**Parameters:**
- `className` (string): Fully qualified name of the Java class to analyze
- `projectPath` (string): Maven project root directory path

**Example:**
```json
{
  "name": "analyze_class",
  "arguments": {
    "className": "com.example.QueryBizOrderDO",
    "projectPath": "/path/to/your/maven/project",
  }
}
```

### Cache Files
The following cache directories and files will be generated in the current project:
- `.mcp-class-index.json`: Class index cache file
- `.mcp-decompile-cache/`: Decompilation result cache directory (by package name structure)
- `.mcp-class-temp/`: Temporary file directory (by package name structure)

## Workflow

1. **Auto Indexing**: When calling `analyze_class` or `decompile_class` for the first time, automatically checks and creates indexes
2. **Smart Caching**: Decompilation results are cached by package name structure with cache control support
3. **Class Analysis**: Use `analyze_class` or `decompile_class` to get detailed class information
4. **LLM Analysis**: Provide decompiled source code to LLM for code analysis

## Technical Architecture

### Core Components

- **DependencyScanner**: Responsible for scanning Maven dependencies and building class indexes
- **DecompilerService**: Responsible for decompiling .class files
- **JavaClassAnalyzer**: Responsible for analyzing Java class structure
- **MCP Server**: Provides standardized MCP interface

### Dependency Scanning Process

1. Execute `mvn dependency:tree` to get dependency tree
2. Parse each JAR package and extract all .class files
3. Build a mapping index from "fully qualified class name -> JAR package path"
4. Cache the index to `.mcp-class-index.json` file

### Decompilation Process

1. Find the corresponding JAR package path based on class name
2. Check cache; if it exists and caching is enabled, return directly
3. Extract .class file from JAR package to `.mcp-class-temp` directory (by package name structure)
4. Use CFR tool to decompile .class file
5. Save decompilation result to cache `.mcp-decompile-cache` directory (by package name structure)
6. Return Java source code

## Troubleshooting

### Common Issues

1. **Maven Command Failure**
   - Ensure Maven is installed and in PATH
   - Check if the project has a valid pom.xml file

2. **CFR Decompilation Failure**
   - Ensure CFR jar package is downloaded (supports any version number)
   - Check if Java environment is correctly configured
   - Can specify CFR path through `cfrPath` parameter

3. **Class Not Found**
   - Program will automatically check and create indexes
   - Check if class name is correct
   - Ensure project dependencies are correctly resolved

## Testing Instructions

### Build Project

```bash
npm install
npm run build
```

### Test Tool Usage

The project provides standalone test tools that can directly test each function of the MCP service without going through an MCP client.

```bash
# Test all tools
node test-tools.js

# Test specific tool
node test-tools.js --tool decompile_class --class com.alibaba.excel.EasyExcelFactory --project /path/to/project

# Don't use cache
node test-tools.js --tool decompile_class --no-cache

# Specify CFR path
node test-tools.js --tool decompile_class --cfr-path /path/to/cfr.jar
```

### Test Tool Parameters

- `-t, --tool <tool name>`: Specify the tool to test (scan|decompile|analyze|all)
- `-p, --project <path>`: Project path
- `-c, --class <class name>`: Class name to analyze
- `--no-refresh`: Don't force refresh dependency index
- `--no-cache`: Don't use decompilation cache
- `--cfr-path <path>`: Specify the path to CFR decompilation tool JAR package
- `-h, --help`: Display help information

### Log Level Control

Control log output through the `NODE_ENV` environment variable:

- `development`: Output detailed debugging information
- `production`: Only output critical information
