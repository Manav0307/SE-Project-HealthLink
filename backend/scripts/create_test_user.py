"""
scripts/create_test_user.py

Standalone utility — inserts a test patient with known login credentials.
Useful for local dev without running the full CSV seed.

Run from the api/ directory:
    python scripts/create_test_user.py
    python scripts/create_test_user.py --email me@example.com --password mypassword
"""
import asyncio
import argparse
import os
import sys
# Fix Windows terminal encoding so emoji output doesn't crash the script
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, func

from app.core.config import settings
from app.core.security import hash_password
from app.models.patient import Patient


async def create_test_user(email: str, password: str, name: str):
    db_url = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
    engine = create_async_engine(db_url, echo=False)
    SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with SessionLocal() as db:
        # Check if email already used
        result = await db.execute(select(Patient).where(Patient.email == email))
        existing = result.scalar_one_or_none()
        if existing:
            print(f"⚠️  A patient with email '{email}' already exists (id={existing.patient_id}).")
            print(f"   Updating password hash...")
            existing.password_hash = hash_password(password)
            await db.commit()
            print(f"\n✅ Password updated for existing user.")
            print(f"   patient_id : {existing.patient_id}")
            print(f"   name       : {existing.name}")
            print(f"   email      : {email}")
            print(f"   password   : {password}")
            return

        # Generate next R-prefixed ID
        count_result = await db.execute(
            select(func.count()).where(Patient.patient_id.like("R%"))
        )
        count = count_result.scalar_one() or 0
        patient_id = f"R{str(count + 1).zfill(5)}"

        patient = Patient(
            patient_id=patient_id,
            name=name,
            email=email,
            password_hash=hash_password(password),
            portal_active=True,
            reliability_grade="B",
            punctuality_score=0.0,
            avg_wait_time_min=0.0,
            total_appointments=0,
            no_show_count=0,
            two_fa_enabled=False,
            biometric_enabled=False,
        )
        db.add(patient)
        await db.commit()

        print("\n✅ Test user created successfully!")
        print(f"   patient_id : {patient_id}")
        print(f"   name       : {name}")
        print(f"   email      : {email}")
        print(f"   password   : {password}")
        print("\nYou can now log in at http://localhost:3000/login")

    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create a test patient user")
    parser.add_argument("--email",    default="test@healthlink.com")
    parser.add_argument("--password", default="health123")
    parser.add_argument("--name",     default="Test User")
    args = parser.parse_args()

    asyncio.run(create_test_user(args.email, args.password, args.name))
