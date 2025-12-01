"""CRUD operations for database models."""
from datetime import date, datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from models import Customer, Station, LoadingSlot, Reservation
from schemas import (
    CustomerCreate, CustomerUpdate,
    StationCreate, StationUpdate,
    LoadingSlotCreate, LoadingSlotUpdate,
    ReservationCreate, ReservationUpdate,
    SlotStatus, ReservationStatus
)


# ============== Customer CRUD ==============

def get_customer(db: Session, customer_id: int) -> Optional[Customer]:
    """Get a customer by ID."""
    return db.query(Customer).filter(Customer.id == customer_id).first()


def get_customer_by_email(db: Session, email: str) -> Optional[Customer]:
    """Get a customer by email."""
    return db.query(Customer).filter(Customer.email == email).first()


def get_customers(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    contract_type: Optional[str] = None
) -> List[Customer]:
    """Get all customers with optional filtering."""
    query = db.query(Customer)
    if contract_type:
        query = query.filter(Customer.contract_type == contract_type)
    return query.offset(skip).limit(limit).all()


def create_customer(db: Session, customer: CustomerCreate) -> Customer:
    """Create a new customer."""
    db_customer = Customer(**customer.model_dump())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer


def update_customer(
    db: Session,
    customer_id: int,
    customer: CustomerUpdate
) -> Optional[Customer]:
    """Update an existing customer."""
    db_customer = get_customer(db, customer_id)
    if not db_customer:
        return None

    update_data = customer.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_customer, field, value)

    db.commit()
    db.refresh(db_customer)
    return db_customer


def delete_customer(db: Session, customer_id: int) -> bool:
    """Delete a customer."""
    db_customer = get_customer(db, customer_id)
    if not db_customer:
        return False
    db.delete(db_customer)
    db.commit()
    return True


def get_active_customers_count(db: Session) -> int:
    """Get count of customers with at least one reservation."""
    return db.query(func.count(func.distinct(Reservation.customer_id))).scalar() or 0


# ============== Station CRUD ==============

def get_station(db: Session, station_id: int) -> Optional[Station]:
    """Get a station by ID."""
    return db.query(Station).filter(Station.id == station_id).first()


def get_station_by_name(db: Session, name: str) -> Optional[Station]:
    """Get a station by name."""
    return db.query(Station).filter(Station.name == name).first()


def get_stations(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None
) -> List[Station]:
    """Get all stations with optional filtering."""
    query = db.query(Station)
    if is_active is not None:
        query = query.filter(Station.is_active == is_active)
    return query.offset(skip).limit(limit).all()


def create_station(db: Session, station: StationCreate) -> Station:
    """Create a new station."""
    db_station = Station(**station.model_dump())
    db.add(db_station)
    db.commit()
    db.refresh(db_station)
    return db_station


def update_station(
    db: Session,
    station_id: int,
    station: StationUpdate
) -> Optional[Station]:
    """Update an existing station."""
    db_station = get_station(db, station_id)
    if not db_station:
        return None

    update_data = station.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_station, field, value)

    db.commit()
    db.refresh(db_station)
    return db_station


# ============== Loading Slot CRUD ==============

def get_slot(db: Session, slot_id: int) -> Optional[LoadingSlot]:
    """Get a loading slot by ID."""
    return db.query(LoadingSlot).filter(LoadingSlot.id == slot_id).first()


def get_slots(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    station_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    status: Optional[str] = None
) -> List[LoadingSlot]:
    """Get loading slots with optional filtering."""
    query = db.query(LoadingSlot)

    if station_id:
        query = query.filter(LoadingSlot.station_id == station_id)
    if date_from:
        query = query.filter(LoadingSlot.date >= date_from)
    if date_to:
        query = query.filter(LoadingSlot.date <= date_to)
    if status:
        query = query.filter(LoadingSlot.status == status)

    return query.order_by(LoadingSlot.date, LoadingSlot.start_time).offset(skip).limit(limit).all()


