# Supabase Project Reuse Guide

This guide explains how to export a Supabase project so it can be reused in another Supabase project or restored later.

## What You Need To Export

A Supabase project is more than credentials. To reuse it correctly, save these parts:

- Database schema: tables, columns, indexes, functions, triggers, RLS policies.
- Database data: rows from your tables.
- Storage setup: buckets and files.
- Auth settings: providers, redirect URLs, email settings.
- Edge Functions and secrets, if used.
- New `.env.local` credentials for the project you restore into.

The database export is the most important part for this app because the storefront/admin expect specific tables and policies.

## Install And Link Supabase CLI

From the repo root:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

Find `YOUR_PROJECT_REF` in the Supabase dashboard project URL or Project Settings.

## Export Schema

Schema means structure: tables, policies, functions, triggers, and database objects.

```powershell
npx supabase db dump -f supabase/schema.sql
```

Commit this file only if it does not contain sensitive data. Schema usually does not include table rows, but review it before sharing.

## Export Data

Data means actual rows inside your tables.

```powershell
npx supabase db dump -f supabase/data.sql --data-only --use-copy
```

Be careful with this file. It can include customer information, orders, profiles, addresses, and auth-related records depending on what is exported.

## Pull Schema As Migrations

If you want the project schema tracked as migrations instead of one large SQL file:

```powershell
npx supabase db pull
```

This creates a migration file under `supabase/migrations`. Use this when you want the database structure to live cleanly in Git.

## Restore Into Another Supabase Project

1. Create the new Supabase project.
2. Copy the new database connection string from the Supabase dashboard.
3. Restore schema first.
4. Restore data second.

```powershell
psql "NEW_PROJECT_DATABASE_CONNECTION_STRING" -f supabase/schema.sql
psql "NEW_PROJECT_DATABASE_CONNECTION_STRING" -f supabase/data.sql
```

If `psql` is not installed, install PostgreSQL tools or use another SQL restore tool that can connect to Supabase Postgres.

## Update This App To Use The New Project

After restoring, change `.env.local`:

```env
VITE_SUPABASE_URL=https://new-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_new_anon_key
```

Optional, only for server/admin scripts that truly need it:

```env
VITE_SUPABASE_SERVICE_ROLE_KEY=your_new_service_role_key
```

Restart the dev server after changing env values.

## Storage Buckets And Files

Database dumps do not fully copy storage files. If this project uses avatars, product uploads, or other Supabase Storage files, recreate the buckets in the new project and copy the files separately.

At minimum, check:

- Bucket names.
- Public/private bucket settings.
- Storage RLS policies.
- Uploaded file paths referenced by database rows.

## Auth Settings To Recreate

In the new Supabase dashboard, review:

- Email/password auth setting.
- OAuth providers, if any.
- Site URL.
- Redirect URLs.
- Email templates.
- SMTP settings, if configured.

Even if users are restored in the database, provider settings and redirect URLs are project configuration and may need manual setup.

## Security Checklist

- Do not commit `.env.local`.
- Do not commit `data.sql` if it contains real customer/user data.
- Do not expose the service role key in frontend code.
- Review exported SQL before sending it to anyone.
- Rotate keys if credentials were shared by mistake.

## Quick Test After Restore

Run the app against the new credentials and verify:

- Storefront login and create account.
- Personal info/profile page.
- Cart and checkout.
- My orders and order details.
- Admin dashboard data.
- File uploads or avatar loading, if used.

If login works but data is empty, the new project may not have restored data or RLS policies may be blocking reads. If the app cannot connect, check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
