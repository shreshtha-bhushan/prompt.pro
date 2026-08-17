-- =============================================================
-- PromptPro — pg_cron schedule for monthly credit reset
--
-- HOW TO RUN:
--   1. Supabase Dashboard → Database → Extensions
--      Enable: pg_cron  ✓   pg_net  ✓
--   2. Supabase Dashboard → SQL Editor → New Query
--      Paste this entire file → click Run
-- =============================================================

-- Step 1: Enable required extensions (idempotent)
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net  with schema extensions;

-- Step 2: Remove old schedule if re-running (idempotent)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'reset-credits-hourly') then
    perform cron.unschedule('reset-credits-hourly');
  end if;
end
$$;

-- Step 3: Schedule hourly HTTP call to the reset-credits Edge Function
select cron.schedule(
  'reset-credits-hourly',
  '0 * * * *',   -- every hour on the hour
  $$
    -- SECURITY NOTE: Do NOT hardcode the SUPABASE_SERVICE_ROLE_KEY in migrations or SQL files.
    -- In Phase 2, this will be retrieved dynamically via Supabase Vault (vault.decrypted_secrets).
    -- Replace [SET_VIA_VAULT_IN_PHASE_2] with the active service role key when executing manually in SQL Editor.
    select net.http_post(
      url     := 'https://njfhrvxopavloqkylmqc.supabase.co/functions/v1/reset-credits',
      headers := '{"Content-Type":"application/json","Authorization":"Bearer [SET_VIA_VAULT_IN_PHASE_2]"}'::jsonb,
      body    := '{}'::jsonb
    );
  $$
);

-- Step 4: Confirm the schedule was created
select jobid, jobname, schedule
from cron.job
where jobname = 'reset-credits-hourly';
