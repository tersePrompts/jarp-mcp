# JARP-MCP

> **Java Archive Reader Protocol for MCP** - Give AI agents X-ray vision into compiled Java code

[![npm version](https://badge.fury.io/js/jarp-mcp.svg)](https://www.npmjs.com/package/jarp-mcp)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-brightgreen.svg)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)

---

## Why JARP-MCP?

**Why do AI agents fail at Java?** They can't read compiled code in JAR files. They would need to unzip hundreds of JARs from `~/.m2/repository`, find the right class, and decompile it - a process that's slow, error-prone, and computationally expensive.

This MCP server solves that problem by providing instant decompilation and analysis of Java classes from Maven & Gradle dependencies, directly to AI agents through the Model Context Protocol.

---

## The Problem

When you ask an AI agent like Claude, GPT-4, or Cursor to work with Java code that depends on internal or external libraries:

| Problem | Impact |
|---------|--------|
| **Agent can't see the source** | Most Java code is distributed as compiled `.class` files in JAR packages |
| **Manual workarounds are painful** | Developers must manually decompile classes, copy source code, and paste it into the conversation |
| **Agents hallucinate APIs** | Without access to real class definitions, LLMs invent methods and signatures that don't exist |
| **Context switching kills productivity** | The flow of "ask → decompile → copy → paste → retry" takes 5-10 minutes per class |

**Traditional approach:** Agent requests class → User manually finds JAR → User decompiles with JD-GUI/CFR → User copies source → User pastes to agent → Agent finally understands. **5-10 minutes per class.**

**With JARP-MCP:** Agent requests class → Server decompiles in 1-2 seconds → Agent gets full source code immediately.

---

## The Solution

JARP-MCP provides AI agents with direct access to decompiled Java source code from your Maven and Gradle dependencies.

### Key Benefits

- **⚡ Blazing Fast**: Decompiles any Java class in 1-2 seconds (cached), subsequent calls are <100ms
- **🎯 Zero Configuration**: Automatically scans your `pom.xml`, `build.gradle`, and `~/.m2/repository`
- **🧠 Agent-Ready**: Designed specifically for LLM consumption via MCP protocol
- **💾 Smart Caching**: First decompilation takes ~2s, subsequent calls are instant
- **📦 Production-Ready**: Includes CFR 0.152 decompiler - no external dependencies needed
- **🔧 Maven & Gradle Support**: Works with both Maven and Gradle projects out of the box

### Features

| Feature | Description |
|---------|-------------|
| **🔍 Dependency Scanning** | Automatically scans all JAR packages in Maven/Gradle projects |
| **📦 Class Indexing** | Builds mapping from fully qualified class names → JAR paths |
| **🔄 Real-Time Decompilation** | Uses built-in CFR 0.152 to decompile .class files |
| **📊 Class Analysis** | Analyzes structure, methods, fields, inheritance, etc. |
| **💾 Intelligent Caching** | Caches results by package structure with cache control |
| **🚀 Auto-Indexing** | Automatically checks and creates indexes before analysis |
| **🤖 LLM-Native** | Designed specifically for AI agent workflows via MCP |

---

## Installation

### Zero-Setup (npx) - No Installation Required!

**Just run it directly:**

```bash
npx jarp-mcp
```

That's it! CFR decompiler is bundled. No setup, no configuration needed.

> **Requirements:** Java 8+ must be installed on your system.

---

### Quick Install (Recommended for frequent use)

```bash
npm install -g jarp-mcp
```

### Local Install

```bash
npm install jarp-mcp
```

### From Source

```bash
git clone https://github.com/tersePrompts/jarp-mcp.git
cd jarp-mcp
npm install
npm run build
```

---

## Configuration

### Claude Desktop (Zero-Setup npx)

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "jarp-mcp": {
      "command": "npx",
      "args": ["-y", "jarp-mcp"]
    }
  }
}
```

### Claude Desktop (Global Install)

If you've installed globally with `npm install -g jarp-mcp`:

### Claude Code / CLI (Zero-Setup npx)

Create `.claude/mcp-config.json` in your Java project root:

```json
{
  "mcpServers": {
    "jarp-mcp": {
      "command": "npx",
      "args": ["-y", "jarp-mcp"]
    }
  }
}
```

That's it! No npm install required - CFR decompiler is bundled.

### Claude Code / CLI (Local Install)

If you've installed locally with `npm install jarp-mcp`:

**macOS/Linux example:**
```json
{
  "mcpServers": {
    "jarp-mcp": {
      "command": "node",
      "args": [
        "node_modules/jarp-mcp/dist/cli.js",
        "start"
      ],
      "cwd": "/Users/developer/workspace/my-project",
      "env": {
        "NODE_ENV": "production",
        "MAVEN_REPO": "/Users/developer/.m2/repository",
        "JAVA_HOME": "/usr/lib/jvm/java-21"
      }
    }
  }
}
```

### Running from Source (Development)

If you cloned the repo and want to run the built version directly:

```json
{
  "mcpServers": {
    "jarp-mcp": {
      "command": "node",
      "args": [
        "C:\\path\\to\\jarp-mcp\\node_modules\\jarp-mcp\\dist\\cli.js",
        "start"
      ],
      "cwd": "C:\\path\\to\\your-java-project"
    }
  }
}
```

### Cursor IDE

Settings → MCP Servers:

```json
{
  "mcpServers": {
    "jarp-mcp": {
      "command": "jarp-mcp",
      "args": ["start"]
    }
  }
}
```

### Cline

Add to your project's `.clinerules` or `CLAUDE.md`:

```markdown
# MCP Servers

