from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, Boolean, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), nullable=False, unique=True)
    department = Column(String(100), nullable=False)
    role = Column(String(50), nullable=False, default="employee")
    annual_leave_days = Column(Integer, nullable=False, default=25)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    holiday_requests = relationship("HolidayRequest", back_populates="user", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint(role.in_(['employee', 'manager', 'admin']), name='valid_role'),
    )


class HolidayType(Base):
    __tablename__ = "holiday_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text)
    color = Column(String(20), default="#14b8a6")  # Mint color default
    requires_approval = Column(Boolean, default=True)
    max_days_per_request = Column(Integer, default=30)
    is_active = Column(Boolean, default=True)

    # Relationships
    holiday_requests = relationship("HolidayRequest", back_populates="holiday_type")


class HolidayRequest(Base):
    __tablename__ = "holiday_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    holiday_type_id = Column(Integer, ForeignKey("holiday_types.id"), nullable=False, index=True)
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False, index=True)
    total_days = Column(Integer, nullable=False)
    status = Column(String(20), default="pending", index=True)
    notes = Column(Text)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="holiday_requests", foreign_keys=[user_id])
    holiday_type = relationship("HolidayType", back_populates="holiday_requests")
    approver = relationship("User", foreign_keys=[approved_by])

    __table_args__ = (
        CheckConstraint(status.in_(['pending', 'approved', 'rejected', 'cancelled']), name='valid_status'),
    )
