/**
 * PromptPro — Strict CORS Helper
 *
 * Scopes Cross-Origin Resource Sharing exclusively to:
 *   1. Chrome Extension origins (`chrome-extension://<id>`)
 *   2. The configured application domain (`NEXT_PUBLIC_APP_URL` / Vercel deployment URL)
 *   3. Localhost development environments
 */

import { NextResponse } from "next/server";

export function getCorsHeaders(request?: Request): Record<string, string> {
  const defaultHeaders: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-CSRF-Token",
    "Access-Control-Max-Age": "86400",
  };

  if (!request) {
    return defaultHeaders;
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    return defaultHeaders;
  }

  const isAllowedExtension = origin.startsWith("chrome-extension://");
  const isLocalhost = origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://prompt-pro-liart.vercel.app";
  const isAppDomain = origin === appUrl;

  if (isAllowedExtension || isLocalhost || isAppDomain) {
    return {
      ...defaultHeaders,
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
    };
  }

  // If origin is not in allowlist, do not reflect origin or allow credentials
  return defaultHeaders;
}

export function handleOptions(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}
