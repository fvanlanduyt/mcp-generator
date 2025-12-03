#!/usr/bin/env python3
"""
MCP Bridge - Connects Claude Desktop (stdio) to a remote MCP server (SSE)

Usage:
    python bridge.py <server_url>

Example:
    python bridge.py https://matrix.poc.fluxys.com:8800/mcp/sse
"""

import sys
import json
import asyncio
import aiohttp


async def main():
    if len(sys.argv) < 2:
        print("Usage: python bridge.py <mcp_sse_url>", file=sys.stderr)
        sys.exit(1)

    sse_url = sys.argv[1]
    messages_endpoint = None

    async with aiohttp.ClientSession() as session:
        # Connect to SSE endpoint
        async with session.get(sse_url) as sse_response:
            if sse_response.status != 200:
                print(f"Failed to connect to SSE: {sse_response.status}", file=sys.stderr)
                sys.exit(1)

            # Create tasks for reading stdin and SSE
            stdin_queue = asyncio.Queue()

            async def read_stdin():
                """Read JSON-RPC messages from stdin"""
                loop = asyncio.get_event_loop()
                reader = asyncio.StreamReader()
                protocol = asyncio.StreamReaderProtocol(reader)
                await loop.connect_read_pipe(lambda: protocol, sys.stdin)

                buffer = ""
                while True:
                    try:
                        chunk = await reader.read(4096)
                        if not chunk:
                            break
                        buffer += chunk.decode('utf-8')

                        # Try to parse complete JSON messages
                        while buffer:
                            buffer = buffer.lstrip()
                            if not buffer:
                                break
                            try:
                                msg, idx = json.JSONDecoder().raw_decode(buffer)
                                buffer = buffer[idx:]
                                await stdin_queue.put(msg)
                            except json.JSONDecodeError:
                                break  # Incomplete message, wait for more data
                    except Exception as e:
                        print(f"Stdin read error: {e}", file=sys.stderr)
                        break

            async def process_sse():
                """Process SSE events and forward to stdout"""
                nonlocal messages_endpoint

                async for line in sse_response.content:
                    line = line.decode('utf-8').strip()

                    if line.startswith('event:'):
                        event_type = line[6:].strip()
                    elif line.startswith('data:'):
                        data = line[5:].strip()

                        if event_type == 'endpoint':
                            messages_endpoint = data
                        elif event_type == 'message' and data:
                            # Forward response to stdout
                            print(data, flush=True)
                        elif event_type == 'ping':
                            pass  # Ignore keepalive pings

            async def forward_messages():
                """Forward stdin messages to the server"""
                nonlocal messages_endpoint

                while True:
                    msg = await stdin_queue.get()

                    # Wait for endpoint to be available
                    while messages_endpoint is None:
                        await asyncio.sleep(0.1)

                    try:
                        async with session.post(
                            messages_endpoint,
                            json=msg,
                            headers={'Content-Type': 'application/json'}
                        ) as resp:
                            if resp.status != 200:
                                print(f"Message send failed: {resp.status}", file=sys.stderr)
                    except Exception as e:
                        print(f"Message send error: {e}", file=sys.stderr)

            # Run all tasks concurrently
            await asyncio.gather(
                read_stdin(),
                process_sse(),
                forward_messages()
            )


if __name__ == "__main__":
    asyncio.run(main())
