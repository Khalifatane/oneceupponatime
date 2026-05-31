# Supabase Credentials Guide

This project can point to another Supabase project by changing the environment variables. Supabase is used for auth, user sessions, profiles, carts, orders, storage, and admin data reads/writes.

## What Supabase Does Here

Supabase is read through both app-local files and the shared package:

- `apps/storefront/src/lib/supabase.ts`
- `packages/supabase/src/client.ts`
- `apps/admin/src/lib/supabase.ts`
- `apps/storefront/src/services/supabase-service.ts`
- `apps/admin/src/services/supabase-service.ts`

The admin app imports the shared `@siggistore/supabase` client. The storefront has a local client and also uses shared services in some places. Use the same root `.env.local` values for the whole repo.

## Required Variables

Put these in `.env.local` at the repo root:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Optional:

```env
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

The code also supports `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as fallbacks, but this repo should use `VITE_*` names first.

## How To Change To Another Supabase Project

1. Open the new Supabase project dashboard.
2. Go to Project Settings -> API.
3. Copy the Project URL into `VITE_SUPABASE_URL`.
4. Copy the anon/public key into `VITE_SUPABASE_ANON_KEY`.
5. Only if a server/admin script needs it, copy the service role key into `VITE_SUPABASE_SERVICE_ROLE_KEY`.
6. Restart the dev server. Vite env variables are loaded when the server starts.
7. Test login, account creation, profile pages, cart, checkout, and admin dashboard pages.

## Important Security Notes

- `VITE_SUPABASE_ANON_KEY` is safe to expose in browser code when Row Level Security policies are correct.
- The service role key bypasses RLS. Treat it as a server-only secret.
- Do not commit `.env.local`.
- Do not paste real credentials into docs, issues, screenshots, or frontend HTML.

## Database Requirements

Changing credentials points the app to a different Supabase backend, but it does not create the database schema. The new Supabase project needs the same tables, policies, storage buckets, and auth settings.

Expected areas include:

- Auth users and email/password settings.
- Profiles/customers data.
- Orders and order items.
- Cart or cart item persistence.
- Storage for avatars or user-uploaded files if enabled.
- RLS policies that allow the storefront user to read/write only their own data.
- Admin access rules for dashboard operations.

If the app connects but pages are empty or actions fail, the most likely cause is missing tables, missing RLS policies, or mismatched column names.

## Session Behavior

The shared Supabase package uses a fixed storage key:

```text
siggistore-auth-token
```

That means storefront and admin can share a browser auth session when served from the same domain. After changing credentials, sign out and sign in again so the browser session belongs to the new Supabase project.

## Common Problems

`Missing Supabase configuration`
: `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing. Add both to `.env.local` and restart the dev server.

Login fails
: Check Auth settings in Supabase, email confirmation settings, and that the URL/key pair come from the same project.

Data requests return empty
: The user may not own any rows in the new project, or RLS policies may block access.

Data requests return permission errors
: RLS policies are missing or too strict for the tables being used.

Admin dashboard fails
: The new project may not have the expected admin tables, policies, or service role setup.

## Quick Verification

After changing credentials:

```powershell
pnpm build:storefront
```

Then run the apps and verify:

- Storefront login/create account.
- Personal info/profile page.
- Cart and checkout flow.
- Order list/order detail.
- Admin dashboard data.
