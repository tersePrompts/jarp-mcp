"""
Battle Prep Tests - Real-World Scenarios

These tests simulate actual usage patterns developers encounter.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "client"))
from mcp_test_client import MCPClient, with_project


async def test_spring_boot_common_classes(client: MCPClient, project_root: Path) -> None:
    """Test looking up common Spring Boot classes"""
    spring_classes = [
        "org.springframework.data.jpa.repository.JpaRepository",
        "org.springframework.web.bind.annotation.RestController",
        "org.springframework.stereotype.Service",
        "org.springframework.context.annotation.Configuration",
    ]

    for class_name in spring_classes:
        result = await client.call_tool("analyze_class", {
            "className": class_name,
            "projectPath": str(project_root)
        })
        # Should handle even if not found (no crash)
        assert "result" in result or "error" in result


async def test_java_standard_library(client: MCPClient, project_root: Path) -> None:
    """Test looking up Java standard library classes"""
    java_classes = [
        "java.util.List",
        "java.util.ArrayList",
        "java.util.Map",
        "java.lang.String",
        "java.io.File",
    ]

    for class_name in java_classes:
        result = await client.call_tool("analyze_class", {
            "className": class_name,
            "projectPath": str(project_root)
        })
        # Should handle gracefully
        assert "result" in result or "error" in result


async def test_common_third_party_libs(client: MCPClient, project_root: Path) -> None:
    """Test common third-party library classes"""
    common_libs = [
        "com.fasterxml.jackson.databind.ObjectMapper",
        "org.apache.commons.lang3.StringUtils",
        "com.google.common.collect.Lists",
        "lombok.Data",
    ]

    for class_name in common_libs:
        result = await client.call_tool("decompile_class", {
            "className": class_name,
            "projectPath": str(project_root)
        })
        # Should handle gracefully
        assert "result" in result or "error" in result


async def test_inner_class_names(client: MCPClient, project_root: Path) -> None:
    """Test handling of inner class names"""
    inner_classes = [
        "com.example.OuterClass$InnerClass",
        "com.example.OuterClass$1",
        "com.example.Container$Inner$Nested",
    ]

    for class_name in inner_classes:
        result = await client.call_tool("decompile_class", {
            "className": class_name,
            "projectPath": str(project_root)
        })
        # Should handle gracefully
        assert "result" in result or "error" in result


async def test_array_type_names(client: MCPClient, project_root: Path) -> None:
    """Test handling of array type names"""
    array_types = [
        "[Ljava.lang.String;",
        "[I",
        "[[Ljava.util.List;",
        "java.lang.String[]",
    ]

    for class_name in array_types:
        result = await client.call_tool("analyze_class", {
            "className": class_name,
            "projectPath": str(project_root)
        })
        # Should handle gracefully
        assert "result" in result or "error" in result


async def test_generic_type_signatures(client: MCPClient, project_root: Path) -> None:
    """Test handling of generic type signatures"""
    generic_types = [
        "java.util.List<java.lang.String>",
        "java.util.Map<java.lang.String, java.lang.Integer>",
        "com.example.GenericClass<java.lang.String>",
    ]

    for class_name in generic_types:
        result = await client.call_tool("analyze_class", {
            "className": class_name,
            "projectPath": str(project_root)
        })
        # Should handle gracefully
        assert "result" in result or "error" in result


async def test_scan_then_decompile_workflow(client: MCPClient, project_root: Path) -> None:
    """Test the common workflow: scan, then decompile"""
    # First scan
    scan_result = await client.call_tool("scan_dependencies", {
        "projectPath": str(project_root)
    })
    assert "result" in scan_result

    # Then try to decompile (might fail if no classes found, but shouldn't crash)
    decompile_result = await client.call_tool("decompile_class", {
        "className": "com.test.FakeClass",
        "projectPath": str(project_root)
    })
    assert "result" in decompile_result or "error" in decompile_result


async def test_multiple_scans_same_project(client: MCPClient, project_root: Path) -> None:
    """Test scanning the same project multiple times"""
    for _ in range(3):
        result = await client.call_tool("scan_dependencies", {
            "projectPath": str(project_root)
        })
        assert "result" in result


async def test_primitive_type_names(client: MCPClient, project_root: Path) -> None:
    """Test handling of primitive type names"""
    primitives = [
        "int",
        "boolean",
        "void",
        "byte",
        "short",
        "long",
        "float",
        "double",
        "char",
    ]

    for class_name in primitives:
        result = await client.call_tool("analyze_class", {
            "className": class_name,
            "projectPath": str(project_root)
        })
        # Should handle gracefully
        assert "result" in result or "error" in result


async def test_anonymous_class_patterns(client: MCPClient, project_root: Path) -> None:
    """Test handling of anonymous class patterns"""
    anonymous_patterns = [
        "com.example.Class$1",
        "com.example.Class$2Local",
        "com.example.Class$1Enum",
    ]

    for class_name in anonymous_patterns:
        result = await client.call_tool("decompile_class", {
            "className": class_name,
            "projectPath": str(project_root)
        })
        # Should handle gracefully
        assert "result" in result or "error" in result


BATTLE_PREP_TESTS = [
    test_spring_boot_common_classes,
    test_java_standard_library,
    test_common_third_party_libs,
    test_inner_class_names,
    test_array_type_names,
    test_generic_type_signatures,
    test_scan_then_decompile_workflow,
    test_multiple_scans_same_project,
    test_primitive_type_names,
    test_anonymous_class_patterns,
]
