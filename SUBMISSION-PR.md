# PR Submission: Add JARP-MCP to awesome-mcp-servers

## Target Repository
https://github.com/wong2/awesome-mcp-servers

## Where to Add
Add to the main README.md, alphabetically in the "J" section

## Entry to Add

```markdown
- __JARP-MCP__ - Java Archive Reader for AI. MCP server that gives AI agents instant access to decompiled Java code from Maven/Gradle dependencies. Stop AI from hallucinating Java APIs by letting it decompile JAR files on demand.
```

## Full PR Title & Body

**Title:** Add JARP-MCP - Java decompiler MCP server

**Body:**
```markdown
## Proposal

Add JARP-MCP to the awesome MCP servers list.

## Description

JARP-MCP (Java Archive Reader Protocol) is an MCP server that:
- Scans Maven & Gradle project dependencies
- Decompiles Java classes on demand using CFR 0.152
- Gives AI agents (Claude, Cursor) access to actual Java source code
- Prevents AI from hallucinating Java API methods

## Use Case

When AI assistants work with Java, they often hallucinate method signatures
because they can't see compiled bytecode. JARP-MCP solves this by decompiling
classes on-demand and feeding the actual source to the AI.

## Links

- npm: https://www.npmjs.com/package/jarp-mcp
- GitHub: https://github.com/tersePrompts/jarp-mcp

## Category

Development Tools / Java / Decompiler
```

---

## How to Submit

### Option 1: Manual GitHub PR
1. Go to https://github.com/wong2/awesome-mcp-servers
2. Fork the repository
3. Edit README.md
4. Add the entry above (alphabetically under "J")
5. Submit PR

### Option 2: Use GitHub CLI
```bash
# Fork and clone
gh repo fork wong2/awesome-mcp-servers --clone
cd awesome-mcp-servers

# Create branch
git checkout -b add-jarp-mcp

# Edit README.md - add the entry under "J" section
# (Use the entry from above)

# Commit and push
git add README.md
git commit -m "Add JARP-MCP - Java decompiler MCP server"
git push origin add-jarp-mcp

# Create PR
gh pr create --title "Add JARP-MCP - Java decompiler MCP server" --body "See commit"
```

---

## Other Lists to Submit To

| Repository | URL |
|-----------|-----|
| modelcontextprotocol/servers (Official) | https://github.com/modelcontextprotocol/servers |
| MobinX/awesome-mcp-list | https://github.com/MobinX/awesome-mcp-list |
| appcypher/awesome-mcp-servers | https://github.com/appcypher/awesome-mcp-servers |
