#!/usr/bin/env python3
"""
Script to set up the admin user in Supabase Auth and usuarios table.
Usage: python setup_admin.py <email> <password>
"""

import sys
import os
from dotenv import load_dotenv
from app.db.client import get_supabase_client

load_dotenv()


def setup_admin(email: str, password: str):
    """Create admin user in Supabase Auth and usuarios table."""
    db = get_supabase_client()

    try:
        print(f"Setting up admin user: {email}")
        print(f"{'='*60}")

        # Step 1: Clean up any orphaned records in usuarios table
        print(f"\n1. Checking for orphaned records in usuarios table...")
        existing = db.table("usuarios").select("id, email").eq("email", email).execute()
        if existing.data:
            for user in existing.data:
                print(f"   Found orphaned record: {user['id']}")
                print(f"   Deleting...")
                db.table("usuarios").delete().eq("id", user["id"]).execute()
                print(f"   [OK] Deleted")

        # Step 2: Create user in Supabase Auth
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
            error_str = str(auth_error).lower()
            if "duplicate" in error_str:
                print(f"   [ERROR] User {email} already exists in Supabase Auth")
                print(f"   You need to delete it first from Supabase Console:")
                print(f"   1. Go to https://app.supabase.com")
                print(f"   2. Auth > Users")
                print(f"   3. Find {email}")
                print(f"   4. Click the three dots menu > Delete user")
                print(f"   5. Then run this script again")
                sys.exit(1)
            else:
                print(f"   [ERROR] Could not create user: {auth_error}")
                import traceback
                traceback.print_exc()
                sys.exit(1)

        # Step 3: Create in usuarios table with matching UUID
        print(f"\n3. Creating in usuarios table...")
        try:
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
        except Exception as insert_error:
            print(f"   [ERROR] Could not create in usuarios: {insert_error}")
            sys.exit(1)

        # Success!
        print(f"\n{'='*60}")
        print(f"SUCCESS! Admin user setup complete")
        print(f"{'='*60}")
        print(f"  Email:    {email}")
        print(f"  Password: {password}")
        print(f"  UUID:     {user_id}")
        print(f"\nNext step: Go to http://localhost:3000/admin/login")
        print(f"{'='*60}\n")

    except Exception as e:
        print(f"\n[FATAL ERROR] {e}")
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
