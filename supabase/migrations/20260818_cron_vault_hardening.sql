-- ==============================================================================
-- PromptPro — Phase 2 Security Hardening: pg_cron Hardening
-- Migration: 20260818_cron_vault_hardening.sql
--
-- Scope:
--   1. Replaces brittle, secret-dependent HTTP cron triggers with an atomic,
--      native PostgreSQL stored procedure (`public.reset_due_credits()`).
--   2. Eliminates network hops, external service-role JWT exposure, and secret
--      rotation risks for the hourly credit reset automation.
--   3. Idempotently unschedules broken jobs and reschedules the hardened cron job.
-- ==============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- Step 1: Ensure Required Extensions Exist
-- ──────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;

-- ──────────────────────────────────────────────────────────────────────────────
-- Step 2: Native In-Database Reset Procedure (Zero-Secret Solution)
-- ──────────────────────────────────────────────────────────────────────────────
-- This stored procedure resets monthly credit balances directly inside Postgres.
-- No HTTP requests, no JWT headers, no secret rotation breaks, fully ACID compliant.
CREATE OR REPLACE FUNCTION public.reset_due_credits()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  r RECORD;
  v_allotment integer;
  v_reset_count integer := 0;
  v_next_reset timestamptz := now() + interval '30 days';
BEGIN
  -- Loop through profiles due for credit reset
  FOR r IN
    SELECT clerk_id, coalesce(plan_tier, 'free') AS plan_tier
      FROM public.profiles
     WHERE clerk_id IS NOT NULL
       AND credits_reset_at <= now()
     FOR UPDATE
  LOOP
    -- Map plan tier to allotment
    v_allotment := CASE r.plan_tier
      WHEN 'max'  THEN 2000
      WHEN 'plus' THEN 500
      ELSE 50
    END;

    -- Update profile balance (no rollover, per PromptPro product design)
    UPDATE public.profiles
       SET credits_balance = v_allotment,
           credits_reset_at = v_next_reset,
           plan_updated_at = now()
     WHERE clerk_id = r.clerk_id;

    -- Record audit ledger entry
    INSERT INTO public.credit_ledger (
      profile_clerk_id,
      delta,
      reason,
      created_at
    ) VALUES (
      r.clerk_id,
      v_allotment,
      'monthly_reset',
      now()
    );

    v_reset_count := v_reset_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'reset_count', v_reset_count,
    'executed_at', now()
  );
END;
$$;

-- Revoke public execution; allow postgres & cron execution
REVOKE ALL ON FUNCTION public.reset_due_credits() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reset_due_credits() FROM anon;
REVOKE ALL ON FUNCTION public.reset_due_credits() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reset_due_credits() TO postgres;
GRANT EXECUTE ON FUNCTION public.reset_due_credits() TO service_role;


-- ──────────────────────────────────────────────────────────────────────────────
-- Step 3: Reschedule the pg_cron Job
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reset-credits-hourly') THEN
    PERFORM cron.unschedule('reset-credits-hourly');
  END IF;
END
$$;

-- Schedule the native, secure SQL job (Runs every hour on the hour)
SELECT cron.schedule(
  'reset-credits-hourly',
  '0 * * * *',
  $$SELECT public.reset_due_credits();$$
);
