# <div align="center">JARP-MCP</div>

<div align="center">

**Java Archive Reader Protocol** — Give AI agents X-ray vision into compiled Java code

[![npm](https://img.shields.io/npm/v/jarp-mcp?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/jarp-mcp)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue?style=for-the-badge)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-Compatible-success?style=for-the-badge)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

[**Live Demo**](https://terseprompts.github.io/jarp-mcp/) · [**npm**](https://www.npmjs.com/package/jarp-mcp) · [**GitHub**](https://github.com/tersePrompts/jarp-mcp)

</div>

---

## <div align="center">⚡ Get Started in 10 Seconds</div>

Create `.claude/mcp-config.json` in your Java project:

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

That's it. **No installation. No configuration. CFR decompiler bundled.**

Restart your AI editor and ask it to decompile any Java class from your dependencies.

---

## The Problem

AI agents like Claude, GPT-4, and Cursor **cannot read compiled Java code**. When working with Spring Boot, Maven, or any Java project:

> *"Show me how JpaRepository.saveAll() works"* → Agent **hallucinates** the method signature

> *"What parameters does this internal library function take?"* → Agent **guesses** wrong

> *"Why does this dependency throw this exception?"* → Agent **cannot see** the source

**Developers spend 5-10 minutes per class** manually decompiling with JD-GUI, copying source, and pasting into chat.

---

## The Solution

**JARP-MCP** gives AI agents instant access to decompiled Java source code from your Maven & Gradle dependencies.

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

### Impact

| Metric | Before | After |
|--------|--------|-------|
| Time to inspect a class | **5-10 min** | **<2 seconds** |
| Accuracy of AI responses | ~60% (guessing) | **100%** (actual source) |
| Manual steps | 4+ | **0** |

---

## MCP Tools

| Tool | What It Does |
|------|--------------|
| **`scan_dependencies`** | Scans your Maven/Gradle project, builds class → JAR index |
| **`decompile_class`** | Returns full Java source code for any class |
| **`analyze_class`** | Analyzes class structure, methods, fields, inheritance |

### Example Usage

```javascript
// In your AI assistant chat:
"Scan my Spring Boot project and decompile JpaRepository"
```

The agent uses JARP-MCP to:
1. Scan all dependencies in `pom.xml`
2. Find the JAR containing `JpaRepository`
3. Decompile it using CFR
4. Return the actual source code

**Result:** Accurate answers based on real code, not guesses.

---

## Tech Stack

```
JARP-MCP
├── Language: TypeScript 5.7
├── Runtime: Node.js 16+
├── Protocol: Model Context Protocol (MCP)
├── Decompiler: CFR 0.152 (bundled)
├── Build: tsc
├── Package: npm (zero-setup with npx)
└── License: Apache-2.0
```

### Key Implementation Details

- **Zero external dependencies** — CFR decompiler bundled (2.2MB JAR)
- **Smart path resolution** — Works with `npx`, `npm install -g`, local dev
- **Maven & Gradle support** — Parses `pom.xml` and `build.gradle`
- **Intelligent caching** — First decompile ~2s, subsequent <100ms
- **Auto-indexing** — Builds class index on-demand if missing

---

## Installation

### Zero-Setup (Recommended)

```bash
npx jarp-mcp
```

No installation required. Everything is bundled.

### Global Install

```bash
npm install -g jarp-mcp
jarp-mcp start
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

### Claude Code / Cursor

`.claude/mcp-config.json`:
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

### Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):
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

---

## Performance

| Operation | First Run | Cached |
|-----------|-----------|--------|
| Scan 100 JARs | ~30s | N/A |
| Decompile class | ~2s | <100ms |
| Analyze structure | ~2s | <100ms |

**Real-world:** Spring Boot project with 156 dependencies, 12,458 classes
- Initial scan: 45 seconds
- Each class: ~1.5s first time, instant thereafter

---

## Links

- **npm**: https://www.npmjs.com/package/jarp-mcp
- **GitHub**: https://github.com/tersePrompts/jarp-mcp
- **GitHub Pages**: https://terseprompts.github.io/jarp-mcp/
- **MCP Protocol**: https://modelcontextprotocol.io

---

## License

Apache License 2.0 — see [LICENSE](LICENSE)

---

## Acknowledgments

- [**handsomestWei**](https://github.com/handsomestWei) — Original [java-class-analyzer-mcp-server](https://github.com/handsomestWei/java-class-analyzer-mcp-server)
- [**Lee Benfield**](https://www.benf.org/other/cfr/) — CFR Decompiler
- [**Anthropic**](https://www.anthropic.com) — Claude & MCP ecosystem

---

<div align="center">

**Built with ❤️ for the AI-powered development community**

</div>
