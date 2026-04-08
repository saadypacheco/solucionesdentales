#!/usr/bin/env python3
"""
Script to set up the admin user in Supabase Auth.
Usage: python setup_admin.py <email> <password> [--get-uuid]
"""

import sys
import os
from dotenv import load_dotenv
from app.db.client import get_supabase_client

load_dotenv()


def find_auth_user_uuid(email: str) -> str | None:
    """Find the UUID of a user in auth.users by email."""
    db = get_supabase_client()
    try:
        # Use Supabase CLI or direct SQL is needed here
        # For now, we'll return None and guide the user
        return None
    except Exception as e:
        print(f"[WARNING] Could not find user UUID: {e}")
        return None


def setup_admin(email: str, password: str):
    """Create or update admin user in Supabase Auth and usuarios table."""
    db = get_supabase_client()

    try:
        print(f"Setting up admin user: {email}")

        # Step 1: Delete conflicting record from usuarios table if it exists with wrong structure
        print(f"\n1. Checking usuarios table...")
        existing = db.table("usuarios").select("id").eq("email", email).execute()
        if existing.data:
            old_id = existing.data[0]["id"]
            print(f"   Found user with ID: {old_id}")
            print(f"   WARNING: This user ID might not match auth.users UUID")
            print(f"   Deleting this record to avoid conflicts...")
            db.table("usuarios").delete().eq("id", old_id).execute()

        # Step 2: Try to create user in Supabase Auth
        print(f"\n2. Creating user in Supabase Auth...")
        try:
            auth_res = db.auth.admin.create_user(
                {
                    "email": email,
                    "password": password,
                    "email_confirm": True,
                }
            )
            user_id = auth_res.user.id
            print(f"   [OK] User created with UUID: {user_id}")
        except Exception as auth_error:
            # User already exists, need to find and update
            if "duplicate" in str(auth_error).lower():
                print(f"   [INFO] User already exists in auth.users")
                print(f"   [INFO] Updating password...")
                # We need the UUID from auth.users - since we can't query it directly,
                # we'll need manual intervention
                print(f"\n   ACTION REQUIRED:")
                print(f"   The user already exists in Supabase Auth but with an unknown UUID.")
                print(f"   Please do one of the following:")
                print(f"   A) Go to Supabase Console > Auth Users > Find {email} > Click it > Reset Password")
                print(f"   B) Or provide the UUID and run: python setup_admin_by_uuid.py {email} <UUID> {password}")
                sys.exit(1)
            else:
                print(f"   [ERROR] Could not create user: {auth_error}")
                sys.exit(1)

        # Step 3: Create in usuarios table with correct UUID
        print(f"\n3. Creating in usuarios table...")
        db.table("usuarios").insert(
            {
                "id": user_id,
                "email": email,
                "nombre": "Admin",
                "rol": "admin",
                "activo": True,
            }
        ).execute()
        print(f"   [OK] User created in usuarios table")

        # Success!
        print(f"\n{'-'*50}")
        print(f"Admin setup complete!")
        print(f"  Email: {email}")
        print(f"  Password: {password}")
        print(f"  UUID: {user_id}")
        print(f"  Login: http://localhost:3000/admin/login")
        print(f"{'-'*50}")

    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python setup_admin.py <email> <password>")
        print("Example: python setup_admin.py admin@soluciones.com Admin123!")
        sys.exit(1)

    email = sys.argv[1]
    password = sys.argv[2]

    setup_admin(email, password)
