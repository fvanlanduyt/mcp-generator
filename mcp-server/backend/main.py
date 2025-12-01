import os
from pathlib import Path
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from database import get_db, init_db
from models import DatabaseConnection, Capability, AnalysisConversation
from schemas import (
    DatabaseConnectionCreate,
    DatabaseConnectionUpdate,
    DatabaseConnectionResponse,
    ConnectionTestResult,
    CapabilityCreate,
    CapabilityUpdate,
    CapabilityResponse,
    CapabilityTestRequest,
    CapabilityTestResult,
    ChatRequest,
    ChatResponse,
    ChatMessage,
    ConversationResponse,
    GenerateReportRequest,
    GenerateReportResponse,
    GenerateSQLRequest,
    GenerateSQLResponse,
    SettingsUpdate,
    SettingsResponse,
    DashboardStats,
    SchemaAnalysis,
)
import crud
from db_connector import create_connector, get_connection_string_placeholder
from schema_analyzer import SchemaAnalyzer, get_schema_summary
from sql_executor import SQLExecutor, extract_template_parameters
from ai_analyzer import AIAnalyzer, test_api_key, generate_sql_from_description
from mcp_server import get_mcp_router

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="MCP Server Generator",
    description="AI-powered database integration hub for generating MCP capabilities",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include MCP router
app.include_router(get_mcp_router())


@app.on_event("startup")
async def startup():
    init_db()


# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


# ============== Dashboard ==============
@app.get("/api/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(db: Session = Depends(get_db)):
    stats = crud.get_dashboard_stats(db)
    base_url = crud.get_setting(db, "mcp_server_base_url") or "http://localhost:8000"

    return DashboardStats(
        total_connections=stats["total_connections"],
        live_capabilities=stats["live_capabilities"],
        total_capabilities=stats["total_capabilities"],
        mcp_server_status="running",
        mcp_endpoint=f"{base_url}/mcp"
    )


# ============== Connections ==============
@app.get("/api/connections", response_model=List[DatabaseConnectionResponse])
async def list_connections(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db)
):
    connections = crud.get_connections(db, skip=skip, limit=limit)
    return connections


@app.post("/api/connections", response_model=DatabaseConnectionResponse)
async def create_connection(
    connection: DatabaseConnectionCreate,
    db: Session = Depends(get_db)
):
    return crud.create_connection(db, connection)