def get_available_slots(
    db: Session,
    station_id: Optional[int] = None,
    target_date: Optional[date] = None,
    min_volume: Optional[float] = None
) -> List[LoadingSlot]:
    """Get available loading slots with optional filtering."""
    query = db.query(LoadingSlot).filter(LoadingSlot.status == SlotStatus.AVAILABLE.value)

    if station_id:
        query = query.filter(LoadingSlot.station_id == station_id)
    if target_date:
        query = query.filter(LoadingSlot.date == target_date)
    if min_volume:
        query = query.filter(LoadingSlot.max_volume >= min_volume)

    return query.order_by(LoadingSlot.date, LoadingSlot.start_time).all()


def create_slot(db: Session, slot: LoadingSlotCreate) -> LoadingSlot:
    """Create a new loading slot."""
    # Validate station exists
    station = get_station(db, slot.station_id)
    if not station:
        raise ValueError("Station not found")

    # Validate time is within operating hours
    if slot.start_time < station.operating_hours_start or slot.end_time > station.operating_hours_end:
        raise ValueError("Slot time must be within station operating hours")

    # Check for overlapping slots
    overlapping = db.query(LoadingSlot).filter(
        and_(
            LoadingSlot.station_id == slot.station_id,
            LoadingSlot.date == slot.date,
            LoadingSlot.status != SlotStatus.CANCELLED.value,
            LoadingSlot.start_time < slot.end_time,
            LoadingSlot.end_time > slot.start_time
        )
    ).first()

    if overlapping:
        raise ValueError("Slot overlaps with existing slot")

    db_slot = LoadingSlot(**slot.model_dump())
    db.add(db_slot)
    db.commit()
    db.refresh(db_slot)
    return db_slot


def update_slot(
    db: Session,
    slot_id: int,
    slot: LoadingSlotUpdate
) -> Optional[LoadingSlot]:
    """Update an existing loading slot."""
    db_slot = get_slot(db, slot_id)
    if not db_slot:
        return None

    update_data = slot.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_slot, field, value)

    db.commit()
    db.refresh(db_slot)
    return db_slot


def get_available_slots_count_today(db: Session) -> int:
    """Get count of available slots today."""
    today = date.today()
    return db.query(LoadingSlot).filter(
        and_(
            LoadingSlot.date == today,
            LoadingSlot.status == SlotStatus.AVAILABLE.value
        )
    ).count()


# ============== Reservation CRUD ==============

def get_reservation(db: Session, reservation_id: int) -> Optional[Reservation]:
    """Get a reservation by ID."""
    return db.query(Reservation).filter(Reservation.id == reservation_id).first()


def get_reservations(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    customer_id: Optional[int] = None,
    status: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    station_id: Optional[int] = None,
    search: Optional[str] = None
) -> List[Reservation]:
    """Get reservations with optional filtering."""
    query = db.query(Reservation).join(
        LoadingSlot, Reservation.slot_id == LoadingSlot.id
    )

    if customer_id:
        query = query.filter(Reservation.customer_id == customer_id)
    if status:
        query = query.filter(Reservation.status == status)
    if date_from:
        query = query.filter(LoadingSlot.date >= date_from)
    if date_to:
        query = query.filter(LoadingSlot.date <= date_to)
    if station_id:
        query = query.filter(LoadingSlot.station_id == station_id)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Reservation.truck_license_plate.ilike(search_term)) |
            (Reservation.driver_name.ilike(search_term))
        )

    return query.order_by(LoadingSlot.date.desc(), LoadingSlot.start_time.desc()).offset(skip).limit(limit).all()


def get_reservations_by_customer(
    db: Session,
    customer_id: int,
    skip: int = 0,
    limit: int = 100
) -> List[Reservation]:
    """Get all reservations for a specific customer."""
    return db.query(Reservation).filter(
        Reservation.customer_id == customer_id
    ).order_by(Reservation.created_at.desc()).offset(skip).limit(limit).all()


