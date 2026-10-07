# Shared Database Setup (Supabase) — 5 minutes

This connects the Udukku app to one shared database so the whole team works
from the same tutors, payment receipts and quotations — on any device, from a link.

> Project-specific documentation. If you prefer a different database service,
> tell us and we'll adapt the sync layer.

## What the app does once connected

- **Local-only mode (default):** nothing changes — data lives in each browser.
- **Cloud mode:** after connecting in **Settings**, each team member signs in
  with their invited work email + password. Data loads from the shared
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
```

## Step 3 — Invite the team (one-time, ~1 minute per person)

In Supabase: **Authentication → Users → Add user → Create new user** → enter the
person's work email (password is generated — they'll use the magic link, so it
doesn't matter).

Then, to keep it internal-only: **Authentication → Sign In / Up → Email →
turn OFF "Enable signups"** (invited users can still sign in; strangers can't
create accounts).

Now flip **both** switches to **OFF** in **Authentication → Sign In / Up → Email**:
- **Enable signups** — OFF (strangers can't create accounts; only invited emails sign in)
- **Confirm email** — OFF (required for direct password sign-in to work instantly)

Then give the user a password: **Authentication → Users → the ⋮ (three dots)
next to their name → "Set new password"** → type a password for them (or tell
them one) → save. They sign in with **email + password** — no mailbox needed.
(The app also offers a magic link as a "forgot password" fallback.)

### Managing the team later (Ishita, anytime)

The app's **Settings → Team Access** card is your shortcut to this page.

- **Add someone:** Authentication → Users → **Add user → Create new user** → their
  work email → Create user. From then on they can sign in with a magic link.
- **Remove someone:** Authentication → Users → the **⋮** next to their name →
  **Delete user**. Their login stops working immediately (their data stays —
  only *access* is removed).
- Only these invited emails can ever sign in — signups are switched off, so
  nobody random can create an account.

## Step 4 — Sign in (the app is already configured for this database)

The team's database details are built into the app, so **there's nothing to paste**:

1. Open the app → the **"Udukku Team Access"** screen appears.
2. Type your **email + password** (the one set in Step 3) → **Sign in** → you're in.
   No email in your inbox needed. (Forgot the password? Use the "Send me a magic
   link" button below the form — one-time fallback.)
3. **First sign-in on a device that already has data:** the app automatically
   uploads that device's data to the cloud before syncing, so nothing is lost.
4. **Later, to merge data from another device:** Settings → "Move my local data
   to the cloud" (adds/updates only — it never deletes anything from the cloud).

Everyone else just opens the app, signs in with their invited email, and the
same data appears. A device can always go back to local-only:
**Settings → Disconnect cloud** (affects only that device).

## Website Submissions (enquiries from udukkumusic.com) — nothing to set up

The **Website Submissions** section (🌐 in the sidebar) shows the same
enquiries as your website's own admin dashboard — session bookings, contact
messages, corporate wellness and city requests.

- **No setup needed.** The connection is already built into the app — it reads
  the website's own public database, so there is no extra table to create and
  nothing to paste into the website.
- Open any enquiry to see every field, then track it **New → Contacted →
  Closed**. The status you set here shows up in the website's admin dashboard
  too.
- **🧾 Start Quotation** pre-fills a new quotation with that enquiry's details.
- **🔄 Refresh** pulls in the latest enquiries (or wait — it reloads
  automatically after a sync).

## Notes & limits (honest ones)

- **Concurrent edits:** if two people edit the same record at the same time,
  the last save wins. Fine for a small team; deletions are safe (the app only
  removes rows that a signed-in user deleted locally).
- **Who can see data:** anyone signed in through an invited email. Payment receipt data
  is internal per the Source of Truth, so only invite real team emails.
- **Free tier:** plenty for this app's size (a few hundred records, a handful
  of users).
- **Offline:** if the connection drops, changes save locally and retry on the
  next save; a toast tells you if a sync attempt failed.