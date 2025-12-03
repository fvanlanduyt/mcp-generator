import json
import uuid
import asyncio
from datetime import datetime
from collections import deque
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse, HTMLResponse
from sse_starlette.sse import EventSourceResponse
from sqlalchemy.orm import Session

from database import SessionLocal
from models import Capability, DatabaseConnection
from db_connector import create_connector
from sql_executor import SQLExecutor

router = APIRouter()

# Store for SSE sessions - maps session_id to message queue
sse_sessions: Dict[str, asyncio.Queue] = {}

# =============================================================================
# MCP Activity Logger - Track all MCP interactions
# =============================================================================
class MCPActivityLog:
    """Stores MCP activity for monitoring and debugging"""

    def __init__(self, max_entries: int = 100):
        self.entries: deque = deque(maxlen=max_entries)
        self.listeners: List[asyncio.Queue] = []

    def log(self, event_type: str, data: Dict[str, Any], client_ip: str = None, session_id: str = None):
        entry = {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "event_type": event_type,
            "client_ip": client_ip,
            "session_id": session_id,
            "data": data
        }
        self.entries.append(entry)

        # Notify all listeners
        for listener in self.listeners:
            try:
                listener.put_nowait(entry)
            except asyncio.QueueFull:
                pass

    def get_recent(self, limit: int = 50) -> List[Dict]:
        return list(self.entries)[-limit:]

    def add_listener(self) -> asyncio.Queue:
        queue = asyncio.Queue(maxsize=100)
        self.listeners.append(queue)
        return queue

    def remove_listener(self, queue: asyncio.Queue):
        if queue in self.listeners:
            self.listeners.remove(queue)

# Global activity log
mcp_activity = MCPActivityLog()


class MCPProtocolHandler:
    """Handles MCP protocol requests"""

    SUPPORTED_PROTOCOL_VERSION = "2024-11-05"

    def __init__(self, db: Session):
        self.db = db

    def get_live_capabilities(self) -> List[Capability]:
        """Get all live capabilities"""
        return self.db.query(Capability).filter(Capability.is_live == True).all()

    def capability_to_mcp_tool(self, capability: Capability) -> Dict[str, Any]:
        """Convert a capability to MCP tool format"""
        properties = {}
        required = []

        for param in capability.parameters or []:
            param_name = param.get("name", "")
            param_type = param.get("type", "string")
            param_desc = param.get("description", "")
            param_required = param.get("required", True)

            # Map our types to JSON Schema types
            json_type_map = {
                "string": "string",
                "integer": "integer",
                "float": "number",
                "boolean": "boolean",
                "date": "string"
            }

            properties[param_name] = {
                "type": json_type_map.get(param_type, "string"),
                "description": param_desc
            }

            if param_type == "date":
                properties[param_name]["format"] = "date"

            if param_required:
                required.append(param_name)

        return {
            "name": capability.name,
            "description": capability.description,
            "inputSchema": {
                "type": "object",
                "properties": properties,
                "required": required
            }
        }

    def handle_initialize(self, params: Optional[Dict] = None) -> Dict[str, Any]:
        """Handle initialize request"""
        return {
            "protocolVersion": self.SUPPORTED_PROTOCOL_VERSION,
            "capabilities": {
                "tools": {}
            },
            "serverInfo": {
                "name": "mcp-server-generator",
                "version": "1.0.0"
            }
        }

    def handle_tools_list(self, params: Optional[Dict] = None) -> Dict[str, Any]:
        """Handle tools/list request"""
        capabilities = self.get_live_capabilities()
        tools = [self.capability_to_mcp_tool(cap) for cap in capabilities]
        return {"tools": tools}

    def handle_tools_call(self, params: Dict) -> Dict[str, Any]:
        """Handle tools/call request"""
        tool_name = params.get("name")
        arguments = params.get("arguments", {})

        if not tool_name:
            raise ValueError("Tool name is required")

        # Find the capability
        capability = self.db.query(Capability).filter(
            Capability.name == tool_name,
            Capability.is_live == True
        ).first()

        if not capability:
            raise ValueError(f"Tool '{tool_name}' not found or not live")

        # Get the connection
        connection = self.db.query(DatabaseConnection).filter(
            DatabaseConnection.id == capability.connection_id
        ).first()

        if not connection:
            raise ValueError(f"Database connection for tool '{tool_name}' not found")

        # Create connector and executor
        connector = create_connector(connection.db_type, connection.connection_string)
        executor = SQLExecutor(connector)

        # Execute the capability
        result = executor.execute(
            capability.sql_template,
            arguments,
            capability.parameters or []
        )

        connector.close()

        if result["success"]:
            # Format result for MCP
            return {
                "content": [
                    {
                        "type": "text",
                        "text": json.dumps(result["data"], default=str, indent=2)
                    }
                ]
            }
        else:
            raise ValueError(f"Query execution failed: {result['error']}")

    def handle_request(self, request: Dict) -> Dict[str, Any]:
        """Main request handler"""
        method = request.get("method", "")
        params = request.get("params")
        request_id = request.get("id")

        handlers = {
            "initialize": self.handle_initialize,
            "tools/list": self.handle_tools_list,
            "tools/call": self.handle_tools_call,
        }

        handler = handlers.get(method)
        if not handler:
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {
                    "code": -32601,
                    "message": f"Method '{method}' not found"
                }
            }

        try:
            result = handler(params)
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": result
            }
        except Exception as e:
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {
                    "code": -32000,
                    "message": str(e)
                }
            }


