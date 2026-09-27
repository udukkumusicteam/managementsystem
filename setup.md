# Shared Database Setup (Supabase) — 5 minutes

This connects the Udukku app to one shared database so the whole team works
from the same tutors, payment receipts and quotations — on any device, from a link.

> Project-specific documentation. If you prefer a different database service,
> tell us and we'll adapt the sync layer.

## What the app does once connected

- **Local-only mode (default):** nothing changes — data lives in each browser.
- **Cloud mode:** after connecting in **Settings**, each team member signs in
  with their invited work email (magic link). Data loads from the shared
  database, and every change (add/edit/delete) syncs automatically.
- Every browser also keeps an offline copy, so the app still opens without internet.

## Step 1 — Create the free Supabase project

1. Go to [supabase.com](https://supabase.com) → sign up (free tier is fine).
2. **New project** → give it a name (e.g. `udukku-ops`), set a strong database password, pick a close region, **Create**.
3. Wait ~1 minute for it to be ready.

## Step 2 — Create the tables

In Supabase: **SQL Editor** (top of the left sidebar) → **New query**, paste this, and run it:

```sql
-- Udukku Ops shared database
-- Each table: id (text) + the full app record as JSONB.

create table if not exists tutors (
    id text primary key,
    data jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz
);

create table if not exists payslips (
    id text primary key,
    data jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz
);

create table if not exists quotations (
    id text primary key,
    data jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz
);

-- Only signed-in (invited) team members can read/write.
alter table tutors    enable row level security;
alter table payslips  enable row level security;
alter table quotations enable row level security;

create policy "team read"    on tutors     for select to authenticated using (true);
create policy "team write"   on tutors     for all    to authenticated using (true) with check (true);
create policy "team read"    on payslips   for select to authenticated using (true);
create policy "team write"   on payslips   for all    to authenticated using (true) with check (true);
create policy "team read"    on quotations for select to authenticated using (true);
create policy "team write"   on quotations for all    to authenticated using (true) with check (true);