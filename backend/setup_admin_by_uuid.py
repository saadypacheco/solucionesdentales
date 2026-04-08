#!/usr/bin/env python3
"""
Script to set up admin user when UUID is known.
Usage: python setup_admin_by_uuid.py <email> <uuid> <password>
"""

import sys
import os
from dotenv import load_dotenv
from app.db.client import get_supabase_client

load_dotenv()


def setup_admin_with_uuid(email: str, uuid: str, password: str):
    """Set up admin user with known UUID."""
    db = get_supabase_client()

    try:
        print(f"Setting up admin user with UUID")
        print(f"  Email: {email}")
        print(f"  UUID: {uuid}")

        # Step 1: Update password in Supabase Auth
        print(f"\n1. Updating password in Supabase Auth...")
        db.auth.admin.update_user_by_id(uuid, {"password": password})
        print(f"   [OK] Password updated")

        # Step 2: Delete any existing usuarios record with different UUID
        existing = db.table("usuarios").select("id").eq("email", email).execute()
        if existing.data:
            old_id = existing.data[0]["id"]
            if old_id != uuid:
                print(f"\n2. Fixing UUID mismatch...")
                print(f"   Old ID: {old_id}")
                print(f"   New ID: {uuid}")
                db.table("usuarios").delete().eq("id", old_id).execute()
                print(f"   [OK] Deleted old record")

        # Step 3: Ensure correct record in usuarios table
        print(f"\n3. Creating/updating in usuarios table...")
        existing = db.table("usuarios").select("id").eq("id", uuid).execute()
        if existing.data:
            # Update
            db.table("usuarios").update({
                "email": email,
                "nombre": "Admin",
                "rol": "admin",
                "activo": True,
            }).eq("id", uuid).execute()
            print(f"   [OK] Updated existing record")
        else:
            # Create
            db.table("usuarios").insert({
                "id": uuid,
                "email": email,
                "nombre": "Admin",
                "rol": "admin",
                "activo": True,
            }).execute()
            print(f"   [OK] Created new record")

        # Success!
        print(f"\n{'-'*50}")
        print(f"Admin setup complete!")
        print(f"  Email: {email}")
        print(f"  Password: {password}")
        print(f"  UUID: {uuid}")
        print(f"  Login: http://localhost:3000/admin/login")
        print(f"{'-'*50}")

    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python setup_admin_by_uuid.py <email> <uuid> <password>")
        print("Example: python setup_admin_by_uuid.py admin@soluciones.com 550e8400-e29b-41d4-a716-446655440000 Admin123!")
        sys.exit(1)

    email = sys.argv[1]
    uuid = sys.argv[2]
    password = sys.argv[3]

    setup_admin_with_uuid(email, uuid, password)
