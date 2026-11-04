/**
 * PromptPro — End-to-End Request ID Correlation
 *
 * Generates or extracts a unique request ID for every API request.
 * This enables full trace correlation across:
 *   - Client extension → API route → OpenRouter → logs
 *
 * The ID is:
 *   1. Extracted from the incoming `x-request-id` header (if sent by the client)
 *   2. Otherwise generated server-side as a compact UUID-v4
 *   3. Attached to all outgoing responses via `x-request-id` header
 *   4. Forwarded to upstream providers (OpenRouter) for end-to-end tracing
 *   5. Included in all structured log lines for grep-ability
 */

/**
 * Generate a compact, collision-resistant request ID.
 * Format: `pp-<timestamp_hex>-<random_hex>` (22 chars)
 */
export function generateRequestId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `pp-${ts}-${rand}`;
}

/**
 * Extract or generate a request ID from the incoming request.
 * Prefers the client-supplied `x-request-id` if present and valid.
 */
export function resolveRequestId(request: Request): string {
  const clientId = request.headers.get("x-request-id");
  if (clientId && /^[\w-]{8,64}$/.test(clientId)) {
    return clientId;
  }
  return generateRequestId();
}

/**
 * Create a structured log prefix for consistent log formatting.
 * Usage: `console.error(logPrefix(requestId, "/api/upgrade"), "message", error)`
 */
export function logPrefix(requestId: string, route: string): string {
  return `[${route}] [${requestId}]`;
}
