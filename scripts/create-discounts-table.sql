create extension if not exists pgcrypto;

create table if not exists public.discounts (
  id uuid primary key default gen_random_uuid(),
  name text,
  title text,
  code text not null unique,
  type text not null default 'percent',
  value numeric not null default 0,
  amount numeric,
  scope text default 'global',
  applies_to text,
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer,
  usage_count integer not null default 0,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists discounts_status_idx on public.discounts(status);
create index if not exists discounts_code_idx on public.discounts(code);
create index if not exists discounts_scope_idx on public.discounts(scope);
