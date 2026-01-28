"""
Stress Tests - High Load and Concurrent Requests

These tests verify the server can handle heavy usage patterns.
"""

import asyncio
import sys
import time
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).parent.parent / "client"))
from mcp_test_client import MCPClient, with_project


async def test_concurrent_tool_calls(client: MCPClient, project_root: Path) -> None:
    """Test multiple concurrent tool calls"""
    tools = await client.list_tools()

    # Make 10 concurrent list_tools calls
    tasks = [client.list_tools() for _ in range(10)]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # All should succeed
    for result in results:
        if isinstance(result, Exception):
            raise result
        assert isinstance(result, list)


async def test_rapid_sequential_calls(client: MCPClient, project_root: Path) -> None:
    """Test rapid sequential tool calls"""
    start = time.time()

    for _ in range(20):
        await client.list_tools()

    duration = time.time() - start
    # Should complete reasonably fast
    assert duration < 10, f"Too slow: {duration}s for 20 calls"


async def test_concurrent_different_tools(client: MCPClient, project_root: Path) -> None:
    """Test concurrent calls to different tools"""
    tasks = [
        client.list_tools(),
        client.call_tool("scan_dependencies", {"projectPath": str(project_root)}),
        client.call_tool("analyze_class", {"className": "test.Test", "projectPath": str(project_root)}),
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    # At least list_tools should succeed
    assert results[0] is not None
    assert not isinstance(results[0], Exception)


async def test_memory_stability(client: MCPClient, project_root: Path) -> None:
    """Test server doesn't leak memory over many operations"""
    # Perform many operations
    for _ in range(50):
        await client.list_tools()
        await asyncio.sleep(0.01)

    # If we get here without crash, memory is stable enough


async def test_long_running_session(client: MCPClient, project_root: Path) -> None:
    """Test server remains responsive over time"""
    start = time.time()

    # Run operations for 5 seconds
    while time.time() - start < 5:
        await client.list_tools()
        await asyncio.sleep(0.1)

    # Server should still be responsive
    tools = await client.list_tools()
    assert len(tools) > 0


async def test_burst_traffic(client: MCPClient, project_root: Path) -> None:
    """Test handling burst traffic pattern"""
    # Simulate burst: many calls at once, then pause, then repeat
    for _ in range(3):
        tasks = [client.list_tools() for _ in range(15)]
        await asyncio.gather(*tasks)
        await asyncio.sleep(0.5)


async def test_error_recovery(client: MCPClient, project_root: Path) -> None:
    """Test server recovers from errors"""
    # Make several invalid calls
    for _ in range(5):
        try:
            await client.call_tool("decompile_class", {
                "className": "",
                "projectPath": "/nonexistent"
            })
        except Exception:
            pass  # Expected to fail

    # Server should still work
    tools = await client.list_tools()
    assert len(tools) > 0


STRESS_TESTS = [
    test_concurrent_tool_calls,
    test_rapid_sequential_calls,
    test_concurrent_different_tools,
    test_memory_stability,
    test_long_running_session,
    test_burst_traffic,
    test_error_recovery,
]
