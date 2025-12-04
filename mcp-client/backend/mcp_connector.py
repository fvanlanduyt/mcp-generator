import httpx
import json
from typing import Dict, Any, List, Optional
from datetime import datetime


class MCPConnector:
    """Connects to MCP servers and fetches available tools"""

    def __init__(self, server_url: str):
        self.server_url = server_url.rstrip('/')
        self.client = httpx.Client(timeout=30.0)
        self.session_id: Optional[str] = None

    def _get_mcp_endpoint(self) -> str:
        """Get the MCP endpoint URL"""
        # Try /mcp first (standard endpoint)
        return f"{self.server_url}/mcp"

    def _make_jsonrpc_request(self, method: str, params: Optional[Dict] = None, request_id: int = 1) -> Dict:
        """Make a JSON-RPC request to the MCP server"""
        request = {
            "jsonrpc": "2.0",
            "id": request_id,
            "method": method
        }
        if params:
            request["params"] = params
        return request

    def check_connection(self) -> Dict[str, Any]:
        """Check if the MCP server is reachable and get server info"""
        try:
            # First try GET to /mcp to get server info
            response = self.client.get(
                self._get_mcp_endpoint(),
                headers={"Accept": "application/json"}
            )

            if response.status_code == 200:
                data = response.json()
                return {
                    "online": True,
                    "server_info": data,
                    "checked_at": datetime.utcnow().isoformat()
                }

            return {
                "online": False,
                "error": f"Server returned status {response.status_code}",
                "checked_at": datetime.utcnow().isoformat()
            }
        except httpx.ConnectError:
            return {
                "online": False,
                "error": "Connection refused - server may be offline",
                "checked_at": datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {
                "online": False,
                "error": str(e),
                "checked_at": datetime.utcnow().isoformat()
            }

    def initialize(self) -> Dict[str, Any]:
        """Initialize connection with the MCP server"""
        try:
            request = self._make_jsonrpc_request("initialize", {
                "protocolVersion": "2025-03-26",
                "capabilities": {},
                "clientInfo": {
                    "name": "mcp-client",
                    "version": "1.0.0"
                }
            })

            response = self.client.post(
                self._get_mcp_endpoint(),
                json=request,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            )

            if response.status_code == 200:
                # Check for session ID in response headers
                self.session_id = response.headers.get("mcp-session-id")
                return response.json()

            return {
                "error": f"Initialize failed with status {response.status_code}"
            }
        except Exception as e:
            return {"error": str(e)}

    def list_tools(self) -> List[Dict[str, Any]]:
        """Fetch the list of available tools from the MCP server"""
        try:
            # First initialize if we don't have a session
            if not self.session_id:
                init_result = self.initialize()
                if "error" in init_result:
                    return []

            request = self._make_jsonrpc_request("tools/list", request_id=2)

            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            if self.session_id:
                headers["mcp-session-id"] = self.session_id

            response = self.client.post(
                self._get_mcp_endpoint(),
                json=request,
                headers=headers
            )

            if response.status_code == 200:
                data = response.json()
                if "result" in data and "tools" in data["result"]:
                    return data["result"]["tools"]

            return []
        except Exception as e:
            print(f"Error listing tools: {e}")
            return []

    def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Call a tool on the MCP server"""
        try:
            request = self._make_jsonrpc_request("tools/call", {
                "name": tool_name,
                "arguments": arguments
            }, request_id=3)

            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            if self.session_id:
                headers["mcp-session-id"] = self.session_id

            response = self.client.post(
                self._get_mcp_endpoint(),
                json=request,
                headers=headers
            )

            if response.status_code == 200:
                return response.json()

            return {
                "error": f"Tool call failed with status {response.status_code}"
            }
        except Exception as e:
            return {"error": str(e)}

    def close(self):
        """Close the connection"""
        self.client.close()


def sync_server_tools(server_url: str) -> Dict[str, Any]:
    """
    Sync tools from an MCP server.
    Returns the connection status and list of tools.
    """
    connector = MCPConnector(server_url)

    try:
        # Check connection
        status = connector.check_connection()

        if not status["online"]:
            return {
                "success": False,
                "online": False,
                "error": status.get("error", "Server offline"),
                "tools": [],
                "checked_at": status["checked_at"]
            }

        # Get tools
        tools = connector.list_tools()

        return {
            "success": True,
            "online": True,
            "server_info": status.get("server_info", {}),
            "tools": tools,
            "tool_count": len(tools),
            "checked_at": status["checked_at"]
        }
    finally:
        connector.close()
