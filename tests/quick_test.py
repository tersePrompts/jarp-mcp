#!/usr/bin/env python3
"""
Quick smoke test for MCP server - starts server and verifies it responds
"""

import asyncio
import json
import sys
import os
import platform
from pathlib import Path


async def test_mcp_server():
    """Test that the MCP server starts and responds"""
    project_root = Path(__file__).parent.parent

    # Build if needed
    dist_path = project_root / "dist" / "index.js"
    if not dist_path.exists():
        print("Building project...")
        import subprocess
        npm_cmd = "npm.cmd" if platform.system() == "Windows" else "npm"
        result = subprocess.run([npm_cmd, "run", "build"], cwd=project_root)
        if result.returncode != 0:
            print("Build failed")
            return False

    # Start server
    print("Starting MCP server...")
    node_cmd = "node.exe" if platform.system() == "Windows" else "node"
    process = await asyncio.create_subprocess_exec(
        node_cmd,
        str(dist_path),
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=project_root
    )

    try:
        # Wait a bit for server to start
        await asyncio.sleep(2)

        # Check if process is still running
        if process.returncode is not None:
            stderr = await process.stderr.read()
            print(f"Server exited with code {process.returncode}")
            print(f"stderr: {stderr.decode()}")
            return False

        # Send initialize request
        request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "test-client", "version": "1.0"}
            }
        }

        message = json.dumps(request) + "\n"
        process.stdin.write(message.encode())
        await process.stdin.drain()

        # Read response
        response_line = await asyncio.wait_for(process.stdout.readline(), timeout=5)
        response = json.loads(response_line.decode())

        if "result" in response:
            print("[PASS] Server initialized successfully")
            print(f"  Server info: {response['result'].get('serverInfo', {})}")

            # List tools
            tools_request = {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/list",
                "params": {}
            }
            message = json.dumps(tools_request) + "\n"
            process.stdin.write(message.encode())
            await process.stdin.drain()

            tools_response = await asyncio.wait_for(process.stdout.readline(), timeout=5)
            tools_data = json.loads(tools_response.decode())

            if "result" in tools_data:
                tools = tools_data["result"].get("tools", [])
                print(f"[PASS] Listed {len(tools)} tools")
                for tool in tools:
                    print(f"  - {tool.get('name')}")
                return True
            else:
                print(f"[FAIL] Could not list tools: {tools_data}")
                return False
        else:
            print(f"[FAIL] Initialize failed: {response}")
            return False

    except asyncio.TimeoutError:
        print("[FAIL] Timeout waiting for server response")
        return False
    except Exception as e:
        print(f"[FAIL] Error: {e}")
        return False
    finally:
        try:
            process.terminate()
            await asyncio.wait_for(process.wait(), timeout=3)
        except:
            process.kill()


if __name__ == "__main__":
    success = asyncio.run(test_mcp_server())
    sys.exit(0 if success else 1)
