"""Pydantic schemas for API request/response validation."""
from datetime import datetime, date, time
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from enum import Enum


# Enums for type safety
class ContractType(str, Enum):
    SPOT = "spot"
    CONTRACT = "contract"


class SlotStatus(str, Enum):
    AVAILABLE = "available"
    RESERVED = "reserved"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ReservationStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


# Customer Schemas
class CustomerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    contact_person: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    phone: str = Field(..., min_length=1, max_length=50)
    contract_type: ContractType = ContractType.SPOT


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    contact_person: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, min_length=1, max_length=50)
    contract_type: Optional[ContractType] = None


class CustomerResponse(CustomerBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class CustomerWithReservations(CustomerResponse):
    reservations: List["ReservationResponse"] = []


# Station Schemas
class StationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    location: str = Field(..., min_length=1, max_length=500)
    capacity_per_hour: float = Field(..., gt=0)
    operating_hours_start: time
    operating_hours_end: time
    is_active: bool = True


class StationCreate(StationBase):
    pass


class StationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    location: Optional[str] = Field(None, min_length=1, max_length=500)
    capacity_per_hour: Optional[float] = Field(None, gt=0)
    operating_hours_start: Optional[time] = None
    operating_hours_end: Optional[time] = None
    is_active: Optional[bool] = None


class StationResponse(StationBase):
    id: int

    class Config:
        from_attributes = True


# Loading Slot Schemas
class LoadingSlotBase(BaseModel):
    station_id: int
    date: date
    start_time: time
    end_time: time
    max_volume: float = Field(..., gt=0)
    status: SlotStatus = SlotStatus.AVAILABLE


class LoadingSlotCreate(BaseModel):
    station_id: int
    date: date
    start_time: time
    end_time: time
    max_volume: float = Field(..., gt=0)


class LoadingSlotUpdate(BaseModel):
    date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    max_volume: Optional[float] = Field(None, gt=0)
    status: Optional[SlotStatus] = None


class LoadingSlotResponse(LoadingSlotBase):
    id: int
    station: Optional[StationResponse] = None

    class Config:
        from_attributes = True


# Reservation Schemas
class ReservationBase(BaseModel):
    slot_id: int
    customer_id: int
    requested_volume: float = Field(..., gt=0)
    truck_license_plate: str = Field(..., min_length=1, max_length=20)
    driver_name: str = Field(..., min_length=1, max_length=255)
    notes: Optional[str] = None


class ReservationCreate(ReservationBase):
    pass


class ReservationUpdate(BaseModel):
    requested_volume: Optional[float] = Field(None, gt=0)
    truck_license_plate: Optional[str] = Field(None, min_length=1, max_length=20)
    driver_name: Optional[str] = Field(None, min_length=1, max_length=255)
    status: Optional[ReservationStatus] = None
    notes: Optional[str] = None


class ReservationResponse(ReservationBase):
    id: int
    status: ReservationStatus
    created_at: datetime
    slot: Optional[LoadingSlotResponse] = None
    customer: Optional[CustomerResponse] = None

    class Config:
        from_attributes = True


# Dashboard Schemas
class DashboardStats(BaseModel):
    total_reservations_today: int
    available_slots_today: int
    active_customers: int
    completed_loadings_this_week: int
    total_volume_this_week: float


class TodayScheduleItem(BaseModel):
    reservation_id: int
    slot_start_time: time
    slot_end_time: time
    station_name: str
    customer_name: str
    truck_license_plate: str
    driver_name: str
    requested_volume: float
    status: ReservationStatus


class RecentActivity(BaseModel):
    id: int
    type: str  # 'reservation_created', 'reservation_completed', etc.
    description: str
    timestamp: datetime


# Schema Export for MCP
class ColumnInfo(BaseModel):
    name: str
    type: str
    nullable: bool
    primary_key: bool
    foreign_key: Optional[str] = None


class TableInfo(BaseModel):
    name: str
    columns: List[ColumnInfo]


class SchemaExport(BaseModel):
    tables: List[TableInfo]


# Update forward references
CustomerWithReservations.model_rebuild()