@router.post("/mcp")
async def mcp_endpoint(request: Request):
    """MCP JSON-RPC endpoint"""
    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")

    try:
        body = await request.json()
    except Exception:
        mcp_activity.log("error", {"error": "Parse error"}, client_ip=client_ip)
        return JSONResponse({
            "jsonrpc": "2.0",
            "id": None,
            "error": {
                "code": -32700,
                "message": "Parse error"
            }
        })

    # Log the incoming request
    method = body.get("method", "unknown")
    mcp_activity.log("request", {
        "method": method,
        "id": body.get("id"),
        "params": body.get("params")
    }, client_ip=client_ip)

    db = SessionLocal()
    try:
        handler = MCPProtocolHandler(db)
        response = handler.handle_request(body)

        # Log the response
        mcp_activity.log("response", {
            "method": method,
            "id": response.get("id"),
            "success": "result" in response,
            "error": response.get("error")
        }, client_ip=client_ip)

        return JSONResponse(response)
    finally:
        db.close()


@router.get("/mcp")
async def mcp_info():
    """Get MCP server info"""
    db = SessionLocal()
    try:
        live_count = db.query(Capability).filter(Capability.is_live == True).count()
        return {
            "name": "MCP Server Generator",
            "version": "1.0.0",
            "protocol_version": MCPProtocolHandler.SUPPORTED_PROTOCOL_VERSION,
            "live_capabilities": live_count,
            "status": "running",
            "transports": ["http", "sse"],
            "sse_endpoint": "/mcp/sse"
        }
    finally:
        db.close()


# =============================================================================
# SSE Transport for MCP (for Claude Desktop and other remote clients)
# =============================================================================

