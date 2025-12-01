from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime

from models import DatabaseConnection, Capability, AnalysisConversation, Settings
from schemas import (
    DatabaseConnectionCreate,
    DatabaseConnectionUpdate,
    CapabilityCreate,
    CapabilityUpdate,
)


# Database Connection CRUD
def get_connections(db: Session, skip: int = 0, limit: int = 100) -> List[DatabaseConnection]:
    return db.query(DatabaseConnection).order_by(desc(DatabaseConnection.created_at)).offset(skip).limit(limit).all()


def get_connection(db: Session, connection_id: int) -> Optional[DatabaseConnection]:
    return db.query(DatabaseConnection).filter(DatabaseConnection.id == connection_id).first()


def create_connection(db: Session, connection: DatabaseConnectionCreate) -> DatabaseConnection:
    db_connection = DatabaseConnection(
        name=connection.name,
        db_type=connection.db_type.value,
        connection_string=connection.connection_string,
    )
    db.add(db_connection)
    db.commit()
    db.refresh(db_connection)
    return db_connection


def update_connection(db: Session, connection_id: int, connection: DatabaseConnectionUpdate) -> Optional[DatabaseConnection]:
    db_connection = get_connection(db, connection_id)
    if not db_connection:
        return None

    update_data = connection.model_dump(exclude_unset=True)
    if "db_type" in update_data and update_data["db_type"]:
        update_data["db_type"] = update_data["db_type"].value

    for key, value in update_data.items():
        setattr(db_connection, key, value)

    db.commit()
    db.refresh(db_connection)
    return db_connection


def delete_connection(db: Session, connection_id: int) -> bool:
    db_connection = get_connection(db, connection_id)
    if not db_connection:
        return False
    db.delete(db_connection)
    db.commit()
    return True


def update_connection_schema(
    db: Session,
    connection_id: int,
    schema_analysis: dict,
    ai_summary: Optional[str] = None
) -> Optional[DatabaseConnection]:
    db_connection = get_connection(db, connection_id)
    if not db_connection:
        return None

    db_connection.schema_analysis = schema_analysis
    db_connection.ai_summary = ai_summary
    db_connection.last_connected_at = datetime.utcnow()

    db.commit()
    db.refresh(db_connection)
    return db_connection


# Capability CRUD
def get_capabilities(
    db: Session,
    connection_id: Optional[int] = None,
    is_live: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Capability]:
    query = db.query(Capability)

    if connection_id is not None:
        query = query.filter(Capability.connection_id == connection_id)
    if is_live is not None:
        query = query.filter(Capability.is_live == is_live)

    return query.order_by(desc(Capability.created_at)).offset(skip).limit(limit).all()


def get_capability(db: Session, capability_id: int) -> Optional[Capability]:
    return db.query(Capability).filter(Capability.id == capability_id).first()


def get_capability_by_name(db: Session, name: str) -> Optional[Capability]:
    return db.query(Capability).filter(Capability.name == name).first()


def create_capability(db: Session, capability: CapabilityCreate) -> Capability:
    db_capability = Capability(
        connection_id=capability.connection_id,
        name=capability.name,
        description=capability.description,
        sql_template=capability.sql_template,
        parameters=[p.model_dump() for p in capability.parameters],
    )
    db.add(db_capability)
    db.commit()
    db.refresh(db_capability)
    return db_capability


def update_capability(db: Session, capability_id: int, capability: CapabilityUpdate) -> Optional[Capability]:
    db_capability = get_capability(db, capability_id)
    if not db_capability:
        return None

    update_data = capability.model_dump(exclude_unset=True)
    if "parameters" in update_data and update_data["parameters"]:
        update_data["parameters"] = [p.model_dump() if hasattr(p, 'model_dump') else p for p in update_data["parameters"]]

    for key, value in update_data.items():
        setattr(db_capability, key, value)

    db.commit()
    db.refresh(db_capability)
    return db_capability


def delete_capability(db: Session, capability_id: int) -> bool:
    db_capability = get_capability(db, capability_id)
    if not db_capability:
        return False
    db.delete(db_capability)
    db.commit()
    return True


def toggle_capability_live(db: Session, capability_id: int) -> Optional[Capability]:
    db_capability = get_capability(db, capability_id)
    if not db_capability:
        return None

    db_capability.is_live = not db_capability.is_live
    db.commit()
    db.refresh(db_capability)
    return db_capability


def update_capability_test_result(
    db: Session,
    capability_id: int,
    test_result: dict
) -> Optional[Capability]:
    db_capability = get_capability(db, capability_id)
    if not db_capability:
        return None

    db_capability.last_test_result = test_result
    db_capability.last_tested_at = datetime.utcnow()

    db.commit()
    db.refresh(db_capability)
    return db_capability


# Conversation CRUD
def get_conversation(db: Session, connection_id: int) -> Optional[AnalysisConversation]:
    return db.query(AnalysisConversation).filter(
        AnalysisConversation.connection_id == connection_id
    ).order_by(desc(AnalysisConversation.updated_at)).first()


def create_conversation(db: Session, connection_id: int) -> AnalysisConversation:
    conversation = AnalysisConversation(
        connection_id=connection_id,
        messages=[]
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


def add_message_to_conversation(
    db: Session,
    conversation_id: int,
    role: str,
    content: str
) -> Optional[AnalysisConversation]:
    conversation = db.query(AnalysisConversation).filter(
        AnalysisConversation.id == conversation_id
    ).first()

    if not conversation:
        return None

    messages = conversation.messages or []
    messages.append({
        "role": role,
        "content": content,
        "timestamp": datetime.utcnow().isoformat()
    })
    conversation.messages = messages

    db.commit()
    db.refresh(conversation)
    return conversation


def update_conversation_report(
    db: Session,
    conversation_id: int,
    report: str
) -> Optional[AnalysisConversation]:
    conversation = db.query(AnalysisConversation).filter(
        AnalysisConversation.id == conversation_id
    ).first()

    if not conversation:
        return None

    conversation.final_report = report
    db.commit()
    db.refresh(conversation)
    return conversation


def clear_conversation(db: Session, connection_id: int) -> bool:
    conversation = get_conversation(db, connection_id)
    if conversation:
        db.delete(conversation)
        db.commit()
    return True


# Settings CRUD
def get_setting(db: Session, key: str) -> Optional[str]:
    setting = db.query(Settings).filter(Settings.key == key).first()
    return setting.value if setting else None


def set_setting(db: Session, key: str, value: str) -> Settings:
    setting = db.query(Settings).filter(Settings.key == key).first()
    if setting:
        setting.value = value
    else:
        setting = Settings(key=key, value=value)
        db.add(setting)
    db.commit()
    db.refresh(setting)
    return setting


def get_all_settings(db: Session) -> dict:
    settings = db.query(Settings).all()
    return {s.key: s.value for s in settings}


def delete_setting(db: Session, key: str) -> bool:
    setting = db.query(Settings).filter(Settings.key == key).first()
    if setting:
        db.delete(setting)
        db.commit()
        return True
    return False


# Dashboard stats
def get_dashboard_stats(db: Session) -> dict:
    total_connections = db.query(DatabaseConnection).count()
    total_capabilities = db.query(Capability).count()
    live_capabilities = db.query(Capability).filter(Capability.is_live == True).count()

    return {
        "total_connections": total_connections,
        "total_capabilities": total_capabilities,
        "live_capabilities": live_capabilities
    }
