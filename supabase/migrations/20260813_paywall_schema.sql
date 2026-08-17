-- =============================================================
-- PromptPro Paywall Schema Migration (v2 — corrected for UUID profiles.id)
-- Created: 2026-08-13
--
-- KEY DIFFERENCE from v1:
-- profiles.id is a UUID (Supabase native auth). Clerk user IDs are TEXT.
-- Solution: add a clerk_id TEXT UNIQUE column to profiles for Clerk lookups.
-- New tables use profile_clerk_id TEXT (Clerk ID) — no cross-type FK.
-- =============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. Extend existing `profiles` table
-- ─────────────────────────────────────────────────────────────

alter table profiles
  -- Clerk user id (e.g. "user_xxxx") — our primary lookup key for billing
  add column if not exists clerk_id text unique,

  -- Billing / plan state
  add column if not exists plan_tier text not null default 'free'
    check (plan_tier in ('free', 'plus', 'max')),
  add column if not exists whop_customer_id text,
  add column if not exists whop_membership_id text,
  add column if not exists plan_status text not null default 'none'
    check (plan_status in ('active', 'past_due', 'canceled', 'none')),
  add column if not exists billing_period text
    check (billing_period in ('monthly', 'annual')),
  add column if not exists credits_balance integer not null default 50,
  add column if not exists credits_reset_at timestamptz not null default (now() + interval '30 days'),
  add column if not exists plan_updated_at timestamptz not null default now();

create index if not exists profiles_clerk_id_idx on profiles(clerk_id);


-- ─────────────────────────────────────────────────────────────
-- 2. Whop webhook event log (idempotency record)
--    profile_clerk_id is TEXT (Clerk user id) — no FK to avoid type mismatch
-- ─────────────────────────────────────────────────────────────

create table if not exists whop_webhook_events (
  id               uuid        primary key default gen_random_uuid(),
  event_id         text        not null unique,
  event_type       text        not null,
  payload          jsonb       not null,
  processed_at     timestamptz,
  profile_clerk_id text,        -- Clerk user id, no FK (type would mismatch profiles.id uuid)
  created_at       timestamptz not null default now()
);

create index if not exists whop_webhook_events_profile_clerk_id_idx
  on whop_webhook_events(profile_clerk_id);


-- ─────────────────────────────────────────────────────────────
-- 3. Credit ledger (audit trail of every credit change)
--    profile_clerk_id is TEXT (Clerk user id) — no FK to avoid type mismatch
-- ─────────────────────────────────────────────────────────────

create table if not exists credit_ledger (
  id               uuid        primary key default gen_random_uuid(),
  profile_clerk_id text        not null,   -- Clerk user id, no FK (type mismatch)
  delta            integer     not null,
  reason           text        not null check (
    reason in (
      'quick_optimize',
      'advanced_optimize',
      'max_optimize',
      'monthly_reset',
      'admin_grant',
      'admin_deduct'
    )
  ),
  created_at       timestamptz not null default now()
);

create index if not exists credit_ledger_profile_clerk_id_idx
  on credit_ledger(profile_clerk_id);


-- ─────────────────────────────────────────────────────────────
-- 4. Row Level Security
--
-- IMPORTANT: Requires Supabase Third-Party Auth → Clerk configured so
-- auth.jwt()->>'sub' returns the Clerk user id (e.g. "user_xxxx").
-- Supabase Dashboard → Authentication → Third Party Auth → Clerk
-- ─────────────────────────────────────────────────────────────

alter table profiles            enable row level security;
alter table credit_ledger       enable row level security;
alter table whop_webhook_events enable row level security;

-- Users can read their own profile row (matched by clerk_id)
drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles
  for select
  using (clerk_id = (auth.jwt() ->> 'sub'));

-- Admins can read all profile rows
drop policy if exists "profiles_select_admin" on profiles;
create policy "profiles_select_admin" on profiles
  for select
  using (
    coalesce((auth.jwt() -> 'public_metadata' ->> 'role'), 'user') = 'admin'
  );

-- Users can read their own credit ledger rows
drop policy if exists "credit_ledger_select_own" on credit_ledger;
create policy "credit_ledger_select_own" on credit_ledger
  for select
  using (profile_clerk_id = (auth.jwt() ->> 'sub'));

-- Admins can read all credit ledger rows
drop policy if exists "credit_ledger_select_admin" on credit_ledger;
create policy "credit_ledger_select_admin" on credit_ledger
  for select
  using (
    coalesce((auth.jwt() -> 'public_metadata' ->> 'role'), 'user') = 'admin'
  );

-- Webhook events are backend-only (service role bypasses RLS)


-- ─────────────────────────────────────────────────────────────
-- 5. Transactional credit spend function
--    Looks up profile by clerk_id (TEXT), not id (UUID).
--    Called via supabase.rpc('spend_credits', {...}) with service-role client.
-- ─────────────────────────────────────────────────────────────

create or replace function spend_credits(
  p_clerk_id text,
  p_amount   integer,
  p_reason   text
) returns integer
language plpgsql
security definer
as $$
declare
  v_balance integer;
begin
  -- Lock the row to prevent concurrent double-spends
  select credits_balance
    into v_balance
    from profiles
   where clerk_id = p_clerk_id
  for update;

  if v_balance is null then
    raise exception 'profile_not_found';
  end if;

  -- Allow negative amounts (admin_grant) — only check for normal spends
  if p_amount > 0 and v_balance < p_amount then
    raise exception 'insufficient_credits';
  end if;

  update profiles
     set credits_balance = credits_balance - p_amount
   where clerk_id = p_clerk_id;

  insert into credit_ledger (profile_clerk_id, delta, reason)
  values (p_clerk_id, -p_amount, p_reason);

  return v_balance - p_amount;
end;
$$;
