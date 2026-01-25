# Java Class Analyzer MCP Server

> **Why do AI agents fail at Java?** They can't read compiled code in JAR files. They would need to unzip hundreds of JARs from `~/.m2/repository`, find the right class, and decompile it - a process that's slow, error-prone, and computationally expensive.

This MCP server solves that problem by providing instant decompilation and analysis of Java classes from Maven dependencies, directly to AI agents through the Model Context Protocol.

## The Problem

When you ask an AI agent like Claude, GPT-4, or Cursor to work with Java code that depends on internal or external libraries:

1. **The agent can't see the source** - Most Java code is distributed as compiled `.class` files in JAR packages
2. **Manual workarounds are painful** - Developers must manually decompile classes, copy source code, and paste it into the conversation
3. **Agents hallucinate APIs** - Without access to real class definitions, LLMs invent methods and signatures that don't exist
4. **Context switching kills productivity** - The flow of "ask question → manually decompile → copy → paste → retry" is incredibly slow

**Traditional approach:** Agent requests class → User manually finds JAR in `~/.m2/repository` → User decompiles with JD-GUI/CFR → User copies source → User pastes to agent → Agent finally understands the code. This takes 5-10 minutes per class.

**With this MCP server:** Agent requests class → Server decompiles in 1-2 seconds → Agent gets full source code immediately.

## The Solution

This MCP server provides AI agents with direct access to decompiled Java source code from your Maven dependencies. It's like giving your AI agent X-ray vision into compiled code.

### Key Benefits

- **⚡ Blazing Fast**: Decompiles any Java class in 1-2 seconds (cached)
- **🎯 Zero Configuration**: Automatically scans your `pom.xml` and `~/.m2/repository`
- **🧠 Agent-Ready**: Designed specifically for LLM consumption via MCP protocol
- **💾 Smart Caching**: First decompilation takes ~2s, subsequent calls are instant
- **📦 Production-Ready**: Includes CFR 0.152 decompiler - no external dependencies needed

## Features

- **🔍 Dependency Scanning**: Automatically scans all JAR packages in Maven projects
- **📦 Class Indexing**: Builds mapping from fully qualified class names → JAR paths
- **🔄 Real-Time Decompilation**: Uses built-in CFR 0.152 to decompile .class files
- **📊 Class Analysis**: Analyzes structure, methods, fields, inheritance, etc.
- **💾 Intelligent Caching**: Caches results by package structure with cache control
- **🚀 Auto-Indexing**: Automatically checks and creates indexes before analysis
- **🤖 LLM-Native**: Designed specifically for AI agent workflows via MCP

## Installation

### Global Installation (Recommended)

```bash
npm install -g jarp-mcp
```

### Local Installation

```bash
npm install jarp-mcp
```

### Install from Source

```bash
git clone https://github.com/tersePrompts/jarp-mcp.git
cd jarp-mcp
npm install
npm run build
```

> **Note**: This is a fork of the original [java-class-analyzer-mcp-server](https://github.com/handsomestWei/java-class-analyzer-mcp-server) by [handsomestWei](https://github.com/handsomestWei). This version includes major upgrades and improvements.

## Configuration

### Claude Desktop (Claude Code)

Add to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "java-class-analyzer": {
      "command": "java-class-analyzer-mcp",
      "args": ["start"],
      "env": {
        "NODE_ENV": "production",
        "MAVEN_REPO": "/path/to/.m2/repository",
        "JAVA_HOME": "/path/to/java-home"
      }
    }
  }
}
```

### Cursor IDE

Add to your Cursor settings (Settings → MCP):

```json
{
  "mcpServers": {
    "java-class-analyzer": {
      "command": "java-class-analyzer-mcp",
      "args": ["start"],
      "env": {
        "NODE_ENV": "production",
        "MAVEN_REPO": "/path/to/.m2/repository",
        "JAVA_HOME": "/path/to/java-home"
      }
    }
  }
}
```

Or use the local installation variant:

```json
{
  "mcpServers": {
    "java-class-analyzer": {
      "command": "node",
      "args": ["./node_modules/jarp-mcp/dist/index.js"],
      "env": {
        "NODE_ENV": "production",
        "MAVEN_REPO": "/path/to/.m2/repository",
        "JAVA_HOME": "/path/to/java-home"
      }
    }
  }
}
```

### Cline (CLAUDE.md in your project)

Add to your project's `.clinerules` or `CLAUDE.md`:

```markdown
# MCP Servers

