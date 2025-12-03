# Holidays Management Tool

A web application for managing employee holidays and leave requests.

## Features

- **User Management**: Create and manage employee accounts with role-based permissions
- **Holiday Types**: Configure different types of leave (Annual, Sick, Personal, etc.)
- **Leave Requests**: Submit, approve, and track holiday requests
- **Calendar View**: Visual overview of all scheduled holidays
- **Dashboard**: Quick stats and pending approval queue

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons
- **Backend**: FastAPI, SQLAlchemy, Pydantic
- **Database**: SQLite (easily switchable to PostgreSQL/MySQL)

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+

### Local Development

1. **Start the backend:**

```bash
cd backend
pip install -r requirements.txt
python seed_data.py  # Create demo data
uvicorn main:app --reload
```

2. **Start the frontend:**

```bash
cd frontend
npm install
npm run dev
```

3. Open http://localhost:5173

### Docker Development

```bash
docker-compose up
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Production

```bash
docker-compose --profile production up app
```

The app will be available at http://localhost:8000

## API Endpoints

- `GET /api/users` - List all users
- `POST /api/users` - Create a user
- `GET /api/holiday-types` - List holiday types
- `GET /api/requests` - List all leave requests
- `POST /api/requests` - Submit a new request
- `POST /api/requests/{id}/approve` - Approve a request
- `POST /api/requests/{id}/reject` - Reject a request
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/dashboard/calendar` - Calendar events

## Database Schema

### Users
- id, name, email, department, role, annual_leave_days, is_active

### Holiday Types
- id, name, description, color, requires_approval, max_days_per_request

### Holiday Requests
- id, user_id, holiday_type_id, start_date, end_date, total_days, status, notes, approved_by
