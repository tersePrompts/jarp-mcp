#!/usr/bin/env python3
"""
Main Test Runner for JARP-MCP CI

Runs all test suites against the MCP server.
"""

import asyncio
import sys
import os
import platform
import shutil
from pathlib import Path

# Add client to path
sys.path.insert(0, str(Path(__file__).parent / "client"))
sys.path.insert(0, str(Path(__file__).parent / "suites"))

from mcp_test_client import TestRunner
from test_smoke import SMOKE_TESTS
from test_stress import STRESS_TESTS
from test_edge_cases import EDGE_CASE_TESTS
from test_battle_prep import BATTLE_PREP_TESTS
from test_performance import PERFORMANCE_TESTS


def get_server_command() -> list[str]:
    """Get the command to start the MCP server"""
    project_root = Path(__file__).parent.parent

    # On Windows, use node.exe; on Unix, use node
    node_cmd = "node.exe" if platform.system() == "Windows" else "node"

    # Find node in PATH if not directly available
    if shutil.which(node_cmd):
        return [node_cmd, str(project_root / "dist" / "index.js")]

    # Try to find node in common locations
    if platform.system() == "Windows":
        program_files = os.environ.get("ProgramFiles", "C:\\Program Files")
        node_path = shutil.which("node", path=f"{program_files}\\nodejs")
        if node_path:
            return [node_path, str(project_root / "dist" / "index.js")]

    return [node_cmd, str(project_root / "dist" / "index.js")]


async def main():
    """Run all test suites"""
    project_root = Path(__file__).parent.parent

    # Build the project first
    print("Building project...")

    # Find npm command
    npm_cmd = shutil.which("npm.cmd" if platform.system() == "Windows" else "npm")
    if not npm_cmd and platform.system() == "Windows":
        # Try common Windows locations
        program_files = os.environ.get("ProgramFiles", "C:\\Program Files")
        npm_path = os.path.join(program_files, "nodejs", "npm.cmd")
        if os.path.exists(npm_path):
            npm_cmd = npm_path

    if not npm_cmd:
        print("Warning: npm not found, assuming already built...")
    else:
        import subprocess
        result = subprocess.run(
            [npm_cmd, "run", "build"],
            cwd=project_root,
            capture_output=True
        )
        if result.returncode != 0:
            print(f"Build failed: {result.stderr.decode()}")
            sys.exit(1)
        print("Build complete.\n")

    # Create test runner
    runner = TestRunner(
        server_command=get_server_command(),
        server_cwd=project_root
    )

    try:
        await runner.setup()

        # Run all suites
        await runner.run_suite("Smoke Tests", SMOKE_TESTS)
        await runner.run_suite("Stress Tests", STRESS_TESTS)
        await runner.run_suite("Edge Cases", EDGE_CASE_TESTS)
        await runner.run_suite("Battle Prep", BATTLE_PREP_TESTS)
        await runner.run_suite("Performance", PERFORMANCE_TESTS)

        runner.print_summary()

    finally:
        await runner.teardown()


if __name__ == "__main__":
    asyncio.run(main())
