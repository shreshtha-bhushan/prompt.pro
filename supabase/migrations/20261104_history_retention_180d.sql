-- ==============================================================================
-- PromptPro — 180-Day Prompt History Retention Policy & Automated Cleanup
-- Migration: 20261104_history_retention_180d.sql
--
-- Purpose:
--   Enforces a 180-day data minimization & retention cycle for optimization_logs.
--   Prevents unbounded table growth and aligns data storage with privacy standards.
--
-- HOW TO RUN:
--   Run via Supabase CLI:
--     npx supabase db push
--   Or paste into Supabase Dashboard → SQL Editor → New Query → Run
-- ==============================================================================

-- 1. Create index on created_at for fast time-window range filtering & deletion
CREATE INDEX IF NOT EXISTS optimization_logs_created_at_idx
  ON public.optimization_logs (created_at);

-- 2. Stored function for automated log cleanup
CREATE OR REPLACE FUNCTION public.cleanup_old_optimization_logs(days_threshold integer DEFAULT 180)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Validate input bounds (minimum 1 day)
  IF days_threshold < 1 THEN
    RAISE EXCEPTION 'days_threshold must be at least 1 day';
  END IF;

  DELETE FROM public.optimization_logs
   WHERE created_at < (NOW() - (days_threshold || ' days')::interval);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 3. Lock down execution privileges: service_role only
REVOKE ALL ON FUNCTION public.cleanup_old_optimization_logs(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_old_optimization_logs(integer) FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_old_optimization_logs(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_optimization_logs(integer) TO service_role;

-- 4. Idempotently schedule daily pg_cron job at 03:30 UTC if pg_cron is enabled
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-optimization-logs-180d') THEN
      PERFORM cron.unschedule('cleanup-optimization-logs-180d');
    END IF;

    PERFORM cron.schedule(
      'cleanup-optimization-logs-180d',
      '30 3 * * *', -- Daily at 03:30 UTC
      'SELECT public.cleanup_old_optimization_logs(180);'
    );
  END IF;
END;
$$;
