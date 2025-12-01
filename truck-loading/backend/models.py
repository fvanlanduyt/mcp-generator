"""SQLAlchemy database models for LNG Truck Loading system."""
from datetime import datetime, date, time
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Date, Time,
    DateTime, ForeignKey, Text, CheckConstraint
)
from sqlalchemy.orm import relationship
from database import Base


class Customer(Base):
    """
    Customer model representing companies that book loading slots.

    Attributes:
        id: Unique identifier
        name: Company name
        contact_person: Primary contact name
        email: Contact email address
        phone: Contact phone number
        contract_type: Either 'spot' for one-time or 'contract' for regular customers
        created_at: Timestamp when customer was created
    """
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    contact_person = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)
    contract_type = Column(
        String(20),
        nullable=False,
        default="spot"
    )
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    reservations = relationship("Reservation", back_populates="customer")

    __table_args__ = (
        CheckConstraint(
            "contract_type IN ('spot', 'contract')",
            name="valid_contract_type"
        ),
    )


class Station(Base):
    """
    Loading station model representing physical LNG loading terminals.

    Attributes:
        id: Unique identifier
        name: Station name (e.g., 'Zeebrugge Terminal 1')
        location: Physical location/address
        capacity_per_hour: Loading capacity in cubic meters per hour
        operating_hours_start: Daily opening time
        operating_hours_end: Daily closing time
        is_active: Whether station is currently operational
    """
    __tablename__ = "stations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True, index=True)
    location = Column(String(500), nullable=False)
    capacity_per_hour = Column(Float, nullable=False)
    operating_hours_start = Column(Time, nullable=False)
    operating_hours_end = Column(Time, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    loading_slots = relationship("LoadingSlot", back_populates="station")


class LoadingSlot(Base):
    """
    Loading slot model representing available time windows for truck loading.

    Attributes:
        id: Unique identifier
        station_id: Reference to the station
        date: Date of the slot
        start_time: Slot start time
        end_time: Slot end time
        max_volume: Maximum volume that can be loaded in cubic meters
        status: Current status (available, reserved, completed, cancelled)
    """
    __tablename__ = "loading_slots"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("stations.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    max_volume = Column(Float, nullable=False)
    status = Column(
        String(20),
        nullable=False,
        default="available",
        index=True
    )

    # Relationships
    station = relationship("Station", back_populates="loading_slots")
    reservations = relationship("Reservation", back_populates="slot")

    __table_args__ = (
        CheckConstraint(
            "status IN ('available', 'reserved', 'completed', 'cancelled')",
            name="valid_slot_status"
        ),
    )


class Reservation(Base):
    """
    Reservation model for truck loading appointments.

    Attributes:
        id: Unique identifier
        slot_id: Reference to the loading slot
        customer_id: Reference to the customer
        requested_volume: Volume to be loaded in cubic meters
        truck_license_plate: License plate of the truck
        driver_name: Name of the truck driver
        status: Current status (pending, confirmed, in_progress, completed, cancelled)
        created_at: Timestamp when reservation was created
        notes: Optional notes or special instructions
    """
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True)
    slot_id = Column(Integer, ForeignKey("loading_slots.id"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    requested_volume = Column(Float, nullable=False)
    truck_license_plate = Column(String(20), nullable=False, index=True)
    driver_name = Column(String(255), nullable=False)
    status = Column(
        String(20),
        nullable=False,
        default="pending",
        index=True
    )
    created_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, nullable=True)

    # Relationships
    slot = relationship("LoadingSlot", back_populates="reservations")
    customer = relationship("Customer", back_populates="reservations")

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')",
            name="valid_reservation_status"
        ),
    )