When working with Java code in this project, use the java-class-analyzer MCP server to:
1. Scan Maven dependencies and build class index
2. Decompile any Java class from dependencies
3. Analyze class structure, methods, and fields

The agent should automatically use `scan_dependencies` first, then `decompile_class` or `analyze_class` as needed.
```

### Postman (for API testing)

Create a new Websocket request connecting to the MCP server:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "scan_dependencies",
    "arguments": {
      "projectPath": "/path/to/maven/project",
      "forceRefresh": false
    }
  }
}
```

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Runtime environment | No | `production` |
| `MAVEN_REPO` | Maven local repository path | No | `~/.m2/repository` |
| `JAVA_HOME` | Java installation path | No | `java` from PATH |
| `CFR_PATH` | Custom CFR decompiler path | No | Built-in CFR 0.152 |

## Available Tools

### 1. `scan_dependencies`

Scans all Maven project dependencies and builds a class name → JAR package mapping index.

**Parameters:**
- `projectPath` (string, required): Maven project root directory path
- `forceRefresh` (boolean, optional): Force refresh the index, default `false`

**Example usage by agent:**
```json
{
  "name": "scan_dependencies",
  "arguments": {
    "projectPath": "/Users/developer/workspace/my-project",
    "forceRefresh": false
  }
}
```

**Response:**
```text
Dependency scanning complete!

Scanned JAR count: 156
Indexed class count: 12,458
Index file path: /Users/developer/workspace/my-project/.mcp-class-index.json

Sample index entries:
com.example.utils.StringHelper → /path/to.jar
org.springframework.boot.SpringApplication → /path/to/spring-boot.jar
```

---

### 2. `decompile_class`

Decompiles a Java class file and returns the complete Java source code.

**Parameters:**
- `className` (string, required): Fully qualified class name (e.g., `com.example.MyClass`)
- `projectPath` (string, required): Maven project root directory path
- `useCache` (boolean, optional): Use cached decompilation result, default `true`
- `cfrPath` (string, optional): Custom CFR decompiler JAR path (not needed, CFR 0.152 is built-in)

**Example usage by agent:**
```json
{
  "name": "decompile_class",
  "arguments": {
    "className": "org.springframework.data.jpa.repository.JpaRepository",
    "projectPath": "/Users/developer/workspace/my-project",
    "useCache": true
  }
}
```

**Response:**
```text
Decompiled source code for class org.springframework.data.jpa.repository.JpaRepository:

```java
package org.springframework.data.jpa.repository;

import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.Repository;

public interface JpaRepository<T, ID> extends CrudRepository<T, ID>, Repository<T, ID> {
    // Full decompiled source code here...
}
```
```

---

### 3. `analyze_class`

Analyzes Java class structure including methods, fields, modifiers, inheritance, and interfaces.

**Parameters:**
- `className` (string, required): Fully qualified class name to analyze
- `projectPath` (string, required): Maven project root directory path

**Example usage by agent:**
```json
{
  "name": "analyze_class",
  "arguments": {
    "className": "org.springframework.boot.autoconfigure.SpringBootApplication",
    "projectPath": "/Users/developer/workspace/my-project"
  }
}
```

**Response:**
```text
Analysis result for class org.springframework.boot.autoconfigure.SpringBootApplication:

Package name: org.springframework.boot.autoconfigure
Class name: SpringBootApplication
Modifiers: public abstract interface
Super class: None
Implemented interfaces: None

Fields (0):

Methods (3):
  - public abstract String[] scanBasePackages()
  - public abstract Class<?>[] scanBasePackageClasses()
  - public abstract Class<?>[] exclude()
```

## System Prompt for LLMs

When configuring this MCP server for an AI agent, use this system prompt to guide the agent on how to use the tools effectively:

