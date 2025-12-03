#!/usr/bin/env python3
"""Seed the database with demo data."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import date, timedelta
import random

from database import SessionLocal, init_db
import models


def seed_database():
    """Create demo data for the holidays application."""
    init_db()
    db = SessionLocal()

    try:
        # Check if data already exists
        if db.query(models.User).first():
            print("Database already seeded. Skipping...")
            return

        # Create Holiday Types
        holiday_types = [
            models.HolidayType(
                name="Annual Leave",
                description="Regular paid vacation days",
                color="#14b8a6",
                requires_approval=True,
                max_days_per_request=30
            ),
            models.HolidayType(
                name="Sick Leave",
                description="Time off due to illness",
                color="#ef4444",
                requires_approval=False,
                max_days_per_request=10
            ),
            models.HolidayType(
                name="Personal Day",
                description="Personal time off for appointments or family matters",
                color="#8b5cf6",
                requires_approval=True,
                max_days_per_request=3
            ),
            models.HolidayType(
                name="Work From Home",
                description="Working remotely from home",
                color="#3b82f6",
                requires_approval=True,
                max_days_per_request=5
            ),
            models.HolidayType(
                name="Parental Leave",
                description="Time off for new parents",
                color="#ec4899",
                requires_approval=True,
                max_days_per_request=90
            ),
        ]

        for ht in holiday_types:
            db.add(ht)
        db.commit()
        print(f"Created {len(holiday_types)} holiday types")

        # Create Users
        departments = ["Engineering", "Sales", "Marketing", "HR", "Finance", "Operations"]
        users = [
            models.User(
                name="Jan De Vries",
                email="jan.devries@company.com",
                department="Engineering",
                role="manager",
                annual_leave_days=28
            ),
            models.User(
                name="Marie Janssens",
                email="marie.janssens@company.com",
                department="Engineering",
                role="employee",
                annual_leave_days=25
            ),
            models.User(
                name="Pieter Van Dam",
                email="pieter.vandam@company.com",
                department="Sales",
                role="employee",
                annual_leave_days=25
            ),
            models.User(
                name="Sophie Dubois",
                email="sophie.dubois@company.com",
                department="Marketing",
                role="manager",
                annual_leave_days=28
            ),
            models.User(
                name="Thomas Peeters",
                email="thomas.peeters@company.com",
                department="HR",
                role="admin",
                annual_leave_days=30
            ),
            models.User(
                name="Laura Maes",
                email="laura.maes@company.com",
                department="Finance",
                role="employee",
                annual_leave_days=25
            ),
            models.User(
                name="Kevin Wouters",
                email="kevin.wouters@company.com",
                department="Operations",
                role="employee",
                annual_leave_days=25
            ),
            models.User(
                name="Emma Claes",
                email="emma.claes@company.com",
                department="Engineering",
                role="employee",
                annual_leave_days=25
            ),
        ]

        for user in users:
            db.add(user)
        db.commit()
        print(f"Created {len(users)} users")

        # Refresh to get IDs
        db.refresh(users[0])

        # Create Holiday Requests
        today = date.today()

        requests = [
            # Approved requests
            models.HolidayRequest(
                user_id=2,  # Marie
                holiday_type_id=1,  # Annual Leave
                start_date=today + timedelta(days=14),
                end_date=today + timedelta(days=21),
                total_days=8,
                status="approved",
                approved_by=1,
                notes="Summer vacation to Spain"
            ),
            models.HolidayRequest(
                user_id=3,  # Pieter
                holiday_type_id=1,
                start_date=today + timedelta(days=30),
                end_date=today + timedelta(days=34),
                total_days=5,
                status="approved",
                approved_by=4,
                notes="Family reunion"
            ),
            # Pending requests
            models.HolidayRequest(
                user_id=6,  # Laura
                holiday_type_id=1,
                start_date=today + timedelta(days=45),
                end_date=today + timedelta(days=52),
                total_days=8,
                status="pending",
                notes="Christmas holidays"
            ),
            models.HolidayRequest(
                user_id=7,  # Kevin
                holiday_type_id=3,  # Personal Day
                start_date=today + timedelta(days=7),
                end_date=today + timedelta(days=7),
                total_days=1,
                status="pending",
                notes="Doctor appointment"
            ),
            models.HolidayRequest(
                user_id=8,  # Emma
                holiday_type_id=4,  # WFH
                start_date=today + timedelta(days=3),
                end_date=today + timedelta(days=5),
                total_days=3,
                status="pending",
                notes="Waiting for furniture delivery"
            ),
            # Someone on holiday today
            models.HolidayRequest(
                user_id=4,  # Sophie
                holiday_type_id=1,
                start_date=today - timedelta(days=2),
                end_date=today + timedelta(days=3),
                total_days=6,
                status="approved",
                approved_by=5,
                notes="Short break"
            ),
            # Past approved request
            models.HolidayRequest(
                user_id=2,  # Marie
                holiday_type_id=2,  # Sick Leave
                start_date=today - timedelta(days=30),
                end_date=today - timedelta(days=28),
                total_days=3,
                status="approved",
                approved_by=1,
                notes="Flu"
            ),
        ]

        for req in requests:
            db.add(req)
        db.commit()
        print(f"Created {len(requests)} holiday requests")

        print("\n✅ Database seeded successfully!")
        print("\nDemo accounts:")
        for user in users[:3]:
            print(f"  - {user.name} ({user.email}) - {user.role}")

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
