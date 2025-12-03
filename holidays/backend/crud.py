from datetime import date, datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
import models
import schemas


# User CRUD
def get_users(db: Session, skip: int = 0, limit: int = 100, is_active: Optional[bool] = None) -> List[models.User]:
    query = db.query(models.User)
    if is_active is not None:
        query = query.filter(models.User.is_active == is_active)
    return query.offset(skip).limit(limit).all()


def get_user(db: Session, user_id: int) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email).first()


def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    db_user = models.User(**user.model_dump())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def update_user(db: Session, user_id: int, user: schemas.UserUpdate) -> Optional[models.User]:
    db_user = get_user(db, user_id)
    if db_user:
        update_data = user.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_user, key, value)
        db.commit()
        db.refresh(db_user)
    return db_user


def delete_user(db: Session, user_id: int) -> bool:
    db_user = get_user(db, user_id)
    if db_user:
        db.delete(db_user)
        db.commit()
        return True
    return False


def get_user_with_balance(db: Session, user_id: int, year: int = None) -> Optional[schemas.UserWithBalance]:
    if year is None:
        year = datetime.now().year

    user = get_user(db, user_id)
    if not user:
        return None

    # Calculate used days for the year
    used_days = db.query(func.sum(models.HolidayRequest.total_days)).filter(
        models.HolidayRequest.user_id == user_id,
        models.HolidayRequest.status == "approved",
        func.extract('year', models.HolidayRequest.start_date) == year
    ).scalar() or 0

    return schemas.UserWithBalance(
        **{k: v for k, v in user.__dict__.items() if not k.startswith('_')},
        used_days=used_days,
        remaining_days=user.annual_leave_days - used_days
    )


# Holiday Type CRUD
def get_holiday_types(db: Session, is_active: Optional[bool] = None) -> List[models.HolidayType]:
    query = db.query(models.HolidayType)
    if is_active is not None:
        query = query.filter(models.HolidayType.is_active == is_active)
    return query.all()


def get_holiday_type(db: Session, type_id: int) -> Optional[models.HolidayType]:
    return db.query(models.HolidayType).filter(models.HolidayType.id == type_id).first()


def create_holiday_type(db: Session, holiday_type: schemas.HolidayTypeCreate) -> models.HolidayType:
    db_type = models.HolidayType(**holiday_type.model_dump())
    db.add(db_type)
    db.commit()
    db.refresh(db_type)
    return db_type


def update_holiday_type(db: Session, type_id: int, holiday_type: schemas.HolidayTypeUpdate) -> Optional[models.HolidayType]:
    db_type = get_holiday_type(db, type_id)
    if db_type:
        update_data = holiday_type.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_type, key, value)
        db.commit()
        db.refresh(db_type)
    return db_type


def delete_holiday_type(db: Session, type_id: int) -> bool:
    db_type = get_holiday_type(db, type_id)
    if db_type:
        db.delete(db_type)
        db.commit()
        return True
    return False


# Holiday Request CRUD
def get_holiday_requests(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[int] = None,
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> List[models.HolidayRequest]:
    query = db.query(models.HolidayRequest)

    if user_id is not None:
        query = query.filter(models.HolidayRequest.user_id == user_id)
    if status is not None:
        query = query.filter(models.HolidayRequest.status == status)
    if start_date is not None:
        query = query.filter(models.HolidayRequest.start_date >= start_date)
    if end_date is not None:
        query = query.filter(models.HolidayRequest.end_date <= end_date)

    return query.order_by(models.HolidayRequest.start_date.desc()).offset(skip).limit(limit).all()


def get_holiday_request(db: Session, request_id: int) -> Optional[models.HolidayRequest]:
    return db.query(models.HolidayRequest).filter(models.HolidayRequest.id == request_id).first()


def create_holiday_request(db: Session, request: schemas.HolidayRequestCreate) -> models.HolidayRequest:
    # Calculate total days (simple calculation, excluding weekends could be added)
    total_days = (request.end_date - request.start_date).days + 1

    db_request = models.HolidayRequest(
        **request.model_dump(),
        total_days=total_days
    )
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    return db_request


def update_holiday_request(db: Session, request_id: int, request: schemas.HolidayRequestUpdate) -> Optional[models.HolidayRequest]:
    db_request = get_holiday_request(db, request_id)
    if db_request:
        update_data = request.model_dump(exclude_unset=True)

        # Recalculate total days if dates changed
        start = update_data.get('start_date', db_request.start_date)
        end = update_data.get('end_date', db_request.end_date)
        if 'start_date' in update_data or 'end_date' in update_data:
            update_data['total_days'] = (end - start).days + 1

        for key, value in update_data.items():
            setattr(db_request, key, value)
        db.commit()
        db.refresh(db_request)
    return db_request


def delete_holiday_request(db: Session, request_id: int) -> bool:
    db_request = get_holiday_request(db, request_id)
    if db_request:
        db.delete(db_request)
        db.commit()
        return True
    return False


def approve_holiday_request(db: Session, request_id: int, approver_id: int) -> Optional[models.HolidayRequest]:
    db_request = get_holiday_request(db, request_id)
    if db_request and db_request.status == "pending":
        db_request.status = "approved"
        db_request.approved_by = approver_id
        db_request.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_request)
    return db_request


