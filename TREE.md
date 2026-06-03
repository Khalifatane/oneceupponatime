# TREE

This repository is organized as a `pnpm`/Turbo monorepo with two Vite apps and shared workspace packages.

Large dependency/build/generated-asset directories are shown as directories, but their internal contents are intentionally collapsed: `.git/`, `.turbo/`, `dist/`, `node_modules/`, package-level `node_modules/`, and the large vendored asset trees under app `public/` folders.

```text
D:\inchallah
|-- .git/                         # Git metadata
|-- .turbo/                       # Turbo cache
|-- apps/
|   |-- storefront/               # Customer commerce app (Vite + React)
|   |   |-- public/
|   |   |   |-- assets/
|   |   |   |   `-- eprose.svg
|   |   |   |-- css/              # Vendored/generated CSS assets
|   |   |   |-- images/           # Storefront image assets
|   |   |   |-- js/               # Vendored/generated JS assets
|   |   |   `-- pages/
|   |   |       `-- home.html
|   |   |-- sanity/
|   |   |   `-- schemaTypes/
|   |   |       |-- category.ts
|   |   |       |-- index.ts
|   |   |       |-- page.ts
|   |   |       `-- product.ts
|   |   |-- src/
|   |   |   |-- adapters/
|   |   |   |-- components/
|   |   |   |-- config/
|   |   |   |-- contexts/
|   |   |   |-- data/
|   |   |   |-- hooks/
|   |   |   |-- islands/
|   |   |   |-- lib/
|   |   |   |-- page-scripts/
|   |   |   |-- pages/
|   |   |   |-- services/
|   |   |   |-- shells/
|   |   |   |-- App.css
|   |   |   |-- App.jsx
|   |   |   |-- App.tsx
|   |   |   |-- index.css
|   |   |   |-- index.ts
|   |   |   |-- main.jsx
|   |   |   `-- main.tsx
|   |   |-- .gitignore
|   |   |-- Addresses.html
|   |   |-- Cart.html
|   |   |-- Checkout not Logged-In.html
|   |   |-- Checkout.html
|   |   |-- components.json
|   |   |-- Create Account.html
|   |   |-- Empty Cart.html
|   |   |-- eslint.config.js
|   |   |-- favorite.html
|   |   |-- footer.html
|   |   |-- Forgot Password.html
|   |   |-- header.html
|   |   |-- hero.html
|   |   |-- index.html
|   |   |-- Login.html
|   |   |-- My Orders.html
|   |   |-- Order Checkup.html
|   |   |-- Order Details.html
|   |   |-- order-confirmation.html
|   |   |-- package.json
|   |   |-- Personal Info.html
|   |   |-- postcss.config.js
|   |   |-- Product Detail.html
|   |   |-- Product Listing.html
|   |   |-- README.md
|   |   |-- review.html
|   |   |-- review-pay.html
|   |   |-- sanity.cli.ts
|   |   |-- sanity.config.ts
|   |   |-- tailwind.config.js
|   |   |-- tsconfig.app.json
|   |   |-- tsconfig.json
|   |   |-- tsconfig.node.json
|   |   |-- vite.config.ts
|   |   `-- write-a-product-review.html
|   `-- admin/                    # Seller/admin dashboard (Vite + React)
|       |-- public/
|       |   |-- assets/
|       |   |   `-- eprose.svg
|       |   |-- cdn.jsdelivr.net/  # Vendored/generated CDN assets
|       |   |-- css/               # Vendored/generated CSS assets
|       |   |-- fonts.googleapis.com/
|       |   |-- fonts.gstatic.com/
|       |   |-- images/            # Admin image assets
|       |   |-- images.unsplash.com/
|       |   |-- js/                # Vendored/generated JS assets
|       |   |-- pages/
|       |   |   `-- home.html
|       |   |-- preline.co/
|       |   `-- www.googletagmanager.com/
|       |-- src/
|       |   |-- components/
|       |   |-- contexts/
|       |   |-- data/
|       |   |-- hooks/
|       |   |-- lib/
|       |   |-- page-scripts/
|       |   |-- pages/
|       |   |-- services/
|       |   |-- App.jsx
|       |   |-- index.css
|       |   |-- index.ts
|       |   |-- main.jsx
|       |   |-- main.tsx
|       |   `-- vite-env.d.ts
|       |-- add-product.html
|       |-- discounts.html
|       |-- empty-states.html
|       |-- footer.html
|       |-- header.html
|       |-- index.html
|       |-- order-details.html
|       |-- orders.html
|       |-- package.json
|       |-- payouts.html
|       |-- product-details.html
|       |-- products.html
|       |-- purchase-orders.html
|       |-- reviews.html
|       |-- search.html
|       |-- spa.html
|       |-- store.html
|       |-- tsconfig.json
|       |-- tsconfig.node.json
|       `-- vite.config.ts
|-- assets/
|   `-- eprose.svg
|-- dist/                         # Build output
|-- docs/
|   |-- admin/
|   |   |-- ADMIN_BACKEND_CONTINUITY.md
|   |   |-- JavaScript Overview.md
|   |   `-- Project Overview.md
|   `-- storefront/
|       |-- JavaScript.md
|       |-- Project Overview.md
|       |-- Sanity.md
|       |-- Supabase Project Reuse.md
|       `-- Supabase.md
|-- node_modules/                 # Installed root dependencies
|-- packages/
|   |-- auth/                     # Shared auth hooks/provider and role guards
|   |   |-- node_modules/
|   |   |-- src/
|   |   |   |-- index.ts
|   |   |   `-- react.tsx
|   |   `-- package.json
|   |-- sanity/                   # Shared Sanity client and helpers
|   |   |-- node_modules/
|   |   |-- src/
|   |   |   `-- index.ts
|   |   `-- package.json
|   |-- services/                 # Shared storefront/admin business logic
|   |   |-- node_modules/
|   |   |-- src/
|   |   |   |-- admin/
|   |   |   |-- storefront/
|   |   |   `-- index.ts
|   |   `-- package.json
|   |-- shared-types/             # Cross-app TypeScript types
|   |   |-- node_modules/
|   |   |-- src/
|   |   |   `-- index.ts
|   |   `-- package.json
|   |-- supabase/                 # Shared Supabase client and admin operations
|   |   |-- node_modules/
|   |   |-- src/
|   |   |   |-- admin.ts
|   |   |   |-- client.ts
|   |   |   `-- index.ts
|   |   `-- package.json
|   |-- ui/                       # Shared UI package placeholder
|   |   |-- node_modules/
|   |   |-- src/
|   |   |   `-- index.ts
|   |   `-- package.json
|   `-- utils/                    # Logger and shared utilities
|       |-- node_modules/
|       |-- src/
|       |   |-- index.ts
|       |   `-- logger.ts
|       `-- package.json
|-- scripts/
|   |-- build-soft-merged.mjs
|   |-- create-discounts-table.sql
|   |-- create-product-reviews-tables.sql
|   |-- create-products-runtime-table.sql
|   |-- dev-soft-merged.ps1
|   `-- playwright-live-checkout.mjs
|-- supabase/
|   `-- migrations/
|       |-- 202605230001_create_product_reviews.sql
|       `-- 202605230002_create_products_runtime.sql
|-- .env.local
|-- .gitignore
|-- eprose.svg
|-- folder01012
|-- package.json
|-- pnpm-lock.yaml
|-- pnpm-workspace.yaml
|-- README.md
|-- test.html
|-- TREE.md
|-- tsconfig.base.json
|-- tsconfig.json
`-- turbo.json
```

