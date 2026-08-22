-- ==============================================================================
-- PromptPro — Credit Ledger Reason Constraint Fix
-- Migration: 20260824_credit_ledger_reasons.sql
--
-- Problem:
--   The spend_credits() function uses refund reasons like 'quick_optimize_refund',
--   'advanced_optimize_refund', 'max_optimize_refund' (see api/optimize/route.ts
--   and api/upgrade/route.ts refund paths). These reason values are NOT included
--   in the original credit_ledger.reason CHECK constraint from 20260813_paywall_schema.sql.
--
--   This means every LLM-failure refund INSERT into credit_ledger would fail with
--   a constraint violation, causing the refund to not be audited in the ledger.
--   (The balance update still happens via the UPDATE in spend_credits, but the
--   audit trail entry is lost, and any future constraint-first DB could block the refund.)
--
-- Fix:
--   Drop and recreate the CHECK constraint to include all valid reason values.
-- ==============================================================================

ALTER TABLE public.credit_ledger
  DROP CONSTRAINT IF EXISTS credit_ledger_reason_check;

ALTER TABLE public.credit_ledger
  ADD CONSTRAINT credit_ledger_reason_check CHECK (
    reason IN (
      'quick_optimize',
      'advanced_optimize',
      'max_optimize',
      'monthly_reset',
      'admin_grant',
      'admin_deduct',
      'quick_optimize_refund',
      'advanced_optimize_refund',
      'max_optimize_refund'
    )
  );
