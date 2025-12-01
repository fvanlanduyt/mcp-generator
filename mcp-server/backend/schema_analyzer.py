from sqlalchemy import inspect, text
from typing import Dict, Any, List, Optional
from db_connector import DatabaseConnector


class SchemaAnalyzer:
    """Analyzes database schema and extracts metadata"""

    def __init__(self, connector: DatabaseConnector):
        self.connector = connector
        self.db_type = connector.db_type

    def analyze(self) -> Dict[str, Any]:
        """Perform full schema analysis"""
        engine = self.connector.get_engine()
        inspector = inspect(engine)

        tables = []
        relationships = []

        # Get all table names
        table_names = inspector.get_table_names()

        for table_name in table_names:
            table_info = self._analyze_table(inspector, table_name)
            tables.append(table_info)

            # Collect relationships from foreign keys
            for fk in table_info.get("foreign_keys", []):
                relationships.append({
                    "from_table": table_name,
                    "from_column": fk["column"],
                    "to_table": fk["references_table"],
                    "to_column": fk["references_column"],
                    "type": "many-to-one"
                })

        # Try to get row counts
        tables = self._add_row_counts(tables)

        return {
            "tables": tables,
            "relationships": relationships,
            "database_type": self.db_type,
            "table_count": len(tables)
        }

    def _analyze_table(self, inspector, table_name: str) -> Dict[str, Any]:
        """Analyze a single table"""
        columns = []
        for col in inspector.get_columns(table_name):
            columns.append({
                "name": col["name"],
                "type": str(col["type"]),
                "nullable": col.get("nullable", True),
                "primary_key": False,  # Will be updated below
                "default": str(col.get("default")) if col.get("default") else None
            })

        # Get primary key columns
        pk = inspector.get_pk_constraint(table_name)
        pk_columns = pk.get("constrained_columns", []) if pk else []
        for col in columns:
            if col["name"] in pk_columns:
                col["primary_key"] = True

        # Get foreign keys
        foreign_keys = []
        for fk in inspector.get_foreign_keys(table_name):
            for i, col in enumerate(fk.get("constrained_columns", [])):
                ref_cols = fk.get("referred_columns", [])
                foreign_keys.append({
                    "column": col,
                    "references_table": fk.get("referred_table", ""),
                    "references_column": ref_cols[i] if i < len(ref_cols) else ""
                })

        # Get indexes
        indexes = []
        for idx in inspector.get_indexes(table_name):
            indexes.append({
                "name": idx.get("name", ""),
                "columns": idx.get("column_names", []),
                "unique": idx.get("unique", False)
            })

        return {
            "name": table_name,
            "columns": columns,
            "foreign_keys": foreign_keys,
            "indexes": indexes,
            "row_count": None
        }

    def _add_row_counts(self, tables: List[Dict]) -> List[Dict]:
        """Add approximate row counts to tables"""
        try:
            with self.connector.connect() as conn:
                for table in tables:
                    try:
                        # Use LIMIT to prevent long-running counts on large tables
                        if self.db_type == "postgresql":
                            # Use estimate for PostgreSQL
                            result = conn.execute(text(
                                f"SELECT reltuples::bigint FROM pg_class WHERE relname = :table"
                            ), {"table": table["name"]})
                            count = result.scalar()
                            if count == -1 or count is None:
                                # Fall back to actual count
                                result = conn.execute(text(f'SELECT COUNT(*) FROM "{table["name"]}"'))
                                count = result.scalar()
                        else:
                            # For other databases, do actual count with limit check
                            safe_name = table["name"].replace('"', '""')
                            result = conn.execute(text(f'SELECT COUNT(*) FROM "{safe_name}"'))
                            count = result.scalar()

                        table["row_count"] = count
                    except Exception:
                        table["row_count"] = None
        except Exception:
            pass
        return tables

    def get_table_sample(self, table_name: str, limit: int = 5) -> List[Dict]:
        """Get sample rows from a table"""
        try:
            safe_name = table_name.replace('"', '""')
            with self.connector.connect() as conn:
                result = conn.execute(text(f'SELECT * FROM "{safe_name}" LIMIT :limit'), {"limit": limit})
                return [dict(row._mapping) for row in result.fetchall()]
        except Exception as e:
            return []

    def get_schema_summary(self) -> str:
        """Get a text summary of the schema for AI context"""
        schema = self.analyze()
        lines = []
        lines.append(f"Database Type: {schema['database_type']}")
        lines.append(f"Total Tables: {schema['table_count']}")
        lines.append("")

        for table in schema["tables"]:
            row_info = f" (~{table['row_count']} rows)" if table.get('row_count') is not None else ""
            lines.append(f"Table: {table['name']}{row_info}")

            for col in table["columns"]:
                pk = " [PK]" if col["primary_key"] else ""
                nullable = " NULL" if col["nullable"] else " NOT NULL"
                lines.append(f"  - {col['name']}: {col['type']}{pk}{nullable}")

            if table["foreign_keys"]:
                lines.append("  Foreign Keys:")
                for fk in table["foreign_keys"]:
                    lines.append(f"    - {fk['column']} -> {fk['references_table']}.{fk['references_column']}")

            lines.append("")

        if schema["relationships"]:
            lines.append("Relationships:")
            for rel in schema["relationships"]:
                lines.append(f"  - {rel['from_table']}.{rel['from_column']} -> {rel['to_table']}.{rel['to_column']} ({rel['type']})")

        return "\n".join(lines)


def analyze_database(connector: DatabaseConnector) -> Dict[str, Any]:
    """Convenience function to analyze a database"""
    analyzer = SchemaAnalyzer(connector)
    return analyzer.analyze()


def get_schema_summary(connector: DatabaseConnector) -> str:
    """Convenience function to get schema summary"""
    analyzer = SchemaAnalyzer(connector)
    return analyzer.get_schema_summary()