@app.get("/api/connections/{connection_id}", response_model=DatabaseConnectionResponse)
async def get_connection(connection_id: int, db: Session = Depends(get_db)):
    connection = crud.get_connection(db, connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    return connection


@app.put("/api/connections/{connection_id}", response_model=DatabaseConnectionResponse)
async def update_connection(
    connection_id: int,
    connection: DatabaseConnectionUpdate,
    db: Session = Depends(get_db)
):
    updated = crud.update_connection(db, connection_id, connection)
    if not updated:
        raise HTTPException(status_code=404, detail="Connection not found")
    return updated


@app.delete("/api/connections/{connection_id}")
async def delete_connection(connection_id: int, db: Session = Depends(get_db)):
    if not crud.delete_connection(db, connection_id):
        raise HTTPException(status_code=404, detail="Connection not found")
    return {"message": "Connection deleted"}


@app.post("/api/connections/{connection_id}/test", response_model=ConnectionTestResult)
async def test_connection(connection_id: int, db: Session = Depends(get_db)):
    connection = crud.get_connection(db, connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    connector = create_connector(connection.db_type, connection.connection_string)
    result = connector.test_connection()
    connector.close()

    return ConnectionTestResult(**result)


@app.post("/api/connections/{connection_id}/analyze", response_model=SchemaAnalysis)
async def analyze_connection(connection_id: int, db: Session = Depends(get_db)):
    connection = crud.get_connection(db, connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    try:
        connector = create_connector(connection.db_type, connection.connection_string)
        analyzer = SchemaAnalyzer(connector)
        schema = analyzer.analyze()

        # Save schema analysis
        crud.update_connection_schema(db, connection_id, schema)

        connector.close()
        return SchemaAnalysis(**schema)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.get("/api/connections/placeholders/{db_type}")
async def get_placeholder(db_type: str):
    placeholder = get_connection_string_placeholder(db_type)
    return {"placeholder": placeholder}


# ============== Analysis/Chat ==============
@app.get("/api/analyze/{connection_id}/conversation", response_model=Optional[ConversationResponse])
async def get_conversation(connection_id: int, db: Session = Depends(get_db)):
    conversation = crud.get_conversation(db, connection_id)
    if not conversation:
        return None
    return conversation


@app.post("/api/analyze/{connection_id}/chat", response_model=ChatResponse)
async def chat(
    connection_id: int,
    request: ChatRequest,
    db: Session = Depends(get_db)
):
    connection = crud.get_connection(db, connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    # Get or create conversation
    conversation = crud.get_conversation(db, connection_id)
    if not conversation:
        conversation = crud.create_conversation(db, connection_id)

    # Get API key
    api_key = crud.get_setting(db, "anthropic_api_key") or os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=400, detail="Anthropic API key not configured")

    try:
        # Get schema summary
        if connection.schema_analysis:
            connector = create_connector(connection.db_type, connection.connection_string)
            schema_summary = get_schema_summary(connector)
            connector.close()
        else:
            # Analyze first if not done
            connector = create_connector(connection.db_type, connection.connection_string)
            analyzer = SchemaAnalyzer(connector)
            schema = analyzer.analyze()
            schema_summary = analyzer.get_schema_summary()
            crud.update_connection_schema(db, connection_id, schema)
            connector.close()

        # Create AI analyzer
        ai = AIAnalyzer(api_key)

        # If this is the first message, get initial analysis
        if not conversation.messages:
            response_text = ai.analyze_schema(schema_summary, connection.name)
        else:
            response_text = ai.chat(
                request.message,
                conversation.messages,
                schema_summary
            )

        # Add messages to conversation
        crud.add_message_to_conversation(db, conversation.id, "user", request.message)
        crud.add_message_to_conversation(db, conversation.id, "assistant", response_text)

        return ChatResponse(
            message=ChatMessage(
                role="assistant",
                content=response_text,
                timestamp=datetime.utcnow()
            )
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@app.post("/api/analyze/{connection_id}/init")
async def init_analysis(connection_id: int, db: Session = Depends(get_db)):
    """Initialize analysis - get schema and initial AI analysis"""
    connection = crud.get_connection(db, connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    # Get API key
    api_key = crud.get_setting(db, "anthropic_api_key") or os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=400, detail="Anthropic API key not configured")

    try:
        # Analyze schema
        connector = create_connector(connection.db_type, connection.connection_string)
        analyzer = SchemaAnalyzer(connector)
        schema = analyzer.analyze()
        schema_summary = analyzer.get_schema_summary()
        crud.update_connection_schema(db, connection_id, schema)

        # Clear old conversation and create new
        crud.clear_conversation(db, connection_id)
        conversation = crud.create_conversation(db, connection_id)

        # Get initial AI analysis
        ai = AIAnalyzer(api_key)
        response_text = ai.analyze_schema(schema_summary, connection.name)

        # Save AI message
        crud.add_message_to_conversation(db, conversation.id, "assistant", response_text)

        connector.close()

        return {
            "schema": schema,
            "initial_message": response_text,
            "conversation_id": conversation.id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Init error: {str(e)}")


@app.post("/api/analyze/{connection_id}/generate-report", response_model=GenerateReportResponse)
async def generate_report(
    connection_id: int,
    request: GenerateReportRequest,
    db: Session = Depends(get_db)
):
    connection = crud.get_connection(db, connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    conversation = crud.get_conversation(db, connection_id)
    if not conversation or not conversation.messages:
        raise HTTPException(status_code=400, detail="No conversation to generate report from")

    api_key = crud.get_setting(db, "anthropic_api_key") or os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=400, detail="Anthropic API key not configured")

    try:
        connector = create_connector(connection.db_type, connection.connection_string)
        schema_summary = get_schema_summary(connector)
        connector.close()

        ai = AIAnalyzer(api_key)
        result = ai.generate_report(
            conversation.messages,
            schema_summary,
            connection.name
        )

        # Save report
        crud.update_conversation_report(db, conversation.id, result["report"])

        return GenerateReportResponse(
            report=result["report"],
            suggested_capabilities=result["suggested_capabilities"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation error: {str(e)}")


@app.delete("/api/analyze/{connection_id}/conversation")
async def clear_conversation(connection_id: int, db: Session = Depends(get_db)):
    crud.clear_conversation(db, connection_id)
    return {"message": "Conversation cleared"}


# ============== Capabilities ==============
@app.get("/api/capabilities", response_model=List[CapabilityResponse])
async def list_capabilities(
    connection_id: Optional[int] = None,
    is_live: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db)
):
    capabilities = crud.get_capabilities(
        db,
        connection_id=connection_id,
        is_live=is_live,
        skip=skip,
        limit=limit
    )

    # Add connection names
    result = []
    for cap in capabilities:
        cap_dict = {
            "id": cap.id,
            "connection_id": cap.connection_id,
            "name": cap.name,
            "description": cap.description,
            "sql_template": cap.sql_template,
            "parameters": cap.parameters or [],
            "is_live": cap.is_live,
            "created_at": cap.created_at,
            "updated_at": cap.updated_at,
            "last_test_result": cap.last_test_result,
            "last_tested_at": cap.last_tested_at,
            "connection_name": cap.connection.name if cap.connection else None
        }
        result.append(CapabilityResponse(**cap_dict))

    return result


@app.post("/api/capabilities", response_model=CapabilityResponse)
async def create_capability(
    capability: CapabilityCreate,
    db: Session = Depends(get_db)
):
    # Verify connection exists
    connection = crud.get_connection(db, capability.connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    # Check for duplicate name
    existing = crud.get_capability_by_name(db, capability.name)
    if existing:
        raise HTTPException(status_code=400, detail="Capability with this name already exists")

    created = crud.create_capability(db, capability)
    return CapabilityResponse(
        **{
            "id": created.id,
            "connection_id": created.connection_id,
            "name": created.name,
            "description": created.description,
            "sql_template": created.sql_template,
            "parameters": created.parameters or [],
            "is_live": created.is_live,
            "created_at": created.created_at,
            "updated_at": created.updated_at,
            "last_test_result": created.last_test_result,
            "last_tested_at": created.last_tested_at,
            "connection_name": connection.name
        }
    )


@app.get("/api/capabilities/{capability_id}", response_model=CapabilityResponse)
async def get_capability(capability_id: int, db: Session = Depends(get_db)):
    capability = crud.get_capability(db, capability_id)
    if not capability:
        raise HTTPException(status_code=404, detail="Capability not found")

    return CapabilityResponse(
        **{
            "id": capability.id,
            "connection_id": capability.connection_id,
            "name": capability.name,
            "description": capability.description,
            "sql_template": capability.sql_template,
            "parameters": capability.parameters or [],
            "is_live": capability.is_live,
            "created_at": capability.created_at,
            "updated_at": capability.updated_at,
            "last_test_result": capability.last_test_result,
            "last_tested_at": capability.last_tested_at,
            "connection_name": capability.connection.name if capability.connection else None
        }
    )


@app.put("/api/capabilities/{capability_id}", response_model=CapabilityResponse)
async def update_capability(
    capability_id: int,
    capability: CapabilityUpdate,
    db: Session = Depends(get_db)
):
    # Check for duplicate name if name is being changed
    if capability.name:
        existing = crud.get_capability_by_name(db, capability.name)
        if existing and existing.id != capability_id:
            raise HTTPException(status_code=400, detail="Capability with this name already exists")

    updated = crud.update_capability(db, capability_id, capability)
    if not updated:
        raise HTTPException(status_code=404, detail="Capability not found")

    return CapabilityResponse(
        **{
            "id": updated.id,
            "connection_id": updated.connection_id,
            "name": updated.name,
            "description": updated.description,
            "sql_template": updated.sql_template,
            "parameters": updated.parameters or [],
            "is_live": updated.is_live,
            "created_at": updated.created_at,
            "updated_at": updated.updated_at,
            "last_test_result": updated.last_test_result,
            "last_tested_at": updated.last_tested_at,
            "connection_name": updated.connection.name if updated.connection else None
        }
    )


@app.delete("/api/capabilities/{capability_id}")
async def delete_capability(capability_id: int, db: Session = Depends(get_db)):
    if not crud.delete_capability(db, capability_id):
        raise HTTPException(status_code=404, detail="Capability not found")
    return {"message": "Capability deleted"}


@app.post("/api/capabilities/{capability_id}/test", response_model=CapabilityTestResult)
async def test_capability(
    capability_id: int,
    request: CapabilityTestRequest,
    db: Session = Depends(get_db)
):
    capability = crud.get_capability(db, capability_id)
    if not capability:
        raise HTTPException(status_code=404, detail="Capability not found")

    connection = capability.connection
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    try:
        connector = create_connector(connection.db_type, connection.connection_string)
        executor = SQLExecutor(connector)

        result = executor.execute(
            capability.sql_template,
            request.parameters,
            capability.parameters or []
        )

        connector.close()

        # Save test result
        crud.update_capability_test_result(db, capability_id, result)

        return CapabilityTestResult(
            success=result["success"],
            data=result.get("data"),
            error=result.get("error"),
            execution_time_ms=result["execution_time_ms"],
            row_count=result.get("row_count")
        )
    except Exception as e:
        return CapabilityTestResult(
            success=False,
            error=str(e),
            execution_time_ms=0
        )


@app.post("/api/capabilities/{capability_id}/toggle-live", response_model=CapabilityResponse)
async def toggle_capability_live(capability_id: int, db: Session = Depends(get_db)):
    capability = crud.toggle_capability_live(db, capability_id)
    if not capability:
        raise HTTPException(status_code=404, detail="Capability not found")

    return CapabilityResponse(
        **{
            "id": capability.id,
            "connection_id": capability.connection_id,
            "name": capability.name,
            "description": capability.description,
            "sql_template": capability.sql_template,
            "parameters": capability.parameters or [],
            "is_live": capability.is_live,
            "created_at": capability.created_at,
            "updated_at": capability.updated_at,
            "last_test_result": capability.last_test_result,
            "last_tested_at": capability.last_tested_at,
            "connection_name": capability.connection.name if capability.connection else None
        }
    )


@app.get("/api/capabilities/extract-parameters")
async def extract_parameters(sql_template: str = Query(...)):
    """Extract parameter names from SQL template"""
    params = extract_template_parameters(sql_template)
    return {"parameters": params}


@app.post("/api/capabilities/generate-sql", response_model=GenerateSQLResponse)
async def generate_sql(request: GenerateSQLRequest, db: Session = Depends(get_db)):
    """Generate SQL query from description using AI"""
    connection = crud.get_connection(db, request.connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    api_key = crud.get_setting(db, "anthropic_api_key") or os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=400, detail="Anthropic API key not configured")

    try:
        # Get schema summary for context
        connector = create_connector(connection.db_type, connection.connection_string)
        schema_summary = get_schema_summary(connector)
        connector.close()

        # Generate SQL
        result = generate_sql_from_description(
            api_key=api_key,
            schema_summary=schema_summary,
            description=request.description,
            capability_name=request.name
        )

        return GenerateSQLResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SQL generation failed: {str(e)}")


# ============== Bulk Create Capabilities ==============
@app.post("/api/capabilities/bulk", response_model=List[CapabilityResponse])
async def bulk_create_capabilities(
    capabilities: List[CapabilityCreate],
    db: Session = Depends(get_db)
):
    """Create multiple capabilities at once (from AI suggestions)"""
    created = []
    for cap in capabilities:
        # Verify connection exists
        connection = crud.get_connection(db, cap.connection_id)
        if not connection:
            continue

        # Skip if name exists
        existing = crud.get_capability_by_name(db, cap.name)
        if existing:
            continue

        new_cap = crud.create_capability(db, cap)
        created.append(CapabilityResponse(
            **{
                "id": new_cap.id,
                "connection_id": new_cap.connection_id,
                "name": new_cap.name,
                "description": new_cap.description,
                "sql_template": new_cap.sql_template,
                "parameters": new_cap.parameters or [],
                "is_live": new_cap.is_live,
                "created_at": new_cap.created_at,
                "updated_at": new_cap.updated_at,
                "last_test_result": new_cap.last_test_result,
                "last_tested_at": new_cap.last_tested_at,
                "connection_name": connection.name
            }
        ))
    return created


# ============== Settings ==============
@app.get("/api/settings", response_model=SettingsResponse)
async def get_settings(db: Session = Depends(get_db)):
    settings = crud.get_all_settings(db)

    api_key = settings.get("anthropic_api_key") or os.getenv("ANTHROPIC_API_KEY")

    return SettingsResponse(
        anthropic_api_key_set=bool(api_key),
        mcp_server_port=int(settings.get("mcp_server_port", 8000)),
        mcp_server_base_url=settings.get("mcp_server_base_url", "http://localhost:8000"),
        default_query_timeout=int(settings.get("default_query_timeout", 30))
    )


@app.put("/api/settings", response_model=SettingsResponse)
async def update_settings(settings: SettingsUpdate, db: Session = Depends(get_db)):
    if settings.anthropic_api_key is not None:
        crud.set_setting(db, "anthropic_api_key", settings.anthropic_api_key)
    if settings.mcp_server_port is not None:
        crud.set_setting(db, "mcp_server_port", str(settings.mcp_server_port))
    if settings.mcp_server_base_url is not None:
        crud.set_setting(db, "mcp_server_base_url", settings.mcp_server_base_url)
    if settings.default_query_timeout is not None:
        crud.set_setting(db, "default_query_timeout", str(settings.default_query_timeout))

    return await get_settings(db)


@app.post("/api/settings/test-api-key")
async def test_api_key_endpoint(db: Session = Depends(get_db)):
    api_key = crud.get_setting(db, "anthropic_api_key") or os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return {"valid": False, "message": "API key not configured"}

    result = test_api_key(api_key)
    return result


# Serve static files in production
STATIC_DIR = Path(__file__).parent / "static"
if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        """Serve the SPA for all non-API routes"""
        # Skip API routes
        if full_path.startswith("api/") or full_path.startswith("mcp") or full_path == "health":
            raise HTTPException(status_code=404)

        # Try to serve static file first
        static_file = STATIC_DIR / full_path
        if static_file.exists() and static_file.is_file():
            return FileResponse(static_file)

        # Fall back to index.html for SPA routing
        return FileResponse(STATIC_DIR / "index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
