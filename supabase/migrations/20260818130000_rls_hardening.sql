-- ==============================================================================
-- PromptPro — Phase 2 Security Hardening: Row Level Security (RLS) Policies
-- Migration: 20260818130000_rls_hardening.sql
--
-- Scope:
--   1. Ensures RLS is enabled and enforced on all 5 core tables.
--   2. Enforces non-spoofable Clerk JWT identity bridging via (auth.jwt() ->> 'sub').
--   3. Locks down profiles, credit_ledger, and whop_webhook_events against unauthorized
--      client-side inserts, updates, or deletes (protecting billing & credit balances).
--   4. Scopes optimization_logs and snippets strictly to the owning user for CRUD.
--   5. Revokes overly permissive anon/authenticated table-level privileges where appropriate.
-- ==============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Table: profiles
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean, consistent state
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;

-- Allow users to read ONLY their own profile (verified via Clerk JWT 'sub')
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (clerk_id = (auth.jwt() ->> 'sub'));

-- Allow admins to read all profiles (verified via Clerk JWT public_metadata.role)
CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    coalesce((auth.jwt() -> 'public_metadata' ->> 'role'), 'user') = 'admin'
  );

-- NOTE: No INSERT, UPDATE, or DELETE policies for authenticated/anon roles.
-- All profile creations (ensureProfile), credit modifications, tier upgrades,
-- and status updates MUST be executed via the service-role client (backend API / webhooks).
-- This prevents malicious clients from altering their own plan_tier or credits_balance.


-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Table: credit_ledger
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "credit_ledger_select_own" ON public.credit_ledger;
DROP POLICY IF EXISTS "credit_ledger_select_admin" ON public.credit_ledger;
DROP POLICY IF EXISTS "credit_ledger_insert_own" ON public.credit_ledger;
DROP POLICY IF EXISTS "credit_ledger_update_own" ON public.credit_ledger;
DROP POLICY IF EXISTS "credit_ledger_delete_own" ON public.credit_ledger;

-- Allow users to view their own credit audit history
CREATE POLICY "credit_ledger_select_own" ON public.credit_ledger
  FOR SELECT
  TO authenticated
  USING (profile_clerk_id = (auth.jwt() ->> 'sub'));

-- Allow admins to view all ledger entries
CREATE POLICY "credit_ledger_select_admin" ON public.credit_ledger
  FOR SELECT
  TO authenticated
  USING (
    coalesce((auth.jwt() -> 'public_metadata' ->> 'role'), 'user') = 'admin'
  );

-- NOTE: credit_ledger is strictly an append-only audit trail.
-- INSERTs are performed exclusively via spend_credits() RPC, webhook handlers,
-- or cron resets (service_role only). Users CANNOT insert, update, or delete ledger records.


-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Table: whop_webhook_events
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.whop_webhook_events ENABLE ROW LEVEL SECURITY;

-- Drop any accidental public/client policies
DROP POLICY IF EXISTS "whop_webhook_events_select" ON public.whop_webhook_events;
DROP POLICY IF EXISTS "whop_webhook_events_insert" ON public.whop_webhook_events;
DROP POLICY IF EXISTS "whop_webhook_events_update" ON public.whop_webhook_events;
DROP POLICY IF EXISTS "whop_webhook_events_delete" ON public.whop_webhook_events;

-- NOTE: Zero policies granted to anon or authenticated roles.
-- whop_webhook_events is backend-only. The Whop webhook route operates exclusively
-- with SUPABASE_SERVICE_ROLE_KEY (bypassing RLS safely).


-- ──────────────────────────────────────────────────────────────────────────────
-- 4. Table: optimization_logs
-- ──────────────────────────────────────────────────────────────────────────────
-- Ensure table has RLS enabled
ALTER TABLE public.optimization_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "optimization_logs_select_own" ON public.optimization_logs;
DROP POLICY IF EXISTS "optimization_logs_insert_own" ON public.optimization_logs;
DROP POLICY IF EXISTS "optimization_logs_update_own" ON public.optimization_logs;
DROP POLICY IF EXISTS "optimization_logs_delete_own" ON public.optimization_logs;
DROP POLICY IF EXISTS "optimization_logs_select_admin" ON public.optimization_logs;

-- Users can read their own optimization logs
CREATE POLICY "optimization_logs_select_own" ON public.optimization_logs
  FOR SELECT
  TO authenticated
  USING (user_id = (auth.jwt() ->> 'sub'));

-- Admins can read all optimization logs
CREATE POLICY "optimization_logs_select_admin" ON public.optimization_logs
  FOR SELECT
  TO authenticated
  USING (
    coalesce((auth.jwt() -> 'public_metadata' ->> 'role'), 'user') = 'admin'
  );

-- Users can insert logs ONLY with their own verified Clerk user ID
CREATE POLICY "optimization_logs_insert_own" ON public.optimization_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (auth.jwt() ->> 'sub'));

-- Users can update their own logs (used during extension sync to fill site / prompt metadata)
CREATE POLICY "optimization_logs_update_own" ON public.optimization_logs
  FOR UPDATE
  TO authenticated
  USING (user_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (user_id = (auth.jwt() ->> 'sub'));

-- Users can delete their own logs (History clear / item delete)
CREATE POLICY "optimization_logs_delete_own" ON public.optimization_logs
  FOR DELETE
  TO authenticated
  USING (user_id = (auth.jwt() ->> 'sub'));


-- ──────────────────────────────────────────────────────────────────────────────
-- 5. Table: snippets
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.snippets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "snippets_select_own" ON public.snippets;
DROP POLICY IF EXISTS "snippets_insert_own" ON public.snippets;
DROP POLICY IF EXISTS "snippets_update_own" ON public.snippets;
DROP POLICY IF EXISTS "snippets_delete_own" ON public.snippets;

-- Users can read their own snippets and context notes
CREATE POLICY "snippets_select_own" ON public.snippets
  FOR SELECT
  TO authenticated
  USING (user_id = (auth.jwt() ->> 'sub'));

-- Users can insert snippets ONLY with their own verified Clerk user ID
CREATE POLICY "snippets_insert_own" ON public.snippets
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (auth.jwt() ->> 'sub'));

-- Users can update their own snippets (e.g. toggle active state, edit content)
CREATE POLICY "snippets_update_own" ON public.snippets
  FOR UPDATE
  TO authenticated
  USING (user_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (user_id = (auth.jwt() ->> 'sub'));

-- Users can delete their own snippets
CREATE POLICY "snippets_delete_own" ON public.snippets
  FOR DELETE
  TO authenticated
  USING (user_id = (auth.jwt() ->> 'sub'));


-- ──────────────────────────────────────────────────────────────────────────────
-- 6. Role Grants Hardening
-- ──────────────────────────────────────────────────────────────────────────────
-- Ensure anon has NO direct access to user data tables
REVOKE ALL ON TABLE public.profiles FROM anon;
REVOKE ALL ON TABLE public.credit_ledger FROM anon;
REVOKE ALL ON TABLE public.whop_webhook_events FROM anon;
REVOKE ALL ON TABLE public.optimization_logs FROM anon;
REVOKE ALL ON TABLE public.snippets FROM anon;

-- Ensure authenticated role has standard DML subject to RLS
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.credit_ledger TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.optimization_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.snippets TO authenticated;