@router.get("/mcp/sse")
async def mcp_sse(request: Request):
    """
    SSE endpoint for MCP protocol.

    Claude Desktop connects here and receives:
    1. An 'endpoint' event with the URL to POST messages to
    2. Response events for each JSON-RPC request
    """
    session_id = str(uuid.uuid4())
    message_queue: asyncio.Queue = asyncio.Queue()
    sse_sessions[session_id] = message_queue

    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")

    # Build the messages endpoint URL
    # Use the request's base URL to construct the full endpoint
    scheme = request.headers.get("x-forwarded-proto", request.url.scheme)
    host = request.headers.get("x-forwarded-host", request.headers.get("host", request.url.netloc))
    port = request.headers.get("x-forwarded-port", "")

    # Add port to host if not already included and not standard port
    if port and ":" not in host and port not in ("80", "443"):
        host = f"{host}:{port}"

    messages_endpoint = f"{scheme}://{host}/mcp/messages?session_id={session_id}"

    # Log SSE connection
    mcp_activity.log("sse_connect", {
        "session_id": session_id,
        "messages_endpoint": messages_endpoint,
        "headers": {
            "origin": request.headers.get("origin"),
            "user-agent": request.headers.get("user-agent"),
            "host": request.headers.get("host")
        }
    }, client_ip=client_ip, session_id=session_id)

    async def event_generator():
        try:
            # First, send the endpoint event so the client knows where to POST messages
            yield {
                "event": "endpoint",
                "data": messages_endpoint
            }

            # Keep connection alive and send responses
            while True:
                try:
                    # Wait for messages with timeout to allow checking if client disconnected
                    message = await asyncio.wait_for(message_queue.get(), timeout=30.0)
                    yield {
                        "event": "message",
                        "data": json.dumps(message)
                    }
                except asyncio.TimeoutError:
                    # Send keepalive ping
                    yield {
                        "event": "ping",
                        "data": ""
                    }
                    continue

                # Check if client is still connected
                if await request.is_disconnected():
                    break

        finally:
            # Cleanup session and log disconnect
            mcp_activity.log("sse_disconnect", {
                "session_id": session_id
            }, client_ip=client_ip, session_id=session_id)
            if session_id in sse_sessions:
                del sse_sessions[session_id]

    return EventSourceResponse(
        event_generator(),
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/mcp/messages")
async def mcp_messages(request: Request, session_id: str):
    """
    Endpoint for receiving MCP JSON-RPC messages from clients.
    Processes the message and sends the response via SSE.
    """
    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")

    if session_id not in sse_sessions:
        mcp_activity.log("error", {
            "error": "Session not found",
            "session_id": session_id
        }, client_ip=client_ip, session_id=session_id)
        raise HTTPException(status_code=404, detail="Session not found. Connect to /mcp/sse first.")

    try:
        body = await request.json()
    except Exception:
        error_response = {
            "jsonrpc": "2.0",
            "id": None,
            "error": {
                "code": -32700,
                "message": "Parse error"
            }
        }
        mcp_activity.log("error", {"error": "Parse error"}, client_ip=client_ip, session_id=session_id)
        await sse_sessions[session_id].put(error_response)
        return JSONResponse({"status": "error", "message": "Parse error"})

    # Log the incoming request
    method = body.get("method", "unknown")
    mcp_activity.log("sse_request", {
        "method": method,
        "id": body.get("id"),
        "params": body.get("params")
    }, client_ip=client_ip, session_id=session_id)

    db = SessionLocal()
    try:
        handler = MCPProtocolHandler(db)
        response = handler.handle_request(body)

        # Log the response
        mcp_activity.log("sse_response", {
            "method": method,
            "id": response.get("id"),
            "success": "result" in response,
            "error": response.get("error")
        }, client_ip=client_ip, session_id=session_id)

        # Put the response in the session's queue to be sent via SSE
        await sse_sessions[session_id].put(response)

        # Also return the response directly for clients that prefer synchronous responses
        return JSONResponse(response)
    finally:
        db.close()


# =============================================================================
# MCP Activity Monitor - View logs and debug connections
# =============================================================================

@router.get("/mcp/logs")
async def get_mcp_logs(limit: int = 50):
    """Get recent MCP activity logs"""
    return {
        "logs": mcp_activity.get_recent(limit),
        "active_sessions": len(sse_sessions),
        "session_ids": list(sse_sessions.keys())
    }


@router.get("/mcp/logs/stream")
async def stream_mcp_logs(request: Request):
    """Stream MCP activity logs in real-time via SSE"""
    queue = mcp_activity.add_listener()

    async def event_generator():
        try:
            # Send recent logs first
            for entry in mcp_activity.get_recent(20):
                yield {
                    "event": "log",
                    "data": json.dumps(entry)
                }

            # Then stream new logs
            while True:
                try:
                    entry = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield {
                        "event": "log",
                        "data": json.dumps(entry)
                    }
                except asyncio.TimeoutError:
                    yield {
                        "event": "ping",
                        "data": ""
                    }

                if await request.is_disconnected():
                    break
        finally:
            mcp_activity.remove_listener(queue)

    return EventSourceResponse(event_generator())


@router.get("/mcp/monitor", response_class=HTMLResponse)
async def mcp_monitor():
    """Visual MCP activity monitor dashboard"""
    return """
<!DOCTYPE html>
<html>
<head>
    <title>MCP Activity Monitor</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a2e; color: #eee; padding: 20px; }
        h1 { color: #00d4ff; margin-bottom: 20px; }
        .stats { display: flex; gap: 20px; margin-bottom: 20px; }
        .stat { background: #16213e; padding: 15px 25px; border-radius: 8px; }
        .stat-value { font-size: 2em; font-weight: bold; color: #00d4ff; }
        .stat-label { color: #888; font-size: 0.9em; }
        .logs { background: #16213e; border-radius: 8px; padding: 15px; max-height: 70vh; overflow-y: auto; }
        .log-entry { padding: 10px; border-bottom: 1px solid #2a2a4a; font-family: monospace; font-size: 13px; }
        .log-entry:hover { background: #1f2b47; }
        .log-time { color: #888; }
        .log-type { padding: 2px 8px; border-radius: 4px; font-size: 11px; margin: 0 8px; }
        .log-type.sse_connect { background: #00875a; }
        .log-type.sse_disconnect { background: #de350b; }
        .log-type.request, .log-type.sse_request { background: #0052cc; }
        .log-type.response, .log-type.sse_response { background: #6554c0; }
        .log-type.error { background: #de350b; }
        .log-data { color: #aaa; margin-top: 5px; white-space: pre-wrap; word-break: break-all; }
        .log-ip { color: #ff9f43; }
        .log-session { color: #54a0ff; font-size: 11px; }
        .connected { color: #00d4ff; animation: pulse 2s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    </style>
</head>
<body>
    <h1>🔌 MCP Activity Monitor</h1>
    <div class="stats">
        <div class="stat">
            <div class="stat-value" id="sessions">-</div>
            <div class="stat-label">Active Sessions</div>
        </div>
        <div class="stat">
            <div class="stat-value" id="requests">0</div>
            <div class="stat-label">Total Requests</div>
        </div>
        <div class="stat">
            <div class="stat-value connected" id="status">Connecting...</div>
            <div class="stat-label">Stream Status</div>
        </div>
    </div>
    <div class="logs" id="logs"></div>

    <script>
        let requestCount = 0;
        const logsContainer = document.getElementById('logs');
        const sessionsEl = document.getElementById('sessions');
        const requestsEl = document.getElementById('requests');
        const statusEl = document.getElementById('status');

        function addLog(entry) {
            const div = document.createElement('div');
            div.className = 'log-entry';

            const time = new Date(entry.timestamp).toLocaleTimeString();
            const type = entry.event_type;
            const ip = entry.client_ip || '-';
            const session = entry.session_id ? entry.session_id.substring(0, 8) + '...' : '-';
            const data = JSON.stringify(entry.data, null, 2);

            div.innerHTML = `
                <span class="log-time">${time}</span>
                <span class="log-type ${type}">${type}</span>
                <span class="log-ip">${ip}</span>
                <span class="log-session">[${session}]</span>
                <div class="log-data">${data}</div>
            `;

            logsContainer.insertBefore(div, logsContainer.firstChild);

            // Keep max 100 entries
            while (logsContainer.children.length > 100) {
                logsContainer.removeChild(logsContainer.lastChild);
            }

            if (type.includes('request')) {
                requestCount++;
                requestsEl.textContent = requestCount;
            }
        }

        function connect() {
            const es = new EventSource('/mcp/logs/stream');

            es.onopen = () => {
                statusEl.textContent = 'Connected';
                statusEl.className = 'connected';
            };

            es.addEventListener('log', (e) => {
                const entry = JSON.parse(e.data);
                addLog(entry);
            });

            es.onerror = () => {
                statusEl.textContent = 'Reconnecting...';
                es.close();
                setTimeout(connect, 3000);
            };
        }

        // Fetch initial stats
        fetch('/mcp/logs')
            .then(r => r.json())
            .then(data => {
                sessionsEl.textContent = data.active_sessions;
                data.logs.reverse().forEach(addLog);
            });

        // Update sessions count periodically
        setInterval(() => {
            fetch('/mcp/logs?limit=1')
                .then(r => r.json())
                .then(data => {
                    sessionsEl.textContent = data.active_sessions;
                });
        }, 5000);

        connect();
    </script>
</body>
</html>
"""


def get_mcp_router() -> APIRouter:
    """Get the MCP router"""
    return router
