import os
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
from anthropic import Anthropic


SYSTEM_PROMPT = """You are a database analyst assistant helping users understand their database structure and create useful query capabilities for AI integration via the Model Context Protocol (MCP).

Your job is to:
1. Understand what the database is used for based on the schema and user input
2. Identify key entities and relationships
3. Suggest useful queries that would help an AI assistant answer questions
4. Help the user define clear, safe SQL queries

Always be curious and ask clarifying questions about:
- Business terminology (what does each table/column represent in their context?)
- Edge cases (what status values are possible? what are the business rules?)
- Common queries (what questions do users typically ask?)
- Data relationships (how do tables connect to each other?)

When suggesting capabilities:
- Focus on READ operations first (SELECT queries)
- Be cautious about suggesting write operations and always highlight the risks
- Make sure queries are parameterized for safety
- Consider what parameters would be useful for filtering

Format your responses in a conversational but informative way. Use markdown for formatting when helpful."""


REPORT_GENERATION_PROMPT = """Based on our conversation and the database schema, generate a comprehensive analysis report.

The report should follow this structure:

# Database Analysis Report: [Database Name]

## Overview
[2-3 sentence summary of what this database is used for]

## Tables

### [table_name]
- **Purpose**: [what this table stores]
- **Key fields**: [important columns and their meaning]
- **Relationships**: [how it connects to other tables]

[Repeat for each table]

## Suggested Capabilities
Based on the schema and our conversation, here are recommended MCP capabilities:

1. **[capability_name]** (e.g., get_available_slots)
   - Description: [what this capability does]
   - SQL: ```sql
   [the SQL query with {{parameter}} placeholders]
   ```
   - Parameters:
     - `parameter_name` (type): description

[List 3-5 most useful capabilities]

## Business Rules Identified
- [List any business logic, constraints, or rules discovered]

## Additional Notes
[Any other relevant observations or recommendations]

Make sure the suggested capabilities are practical and would be genuinely useful for an AI assistant to help users query this database."""


class AIAnalyzer:
    """Handles AI-powered database analysis using Claude"""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("Anthropic API key not configured")
        self.client = Anthropic(api_key=self.api_key)

    def analyze_schema(self, schema_summary: str, db_name: str) -> str:
        """Generate initial analysis of database schema"""
        user_message = f"""I've just connected to a database called "{db_name}". Here's the schema:

{schema_summary}

Please analyze this schema and:
1. Tell me what you think this database is used for
2. Identify the key entities and relationships
3. Ask me any clarifying questions to better understand the business context

Remember to be conversational and curious!"""

        response = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}]
        )

        return response.content[0].text

    def chat(
        self,
        message: str,
        conversation_history: List[Dict[str, str]],
        schema_summary: str
    ) -> str:
        """Continue conversation about the database"""
        # Build messages list for the API
        messages = []

        # Add schema context as first user message if this is a fresh conversation
        if not conversation_history:
            messages.append({
                "role": "user",
                "content": f"Here's the database schema for reference:\n\n{schema_summary}"
            })
            messages.append({
                "role": "assistant",
                "content": "I have the schema loaded. How can I help you analyze this database?"
            })

        # Add conversation history
        for msg in conversation_history:
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })

        # Add current message
        messages.append({
            "role": "user",
            "content": message
        })

        response = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            system=SYSTEM_PROMPT + f"\n\nDatabase Schema Reference:\n{schema_summary}",
            messages=messages
        )

        return response.content[0].text

    def generate_report(
        self,
        conversation_history: List[Dict[str, str]],
        schema_summary: str,
        db_name: str
    ) -> Dict[str, Any]:
        """Generate analysis report and suggested capabilities"""
        # Build context from conversation
        conversation_text = "\n".join([
            f"{msg['role'].upper()}: {msg['content']}"
            for msg in conversation_history
        ])

        user_message = f"""Database Name: {db_name}

Schema:
{schema_summary}

Conversation History:
{conversation_text}

{REPORT_GENERATION_PROMPT}

Also, after the report, provide a JSON block with the suggested capabilities in this format:
```json
{{
  "capabilities": [
    {{
      "name": "capability_name",
      "description": "What this capability does",
      "sql_template": "SELECT ... WHERE column = {{{{param}}}}",
      "parameters": [
        {{
          "name": "param",
          "type": "string",
          "description": "Parameter description",
          "required": true
        }}
      ]
    }}
  ]
}}
```"""

        response = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4000,
            system="You are a database analyst generating a comprehensive report. Be thorough but practical.",
            messages=[{"role": "user", "content": user_message}]
        )

        response_text = response.content[0].text

        # Extract capabilities JSON from response
        capabilities = []
        try:
            # Find JSON block in response
            import re
            json_match = re.search(r'```json\s*(\{.*?\})\s*```', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
                data = json.loads(json_str)
                capabilities = data.get("capabilities", [])

                # Remove JSON block from report text
                report = response_text[:json_match.start()].strip()
            else:
                report = response_text
        except (json.JSONDecodeError, Exception):
            report = response_text

        return {
            "report": report,
            "suggested_capabilities": capabilities
        }


SQL_GENERATION_PROMPT = """You are a SQL expert. Based on the database schema and the user's description, generate a SQL query.

Rules:
1. Use {{parameter_name}} syntax for parameters that should be provided at runtime
2. Only generate SELECT queries (read-only operations)
3. Make the query safe and efficient
4. Use appropriate JOINs when needed
5. Add reasonable LIMIT clauses for potentially large result sets

Return ONLY the SQL query, nothing else. No explanations, no markdown code blocks, just the raw SQL."""


def generate_sql_from_description(
    api_key: str,
    schema_summary: str,
    description: str,
    capability_name: str
) -> Dict[str, Any]:
    """Generate SQL query based on description and schema"""
    client = Anthropic(api_key=api_key)

    user_message = f"""Database Schema:
{schema_summary}

Capability Name: {capability_name}
Description: {description}

Generate a SQL query that fulfills this description. Use {{{{parameter_name}}}} for any dynamic values."""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        system=SQL_GENERATION_PROMPT,
        messages=[{"role": "user", "content": user_message}]
    )

    sql = response.content[0].text.strip()

    # Clean up if wrapped in code blocks
    if sql.startswith("```"):
        lines = sql.split("\n")
        sql = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])

    # Extract parameters from the generated SQL
    import re
    params = re.findall(r'\{\{(\w+)\}\}', sql)
    unique_params = list(dict.fromkeys(params))  # Preserve order, remove duplicates

    parameters = [
        {
            "name": p,
            "type": "string",
            "description": "",
            "required": True
        }
        for p in unique_params
    ]

    return {
        "sql_template": sql,
        "parameters": parameters
    }


def create_analyzer(api_key: Optional[str] = None) -> AIAnalyzer:
    """Factory function to create AI analyzer"""
    return AIAnalyzer(api_key)


def test_api_key(api_key: str) -> Dict[str, Any]:
    """Test if API key is valid"""
    try:
        client = Anthropic(api_key=api_key)
        # Make a minimal API call
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=10,
            messages=[{"role": "user", "content": "Hi"}]
        )
        return {"valid": True, "message": "API key is valid"}
    except Exception as e:
        return {"valid": False, "message": str(e)}