```markdown
# Java Development with MCP Class Analyzer

You have access to the Java Class Analyzer MCP server, which can decompile and analyze Java classes from Maven dependencies.

## When to Use These Tools

Use these tools when you need to:
1. Understand how to use a Java class from a dependency library
2. See the actual implementation of a method or class
3. Analyze the API structure of a library
4. Debug issues related to dependency usage
5. Generate code that correctly uses external libraries

## Recommended Workflow

**Step 1: Scan Dependencies (First Time)**
Always start by scanning the project dependencies to build the class index:
```
Use tool: scan_dependencies with projectPath=<current project path>
```

**Step 2: Choose Your Approach**

For quick API understanding:
```
Use tool: analyze_class with className=<fully qualified class name>
```
This gives you class structure, methods, fields, inheritance - perfect for understanding the API surface.

For detailed implementation analysis:
```
Use tool: decompile_class with className=<fully qualified class name>
```
This gives you full source code - perfect for understanding implementation details.

**Step 3: Provide Better Answers**

After using these tools, you can:
- Provide accurate code examples that use the correct method signatures
- Explain how classes actually work internally
- Suggest proper usage patterns based on real implementations
- Debug issues by seeing the actual code

## Important Notes

- The first decompilation for a class takes ~2 seconds, subsequent calls are instant (cached)
- You get actual decompiled source code, not hallucinated APIs
- Always use the fully qualified class name (e.g., `java.util.List`, not just `List`)
- If a class is not found, ensure you've run `scan_dependencies` first
- The index persists between sessions, so you only need to scan once per project

## Cache Files and Git Configuration

**IMPORTANT:** This tool saves decompiled classes and cache files in your project directory. These should NOT be committed to git.

Add these entries to your project's `.gitignore`:

```gitignore
# MCP Java Class Analyzer cache
.mcp-class-index.json
.mcp-decompile-cache/
.mcp-class-temp/
```

**When setting up in a new project, remind the user to add these to .gitignore** to prevent committing:
- Decompiled source code (may have licensing implications)
- Large cache directories (bloats repository)
- Project-specific index files (not portable across machines)

## Example Interactions

**User:** "How do I use EasyExcel to write data to Excel?"

**Your response:**
1. Scan dependencies: `scan_dependencies` for the project
2. Analyze the main class: `analyze_class` for `com.alibaba.excel.EasyExcel`
3. Provide accurate code examples based on the actual API

**User:** "Why is my Spring Boot application not starting?"

**Your response:**
1. Scan dependencies
2. Decompile relevant Spring Boot classes to understand initialization
3. Analyze the actual code to identify potential issues

By using these tools, you can provide accurate, helpful responses instead of guessing or hallucinating Java APIs.
```

## How It Works

### Architecture

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  LLM Agent  │      │    MCP Server    │      │  Maven Project  │
│  (Claude/   │ ───▶ │   (This Tool)    │ ───▶ │   + .m2 Repo    │
│   GPT/      │      │                  │      │                 │
│   Cursor)   │      │                  │      │                 │
└─────────────┘      └────────┬─────────┘      └─────────────────┘
                              │
                              ▼
                     ┌────────────────┐
                     │   CFR 0.152    │
                     │   Decompiler   │
                     └────────────────┘
```

### Workflow

1. **Indexing** (runs once per project)
   - Executes `mvn dependency:tree` to get dependency tree
   - Parses each JAR and extracts all `.class` files
   - Builds mapping: `fully.qualified.ClassName → /path/to.jar`
   - Caches index to `.mcp-class-index.json`

2. **Decompilation** (on-demand, cached)
   - Finds JAR path from index
   - Checks cache (instant hit if already decompiled)
   - Extracts `.class` file from JAR
   - Decompiles using CFR 0.152
   - Returns Java source code

3. **Caching Strategy**
   - `.mcp-class-index.json` - Class index (persists across sessions)
   - `.mcp-decompile-cache/` - Decompiled source code (by package structure)
   - `.mcp-class-temp/` - Temporary extraction files (cleaned up)

   **⚠️ Add these to your `.gitignore`:**
   ```gitignore
   # MCP Java Class Analyzer cache
   .mcp-class-index.json
   .mcp-decompile-cache/
   .mcp-class-temp/
   ```

## Performance

| Operation | First Run | Cached |
|-----------|-----------|--------|
| Scan dependencies (100 JARs) | ~30s | N/A |
| Decompile class | ~2s | <100ms |
| Analyze class structure | ~2s | <100ms |

**Real-world example:** Analyzing a Spring Boot project with 156 dependencies and 12,458 classes:
- Initial scan: 45 seconds
- Each class analysis: ~1.5s first time, instant thereafter
- Typical agent workflow: 10-20 classes analyzed in under 30 seconds total

## Troubleshooting

### Common Issues

**1. "Maven command failed"**
```bash
# Ensure Maven is installed
mvn --version

