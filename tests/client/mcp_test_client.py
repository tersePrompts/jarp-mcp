"""
MCP Test Client for JARP-MCP Server Testing

A lightweight Python client that connects to MCP servers via STDIO
and runs tests against their tools.
"""

import asyncio
import json
import sys
import time
from dataclasses import dataclass
from typing import Any, Optional
from pathlib import Path


@dataclass
class TestResult:
    """Result of a single test"""
    name: str
    passed: bool
    duration: float
    error: Optional[str] = None
    details: Optional[dict] = None


@dataclass
class SuiteResult:
    """Result of a test suite"""
    name: str
    tests: list[TestResult]
    total_duration: float

    @property
    def passed_count(self) -> int:
        return sum(1 for t in self.tests if t.passed)

    @property
    def failed_count(self) -> int:
        return sum(1 for t in self.tests if not t.passed)

    @property
    def passed(self) -> bool:
        return self.failed_count == 0


class MCPClient:
    """Client for connecting to MCP servers via STDIO"""

    def __init__(self, command: list[str], cwd: Optional[Path] = None):
        self.command = command
        self.cwd = cwd
        self.process: Optional[asyncio.subprocess.Process] = None
        self.request_id = 0
        self.initialized = False

    async def start(self) -> None:
        """Start the MCP server process"""
        self.process = await asyncio.create_subprocess_exec(
            *self.command,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=self.cwd
        )

        # Initialize the session
        await self._send_request({
            "jsonrpc": "2.0",
            "id": self._next_id(),
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {
                    "name": "mcp-test-client",
                    "version": "1.0.0"
                }
            }
        })

        # Send initialized notification
        await self._send_notification({
            "jsonrpc": "2.0",
            "method": "notifications/initialized"
        })

        self.initialized = True

    async def stop(self) -> None:
        """Stop the MCP server process"""
        if self.process:
            self.process.terminate()
            try:
                await asyncio.wait_for(self.process.wait(), timeout=5)
            except asyncio.TimeoutError:
                self.process.kill()
                await self.process.wait()

    async def list_tools(self) -> list[dict]:
        """List available tools from the server"""
        response = await self._send_request({
            "jsonrpc": "2.0",
            "id": self._next_id(),
            "method": "tools/list",
            "params": {}
        })
        return response.get("result", {}).get("tools", [])

    async def call_tool(self, name: str, arguments: dict) -> dict:
        """Call a tool with arguments"""
        response = await self._send_request({
            "jsonrpc": "2.0",
            "id": self._next_id(),
            "method": "tools/call",
            "params": {
                "name": name,
                "arguments": arguments
            }
        })
        return response

    async def _send_request(self, request: dict) -> dict:
        """Send a JSON-RPC request and wait for response"""
        if not self.process:
            raise RuntimeError("Process not started")

        # Send request
        message = json.dumps(request) + "\n"
        self.process.stdin.write(message.encode())
        await self.process.stdin.drain()

        # Read response
        response_line = await self.process.stdout.readline()
        if not response_line:
            raise RuntimeError("No response from server")

        try:
            response = json.loads(response_line.decode())
        except json.JSONDecodeError as e:
            raise RuntimeError(f"Invalid JSON response: {response_line}") from e

        # Check for error
        if "error" in response:
            raise RuntimeError(f"RPC Error: {response['error']}")

        return response

    async def _send_notification(self, notification: dict) -> None:
        """Send a JSON-RPC notification (no response expected)"""
        if not self.process:
            raise RuntimeError("Process not started")

        message = json.dumps(notification) + "\n"
        self.process.stdin.write(message.encode())
        await self.process.stdin.drain()

    def _next_id(self) -> int:
        """Get next request ID"""
        self.request_id += 1
        return self.request_id


class TestRunner:
    """Runs test suites against an MCP server"""

    def __init__(self, server_command: list[str], server_cwd: Optional[Path] = None):
        self.server_command = server_command
        self.server_cwd = server_cwd
        self.client = MCPClient(server_command, server_cwd)
        self.results: list[SuiteResult] = []

    async def setup(self) -> None:
        """Start the server and get ready for testing"""
        await self.client.start()
        # Give server a moment to be ready
        await asyncio.sleep(1)

    async def teardown(self) -> None:
        """Stop the server"""
        await self.client.stop()

    async def run_test(self, name: str, test_func) -> TestResult:
        """Run a single test function"""
        start = time.time()
        try:
            await test_func(self.client)
            duration = time.time() - start
            return TestResult(name=name, passed=True, duration=duration)
        except Exception as e:
            duration = time.time() - start
            return TestResult(
                name=name,
                passed=False,
                duration=duration,
                error=str(e)
            )

    async def run_suite(self, name: str, tests: list[callable]) -> SuiteResult:
        """Run a suite of tests"""
        print(f"\n{'='*60}")
        print(f"Running Suite: {name}")
        print(f"{'='*60}")

        start = time.time()
        results: list[TestResult] = []

        for test in tests:
            result = await self.run_test(test.__name__, test)
            results.append(result)

            status = "✓" if result.passed else "✗"
            print(f"{status} {result.name} ({result.duration:.2f}s)")
            if not result.passed:
                print(f"  Error: {result.error}")

        duration = time.time() - start
        suite_result = SuiteResult(name=name, tests=results, total_duration=duration)
        self.results.append(suite_result)

        print(f"\nSuite Results: {suite_result.passed_count}/{len(results)} passed")
        print(f"Duration: {duration:.2f}s")

        return suite_result

    def print_summary(self) -> None:
        """Print summary of all test runs"""
        print(f"\n{'='*60}")
        print("TEST SUMMARY")
        print(f"{'='*60}")

        total_passed = sum(r.passed_count for r in self.results)
        total_failed = sum(r.failed_count for r in self.results)
        total_duration = sum(r.total_duration for r in self.results)

        for suite in self.results:
            status = "✓" if suite.passed else "✗"
            print(f"{status} {suite.name}: {suite.passed_count}/{len(suite.tests)} passed ({suite.total_duration:.2f}s)")

        print(f"\nTotal: {total_passed}/{total_passed + total_failed} tests passed")
        print(f"Total Duration: {total_duration:.2f}s")

        if total_failed > 0:
            print(f"\n{total_failed} tests FAILED!")
            sys.exit(1)


def with_project(test_func):
    """Decorator that provides a test project path"""
    async def wrapper(client: MCPClient):
        # Get the project root (parent of tests directory)
        test_dir = Path(__file__).parent
        project_root = test_dir.parent.parent

        # Call the test with the project path
        await test_func(client, project_root)

    wrapper.__name__ = test_func.__name__
    return wrapper
