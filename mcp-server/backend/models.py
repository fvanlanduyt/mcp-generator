from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class DatabaseConnection(Base):
    __tablename__ = "database_connections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    db_type = Column(String(50), nullable=False)  # sqlite, postgresql, mysql, mssql
    connection_string = Column(Text, nullable=False)  # Encrypted
    is_active = Column(Boolean, default=True)
    last_connected_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Analysis results
    schema_analysis = Column(JSON, nullable=True)
    ai_summary = Column(Text, nullable=True)

    # Relationships
    capabilities = relationship("Capability", back_populates="connection", cascade="all, delete-orphan")
    conversations = relationship("AnalysisConversation", back_populates="connection", cascade="all, delete-orphan")


class Capability(Base):
    __tablename__ = "capabilities"

    id = Column(Integer, primary_key=True, index=True)
    connection_id = Column(Integer, ForeignKey("database_connections.id"), nullable=False)
    name = Column(String(255), nullable=False)  # MCP tool name
    description = Column(Text, nullable=False)
    sql_template = Column(Text, nullable=False)
    parameters = Column(JSON, default=list)  # List of parameter definitions
    is_live = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Testing/validation
    last_test_result = Column(JSON, nullable=True)
    last_tested_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    connection = relationship("DatabaseConnection", back_populates="capabilities")


class AnalysisConversation(Base):
    __tablename__ = "analysis_conversations"

    id = Column(Integer, primary_key=True, index=True)
    connection_id = Column(Integer, ForeignKey("database_connections.id"), nullable=False)
    messages = Column(JSON, default=list)  # Array of {role, content, timestamp}
    final_report = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    connection = relationship("DatabaseConnection", back_populates="conversations")


class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(255), unique=True, nullable=False)
    value = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