# Verify pom.xml exists in the project path
ls /path/to/project/pom.xml
```

**2. "Class not found"**
```bash
# Ensure dependencies are scanned first
# The tool will auto-scan, but you can force refresh:
{
  "name": "scan_dependencies",
  "arguments": {
    "projectPath": "/path/to/project",
    "forceRefresh": true
  }
}
```

**3. "CFR decompilation failed"**
```bash
# CFR 0.152 is included, but check Java is available:
java -version

# Or specify a custom CFR path:
{
  "name": "decompile_class",
  "arguments": {
    "className": "com.example.MyClass",
    "projectPath": "/path/to/project",
    "cfrPath": "/custom/path/to/cfr.jar"
  }
}
```

### Debug Mode

Set `NODE_ENV=development` to see detailed logs:

```json
{
  "env": {
    "NODE_ENV": "development"
  }
}
```

## Acknowledgments

### Original Creator

This project was originally created by **[handsomestWei](https://github.com/handsomestWei)**.

- **Original Repository**: [java-class-analyzer-mcp-server](https://github.com/handsomestWei/java-class-analyzer-mcp-server)

Thank you for building this invaluable tool that bridges the gap between AI agents and compiled Java code!

### Current Maintainer

This fork is maintained by **[tersePrompts](https://github.com/tersePrompts)**.

- **GitHub**: [tersePrompts](https://github.com/tersePrompts)
- **Repository**: [jarp-mcp](https://github.com/tersePrompts/jarp-mcp)

Contributions including major upgrades (MCP SDK v1.25.3, CFR 0.152 bundling, comprehensive documentation rewrite, and internationalization).

### CFR Decompiler

This project includes [CFR (Class File Reader)](https://www.benf.org/other/cfr/), an excellent Java decompiler created by **Lee Benfield**.

> CFR is a decompiler for Java code. It's named after the protagonist's coffee can in the film "The Lost Boys", which is (nearly) "CFR". I've not thought of a good backronym yet.
>
> — Lee Benfield

CFR is distributed under the MIT license and is included in this package at `lib/cfr-0.152.jar`.

### Special Thanks

- **handsomestWei** - Creator and maintainer of this project
- **Lee Benfield** - Creator of CFR decompiler
- **Model Context Protocol team** - For the MCP protocol that makes this integration possible
- **Anthropic** - For Claude and the MCP ecosystem

## Development

### Build from Source

```bash
npm install
npm run build
```

### Run Tests

```bash
# Test all tools
node test-tools.js

# Test specific tool
node test-tools.js --tool decompile_class --class com.alibaba.excel.EasyExcelFactory --project /path/to/project

# Test with no cache
node test-tools.js --tool decompile_class --no-cache

# Test with custom CFR path
node test-tools.js --tool decompile_class --cfr-path /path/to/cfr.jar
```

### Test Tool Parameters

- `-t, --tool <name>`: Tool to test (scan|decompile|analyze|all)
- `-p, --project <path>`: Project path
- `-c, --class <name>`: Class name to analyze
- `--no-refresh`: Don't force refresh dependency index
- `--no-cache`: Don't use decompilation cache
- `--cfr-path <path>`: Custom CFR decompiler path
- `-h, --help`: Display help

## License

Apache License 2.0 - see [LICENSE](LICENSE) for details.

## Links

- **GitHub Repository**: [https://github.com/tersePrompts/jarp-mcp](https://github.com/tersePrompts/jarp-mcp)
- **Original Project**: [https://github.com/handsomestWei/java-class-analyzer-mcp-server](https://github.com/handsomestWei/java-class-analyzer-mcp-server)
- **Model Context Protocol**: [https://modelcontextprotocol.io](https://modelcontextprotocol.io)
- **CFR Decompiler**: [https://www.benf.org/other/cfr/](https://www.benf.org/other/cfr/)
- **MCP SDK**: [@modelcontextprotocol/sdk on npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk)

---

**Built with ❤️ for the AI-powered development community**
