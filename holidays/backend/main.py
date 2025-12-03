from datetime import date
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import os

from database import get_db, init_db, engine
import crud
import schemas
import models

app = FastAPI(
    title="Holidays Management API",
    description="API for managing employee holidays and leave requests",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()


@app.get("/health")
def health_check():
    return {"status": "healthy"}


# ==================== Users ====================

@app.get("/api/users", response_model=List[schemas.User])
def list_users(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    return crud.get_users(db, skip=skip, limit=limit, is_active=is_active)


@app.post("/api/users", response_model=schemas.User, status_code=201)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = crud.get_user_by_email(db, user.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db, user)


@app.get("/api/users/{user_id}", response_model=schemas.UserWithBalance)
def get_user(user_id: int, year: Optional[int] = None, db: Session = Depends(get_db)):
    user = crud.get_user_with_balance(db, user_id, year)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.put("/api/users/{user_id}", response_model=schemas.User)
def update_user(user_id: int, user: schemas.UserUpdate, db: Session = Depends(get_db)):
    updated = crud.update_user(db, user_id, user)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return updated


@app.delete("/api/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    if not crud.delete_user(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}


# ==================== Holiday Types ====================

@app.get("/api/holiday-types", response_model=List[schemas.HolidayType])
def list_holiday_types(is_active: Optional[bool] = None, db: Session = Depends(get_db)):
    return crud.get_holiday_types(db, is_active=is_active)


@app.post("/api/holiday-types", response_model=schemas.HolidayType, status_code=201)
def create_holiday_type(holiday_type: schemas.HolidayTypeCreate, db: Session = Depends(get_db)):
    return crud.create_holiday_type(db, holiday_type)


@app.get("/api/holiday-types/{type_id}", response_model=schemas.HolidayType)
def get_holiday_type(type_id: int, db: Session = Depends(get_db)):
    ht = crud.get_holiday_type(db, type_id)
    if not ht:
        raise HTTPException(status_code=404, detail="Holiday type not found")
    return ht


@app.put("/api/holiday-types/{type_id}", response_model=schemas.HolidayType)
def update_holiday_type(type_id: int, holiday_type: schemas.HolidayTypeUpdate, db: Session = Depends(get_db)):
    updated = crud.update_holiday_type(db, type_id, holiday_type)
    if not updated:
        raise HTTPException(status_code=404, detail="Holiday type not found")
    return updated


@app.delete("/api/holiday-types/{type_id}")
def delete_holiday_type(type_id: int, db: Session = Depends(get_db)):
    if not crud.delete_holiday_type(db, type_id):
        raise HTTPException(status_code=404, detail="Holiday type not found")
    return {"message": "Holiday type deleted"}


# ==================== Holiday Requests ====================

@app.get("/api/requests", response_model=List[schemas.HolidayRequestWithDetails])
def list_holiday_requests(
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[int] = None,
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    requests = crud.get_holiday_requests(
        db, skip=skip, limit=limit, user_id=user_id,
        status=status, start_date=start_date, end_date=end_date
    )
    return requests


@app.post("/api/requests", response_model=schemas.HolidayRequest, status_code=201)
def create_holiday_request(request: schemas.HolidayRequestCreate, db: Session = Depends(get_db)):
    # Validate user exists
    user = crud.get_user(db, request.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Validate holiday type exists
    ht = crud.get_holiday_type(db, request.holiday_type_id)
    if not ht:
        raise HTTPException(status_code=404, detail="Holiday type not found")

    # Validate dates
    if request.end_date < request.start_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")

    return crud.create_holiday_request(db, request)


@app.get("/api/requests/{request_id}", response_model=schemas.HolidayRequestWithDetails)
def get_holiday_request(request_id: int, db: Session = Depends(get_db)):
    request = crud.get_holiday_request(db, request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Holiday request not found")
    return request


@app.put("/api/requests/{request_id}", response_model=schemas.HolidayRequest)
def update_holiday_request(request_id: int, request: schemas.HolidayRequestUpdate, db: Session = Depends(get_db)):
    updated = crud.update_holiday_request(db, request_id, request)
    if not updated:
        raise HTTPException(status_code=404, detail="Holiday request not found")
    return updated


@app.delete("/api/requests/{request_id}")
def delete_holiday_request(request_id: int, db: Session = Depends(get_db)):
    if not crud.delete_holiday_request(db, request_id):
        raise HTTPException(status_code=404, detail="Holiday request not found")
    return {"message": "Holiday request deleted"}


@app.post("/api/requests/{request_id}/approve", response_model=schemas.HolidayRequest)
def approve_request(request_id: int, approver_id: int = Query(...), db: Session = Depends(get_db)):
    request = crud.approve_holiday_request(db, request_id, approver_id)
    if not request:
        raise HTTPException(status_code=404, detail="Holiday request not found or already processed")
    return request


@app.post("/api/requests/{request_id}/reject", response_model=schemas.HolidayRequest)
def reject_request(request_id: int, approver_id: int = Query(...), db: Session = Depends(get_db)):
    request = crud.reject_holiday_request(db, request_id, approver_id)
    if not request:
        raise HTTPException(status_code=404, detail="Holiday request not found or already processed")
    return request


# ==================== Dashboard ====================

@app.get("/api/dashboard/stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    return crud.get_dashboard_stats(db)


@app.get("/api/dashboard/calendar", response_model=List[schemas.CalendarEvent])
def get_calendar_events(
    start_date: date,
    end_date: date,
    user_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    return crud.get_calendar_events(db, start_date, end_date, user_id)


@app.get("/api/dashboard/pending", response_model=List[schemas.HolidayRequestWithDetails])
def get_pending_requests(limit: int = 10, db: Session = Depends(get_db)):
    return crud.get_pending_requests_for_approval(db, limit)


# ==================== Schema Export (for MCP) ====================

@app.get("/api/schema")
def get_schema():
    from sqlalchemy import inspect

    inspector = inspect(engine)
    schema = {}

    for table_name in inspector.get_table_names():
        columns = []
        for column in inspector.get_columns(table_name):
            columns.append({
                "name": column["name"],
                "type": str(column["type"]),
                "nullable": column["nullable"],
                "primary_key": column.get("primary_key", False)
            })

        foreign_keys = []
        for fk in inspector.get_foreign_keys(table_name):
            foreign_keys.append({
                "column": fk["constrained_columns"],
                "references": f"{fk['referred_table']}.{fk['referred_columns']}"
            })

        schema[table_name] = {
            "columns": columns,
            "foreign_keys": foreign_keys
        }

    return schema


# Serve static files in production
if os.path.exists("static"):
    app.mount("/", StaticFiles(directory="static", html=True), name="static")
