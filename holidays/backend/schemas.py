from datetime import date, datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field


class UserRole(str, Enum):
    employee = "employee"
    manager = "manager"
    admin = "admin"


class HolidayStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    cancelled = "cancelled"


# User Schemas
class UserBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    department: str = Field(..., min_length=1, max_length=100)
    role: UserRole = UserRole.employee
    annual_leave_days: int = Field(default=25, ge=0, le=365)


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    department: Optional[str] = Field(None, min_length=1, max_length=100)
    role: Optional[UserRole] = None
    annual_leave_days: Optional[int] = Field(None, ge=0, le=365)
    is_active: Optional[bool] = None


class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserWithBalance(User):
    used_days: int = 0
    remaining_days: int = 0


# Holiday Type Schemas
class HolidayTypeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    color: str = Field(default="#14b8a6", max_length=20)
    requires_approval: bool = True
    max_days_per_request: int = Field(default=30, ge=1, le=365)


class HolidayTypeCreate(HolidayTypeBase):
    pass


class HolidayTypeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    color: Optional[str] = Field(None, max_length=20)
    requires_approval: Optional[bool] = None
    max_days_per_request: Optional[int] = Field(None, ge=1, le=365)
    is_active: Optional[bool] = None


class HolidayType(HolidayTypeBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True


# Holiday Request Schemas
class HolidayRequestBase(BaseModel):
    user_id: int
    holiday_type_id: int
    start_date: date
    end_date: date
    notes: Optional[str] = None


class HolidayRequestCreate(HolidayRequestBase):
    pass


class HolidayRequestUpdate(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    holiday_type_id: Optional[int] = None
    notes: Optional[str] = None
    status: Optional[HolidayStatus] = None
    approved_by: Optional[int] = None


class HolidayRequest(HolidayRequestBase):
    id: int
    total_days: int
    status: HolidayStatus
    approved_by: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class HolidayRequestWithDetails(HolidayRequest):
    user: User
    holiday_type: HolidayType
    approver: Optional[User] = None


# Dashboard Schemas
class DashboardStats(BaseModel):
    total_users: int
    pending_requests: int
    approved_today: int
    on_holiday_today: int
    total_days_booked_this_month: int


class CalendarEvent(BaseModel):
    id: int
    user_name: str
    holiday_type: str
    start_date: date
    end_date: date
    status: str
    color: str
