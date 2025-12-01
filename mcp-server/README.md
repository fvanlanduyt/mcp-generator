# MCP Server Generator

A web application that allows you to connect to any database, analyze its structure through AI-assisted conversation, and generate MCP (Model Context Protocol) capabilities that can be used by Claude or other MCP-compatible clients.

## Features

- **Multi-database support**: Connect to SQLite, PostgreSQL, MySQL, and MS SQL Server
- **AI-powered analysis**: Use Claude to understand your database schema and suggest useful queries
- **MCP server**: Built-in MCP server that exposes your defined capabilities
- **Visual capability builder**: Create and test SQL query capabilities with a user-friendly interface
- **Live/Draft system**: Test capabilities before making them available to AI assistants

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- An Anthropic API key (for AI analysis features)

### Development Setup

1. **Clone and setup backend**:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. **Configure environment**:
```bash
cp ../.env.example ../.env
# Edit .env and add your ANTHROPIC_API_KEY
```

3. **Start the backend**:
```bash
uvicorn main:app --reload --port 8000
```

4. **Setup and start frontend** (in a new terminal):
```bash
cd frontend
npm install
npm run dev
```

5. **Access the application**:
   - Frontend: http://localhost:3000
   - API: http://localhost:8000
   - MCP endpoint: http://localhost:8000/mcp

### Docker Setup

```bash
# Set your API key
export ANTHROPIC_API_KEY=sk-ant-...

# Build and run
docker-compose up -d
```

The application will be available at http://localhost:8000

## Usage

### 1. Add a Database Connection

1. Go to **Connections** → **Add Connection**
2. Enter a name for your connection
3. Select the database type
4. Enter the connection string
5. Test the connection

### 2. Analyze Your Database

1. Click **Analyze** on a connection
2. The AI will analyze your schema and provide insights
3. Chat with the AI to explain your business context
4. Generate a report with suggested capabilities

### 3. Create Capabilities

1. Go to **Capabilities** → **New Capability**
2. Select a database connection
3. Give your capability a name (snake_case)
4. Write the SQL template using `{{parameter}}` placeholders
5. Configure parameters (type, description, required)
6. Test the capability
7. Toggle to **Live** when ready

### 4. Connect to Claude Desktop

1. Copy the MCP endpoint from the Dashboard
2. Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "your-database": {
      "url": "http://localhost:8000/mcp"
    }
  }
}
```

3. Restart Claude Desktop
4. Your capabilities are now available to Claude!

## Connection String Examples

### SQLite
```
/path/to/database.db
```

### PostgreSQL
```
user:password@localhost:5432/database
```

### MySQL
```
user:password@localhost:3306/database
```

### MS SQL Server
```
user:password@localhost:1433/database?driver=ODBC+Driver+17+for+SQL+Server
```

## API Reference

### Connections
- `GET /api/connections` - List all connections
- `POST /api/connections` - Create a new connection
- `GET /api/connections/{id}` - Get connection details
- `PUT /api/connections/{id}` - Update a connection
- `DELETE /api/connections/{id}` - Delete a connection
- `POST /api/connections/{id}/test` - Test connection
- `POST /api/connections/{id}/analyze` - Analyze schema

### Capabilities
- `GET /api/capabilities` - List all capabilities
- `POST /api/capabilities` - Create a new capability
- `GET /api/capabilities/{id}` - Get capability details
- `PUT /api/capabilities/{id}` - Update a capability
- `DELETE /api/capabilities/{id}` - Delete a capability
- `POST /api/capabilities/{id}/test` - Test capability
- `POST /api/capabilities/{id}/toggle-live` - Toggle live status

### Analysis
- `POST /api/analyze/{connection_id}/init` - Initialize analysis
- `POST /api/analyze/{connection_id}/chat` - Send chat message
- `POST /api/analyze/{connection_id}/generate-report` - Generate report

### MCP
- `POST /mcp` - MCP JSON-RPC endpoint
- `GET /mcp` - MCP server info

## Project Structure

```
mcp-server/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── database.py          # SQLAlchemy setup
│   ├── models.py            # Database models
│   ├── schemas.py           # Pydantic schemas
│   ├── crud.py              # CRUD operations
│   ├── db_connector.py      # Multi-database connector
│   ├── schema_analyzer.py   # Schema analysis
│   ├── sql_executor.py      # Safe SQL execution
│   ├── ai_analyzer.py       # Claude API integration
│   ├── mcp_server.py        # MCP protocol handler
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   └── api/             # API client
│   ├── package.json
│   └── tailwind.config.js
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## Security Considerations

- SQL templates use parameterized queries to prevent SQL injection
- Connection strings are stored in the local SQLite database
- API keys can be set via environment variables or the settings page
- Consider adding authentication for production use

## License

MIT
