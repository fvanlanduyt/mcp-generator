from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from datetime import datetime

from database import engine, get_db, Base
from models import MCPServer, ChatMessage, ChatSession
from schemas import (
    MCPServerCreate, MCPServerUpdate, MCPServerResponse,
    ChatMessageCreate, ChatMessageResponse, ChatSessionResponse,
    ChatRequest, ChatResponse, MCPFunction
)
from vector_store import vector_store
from mcp_connector import sync_server_tools, MCPConnector

Base.metadata.create_all(bind=engine)

app = FastAPI(title="MCP Client API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5176"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# MCP Server endpoints
@app.get("/api/servers", response_model=List[MCPServerResponse])
def get_servers(db: Session = Depends(get_db)):
    return db.query(MCPServer).all()


@app.post("/api/servers", response_model=MCPServerResponse)
def create_server(server: MCPServerCreate, db: Session = Depends(get_db)):
    db_server = MCPServer(**server.model_dump())
    db.add(db_server)
    db.commit()
    db.refresh(db_server)

    # Auto-sync after adding
    try:
        sync_result = sync_server_tools(db_server.url)
        if sync_result["success"]:
            # Store tools in vector store
            for tool in sync_result.get("tools", []):
                function_id = f"{db_server.id}_{tool['name']}"
                vector_store.add_function(
                    function_id=function_id,
                    name=tool["name"],
                    description=tool.get("description", ""),
                    parameters=tool.get("inputSchema", {}),
                    server_id=db_server.id,
                    server_name=db_server.name
                )

            # Update server config with sync info
            db_server.config = {
                "last_sync": datetime.utcnow().isoformat(),
                "tool_count": len(sync_result.get("tools", [])),
                "online": True,
                "server_info": sync_result.get("server_info", {})
            }
        else:
            db_server.config = {
                "last_sync": datetime.utcnow().isoformat(),
                "tool_count": 0,
                "online": False,
                "error": sync_result.get("error", "Unknown error")
            }
        db.commit()
        db.refresh(db_server)
    except Exception as e:
        # Don't fail server creation if sync fails
        db_server.config = {
            "last_sync": datetime.utcnow().isoformat(),
            "tool_count": 0,
            "online": False,
            "error": str(e)
        }
        db.commit()
        db.refresh(db_server)

    return db_server


@app.get("/api/servers/{server_id}", response_model=MCPServerResponse)
def get_server(server_id: int, db: Session = Depends(get_db)):
    server = db.query(MCPServer).filter(MCPServer.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    return server


@app.get("/api/servers/{server_id}/status")
def get_server_status(server_id: int, db: Session = Depends(get_db)):
    """Get detailed server status including online status and available tools"""
    server = db.query(MCPServer).filter(MCPServer.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    # Check current connection status
    connector = MCPConnector(server.url)
    try:
        status = connector.check_connection()
    finally:
        connector.close()

    # Get functions for this server from vector store
    all_functions = vector_store.get_all_functions()
    server_functions = [f for f in all_functions if f.get("server_id") == server_id]

    return {
        "id": server.id,
        "name": server.name,
        "url": server.url,
        "is_active": server.is_active,
        "online": status.get("online", False),
        "server_info": status.get("server_info", {}),
        "error": status.get("error"),
        "checked_at": status.get("checked_at"),
        "config": server.config or {},
        "functions": server_functions,
        "function_count": len(server_functions)
    }


@app.put("/api/servers/{server_id}", response_model=MCPServerResponse)
def update_server(server_id: int, server: MCPServerUpdate, db: Session = Depends(get_db)):
    db_server = db.query(MCPServer).filter(MCPServer.id == server_id).first()
    if not db_server:
        raise HTTPException(status_code=404, detail="Server not found")

    update_data = server.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_server, field, value)

    db.commit()
    db.refresh(db_server)
    return db_server


@app.delete("/api/servers/{server_id}")
def delete_server(server_id: int, db: Session = Depends(get_db)):
    db_server = db.query(MCPServer).filter(MCPServer.id == server_id).first()
    if not db_server:
        raise HTTPException(status_code=404, detail="Server not found")

    # Delete associated functions from vector store
    vector_store.delete_server_functions(server_id)

    db.delete(db_server)
    db.commit()
    return {"message": "Server deleted successfully"}


@app.post("/api/servers/{server_id}/sync")
def sync_server_functions_endpoint(server_id: int, db: Session = Depends(get_db)):
    """Sync functions from an MCP server"""
    server = db.query(MCPServer).filter(MCPServer.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    # Delete existing functions for this server
    vector_store.delete_server_functions(server_id)

    # Sync new functions
    sync_result = sync_server_tools(server.url)

    if sync_result["success"]:
        # Store tools in vector store
        for tool in sync_result.get("tools", []):
            function_id = f"{server_id}_{tool['name']}"
            vector_store.add_function(
                function_id=function_id,
                name=tool["name"],
                description=tool.get("description", ""),
                parameters=tool.get("inputSchema", {}),
                server_id=server_id,
                server_name=server.name
            )

        # Update server config
        server.config = {
            "last_sync": datetime.utcnow().isoformat(),
            "tool_count": len(sync_result.get("tools", [])),
            "online": True,
            "server_info": sync_result.get("server_info", {})
        }
        db.commit()

        return {
            "success": True,
            "message": f"Synced {len(sync_result.get('tools', []))} functions from {server.name}",
            "tool_count": len(sync_result.get("tools", [])),
            "tools": sync_result.get("tools", [])
        }
    else:
        # Update server config with error
        server.config = {
            "last_sync": datetime.utcnow().isoformat(),
            "tool_count": 0,
            "online": False,
            "error": sync_result.get("error", "Unknown error")
        }
        db.commit()

        return {
            "success": False,
            "message": f"Failed to sync: {sync_result.get('error', 'Unknown error')}",
            "tool_count": 0,
            "tools": []
        }


# Chat endpoints
@app.get("/api/sessions", response_model=List[ChatSessionResponse])
def get_sessions(db: Session = Depends(get_db)):
    return db.query(ChatSession).order_by(ChatSession.created_at.desc()).all()


@app.post("/api/sessions", response_model=ChatSessionResponse)
def create_session(db: Session = Depends(get_db)):
    session_id = str(uuid.uuid4())
    db_session = ChatSession(session_id=session_id)
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session


@app.get("/api/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
def get_session_messages(session_id: str, db: Session = Depends(get_db)):
    return db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at).all()


@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    # Save user message
    user_message = ChatMessage(
        role="user",
        content=request.message,
        session_id=request.session_id
    )
    db.add(user_message)

    # Search for relevant functions
    relevant_functions = vector_store.search_functions(request.message)

    # Generate response (placeholder - integrate with actual LLM)
    response_content = f"I found {len(relevant_functions)} relevant functions for your query."
    if relevant_functions:
        response_content += "\n\nAvailable functions:\n"
        for func in relevant_functions:
            response_content += f"- **{func['name']}** ({func['server_name']}): {func['description']}\n"

    # Save assistant message
    assistant_message = ChatMessage(
        role="assistant",
        content=response_content,
        session_id=request.session_id
    )
    db.add(assistant_message)
    db.commit()

    return ChatResponse(response=response_content, session_id=request.session_id)


# Function management endpoints
@app.get("/api/functions", response_model=List[MCPFunction])
def get_functions():
    return vector_store.get_all_functions()


@app.post("/api/functions/search", response_model=List[MCPFunction])
def search_functions(query: str, n_results: int = 5):
    return vector_store.search_functions(query, n_results)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=18002)
