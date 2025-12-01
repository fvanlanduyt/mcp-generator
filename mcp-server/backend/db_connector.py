from sqlalchemy import create_engine, text, inspect
from sqlalchemy.engine import Engine
from typing import Optional, Dict, Any, List
from contextlib import contextmanager
import re


class DatabaseConnector:
    """Handles connections to various database types"""

    SUPPORTED_TYPES = ["sqlite", "postgresql", "mysql", "mssql"]

    def __init__(self, db_type: str, connection_string: str):
        self.db_type = db_type
        self.connection_string = connection_string
        self._engine: Optional[Engine] = None

    def _build_connection_url(self) -> str:
        """Build SQLAlchemy connection URL based on database type"""
        if self.db_type == "sqlite":
            # SQLite connection string should be path to file
            if self.connection_string.startswith("sqlite:"):
                return self.connection_string
            return f"sqlite:///{self.connection_string}"

        elif self.db_type == "postgresql":
            # Format: postgresql://user:password@host:port/database
            if self.connection_string.startswith("postgresql"):
                return self.connection_string
            return f"postgresql://{self.connection_string}"

        elif self.db_type == "mysql":
            # Format: mysql+pymysql://user:password@host:port/database
            if self.connection_string.startswith("mysql"):
                return self.connection_string
            return f"mysql+pymysql://{self.connection_string}"

        elif self.db_type == "mssql":
            # Format: mssql+pyodbc://user:password@host:port/database?driver=ODBC+Driver+17+for+SQL+Server
            if self.connection_string.startswith("mssql"):
                return self.connection_string
            return f"mssql+pyodbc://{self.connection_string}"

        else:
            raise ValueError(f"Unsupported database type: {self.db_type}")

    def get_engine(self) -> Engine:
        """Get or create SQLAlchemy engine"""
        if self._engine is None:
            url = self._build_connection_url()
            connect_args = {}

            if self.db_type == "sqlite":
                connect_args["check_same_thread"] = False

            self._engine = create_engine(
                url,
                connect_args=connect_args,
                pool_pre_ping=True,
                pool_recycle=3600
            )
        return self._engine

    def test_connection(self) -> Dict[str, Any]:
        """Test database connection"""
        try:
            engine = self.get_engine()
            with engine.connect() as conn:
                # Simple query to test connection
                if self.db_type == "sqlite":
                    result = conn.execute(text("SELECT sqlite_version()"))
                    version = result.scalar()
                elif self.db_type == "postgresql":
                    result = conn.execute(text("SELECT version()"))
                    version = result.scalar()
                elif self.db_type == "mysql":
                    result = conn.execute(text("SELECT VERSION()"))
                    version = result.scalar()
                elif self.db_type == "mssql":
                    result = conn.execute(text("SELECT @@VERSION"))
                    version = result.scalar()
                else:
                    version = "Unknown"

            return {
                "success": True,
                "message": "Connection successful",
                "details": {
                    "database_type": self.db_type,
                    "version": version
                }
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Connection failed: {str(e)}",
                "details": None
            }

    def close(self):
        """Close the database engine"""
        if self._engine is not None:
            self._engine.dispose()
            self._engine = None

    @contextmanager
    def connect(self):
        """Context manager for database connections"""
        engine = self.get_engine()
        connection = engine.connect()
        try:
            yield connection
        finally:
            connection.close()

    def execute_query(self, sql: str, params: Optional[Dict] = None, timeout: int = 30) -> Dict[str, Any]:
        """Execute a query and return results"""
        try:
            with self.connect() as conn:
                # Set query timeout if supported
                if self.db_type == "postgresql":
                    conn.execute(text(f"SET statement_timeout = {timeout * 1000}"))
                elif self.db_type == "mysql":
                    conn.execute(text(f"SET max_execution_time = {timeout * 1000}"))

                result = conn.execute(text(sql), params or {})

                # Check if it's a SELECT query
                if result.returns_rows:
                    rows = [dict(row._mapping) for row in result.fetchall()]
                    return {
                        "success": True,
                        "data": rows,
                        "row_count": len(rows)
                    }
                else:
                    conn.commit()
                    return {
                        "success": True,
                        "data": None,
                        "row_count": result.rowcount
                    }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "data": None,
                "row_count": None
            }


def create_connector(db_type: str, connection_string: str) -> DatabaseConnector:
    """Factory function to create a database connector"""
    if db_type not in DatabaseConnector.SUPPORTED_TYPES:
        raise ValueError(f"Unsupported database type: {db_type}. Supported types: {DatabaseConnector.SUPPORTED_TYPES}")
    return DatabaseConnector(db_type, connection_string)


def get_connection_string_placeholder(db_type: str) -> str:
    """Get placeholder/example connection string for a database type"""
    placeholders = {
        "sqlite": "/path/to/database.db",
        "postgresql": "user:password@localhost:5432/database",
        "mysql": "user:password@localhost:3306/database",
        "mssql": "user:password@localhost:1433/database?driver=ODBC+Driver+17+for+SQL+Server"
    }
    return placeholders.get(db_type, "")
