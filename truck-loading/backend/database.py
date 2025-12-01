"""Database configuration and session management."""
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Database URL - defaults to SQLite for local development
# Can be switched to Azure SQL/MSSQL via environment variable
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./lng_loading.db"
)

# Handle SQLite-specific connection args
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables."""
    from models import Customer, Station, LoadingSlot, Reservation
    Base.metadata.create_all(bind=engine)
