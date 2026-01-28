"""
Performance Tests - Response Times and Resource Usage

These tests verify the server performs within acceptable limits.
"""

import asyncio
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "client"))
from mcp_test_client import MCPClient


async def test_list_tools_response_time(client: MCPClient) -> None:
    """Test list_tools completes quickly"""
    start = time.time()
    await client.list_tools()
    duration = time.time() - start

    assert duration < 2, f"list_tools too slow: {duration}s"


async def test_list_tools_consistency(client: MCPClient) -> None:
    """Test list_tools response time is consistent"""
    times = []
    for _ in range(10):
        start = time.time()
        await client.list_tools()
        times.append(time.time() - start)

    avg = sum(times) / len(times)
    max_time = max(times)

    assert avg < 1, f"Average time too high: {avg}s"
    assert max_time < 2, f"Max time too high: {max_time}s"


async def test_tool_list_size(client: MCPClient) -> None:
    """Test the number of tools is reasonable"""
    tools = await client.list_tools()

    # Should have at least 3 tools
    assert len(tools) >= 3

    # But not an unreasonable number
    assert len(tools) < 100


async def test_tool_response_size(client: MCPClient) -> None:
    """Test tool list response is not excessively large"""
    import json

    tools = await client.list_tools()
    serialized = json.dumps(tools)
    size_kb = len(serialized) / 1024

    # Response should be under 10KB
    assert size_kb < 10, f"Tool list too large: {size_kb}KB"


async def test_concurrent_overhead(client: MCPClient) -> None:
    """Test concurrent calls don't significantly slow each other"""
    # Single call baseline
    start = time.time()
    await client.list_tools()
    single_duration = time.time() - start

    # 5 concurrent calls
    start = time.time()
    await asyncio.gather(*[client.list_tools() for _ in range(5)])
    concurrent_duration = time.time() - start

    # Concurrent should be faster than sequential
    # (allow 2x overhead for coordination)
    assert concurrent_duration < single_duration * 5 * 0.8


async def test_warm_start_performance(client: MCPClient) -> None:
    """Test performance after warmup"""
    # Warm up
    for _ in range(5):
        await client.list_tools()

    # Measure warm performance
    times = []
    for _ in range(10):
        start = time.time()
        await client.list_tools()
        times.append(time.time() - start)

    avg_warm = sum(times) / len(times)

    # Warm calls should be fast
    assert avg_warm < 0.5, f"Warm calls too slow: {avg_warm}s"


async def test_memory_efficiency(client: MCPClient) -> None:
    """Test server doesn't grow memory unbounded"""
    import psutil
    import os

    process = psutil.Process(client.process.pid)

    # Get initial memory
    initial_mem = process.memory_info().rss / 1024 / 1024  # MB

    # Run many operations
    for _ in range(50):
        await client.list_tools()

    # Get final memory
    final_mem = process.memory_info().rss / 1024 / 1024  # MB
    growth = final_mem - initial_mem

    # Growth should be reasonable (< 50MB)
    assert growth < 50, f"Too much memory growth: {growth}MB"


async def test_scan_performance(client: MCPClient) -> None:
    """Test scan_dependencies performance"""
    start = time.time()
    result = await client.call_tool("scan_dependencies", {
        "projectPath": "/tmp"
    })
    duration = time.time() - start

    # Even for empty/non-existent path, should be fast
    assert duration < 5, f"Scan too slow: {duration}s"


async def test_error_response_speed(client: MCPClient) -> None:
    """Test error responses are also fast"""
    start = time.time()
    result = await client.call_tool("decompile_class", {
        "className": "",
        "projectPath": ""
    })
    duration = time.time() - start

    # Errors should be quick
    assert duration < 1, f"Error response too slow: {duration}s"


async def test_no_slow_leaks(client: MCPClient) -> None:
    """Test no performance degradation over session"""
    times = []

    # 100 iterations
    for i in range(100):
        start = time.time()
        await client.list_tools()
        times.append(time.time() - start)

        # Check every 20 iterations
        if (i + 1) % 20 == 0:
            recent_avg = sum(times[-20:]) / 20
            first_avg = sum(times[:20]) / 20

            # Recent times shouldn't be much worse
            assert recent_avg < first_avg * 2, \
                f"Performance degraded: first={first_avg}s, recent={recent_avg}s"


PERFORMANCE_TESTS = [
    test_list_tools_response_time,
    test_list_tools_consistency,
    test_tool_list_size,
    test_tool_response_size,
    test_concurrent_overhead,
    test_warm_start_performance,
    # test_memory_efficiency,  # Skip if psutil not available
    test_scan_performance,
    test_error_response_speed,
    test_no_slow_leaks,
]
