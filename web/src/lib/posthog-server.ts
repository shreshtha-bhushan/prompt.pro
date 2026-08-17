/**
 * PromptPro — Server-Side PostHog Client (posthog-node)
 *
 * Used for capturing events that originate outside a browser context:
 *  - Whop webhook: checkout_completed, plan_canceled, plan_downgraded
 *  - Edge functions / monthly credit resets
 *
 * IMPORTANT: Server-side calls bypass the /ingest proxy and hit PostHog
 * directly — the proxy is only meaningful for browser-side requests where
 * ad blockers can intercept the DNS. Server→PostHog traffic is not affected.
 *
 * Usage:
 *   import { posthogServer, shutdownPosthog } from "@/lib/posthog-server";
 *   posthogServer.capture({ distinctId: userId, event: "checkout_completed", properties: { ... } });
 *   await shutdownPosthog(); // call after last capture in serverless handlers
 */

import { PostHog } from "posthog-node";

let _client: PostHog | null = null;

function getClient(): PostHog {
  if (!_client) {
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!apiKey || apiKey === "phc_placeholder") {
      // Return a no-op stub when key is not configured yet
      return {
        capture: () => {},
        identify: () => {},
        shutdown: async () => {},
      } as unknown as PostHog;
    }
    _client = new PostHog(apiKey, {
      // Server-side calls go directly to PostHog, not through the /ingest proxy
      host: "https://us.i.posthog.com",
      // Disable batching in serverless — events must flush before function terminates
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return _client;
}

export const posthogServer = new Proxy({} as PostHog, {
  get(_target, prop) {
    return (getClient() as any)[prop];
  },
});

export function getPostHogClient(): PostHog {
  return posthogServer;
}

/**
 * Call this at the end of every serverless handler that uses posthogServer.
 * posthog-node buffers events and sends them asynchronously; shutdown() ensures
 * they are flushed before the Lambda/Edge function exits.
 */
export async function shutdownPosthog(): Promise<void> {
  if (_client) {
    await _client.shutdown();
  }
}
