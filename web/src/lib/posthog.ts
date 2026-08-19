/**
 * PromptPro — PostHog Client Event Helpers
 *
 * Convenience wrappers for firing named events from client components.
 * Import `trackEvent` anywhere in a client component or server action response handler.
 *
 * Event naming convention: snake_case, object_action order
 *   e.g. "optimization_run", NOT "run_optimization"
 *
 * Privacy rules:
 *   - NEVER include prompt text or generated output in event properties
 *   - Include only metadata: mode, platform, credit_cost, score deltas, tier
 */

import posthog from "posthog-js"

/**
 * Fire a named PostHog event from any client-side context.
 * No-ops silently when PostHog is not initialized.
 */
export function trackEvent(
  event: string,
  properties?: Record<string, string | number | boolean | null | undefined>
): void {
  if (typeof window !== "undefined" && posthog?.__loaded) {
    posthog.capture(event, properties)
  }
}

/**
 * Explicitly identify the current user.
 * Typically handled automatically by UserIdentifier in PostHogProvider,
 * but can be called imperatively after a delayed auth resolution.
 */
export function identifyUser(
  userId: string,
  traits?: Record<string, string | number | boolean | null | undefined>
): void {
  if (typeof window !== "undefined" && posthog?.__loaded) {
    posthog.identify(userId, traits)
  }
}

/** Reset analytics identity — call on sign-out. */
export function resetUser(): void {
  if (typeof window !== "undefined" && posthog?.__loaded) {
    posthog.reset()
  }
}

/** Opt the current user out of event capture (respects privacy toggle). */
export function optOutCapturing(): void {
  if (typeof window !== "undefined" && posthog?.__loaded) {
    posthog.opt_out_capturing()
  }
}

/** Opt the current user back in to event capture. */
export function optInCapturing(): void {
  if (typeof window !== "undefined" && posthog?.__loaded) {
    posthog.opt_in_capturing()
  }
}

export const optInPostHog = optInCapturing
export const optOutPostHog = optOutCapturing

