# Admin User Setup Guide

There's a mismatch between the Supabase Auth user and the usuarios table. Follow these steps to fix it:

## Option A: Use Supabase Console (Recommended)

1. Go to https://app.supabase.com
2. Login and select your project
3. Go to **Authentication > Users**
4. Find **admin@soluciones.com**
5. Click on it to open the user details
6. Scroll down and click **"Reset Password"**
7. Set password to: `Admin123!`
8. **Copy the USER ID** (UUID) shown at the top or in the user details
9. Once you have the UUID, run:
   ```bash
   python setup_admin_by_uuid.py admin@soluciones.com <PASTE-UUID-HERE> Admin123!
   ```

## Option B: Use Python Script (If you have the UUID)

If you already know the user's UUID from Supabase Auth, run:

```bash
python setup_admin_by_uuid.py admin@soluciones.com <uuid> Admin123!
```

Example:
```bash
python setup_admin_by_uuid.py admin@soluciones.com 550e8400-e29b-41d4-a716-446655440000 Admin123!
```

## Verify It Works

Once setup is complete, try logging in:

1. Start the frontend: `npm run dev` in the `frontend/` directory
2. Go to http://localhost:3000/admin/login
3. Enter:
   - Email: admin@soluciones.com
   - Password: Admin123!
4. Click "Ingresar"

You should see the admin dashboard!

## What The Scripts Do

- `setup_admin.py <email> <password>` - Creates a new admin user (fails if user exists in auth.users)
- `setup_admin_by_uuid.py <email> <uuid> <password>` - Updates password for existing user and syncs with usuarios table

## Troubleshooting

### Still getting 401 Unauthorized?

Check the browser console (DevTools > Console tab) and look for:
- Network errors in the Network tab
- Specific error messages in the Console tab

Then:
1. Verify the email is spelled correctly
2. Verify the password matches what you set
3. Check that the frontend backend URL is correct (should be http://localhost:8001)
4. Ensure the backend is running and you can access http://localhost:8001/health

### Password not working?

The password might not have been properly updated. Run setup_admin_by_uuid.py again with the correct UUID.

### How do I find my UUID?

In Supabase Console:
1. Auth > Users
2. Click on the user row
3. The UUID is shown at the top of the details panel
4. Or you can see it in the URL bar: `.../users/<UUID>`
