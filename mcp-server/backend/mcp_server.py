import json
import uuid
import asyncio
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse
from sqlalchemy.orm import Session

from database import SessionLocal
from models import Capability, DatabaseConnection
from db_connector import create_connector
from sql_executor import SQLExecutor

router = APIRouter()

# Store for SSE sessions - maps session_id to message queue
sse_sessions: Dict[str, asyncio.Queue] = {}


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
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({
            "jsonrpc": "2.0",
            "id": None,
            "error": {
                "code": -32700,
                "message": "Parse error"
            }
        })

    db = SessionLocal()
    try:
        handler = MCPProtocolHandler(db)
        response = handler.handle_request(body)
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

    # Build the messages endpoint URL
    # Use the request's base URL to construct the full endpoint
    scheme = request.headers.get("x-forwarded-proto", request.url.scheme)
    host = request.headers.get("x-forwarded-host", request.headers.get("host", request.url.netloc))
    port = request.headers.get("x-forwarded-port", "")

    # Add port to host if not already included and not standard port
    if port and ":" not in host and port not in ("80", "443"):
        host = f"{host}:{port}"

    messages_endpoint = f"{scheme}://{host}/mcp/messages?session_id={session_id}"

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
            # Cleanup session
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
    if session_id not in sse_sessions:
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
        await sse_sessions[session_id].put(error_response)
        return JSONResponse({"status": "error", "message": "Parse error"})

    db = SessionLocal()
    try:
        handler = MCPProtocolHandler(db)
        response = handler.handle_request(body)

        # Put the response in the session's queue to be sent via SSE
        await sse_sessions[session_id].put(response)

        # Also return the response directly for clients that prefer synchronous responses
        return JSONResponse(response)
    finally:
        db.close()


def get_mcp_router() -> APIRouter:
    """Get the MCP router"""
    return router
