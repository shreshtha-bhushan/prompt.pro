/**
 * PromptPro — Monthly Credit Reset Constants
 * Mirror of lib/plans.ts monthlyCredits values.
 *
 * IMPORTANT: If you change these values, update web/src/lib/plans.ts too.
 * Both files must stay in sync — the dashboard uses the TS version,
 * this Deno file is used by the Edge Function.
 */

export const PLAN_LIMITS_MONTHLY: Record<"free" | "plus" | "max", number> = {
  free: 50,
  plus: 500,
  max: 2000,
};
