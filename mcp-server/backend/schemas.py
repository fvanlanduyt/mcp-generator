from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum


# Enums
class DatabaseType(str, Enum):
    sqlite = "sqlite"
    postgresql = "postgresql"
    mysql = "mysql"
    mssql = "mssql"


class ParameterType(str, Enum):
    string = "string"
    integer = "integer"
    float = "float"
    date = "date"
    boolean = "boolean"


# Database Connection Schemas
class DatabaseConnectionBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    db_type: DatabaseType
    connection_string: str = Field(..., min_length=1)


class DatabaseConnectionCreate(DatabaseConnectionBase):
    pass


class DatabaseConnectionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    db_type: Optional[DatabaseType] = None
    connection_string: Optional[str] = Field(None, min_length=1)
    is_active: Optional[bool] = None


class DatabaseConnectionResponse(DatabaseConnectionBase):
    id: int
    is_active: bool
    last_connected_at: Optional[datetime] = None
    created_at: datetime
    schema_analysis: Optional[dict] = None
    ai_summary: Optional[str] = None

    class Config:
        from_attributes = True


class ConnectionTestResult(BaseModel):
    success: bool
    message: str
    details: Optional[dict] = None


# Parameter Schema
class ParameterDefinition(BaseModel):
    name: str
    type: ParameterType = ParameterType.string
    description: str = ""
    required: bool = True
    default: Optional[Any] = None


# Capability Schemas
class CapabilityBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, pattern=r'^[a-z_][a-z0-9_]*$')
    description: str = Field(..., min_length=1)
    sql_template: str = Field(..., min_length=1)
    parameters: List[ParameterDefinition] = []


class CapabilityCreate(CapabilityBase):
    connection_id: int


class CapabilityUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255, pattern=r'^[a-z_][a-z0-9_]*$')
    description: Optional[str] = Field(None, min_length=1)
    sql_template: Optional[str] = Field(None, min_length=1)
    parameters: Optional[List[ParameterDefinition]] = None
    is_live: Optional[bool] = None


class CapabilityResponse(CapabilityBase):
    id: int
    connection_id: int
    is_live: bool
    created_at: datetime
    updated_at: datetime
    last_test_result: Optional[dict] = None
    last_tested_at: Optional[datetime] = None
    connection_name: Optional[str] = None

    class Config:
        from_attributes = True


class CapabilityTestRequest(BaseModel):
    parameters: dict = {}


class CapabilityTestResult(BaseModel):
    success: bool
    data: Optional[List[dict]] = None
    error: Optional[str] = None
    execution_time_ms: float
    row_count: Optional[int] = None


# Analysis/Chat Schemas
class ChatMessage(BaseModel):
    role: str  # "user", "assistant", "system"
    content: str
    timestamp: Optional[datetime] = None


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    message: ChatMessage
    schema_context: Optional[dict] = None


class ConversationResponse(BaseModel):
    id: int
    connection_id: int
    messages: List[dict]
    final_report: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GenerateReportRequest(BaseModel):
    include_suggestions: bool = True


class GenerateReportResponse(BaseModel):
    report: str
    suggested_capabilities: List[dict] = []


# Schema Analysis
class ColumnInfo(BaseModel):
    name: str
    type: str
    nullable: bool = True
    primary_key: bool = False
    default: Optional[str] = None


class ForeignKeyInfo(BaseModel):
    column: str
    references_table: str
    references_column: str


class TableInfo(BaseModel):
    name: str
    columns: List[ColumnInfo]
    foreign_keys: List[ForeignKeyInfo] = []
    indexes: List[str] = []
    row_count: Optional[int] = None


class SchemaAnalysis(BaseModel):
    tables: List[TableInfo]
    relationships: List[dict] = []


# MCP Protocol Schemas
class MCPToolParameter(BaseModel):
    type: str
    description: str


class MCPToolInputSchema(BaseModel):
    type: str = "object"
    properties: dict
    required: List[str] = []


class MCPTool(BaseModel):
    name: str
    description: str
    inputSchema: MCPToolInputSchema


class MCPToolsListResponse(BaseModel):
    tools: List[MCPTool]


class MCPToolCallRequest(BaseModel):
    name: str
    arguments: dict = {}


class MCPRequest(BaseModel):
    jsonrpc: str = "2.0"
    id: Optional[Any] = None
    method: str
    params: Optional[dict] = None


class MCPResponse(BaseModel):
    jsonrpc: str = "2.0"
    id: Optional[Any] = None
    result: Optional[Any] = None
    error: Optional[dict] = None


# Settings Schemas
class SettingsUpdate(BaseModel):
    anthropic_api_key: Optional[str] = None
    mcp_server_port: Optional[int] = None
    mcp_server_base_url: Optional[str] = None
    default_query_timeout: Optional[int] = None


class SettingsResponse(BaseModel):
    anthropic_api_key_set: bool = False
    mcp_server_port: int = 8000
    mcp_server_base_url: str = "http://localhost:8000"
    default_query_timeout: int = 30


# Dashboard Stats
class DashboardStats(BaseModel):
    total_connections: int
    live_capabilities: int
    total_capabilities: int
    mcp_server_status: str  # "running" or "offline"
    mcp_endpoint: str


# AI SQL Generation
class GenerateSQLRequest(BaseModel):
    connection_id: int
    name: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)


class GenerateSQLResponse(BaseModel):
    sql_template: str
    parameters: List[dict]
