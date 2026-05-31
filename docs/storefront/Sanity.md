# Sanity Credentials Guide

This project can point to any Sanity project as long as the environment variables match the target Sanity workspace and the target dataset has the content schema the app expects.

## What Sanity Does Here

Sanity is used for product/content data and image URLs. Storefront code reads Sanity through:

- `apps/storefront/src/lib/sanity.ts`
- `packages/sanity/src/index.ts`
- `apps/admin/src/lib/sanity.ts`

The shared package is used by both storefront and admin code. The storefront also has its own local Sanity client file, so keep the same env names available at the repo root.

## Required Variables

Put these in `.env.local` at the repo root:

```env
VITE_SANITY_PROJECT_ID=your_project_id
VITE_SANITY_DATASET=production
VITE_SANITY_API_VERSION=2025-01-01
VITE_SANITY_USE_CDN=true
```

Optional, only if you need private dataset access or authenticated writes:

```env
SANITY_API_TOKEN=your_sanity_token
```

Some files also support `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `NEXT_PUBLIC_SANITY_API_VERSION`, and `NEXT_PUBLIC_SANITY_USE_CDN`, but this repo should use `VITE_*` names first.

## How To Change To Another Sanity Project

1. Open `.env.local`.
2. Replace `VITE_SANITY_PROJECT_ID` with the new Sanity project ID.
3. Replace `VITE_SANITY_DATASET` with the dataset name from that project, usually `production`.
4. Keep or update `VITE_SANITY_API_VERSION`.
5. Set `VITE_SANITY_USE_CDN=true` for public published content, or `false` while testing fresh edits.
6. If the dataset is private, add `SANITY_API_TOKEN`.
7. Restart the dev server. Vite env variables are loaded when the server starts.

## Token Rules

- Public read access: no token is usually needed.
- Private read access: use a Sanity token with read permission.
- Write access: use a token with write permission.
- Never commit real tokens to Git.

Because this is a Vite frontend project, any variable exposed to browser code can be visible to users. Do not put a powerful write token into browser-only code unless you fully understand the risk.

## Expected Sanity Shape

Changing credentials only changes the backend the app connects to. The new Sanity project still needs compatible content types and fields. At minimum, product/category queries expect documents similar to:

- Products with title/name, slug, description, price, images, SKU, stock, and category references.
- Categories with title/name, slug, description, and image.
- Image fields that Sanity image URL builder can resolve.

If the new Sanity project uses different schema names or field names, credentials alone are not enough. The query/service files must also be updated.

## Common Problems

`Missing Sanity configuration`
: `VITE_SANITY_PROJECT_ID` or `VITE_SANITY_DATASET` is missing. Add it to `.env.local` and restart the dev server.

No products show
: The credentials are valid, but the dataset is empty, private without a token, or has a different schema.

Old content still appears
: Set `VITE_SANITY_USE_CDN=false`, restart the dev server, and test again.

Images do not load
: Check that image fields are real Sanity image objects and that the project ID/dataset pair is correct.

## Quick Verification

After changing credentials:

```powershell
pnpm build:storefront
```

Then run the storefront and check product listing, product detail, categories, and any Sanity-backed images.
