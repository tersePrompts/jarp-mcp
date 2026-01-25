# How to Submit JARP-MCP to Awesome Lists

## Option 1: Submit to mcpservers.org (Main List)

Go to: https://mcpservers.org/submit

Fill in:
- **Name:** JARP-MCP
- **Description:** Java Archive Reader Protocol for MCP. Give AI agents instant access to decompiled Java code from Maven/Gradle dependencies. Stop AI from hallucinating Java APIs.
- **Repository:** https://github.com/tersePrompts/jarp-mcp
- **npm:** https://www.npmjs.com/package/jarp-mcp
- **Homepage:** https://github.com/tersePrompts/jarp-mcp
- **Category:** Development Tools
- **Tags:** java, decompiler, maven, gradle, spring, claude, cursor, ai, mcp

---

## Option 2: Submit to Official MCP Repo (Community List)

Create a GitHub issue or PR at:
https://github.com/modelcontextprotocol/servers

**Issue Title:** Add JARP-MCP to community servers list

**Issue Body:**
```
## MCP Server Proposal: JARP-MCP

**Description:**
JARP-MCP (Java Archive Reader Protocol) is an MCP server that gives AI agents instant access to decompiled Java code from Maven/Gradle dependencies.

**Problem it solves:**
AI assistants hallucinate Java API methods because they can't see compiled bytecode. JARP-MCP decompiles classes on-demand and feeds actual source to the AI.

**Links:**
- Repository: https://github.com/tersePrompts/jarp-mcp
- npm: https://www.npmjs.com/package/jarp-mcp
- License: Apache-2.0

**Key Features:**
- Scans Maven & Gradle projects
- Decompiles using CFR 0.152
- Smart caching (<100ms after first use)
- Works with Claude, Cursor, Cline
```

---

## Alternative Lists (These Accept Direct PRs)

### MobinX/awesome-mcp-list
https://github.com/MobinX/awesome-mcp-list

Fork, add your entry, create PR.

### YuzeHao2023/Awesome-MCP-Servers
https://github.com/YuzeHao2023/Awesome-MCP-Servers

Fork, add your entry, create PR.