def reject_holiday_request(db: Session, request_id: int, approver_id: int) -> Optional[models.HolidayRequest]:
    db_request = get_holiday_request(db, request_id)
    if db_request and db_request.status == "pending":
        db_request.status = "rejected"
        db_request.approved_by = approver_id
        db_request.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_request)
    return db_request


# Dashboard
def get_dashboard_stats(db: Session) -> schemas.DashboardStats:
    today = date.today()
    current_month_start = today.replace(day=1)

    total_users = db.query(func.count(models.User.id)).filter(models.User.is_active == True).scalar()

    pending_requests = db.query(func.count(models.HolidayRequest.id)).filter(
        models.HolidayRequest.status == "pending"
    ).scalar()

    approved_today = db.query(func.count(models.HolidayRequest.id)).filter(
        models.HolidayRequest.status == "approved",
        func.date(models.HolidayRequest.updated_at) == today
    ).scalar()

    on_holiday_today = db.query(func.count(models.HolidayRequest.id)).filter(
        models.HolidayRequest.status == "approved",
        models.HolidayRequest.start_date <= today,
        models.HolidayRequest.end_date >= today
    ).scalar()

    total_days_booked = db.query(func.sum(models.HolidayRequest.total_days)).filter(
        models.HolidayRequest.status == "approved",
        models.HolidayRequest.start_date >= current_month_start
    ).scalar() or 0

    return schemas.DashboardStats(
        total_users=total_users,
        pending_requests=pending_requests,
        approved_today=approved_today,
        on_holiday_today=on_holiday_today,
        total_days_booked_this_month=total_days_booked
    )


def get_calendar_events(
    db: Session,
    start_date: date,
    end_date: date,
    user_id: Optional[int] = None
) -> List[schemas.CalendarEvent]:
    query = db.query(models.HolidayRequest).join(models.User).join(models.HolidayType).filter(
        models.HolidayRequest.status.in_(["approved", "pending"]),
        or_(
            and_(models.HolidayRequest.start_date >= start_date, models.HolidayRequest.start_date <= end_date),
            and_(models.HolidayRequest.end_date >= start_date, models.HolidayRequest.end_date <= end_date),
            and_(models.HolidayRequest.start_date <= start_date, models.HolidayRequest.end_date >= end_date)
        )
    )

    if user_id:
        query = query.filter(models.HolidayRequest.user_id == user_id)

    requests = query.all()

    return [
        schemas.CalendarEvent(
            id=req.id,
            user_name=req.user.name,
            holiday_type=req.holiday_type.name,
            start_date=req.start_date,
            end_date=req.end_date,
            status=req.status,
            color=req.holiday_type.color
        )
        for req in requests
    ]


def get_pending_requests_for_approval(db: Session, limit: int = 10) -> List[models.HolidayRequest]:
    return db.query(models.HolidayRequest).filter(
        models.HolidayRequest.status == "pending"
    ).order_by(models.HolidayRequest.created_at.asc()).limit(limit).all()
