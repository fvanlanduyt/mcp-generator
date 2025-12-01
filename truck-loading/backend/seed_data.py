"""Generate realistic demo data for the LNG Truck Loading system."""
import random
from datetime import datetime, date, time, timedelta
from database import SessionLocal, init_db
from models import Customer, Station, LoadingSlot, Reservation


def clear_database(db):
    """Clear all existing data."""
    db.query(Reservation).delete()
    db.query(LoadingSlot).delete()
    db.query(Station).delete()
    db.query(Customer).delete()
    db.commit()


def create_customers(db):
    """Create sample customers."""
    customers_data = [
        {
            "name": "Acme Gas Trading BV",
            "contact_person": "Jan Vermeersch",
            "email": "jan.vermeersch@acmegas.be",
            "phone": "+32 50 123 456",
            "contract_type": "contract"
        },
        {
            "name": "EuroLNG Transport NV",
            "contact_person": "Marie Dubois",
            "email": "m.dubois@eurolng.eu",
            "phone": "+32 3 987 654",
            "contract_type": "contract"
        },
        {
            "name": "Green Energy Solutions",
            "contact_person": "Thomas Van den Berg",
            "email": "t.vandenberg@greenenergy.nl",
            "phone": "+31 20 555 1234",
            "contract_type": "contract"
        },
        {
            "name": "Nordic Fuel AS",
            "contact_person": "Erik Johansson",
            "email": "erik.j@nordicfuel.no",
            "phone": "+47 22 334 455",
            "contract_type": "spot"
        },
        {
            "name": "Mediterranean Gas Ltd",
            "contact_person": "Sofia Papadopoulos",
            "email": "sofia@medgas.gr",
            "phone": "+30 210 123 4567",
            "contract_type": "spot"
        }
    ]

    customers = []
    for data in customers_data:
        customer = Customer(**data)
        db.add(customer)
        customers.append(customer)

    db.commit()
    for c in customers:
        db.refresh(c)

    print(f"Created {len(customers)} customers")
    return customers


def create_stations(db):
    """Create sample stations."""
    stations_data = [
        {
            "name": "Zeebrugge Terminal 1",
            "location": "Veerbootstraat 7, 8380 Zeebrugge, Belgium",
            "capacity_per_hour": 150.0,
            "operating_hours_start": time(6, 0),
            "operating_hours_end": time(22, 0),
            "is_active": True
        },
        {
            "name": "Zeebrugge Terminal 2",
            "location": "LNG-dok 12, 8380 Zeebrugge, Belgium",
            "capacity_per_hour": 200.0,
            "operating_hours_start": time(5, 0),
            "operating_hours_end": time(23, 0),
            "is_active": True
        },
        {
            "name": "Antwerp LNG Terminal",
            "location": "Scheldelaan 600, 2040 Antwerpen, Belgium",
            "capacity_per_hour": 180.0,
            "operating_hours_start": time(6, 0),
            "operating_hours_end": time(20, 0),
            "is_active": True
        }
    ]

    stations = []
    for data in stations_data:
        station = Station(**data)
        db.add(station)
        stations.append(station)

    db.commit()
    for s in stations:
        db.refresh(s)

    print(f"Created {len(stations)} stations")
    return stations


def create_loading_slots(db, stations):
    """Create loading slots for the next 14 days."""
    slots = []
    today = date.today()

    # Slot templates (start time, end time, max volume)
    slot_templates = [
        (time(6, 0), time(8, 0), 45.0),
        (time(8, 30), time(10, 30), 50.0),
        (time(11, 0), time(13, 0), 55.0),
        (time(14, 0), time(16, 0), 50.0),
        (time(16, 30), time(18, 30), 45.0),
        (time(19, 0), time(21, 0), 40.0),
    ]

    for day_offset in range(14):
        current_date = today + timedelta(days=day_offset)

        for station in stations:
            # Get station operating hours
            station_start = station.operating_hours_start
            station_end = station.operating_hours_end

            # Create 3-4 slots per day per station
            num_slots = random.randint(3, 4)
            selected_templates = random.sample(slot_templates, num_slots)

            for start_time, end_time, max_volume in selected_templates:
                # Skip if outside operating hours
                if start_time < station_start or end_time > station_end:
                    continue

                # Vary the max volume slightly
                volume_variation = random.uniform(0.9, 1.1)
                adjusted_volume = round(max_volume * volume_variation, 1)

                slot = LoadingSlot(
                    station_id=station.id,
                    date=current_date,
                    start_time=start_time,
                    end_time=end_time,
                    max_volume=adjusted_volume,
                    status="available"
                )
                db.add(slot)
                slots.append(slot)

    db.commit()
    for s in slots:
        db.refresh(s)

    print(f"Created {len(slots)} loading slots")
    return slots


