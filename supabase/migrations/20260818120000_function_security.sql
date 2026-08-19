-- ==============================================================================
-- PromptPro — Phase 2 Security Hardening: Function & RPC Access Control
-- Migration: 20260818120000_function_security.sql
--
-- Scope:
--   1. Hardens the SECURITY DEFINER function `spend_credits`.
--   2. Explicitly sets immutable `search_path = public, pg_temp` to prevent search-path
--      hijacking vulnerabilities.
--   3. Revokes `EXECUTE` privileges on `spend_credits` from `PUBLIC`, `anon`, and
--      `authenticated` roles.
--   4. Restricts execution strictly to `service_role` (and superuser/postgres) to prevent
--      malicious users from calling `supabase.rpc('spend_credits', ...)` directly
--      from browser clients to grant themselves arbitrary credits or drain others.
-- ==============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Recreate spend_credits with immutable search_path
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.spend_credits(
  p_clerk_id text,
  p_amount   integer,
  p_reason   text
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_balance integer;
BEGIN
  -- Validate inputs
  IF p_clerk_id IS NULL OR trim(p_clerk_id) = '' THEN
    RAISE EXCEPTION 'invalid_clerk_id';
  END IF;

  IF p_amount IS NULL THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  -- Lock the target profile row to prevent concurrent double-spends
  SELECT credits_balance
    INTO v_balance
    FROM public.profiles
   WHERE clerk_id = p_clerk_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  -- Check balance for standard deductions (positive amounts)
  -- Negative amounts represent administrative grants (allowed to increase balance)
  IF p_amount > 0 AND v_balance < p_amount THEN
    RAISE EXCEPTION 'insufficient_credits';
  END IF;

  -- Update the balance atomically
  UPDATE public.profiles
     SET credits_balance = credits_balance - p_amount,
         plan_updated_at = now()
   WHERE clerk_id = p_clerk_id;

  -- Record audit trail in ledger
  INSERT INTO public.credit_ledger (profile_clerk_id, delta, reason, created_at)
  VALUES (p_clerk_id, -p_amount, p_reason, now());

  RETURN v_balance - p_amount;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Revoke and Grant Function Privileges
-- ──────────────────────────────────────────────────────────────────────────────
-- In Postgres, functions in public have EXECUTE granted to PUBLIC by default.
-- We must revoke this immediately to close the privilege escalation vector.
REVOKE ALL ON FUNCTION public.spend_credits(text, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.spend_credits(text, integer, text) FROM anon;
REVOKE ALL ON FUNCTION public.spend_credits(text, integer, text) FROM authenticated;

-- Grant EXECUTE exclusively to service_role (backend API routes & server actions)
GRANT EXECUTE ON FUNCTION public.spend_credits(text, integer, text) TO service_role;
