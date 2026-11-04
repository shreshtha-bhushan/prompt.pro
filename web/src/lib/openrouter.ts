/**
 * PromptPro — Resilient OpenRouter Client
 *
 * Wraps OpenRouter API calls with:
 *   1. Exponential backoff retry for transient errors (429, 5xx)
 *   2. Per-request AbortController timeout (configurable, default 20s)
 *   3. Request ID forwarding for end-to-end trace correlation
 *   4. Sanitized error classification (never leaks upstream details)
 *   5. Structured error types for caller-side handling
 *
 * IMPORTANT: Model chain configuration is NOT modified — callers pass their
 * own model selection. This module only handles transport resilience.
 */

export interface OpenRouterRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
}

export interface OpenRouterSuccess {
  ok: true;
  content: string;
  model: string;
  requestId: string;
}

export interface OpenRouterError {
  ok: false;
  status: number;
  code: string;
  message: string;
  model: string;
  requestId: string;
}

export type OpenRouterResult = OpenRouterSuccess | OpenRouterError;

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  timeoutMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,       // Total attempts = 3 (1 initial + 2 retries)
  baseDelayMs: 500,    // 500ms → 1000ms → 2000ms
  maxDelayMs: 4000,
  timeoutMs: 20000,    // 20s per-attempt timeout
};

/** HTTP status codes that are safe to retry */
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

/**
 * Call OpenRouter with automatic retry on transient failures.
 *
 * @param payload    - The chat completion request body
 * @param requestId  - Trace correlation ID (forwarded to OpenRouter)
 * @param config     - Optional retry configuration overrides
 */
export async function callOpenRouter(
  payload: OpenRouterRequest,
  requestId: string,
  config: Partial<RetryConfig> = {}
): Promise<OpenRouterResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      status: 500,
      code: "PROVIDER_NOT_CONFIGURED",
      message: "AI provider is not configured.",
      model: payload.model,
      requestId,
    };
  }

  const rc: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: OpenRouterError | null = null;

  for (let attempt = 0; attempt <= rc.maxRetries; attempt++) {
    // Exponential backoff delay (skip on first attempt)
    if (attempt > 0) {
      const delay = Math.min(rc.baseDelayMs * Math.pow(2, attempt - 1), rc.maxDelayMs);
      // Add ±25% jitter to prevent thundering herd
      const jitter = delay * (0.75 + Math.random() * 0.5);
      await sleep(Math.round(jitter));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), rc.timeoutMs);

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "https://github.com/shreshtha-bhushan/prompt.pro",
          "X-Title": "PromptPro API",
          "X-Request-Id": requestId,
        },
        body: JSON.stringify({
          model: payload.model,
          messages: payload.messages,
          temperature: payload.temperature ?? 0.3,
          ...(payload.max_tokens ? { max_tokens: payload.max_tokens } : {}),
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const rawMsg = errJson?.error?.message || errJson?.error?.metadata?.raw || "";
        const status = response.status;

        lastError = classifyError(status, rawMsg, payload.model, requestId);

        // Only retry on transient errors
        if (RETRYABLE_STATUSES.has(status) && attempt < rc.maxRetries) {
          console.warn(
            `[openrouter] [${requestId}] Attempt ${attempt + 1}/${rc.maxRetries + 1} failed (HTTP ${status}), retrying...`
          );
          continue;
        }

        return lastError;
      }

      // Parse successful response
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content || typeof content !== "string" || content.trim().length === 0) {
        lastError = {
          ok: false,
          status: 502,
          code: "OPT_EMPTY_RESPONSE",
          message: "AI provider returned an empty completion.",
          model: payload.model,
          requestId,
        };

        // Empty response is retriable (model might be warming up)
        if (attempt < rc.maxRetries) {
          console.warn(
            `[openrouter] [${requestId}] Attempt ${attempt + 1}/${rc.maxRetries + 1} returned empty, retrying...`
          );
          continue;
        }

        return lastError;
      }

      // Success — clean up code fences if present
      let cleaned = content.trim();
      if (cleaned.startsWith("```") && cleaned.endsWith("```")) {
        cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, "").replace(/\n```$/, "").trim();
      }
      // Strip conversational preamble
      cleaned = cleaned
        .replace(/^(here is|here's|sure,?\s*here is|sure,?\s*here's)\s+the\s+(enhanced|rewritten|optimized|upgraded)?\s*prompt:?\n*/i, "")
        .trim();

      return {
        ok: true,
        content: cleaned,
        model: payload.model,
        requestId,
      };
    } catch (err: unknown) {
      const isTimeout = (err as Error)?.name === "AbortError";

      lastError = {
        ok: false,
        status: isTimeout ? 504 : 502,
        code: isTimeout ? "OPT_TIMEOUT" : "OPT_NETWORK_ERROR",
        message: isTimeout
          ? `AI provider request timed out (${rc.timeoutMs / 1000}s).`
          : "Failed to connect to AI provider.",
        model: payload.model,
        requestId,
      };

      // Network errors and timeouts are retriable
      if (attempt < rc.maxRetries) {
        console.warn(
          `[openrouter] [${requestId}] Attempt ${attempt + 1}/${rc.maxRetries + 1} ${isTimeout ? "timed out" : "network error"}, retrying...`
        );
        continue;
      }

      return lastError;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Should never reach here, but satisfy TypeScript
  return lastError!;
}

/**
 * Classify an OpenRouter HTTP error into a user-safe error response.
 * Never leaks raw upstream error details.
 */
function classifyError(
  status: number,
  rawMsg: string,
  model: string,
  requestId: string
): OpenRouterError {
  let message: string;
  let code: string;

  if (status === 429) {
    message = rawMsg.includes("rate-limited")
      ? `${model} is temporarily rate-limited upstream. Please retry in a few moments.`
      : "Optimization request was rate-limited by the AI provider. Please retry shortly.";
    code = "PROVIDER_RATE_LIMITED";
  } else if (status === 401 || status === 403) {
    message = "AI provider authentication failed. Please verify API configuration.";
    code = "PROVIDER_AUTH_FAILED";
  } else if (status === 402) {
    message = "AI provider payment/credits limit reached.";
    code = "PROVIDER_CREDIT_LIMIT";
  } else if (status >= 500) {
    message = "AI provider service is temporarily unavailable. Please retry in a moment.";
    code = "PROVIDER_UNAVAILABLE";
  } else {
    message = `AI provider error (HTTP ${status}).`;
    code = "OPT_PROVIDER_ERROR";
  }

  return { ok: false, status, code, message, model, requestId };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
