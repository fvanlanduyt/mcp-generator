# LNG Load Hub - Truck Loading Slot Reservation System

A full-stack web application for managing LNG truck loading slot reservations. Built with FastAPI (Python) backend and React frontend with Tailwind CSS.

## Features

- **Dashboard**: Overview of daily reservations, available slots, and recent activity
- **Stations Management**: Add and manage LNG loading terminals
- **Loading Slots**: Create and manage time slots for truck loading
- **Reservations**: Book, track, and manage loading reservations
- **Customers**: Manage customer accounts with contract types

## Tech Stack

- **Backend**: Python 3.11, FastAPI, SQLAlchemy, Pydantic
- **Frontend**: React 18, Tailwind CSS, React Router, Lucide Icons
- **Database**: SQLite (development), easily switchable to Azure SQL/MSSQL

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- npm or yarn

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Seed database with demo data
python seed_data.py

# Start the server
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

## API Documentation

Once the backend is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/dashboard/stats` | Dashboard statistics |
| `GET /api/customers` | List all customers |
| `GET /api/stations` | List all stations |
| `GET /api/slots` | List loading slots |
| `GET /api/slots/available` | Get available slots |
| `GET /api/reservations` | List reservations |
| `POST /api/reservations` | Create new reservation |
| `GET /api/schema` | Database schema export (for MCP) |

## Database Schema

### Tables

- **customers**: Company information and contact details
- **stations**: LNG terminal locations and operating hours
- **loading_slots**: Available time windows for loading
- **reservations**: Booking records with truck/driver details

### Schema Export

The `/api/schema` endpoint returns the complete database structure for MCP integration:

```json
{
  "tables": [
    {
      "name": "customers",
      "columns": [
        {"name": "id", "type": "INTEGER", "primary_key": true},
        {"name": "name", "type": "VARCHAR(255)"},
        ...
      ]
    }
  ]
}
```

## Docker Deployment

### Development

```bash
docker-compose up
```

### Production

```bash
docker-compose --profile production up app
```

### Azure Web App

Build and push to Azure Container Registry:

```bash
docker build -t lng-truck-loading .
docker tag lng-truck-loading <your-acr>.azurecr.io/lng-truck-loading
docker push <your-acr>.azurecr.io/lng-truck-loading
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `sqlite:///./lng_loading.db` |

## Example Natural Language Queries

This database is designed to support MCP-powered natural language queries:

- "Is there a slot available at Zeebrugge on December 15th for 50m³?"
- "Show me all reservations for customer Acme Gas"
- "What's the loading schedule for tomorrow?"
- "Which slots are still available this week?"
- "How much volume did we load last month?"
- "Cancel the reservation for truck plate 1-ABC-123"

## Project Structure

```
lng-truck-loading/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── database.py          # SQLAlchemy configuration
│   ├── models.py            # Database models
│   ├── schemas.py           # Pydantic schemas
│   ├── crud.py              # Database operations
│   ├── seed_data.py         # Demo data generator
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/             # API client
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── tailwind.config.js
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## License

MIT