When working with Java code, use jarp-mcp to:
1. Scan Maven/Gradle dependencies and build class index
2. Decompile any Java class from dependencies
3. Analyze class structure, methods, and fields
```

---

## Quick Start

### 1. Scan Your Project Dependencies

First, scan your project to build the class index:

```
Use tool: mcp__jarp-mcp__scan_dependencies
projectPath: "/path/to/your/java/project"
```

**Response:**
```
Dependency scanning complete!

Scanned JAR count: 32
Indexed class count: 3,096
Index file path: /path/to/project/.mcp-class-index.json
```

### 2. Analyze a Class

Get structure, methods, and fields:

```
Use tool: mcp__jarp-mcp__analyze_class
className: "com.example.MyClass"
projectPath: "/path/to/project"
```

### 3. Decompile a Class

Get full Java source code:

```
Use tool: mcp__jarp-mcp__decompile_class
className: "com.example.MyClass"
projectPath: "/path/to/project"
```

---

## Demo: Before & After

### Before (Without JARP-MCP)

```
User: "How do I use JpaRepository's saveAll method?"

Claude: [hallucinates] "Use repository.saveAll(Collection<Entity> entities, boolean flush)..."
        [method signature is WRONG]

User: [5 minutes later] "That method doesn't exist..."
```

### After (With JARP-MCP)

```
User: "How do I use JpaRepository's saveAll method?"

Claude: [uses jarp-mcp to decompile JpaRepository]
        "The actual signature is:
         <S extends T> List<S> saveAll(Iterable<S> entities)

         Here's the correct usage..."
        [answer is INSTANT and ACCURATE]
```

---

## Available Tools

### 1. `scan_dependencies`

Scans all Maven/Gradle project dependencies and builds a class name → JAR package mapping index.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectPath` | string | Yes | Project root directory path |
| `forceRefresh` | boolean | No | Force refresh the index (default: false) |

**Example:**
```json
{
  "name": "scan_dependencies",
  "arguments": {
    "projectPath": "/Users/developer/workspace/my-project"
  }
}
```

**Response:**
```
Dependency scanning complete!

Scanned JAR count: 156
Indexed class count: 12,458
Index file path: /Users/developer/workspace/my-project/.mcp-class-index.json
```

---

### 2. `decompile_class`

Decompiles a Java class file and returns the complete Java source code.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `className` | string | Yes | Fully qualified class name (e.g., `com.example.MyClass`) |
| `projectPath` | string | Yes | Project root directory path |
| `useCache` | boolean | No | Use cached decompilation result (default: true) |
| `cfrPath` | string | No | Custom CFR decompiler JAR path (optional) |

