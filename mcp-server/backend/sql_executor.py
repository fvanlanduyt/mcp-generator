import re
import time
from typing import Dict, Any, List, Optional
from db_connector import DatabaseConnector


class SQLExecutor:
    """Safely executes SQL templates with parameter substitution"""

    # Pattern to match {{parameter_name}} in SQL templates
    PARAM_PATTERN = re.compile(r'\{\{(\w+)\}\}')

    def __init__(self, connector: DatabaseConnector):
        self.connector = connector

    def extract_parameters(self, sql_template: str) -> List[str]:
        """Extract parameter names from SQL template"""
        return list(set(self.PARAM_PATTERN.findall(sql_template)))

    def prepare_sql(self, sql_template: str) -> str:
        """Convert {{param}} placeholders to :param for SQLAlchemy"""
        return self.PARAM_PATTERN.sub(r':\1', sql_template)

    def validate_parameters(
        self,
        sql_template: str,
        provided_params: Dict[str, Any],
        parameter_definitions: List[Dict]
    ) -> Dict[str, Any]:
        """Validate and prepare parameters for execution"""
        expected_params = self.extract_parameters(sql_template)
        prepared_params = {}

        # Create a lookup of parameter definitions
        param_defs = {p["name"]: p for p in parameter_definitions}

        for param_name in expected_params:
            param_def = param_defs.get(param_name, {})
            is_required = param_def.get("required", True)
            default_value = param_def.get("default")
            param_type = param_def.get("type", "string")

            if param_name in provided_params:
                value = provided_params[param_name]
            elif default_value is not None:
                value = default_value
            elif not is_required:
                value = None
            else:
                raise ValueError(f"Required parameter '{param_name}' not provided")

            # Type conversion
            if value is not None:
                value = self._convert_type(value, param_type)

            prepared_params[param_name] = value

        return prepared_params

    def _convert_type(self, value: Any, param_type: str) -> Any:
        """Convert value to the specified type"""
        if value is None:
            return None

        try:
            if param_type == "integer":
                return int(value)
            elif param_type == "float":
                return float(value)
            elif param_type == "boolean":
                if isinstance(value, bool):
                    return value
                if isinstance(value, str):
                    return value.lower() in ("true", "1", "yes")
                return bool(value)
            elif param_type == "date":
                # Keep as string for SQL, but validate format
                if isinstance(value, str):
                    # Basic validation - could be enhanced
                    return value
                return str(value)
            else:  # string
                return str(value)
        except (ValueError, TypeError) as e:
            raise ValueError(f"Cannot convert value '{value}' to type '{param_type}': {e}")

    def execute(
        self,
        sql_template: str,
        params: Dict[str, Any],
        parameter_definitions: List[Dict],
        timeout: int = 30
    ) -> Dict[str, Any]:
        """Execute SQL template with parameters"""
        start_time = time.time()

        try:
            # Validate and prepare parameters
            prepared_params = self.validate_parameters(
                sql_template, params, parameter_definitions
            )

            # Convert template to SQLAlchemy format
            sql = self.prepare_sql(sql_template)

            # Execute the query
            result = self.connector.execute_query(sql, prepared_params, timeout)

            execution_time = (time.time() - start_time) * 1000

            if result["success"]:
                return {
                    "success": True,
                    "data": result["data"],
                    "row_count": result["row_count"],
                    "execution_time_ms": round(execution_time, 2),
                    "error": None
                }
            else:
                return {
                    "success": False,
                    "data": None,
                    "row_count": None,
                    "execution_time_ms": round(execution_time, 2),
                    "error": result["error"]
                }

        except ValueError as e:
            execution_time = (time.time() - start_time) * 1000
            return {
                "success": False,
                "data": None,
                "row_count": None,
                "execution_time_ms": round(execution_time, 2),
                "error": str(e)
            }
        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            return {
                "success": False,
                "data": None,
                "row_count": None,
                "execution_time_ms": round(execution_time, 2),
                "error": f"Execution error: {str(e)}"
            }


def create_executor(connector: DatabaseConnector) -> SQLExecutor:
    """Factory function to create SQL executor"""
    return SQLExecutor(connector)


def extract_template_parameters(sql_template: str) -> List[str]:
    """Extract parameter names from SQL template"""
    return list(set(SQLExecutor.PARAM_PATTERN.findall(sql_template)))