def create_reservations(db, customers, slots):
    """Create sample reservations."""
    # Belgian license plate formats
    license_plates = [
        "1-ABC-123", "1-XYZ-789", "2-DEF-456", "1-GHI-321",
        "2-JKL-654", "1-MNO-987", "2-PQR-159", "1-STU-753",
        "2-VWX-852", "1-YZA-951", "2-BCD-147", "1-EFG-258",
        "2-HIJ-369", "1-KLM-741", "2-NOP-852", "1-QRS-963"
    ]

    # Driver names
    drivers = [
        "Pieter Janssens", "Marc De Smet", "Koen Peeters",
        "Luc Van Damme", "Filip Maes", "Joris Claes",
        "Wim Jacobs", "Dirk Willems", "Geert Mertens",
        "Hans Goossens", "Tom Hermans", "Bart Michiels"
    ]

    statuses = ["pending", "confirmed", "in_progress", "completed", "cancelled"]
    status_weights = [0.15, 0.25, 0.1, 0.4, 0.1]

    reservations = []
    used_slot_ids = set()
    today = date.today()

    # Create 15-20 reservations
    num_reservations = random.randint(15, 20)

    for _ in range(num_reservations):
        # Find an available slot that hasn't been used
        available_slots = [s for s in slots if s.id not in used_slot_ids and s.status == "available"]

        if not available_slots:
            break

        slot = random.choice(available_slots)
        used_slot_ids.add(slot.id)

        customer = random.choice(customers)
        license_plate = random.choice(license_plates)
        driver = random.choice(drivers)

        # Determine status based on slot date
        if slot.date < today:
            # Past dates: mostly completed
            status = random.choices(["completed", "cancelled"], weights=[0.85, 0.15])[0]
        elif slot.date == today:
            # Today: mix of statuses
            status = random.choices(statuses, weights=status_weights)[0]
        else:
            # Future dates: pending or confirmed
            status = random.choices(["pending", "confirmed"], weights=[0.4, 0.6])[0]

        # Update slot status based on reservation status
        if status in ["pending", "confirmed", "in_progress"]:
            slot.status = "reserved"
        elif status == "completed":
            slot.status = "completed"
        # cancelled leaves slot as available

        # Requested volume should be reasonable
        requested_volume = round(random.uniform(20, min(slot.max_volume, 50)), 1)

        notes_options = [
            None,
            "Priority loading - contract customer",
            "Please prepare documents in advance",
            "Driver will arrive 15 minutes early",
            "Requires special documentation",
            None,
            None
        ]

        reservation = Reservation(
            slot_id=slot.id,
            customer_id=customer.id,
            requested_volume=requested_volume,
            truck_license_plate=license_plate,
            driver_name=driver,
            status=status,
            notes=random.choice(notes_options),
            created_at=datetime.now() - timedelta(days=random.randint(0, 7))
        )
        db.add(reservation)
        reservations.append(reservation)

    db.commit()

    print(f"Created {len(reservations)} reservations")
    return reservations


def seed_database():
    """Main function to seed the database."""
    print("Initializing database...")
    init_db()

    db = SessionLocal()

    try:
        print("Clearing existing data...")
        clear_database(db)

        print("Creating customers...")
        customers = create_customers(db)

        print("Creating stations...")
        stations = create_stations(db)

        print("Creating loading slots...")
        slots = create_loading_slots(db, stations)

        print("Creating reservations...")
        reservations = create_reservations(db, customers, slots)

        print("\n" + "="*50)
        print("Database seeding completed successfully!")
        print("="*50)
        print(f"  - {len(customers)} customers")
        print(f"  - {len(stations)} stations")
        print(f"  - {len(slots)} loading slots")
        print(f"  - {len(reservations)} reservations")
        print("="*50)

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