**Example:**
```json
{
  "name": "decompile_class",
  "arguments": {
    "className": "org.springframework.data.jpa.repository.JpaRepository",
    "projectPath": "/Users/developer/workspace/my-project"
  }
}
```

---

### 3. `analyze_class`

Analyzes Java class structure including methods, fields, modifiers, inheritance, and interfaces.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `className` | string | Yes | Fully qualified class name |
| `projectPath` | string | Yes | Project root directory path |

**Example:**
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
```
Analysis result for class SpringBootApplication:

Package: org.springframework.boot.autoconfigure
Class: SpringBootApplication
Modifiers: public abstract interface

Methods (3):
  - public abstract String[] scanBasePackages()
  - public abstract Class<?>[] scanBasePackageClasses()
  - public abstract Class<?>[] exclude()
```

---

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Runtime environment | No | `production` |
| `MAVEN_REPO` | Maven local repository path | No | `~/.m2/repository` (Unix) or `%USERPROFILE%\.m2\repository` (Windows) |
| `JAVA_HOME` | Java installation path | No | `java` from PATH |
| `CFR_PATH` | Custom CFR decompiler JAR path | No | Built-in CFR 0.152 |

**Note:** Set `CFR_PATH` only if you want to use a different version of CFR decompiler than the built-in one. Leave empty to use the bundled version.

---

## Performance

| Operation | First Run | Cached |
|-----------|-----------|--------|
| Scan dependencies (100 JARs) | ~30s | N/A |
| Decompile class | ~2s | <100ms |
| Analyze class structure | ~2s | <100ms |

**Real-world example:** Spring Boot project with 156 dependencies and 12,458 classes:
- Initial scan: 45 seconds
- Each class analysis: ~1.5s first time, instant thereafter
- Typical workflow: 10-20 classes analyzed in under 30 seconds

---

## Architecture

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   LLM Agent │ ───▶ │   JARP-MCP       │ ───▶ │  Maven/Gradle   │
│  (Claude/   │      │   (MCP Server)   │      │  + .m2 Repo     │
│   Cursor)   │      │                  │      │                 │
└─────────────┘      └──────────────────┘      └─────────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ CFR 0.152    │
                     │ Decompiler   │
                     └──────────────┘
```

---

## Troubleshooting

### "Maven command failed"

Verify Maven is installed and pom.xml exists:
```bash
mvn --version
ls /path/to/project/pom.xml
```

### "Class not found"

Force refresh the dependency index:
```json
{
  "name": "scan_dependencies",
  "arguments": {
    "projectPath": "/path/to/project",
    "forceRefresh": true
  }
}
```

### "Cannot find module 'jarp-mcp/dist/cli.js'"

Make sure you've built the project:
```bash
cd jarp-mcp
npm install
npm run build
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

---

## .gitignore

Add these entries to prevent committing decompiled code and cache:

```gitignore
# JARP-MCP cache
.mcp-class-index.json
.mcp-decompile-cache/
.mcp-class-temp/
```

---

## Links

- **npm Package**: [https://www.npmjs.com/package/jarp-mcp](https://www.npmjs.com/package/jarp-mcp)
- **GitHub Repository**: [https://github.com/tersePrompts/jarp-mcp](https://github.com/tersePrompts/jarp-mcp)
- **Model Context Protocol**: [https://modelcontextprotocol.io](https://modelcontextprotocol.io)
- **CFR Decompiler**: [https://www.benf.org/other/cfr/](https://www.benf.org/other/cfr/)

---

## License

Apache License 2.0 - see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- **[handsomestWei](https://github.com/handsomestWei)** - Original [java-class-analyzer-mcp-server](https://github.com/handsomestWei/java-class-analyzer-mcp-server) creator
- **Lee Benfield** - Creator of [CFR Decompiler](https://www.benf.org/other/cfr/)
- **Anthropic** - For Claude and the MCP ecosystem

---

**Built with ❤️ for the AI-powered development community**
