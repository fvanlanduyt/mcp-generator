from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class MCPServerBase(BaseModel):
    name: str
    url: str
    description: Optional[str] = None
    config: Optional[Dict[str, Any]] = None


class MCPServerCreate(MCPServerBase):
    pass


class MCPServerUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    config: Optional[Dict[str, Any]] = None


class MCPServerResponse(MCPServerBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChatMessageBase(BaseModel):
    role: str
    content: str


class ChatMessageCreate(ChatMessageBase):
    session_id: str


class ChatMessageResponse(ChatMessageBase):
    id: int
    session_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSessionResponse(BaseModel):
    id: int
    session_id: str
    title: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    message: str
    session_id: str


class ChatResponse(BaseModel):
    response: str
    session_id: str


class MCPFunction(BaseModel):
    name: str
    description: str
    parameters: Dict[str, Any]
    server_id: int
    server_name: str
