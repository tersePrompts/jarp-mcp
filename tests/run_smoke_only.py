#!/usr/bin/env python3
"""Run just the smoke tests"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "client"))
sys.path.insert(0, str(Path(__file__).parent / "suites"))

from mcp_test_client import TestRunner
from test_smoke import SMOKE_TESTS


def get_server_command():
    from platform import system as platform_system
    project_root = Path(__file__).parent.parent
    node_cmd = "node.exe" if platform_system() == "Windows" else "node"
    return [node_cmd, str(project_root / "dist" / "index.js")]


async def main():
    project_root = Path(__file__).parent.parent
    runner = TestRunner(get_server_command(), project_root)

    try:
        await runner.setup()
        await runner.run_suite("Smoke Tests", SMOKE_TESTS)
        runner.print_summary()
    finally:
        await runner.teardown()


if __name__ == "__main__":
    asyncio.run(main())
