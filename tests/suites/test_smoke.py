"""
Smoke Tests - Basic Functionality Verification

These tests verify the most basic functionality of the MCP server.
If these fail, the server is broken in a fundamental way.
"""

import asyncio
import sys
from pathlib import Path
from typing import Any

# Add client to path
sys.path.insert(0, str(Path(__file__).parent.parent / "client"))
from mcp_test_client import MCPClient, with_project


async def test_server_connects(client: MCPClient) -> None:
    """Test that the server starts and responds"""
    assert client.process is not None
    assert client.process.returncode is None
    assert client.initialized


async def test_list_tools(client: MCPClient) -> None:
    """Test that we can list available tools"""
    tools = await client.list_tools()
    assert isinstance(tools, list)
    assert len(tools) > 0

    # Check expected tools exist
    tool_names = {t.get("name") for t in tools}
    assert "scan_dependencies" in tool_names
    assert "decompile_class" in tool_names
    assert "analyze_class" in tool_names


async def test_scan_dependencies_tool(client: MCPClient, project_root: Path) -> None:
    """Test the scan_dependencies tool with valid project"""
    result = await client.call_tool("scan_dependencies", {
        "projectPath": str(project_root)
    })

    # Should have a result
    assert "result" in result
    content = result["result"].get("content", [])
    assert isinstance(content, list)


async def test_scan_dependencies_response_format(client: MCPClient, project_root: Path) -> None:
    """Test that scan_dependencies returns proper format"""
    result = await client.call_tool("scan_dependencies", {
        "projectPath": str(project_root)
    })

    # Should have content with text
    content = result["result"].get("content", [])
    if content:
        assert any("text" in item for item in content)


async def test_tool_descriptions(client: MCPClient) -> None:
    """Test that all tools have descriptions"""
    tools = await client.list_tools()

    for tool in tools:
        assert "name" in tool
        assert "description" in tool
        # Description should not be empty
        assert len(tool["description"]) > 0


async def test_tool_input_schema(client: MCPClient) -> None:
    """Test that tools have input schemas"""
    tools = await client.list_tools()

    for tool in tools:
        assert "inputSchema" in tool
        schema = tool["inputSchema"]
        assert isinstance(schema, dict)


async def test_invalid_project_path(client: MCPClient) -> None:
    """Test handling of non-existent project path"""
    result = await client.call_tool("scan_dependencies", {
        "projectPath": "/nonexistent/path/that/does/not/exist"
    })

    # Should handle gracefully - either error message or empty result
    assert "result" in result or "error" in result


async def test_decompile_class_without_scan(client: MCPClient) -> None:
    """Test decompile_class fails gracefully without prior scan"""
    result = await client.call_tool("decompile_class", {
        "className": "com.example.Test",
        "projectPath": "/tmp"
    })

    # Should give a helpful error about running scan first
    assert "result" in result or "error" in result


async def test_analyze_class_without_scan(client: MCPClient) -> None:
    """Test analyze_class fails gracefully without prior scan"""
    result = await client.call_tool("analyze_class", {
        "className": "com.example.Test",
        "projectPath": "/tmp"
    })

    # Should give a helpful error
    assert "result" in result or "error" in result


# Export all test functions
SMOKE_TESTS = [
    test_server_connects,
    test_list_tools,
    test_scan_dependencies_tool,
    test_scan_dependencies_response_format,
    test_tool_descriptions,
    test_tool_input_schema,
    test_invalid_project_path,
    test_decompile_class_without_scan,
    test_analyze_class_without_scan,
]
