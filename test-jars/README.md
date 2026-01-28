# Testing JARP-MCP

This directory contains JAR files for testing the MCP server locally.

## Test JARs

### fastmcp-java-0.3.0-beta.jar
- Source: fastMCP4J
- Purpose: Test MCP server integration
- Size: ~162 KB

## Local Testing

1. Start the MCP server:
   ```bash
   cd /path/to/java-class-analyzer-mcp-server
   npm run dev
   ```

2. Test with mcp-cli:
   ```bash
   mcp-cli --server jarp-mcp
   ```

## Adding New Test JARs

1. Copy JAR to this directory
2. Update this README with details
3. Test locally before committing
```

