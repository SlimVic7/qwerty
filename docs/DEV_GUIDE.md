# QWERTY Development Guide

## Creating a Privileged Test Account

For security reasons, normal registration flows exclusively grant the `candidate` role. The application deliberately lacks any public frontend UI to elevate a user to `recruiter`, `admin`, or `super_admin`.

To create a privileged account for testing or internal operations, follow this procedure:

1. **Register Normally:**
   Create a new account using the standard `/register` page in the application (or sign in via Google OAuth once configured).

2. **Access Supabase SQL Editor:**
   Log into the Supabase Dashboard for the `qwerty_dev` project and navigate to the SQL Editor.

3. **Find the User ID:**
   Run the following query to find the UUID of the newly registered user:
   ```sql
   SELECT id, email FROM auth.users WHERE email = 'your.test.email@example.com';
   ```

4. **Elevate Role:**
   Execute an update on the `user_roles` table to grant the desired role. Since the initial registration trigger automatically inserts a `candidate` role, update it directly:
   ```sql
   UPDATE public.user_roles 
   SET role = 'admin' 
   WHERE user_id = 'THE-UUID-FOUND-IN-STEP-3';
   ```
   *(Supported roles: `candidate`, `recruiter`, `editor`, `admin`, `super_admin`)*

5. **Sign Out and Sign Back In:**
   In the QWERTY application, sign out and sign back in to refresh the JWT and fetch the updated roles into the frontend React context. You will now be able to access the `/0ps26` workspace.