## Runtime Notes

### Storefront
- Dev server: `http://127.0.0.1:3000`
- Entry: `apps/storefront/index.html -> apps/storefront/src/main.tsx`
- Vite aliases shared workspace packages from `packages/*`
- Serves admin files under `/admin` during development through the custom `adminSoftMergePlugin()`

### Admin
- Dev server: `http://127.0.0.1:4173`
- Entries include `index.html`, `orders.html`, `products.html`, `discounts.html`, `spa.html`, and the other admin HTML pages listed above
- Main SPA entry: `apps/admin/src/main.tsx`
- Served under `/admin/` in Vite build/dev config

## Shared Layers

- `packages/auth` provides `AuthProvider`, `useAuth()`, `useAuthButton()`, and `useAdminGuard()`
- `packages/supabase` provides the singleton client plus admin data helpers
- `packages/sanity` provides the shared CMS client and image/price helpers
- `packages/services` separates storefront and admin business logic
- `packages/shared-types` centralizes auth, CMS, and admin domain types
- `packages/utils` contains shared logging/utilities
- `packages/ui` exists, but is currently a placeholder rather than a full component library

## Workspace Notes

- Workspace packages are declared in `pnpm-workspace.yaml`
- Root orchestration uses Turbo via `build`, `dev`, `type-check`, and `lint`
- The repo uses `pnpm-lock.yaml` as the single workspace lockfile
