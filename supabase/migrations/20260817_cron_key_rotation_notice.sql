-- =============================================================
-- PromptPro — Cron Key Rotation & Vault Notice (Stopgap)
-- 
-- IMPORTANT / ACTION REQUIRED:
-- The previous pg_cron job 'reset-credits-hourly' was originally 
-- scheduled with a hardcoded service-role JWT that has now been 
-- ROTATED.
-- 
-- As a result, the live pg_cron HTTP trigger in your database will 
-- fail with 401 Unauthorized until either:
--   1. You manually update the cron job in Supabase SQL Editor with 
--      the newly rotated SUPABASE_SERVICE_ROLE_KEY:
--
--      SELECT cron.alter_job(
--        job_id := (SELECT jobid FROM cron.job WHERE jobname = 'reset-credits-hourly'),
--        schedule := '0 * * * *',
--        command := $$
--          SELECT net.http_post(
--            url     := 'https://njfhrvxopavloqkylmqc.supabase.co/functions/v1/reset-credits',
--            headers := '{"Content-Type":"application/json","Authorization":"Bearer <YOUR_NEW_SERVICE_ROLE_KEY>"}'::jsonb,
--            body    := '{}'::jsonb
--          );
--        $$
--      );
--
--   2. Phase 2 Supabase Security Migration is deployed, which 
--      migrates pg_net calls to use Supabase Vault:
--      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
-- =============================================================

-- Idempotent verification check
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'reset-credits-hourly';