def create_reservation(db: Session, reservation: ReservationCreate) -> Reservation:
    """Create a new reservation."""
    # Validate slot exists and is available
    slot = get_slot(db, reservation.slot_id)
    if not slot:
        raise ValueError("Loading slot not found")
    if slot.status != SlotStatus.AVAILABLE.value:
        raise ValueError("Loading slot is not available")

    # Validate customer exists
    customer = get_customer(db, reservation.customer_id)
    if not customer:
        raise ValueError("Customer not found")

    # Validate requested volume
    if reservation.requested_volume > slot.max_volume:
        raise ValueError(f"Requested volume exceeds slot maximum of {slot.max_volume}m³")

    # Check if customer already has a reservation for this slot
    existing = db.query(Reservation).filter(
        and_(
            Reservation.slot_id == reservation.slot_id,
            Reservation.customer_id == reservation.customer_id,
            Reservation.status.notin_([ReservationStatus.CANCELLED.value])
        )
    ).first()

    if existing:
        raise ValueError("Customer already has a reservation for this slot")

    # Create reservation
    db_reservation = Reservation(**reservation.model_dump())
    db.add(db_reservation)

    # Update slot status
    slot.status = SlotStatus.RESERVED.value

    db.commit()
    db.refresh(db_reservation)
    return db_reservation


def update_reservation(
    db: Session,
    reservation_id: int,
    reservation: ReservationUpdate
) -> Optional[Reservation]:
    """Update an existing reservation."""
    db_reservation = get_reservation(db, reservation_id)
    if not db_reservation:
        return None

    update_data = reservation.model_dump(exclude_unset=True)

    # If updating status to cancelled, free up the slot
    if update_data.get("status") == ReservationStatus.CANCELLED.value:
        slot = get_slot(db, db_reservation.slot_id)
        if slot:
            slot.status = SlotStatus.AVAILABLE.value

    # If updating status to completed, update slot status too
    if update_data.get("status") == ReservationStatus.COMPLETED.value:
        slot = get_slot(db, db_reservation.slot_id)
        if slot:
            slot.status = SlotStatus.COMPLETED.value

    for field, value in update_data.items():
        setattr(db_reservation, field, value)

    db.commit()
    db.refresh(db_reservation)
    return db_reservation


def get_reservations_count_today(db: Session) -> int:
    """Get count of reservations for today."""
    today = date.today()
    return db.query(Reservation).join(
        LoadingSlot, Reservation.slot_id == LoadingSlot.id
    ).filter(
        LoadingSlot.date == today
    ).count()


def get_completed_loadings_this_week(db: Session) -> int:
    """Get count of completed loadings this week."""
    today = date.today()
    week_start = datetime.combine(today - timedelta(days=today.weekday()), datetime.min.time())

    return db.query(Reservation).filter(
        and_(
            Reservation.status == ReservationStatus.COMPLETED.value,
            Reservation.created_at >= week_start
        )
    ).count()


def get_total_volume_this_week(db: Session) -> float:
    """Get total volume loaded this week."""
    today = date.today()
    week_start = datetime.combine(today - timedelta(days=today.weekday()), datetime.min.time())

    result = db.query(func.sum(Reservation.requested_volume)).filter(
        and_(
            Reservation.status == ReservationStatus.COMPLETED.value,
            Reservation.created_at >= week_start
        )
    ).scalar()

    return result or 0.0


def get_today_schedule(db: Session) -> List[dict]:
    """Get today's loading schedule."""
    today = date.today()

    reservations = db.query(Reservation).join(
        LoadingSlot, Reservation.slot_id == LoadingSlot.id
    ).filter(
        LoadingSlot.date == today
    ).order_by(LoadingSlot.start_time).all()

    schedule = []
    for r in reservations:
        schedule.append({
            "reservation_id": r.id,
            "slot_start_time": r.slot.start_time,
            "slot_end_time": r.slot.end_time,
            "station_name": r.slot.station.name if r.slot and r.slot.station else "Unknown",
            "customer_name": r.customer.name if r.customer else "Unknown",
            "truck_license_plate": r.truck_license_plate,
            "driver_name": r.driver_name,
            "requested_volume": r.requested_volume,
            "status": r.status
        })

    return schedule


def get_recent_activity(db: Session, limit: int = 10) -> List[dict]:
    """Get recent activity (reservations)."""
    reservations = db.query(Reservation).order_by(
        Reservation.created_at.desc()
    ).limit(limit).all()

    activities = []
    for r in reservations:
        activities.append({
            "id": r.id,
            "type": f"reservation_{r.status}",
            "description": f"Reservation for {r.customer.name if r.customer else 'Unknown'} - {r.truck_license_plate}",
            "timestamp": r.created_at
        })

    return activities
