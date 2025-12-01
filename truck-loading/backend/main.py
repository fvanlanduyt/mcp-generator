"""FastAPI application for LNG Truck Loading Slot Reservation System."""
from datetime import date
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import inspect
import os

from database import get_db, init_db, engine
from models import Customer, Station, LoadingSlot, Reservation
import crud
from schemas import (
    CustomerCreate, CustomerUpdate, CustomerResponse, CustomerWithReservations,
    StationCreate, StationUpdate, StationResponse,
    LoadingSlotCreate, LoadingSlotUpdate, LoadingSlotResponse,
    ReservationCreate, ReservationUpdate, ReservationResponse,
    DashboardStats, TodayScheduleItem, RecentActivity,
    SchemaExport, TableInfo, ColumnInfo
)

# Initialize FastAPI app
app = FastAPI(
    title="LNG Truck Loading API",
    description="API for managing LNG truck loading slot reservations",
    version="1.0.0"
)

# CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    init_db()


# Health check endpoint
@app.get("/health")
def health_check():
    """Health check endpoint for Azure deployment."""
    return {"status": "healthy", "service": "lng-truck-loading-api"}


# ============== Customer Endpoints ==============

@app.get("/api/customers", response_model=List[CustomerResponse])
def list_customers(
    skip: int = 0,
    limit: int = 100,
    contract_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all customers with optional filtering."""
    return crud.get_customers(db, skip=skip, limit=limit, contract_type=contract_type)


@app.post("/api/customers", response_model=CustomerResponse, status_code=201)
def create_customer(customer: CustomerCreate, db: Session = Depends(get_db)):
    """Create a new customer."""
    # Check if email already exists
    existing = crud.get_customer_by_email(db, customer.email)
    if existing:
        raise HTTPException(status_code=400, detail="Customer with this email already exists")
    return crud.create_customer(db, customer)


@app.get("/api/customers/{customer_id}", response_model=CustomerWithReservations)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    """Get a customer by ID with their reservations."""
    customer = crud.get_customer(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@app.put("/api/customers/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: int,
    customer: CustomerUpdate,
    db: Session = Depends(get_db)
):
    """Update a customer."""
    updated = crud.update_customer(db, customer_id, customer)
    if not updated:
        raise HTTPException(status_code=404, detail="Customer not found")
    return updated


@app.delete("/api/customers/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    """Delete a customer."""
    if not crud.delete_customer(db, customer_id):
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"message": "Customer deleted successfully"}


# ============== Station Endpoints ==============

@app.get("/api/stations", response_model=List[StationResponse])
def list_stations(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get all stations with optional filtering."""
    return crud.get_stations(db, skip=skip, limit=limit, is_active=is_active)


@app.post("/api/stations", response_model=StationResponse, status_code=201)
def create_station(station: StationCreate, db: Session = Depends(get_db)):
    """Create a new station."""
    existing = crud.get_station_by_name(db, station.name)
    if existing:
        raise HTTPException(status_code=400, detail="Station with this name already exists")
    return crud.create_station(db, station)


@app.get("/api/stations/{station_id}", response_model=StationResponse)
def get_station(station_id: int, db: Session = Depends(get_db)):
    """Get a station by ID."""
    station = crud.get_station(db, station_id)
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")
    return station


@app.put("/api/stations/{station_id}", response_model=StationResponse)
def update_station(
    station_id: int,
    station: StationUpdate,
    db: Session = Depends(get_db)
):
    """Update a station."""
    updated = crud.update_station(db, station_id, station)
    if not updated:
        raise HTTPException(status_code=404, detail="Station not found")
    return updated


# ============== Loading Slot Endpoints ==============

@app.get("/api/slots", response_model=List[LoadingSlotResponse])
def list_slots(
    skip: int = 0,
    limit: int = 100,
    station_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all loading slots with optional filtering."""
    return crud.get_slots(
        db, skip=skip, limit=limit,
        station_id=station_id, date_from=date_from, date_to=date_to, status=status
    )


@app.get("/api/slots/available", response_model=List[LoadingSlotResponse])
def list_available_slots(
    station_id: Optional[int] = None,
    date: Optional[date] = Query(None, alias="date"),
    min_volume: Optional[float] = None,
    db: Session = Depends(get_db)
):
    """Get available loading slots."""
    return crud.get_available_slots(db, station_id=station_id, target_date=date, min_volume=min_volume)


@app.post("/api/slots", response_model=LoadingSlotResponse, status_code=201)
def create_slot(slot: LoadingSlotCreate, db: Session = Depends(get_db)):
    """Create a new loading slot."""
    try:
        return crud.create_slot(db, slot)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/slots/{slot_id}", response_model=LoadingSlotResponse)
def get_slot(slot_id: int, db: Session = Depends(get_db)):
    """Get a loading slot by ID."""
    slot = crud.get_slot(db, slot_id)
    if not slot:
        raise HTTPException(status_code=404, detail="Loading slot not found")
    return slot


@app.put("/api/slots/{slot_id}", response_model=LoadingSlotResponse)
def update_slot(
    slot_id: int,
    slot: LoadingSlotUpdate,
    db: Session = Depends(get_db)
):
    """Update a loading slot."""
    updated = crud.update_slot(db, slot_id, slot)
    if not updated:
        raise HTTPException(status_code=404, detail="Loading slot not found")
    return updated


# ============== Reservation Endpoints ==============

@app.get("/api/reservations", response_model=List[ReservationResponse])
def list_reservations(
    skip: int = 0,
    limit: int = 100,
    customer_id: Optional[int] = None,
    status: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    station_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all reservations with optional filtering."""
    return crud.get_reservations(
        db, skip=skip, limit=limit,
        customer_id=customer_id, status=status,
        date_from=date_from, date_to=date_to,
        station_id=station_id, search=search
    )


@app.post("/api/reservations", response_model=ReservationResponse, status_code=201)
def create_reservation(reservation: ReservationCreate, db: Session = Depends(get_db)):
    """Create a new reservation."""
    try:
        return crud.create_reservation(db, reservation)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/reservations/{reservation_id}", response_model=ReservationResponse)
def get_reservation(reservation_id: int, db: Session = Depends(get_db)):
    """Get a reservation by ID."""
    reservation = crud.get_reservation(db, reservation_id)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return reservation


@app.put("/api/reservations/{reservation_id}", response_model=ReservationResponse)
def update_reservation(
    reservation_id: int,
    reservation: ReservationUpdate,
    db: Session = Depends(get_db)
):
    """Update a reservation."""
    updated = crud.update_reservation(db, reservation_id, reservation)
    if not updated:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return updated


@app.get("/api/reservations/by-customer/{customer_id}", response_model=List[ReservationResponse])
def get_reservations_by_customer(
    customer_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all reservations for a specific customer."""
    # Check if customer exists
    customer = crud.get_customer(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return crud.get_reservations_by_customer(db, customer_id, skip=skip, limit=limit)


# ============== Dashboard Endpoints ==============

@app.get("/api/dashboard/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Get dashboard statistics."""
    return DashboardStats(
        total_reservations_today=crud.get_reservations_count_today(db),
        available_slots_today=crud.get_available_slots_count_today(db),
        active_customers=crud.get_active_customers_count(db),
        completed_loadings_this_week=crud.get_completed_loadings_this_week(db),
        total_volume_this_week=crud.get_total_volume_this_week(db)
    )


@app.get("/api/dashboard/today-schedule", response_model=List[TodayScheduleItem])
def get_today_schedule(db: Session = Depends(get_db)):
    """Get today's loading schedule."""
    return crud.get_today_schedule(db)


@app.get("/api/dashboard/recent-activity", response_model=List[RecentActivity])
def get_recent_activity(limit: int = 10, db: Session = Depends(get_db)):
    """Get recent activity."""
    return crud.get_recent_activity(db, limit=limit)


# ============== Schema Export Endpoint ==============

@app.get("/api/schema", response_model=SchemaExport)
def get_database_schema():
    """
    Export database schema for MCP integration.
    Returns table names, column names, types, and relationships.
    """
    inspector = inspect(engine)
    tables = []

    for table_name in inspector.get_table_names():
        columns = []
        pk_columns = [pk['name'] for pk in inspector.get_pk_constraint(table_name).get('constrained_columns', [])]
        fk_map = {}

        for fk in inspector.get_foreign_keys(table_name):
            for col in fk['constrained_columns']:
                fk_map[col] = f"{fk['referred_table']}.{fk['referred_columns'][0]}"

        for col in inspector.get_columns(table_name):
            columns.append(ColumnInfo(
                name=col['name'],
                type=str(col['type']),
                nullable=col['nullable'],
                primary_key=col['name'] in pk_columns,
                foreign_key=fk_map.get(col['name'])
            ))

        tables.append(TableInfo(name=table_name, columns=columns))

    return SchemaExport(tables=tables)


# ============== Serve Frontend (Production) ==============

# Check if frontend build exists and serve it
frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(frontend_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_path, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """Serve frontend for all non-API routes."""
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        return FileResponse(os.path.join(frontend_path, "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
