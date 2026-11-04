import type { NextRequest } from "next/server";
import { auth, verifyToken } from "@clerk/nextjs/server";

/**
 * Resolves the authenticated Clerk userId across:
 * 1. Standard Next.js / Clerk session cookies via auth()
 * 2. Authorization: Bearer <clerk_token> with cryptographic JWT signature verification
 *
 * SECURITY:
 * Never trust unverified JWT payloads or custom client headers.
 * Any token failing cryptographic signature verification returns null.
 */
export async function resolveAuthUserId(request: NextRequest): Promise<string | null> {
  // 1. Check standard Clerk session cookies via auth()
  try {
    const sessionAuth = await auth();
    if (sessionAuth?.userId) {
      return sessionAuth.userId;
    }
  } catch (_e) {
    // Session cookie extraction failed or not present
  }

  // 2. Check Authorization: Bearer <token>
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (authHeader) {
    const parts = authHeader.trim().split(/\s+/);
    if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
      const rawToken = parts[1].trim();
      const secretKey = process.env.CLERK_SECRET_KEY;

      if (rawToken && secretKey) {
        try {
          const verified = await verifyToken(rawToken, {
            secretKey,
          });
          if (verified?.sub && typeof verified.sub === "string" && verified.sub.startsWith("user_")) {
            return verified.sub;
          }
        } catch (_err) {
          // Token signature verification failed (e.g. invalid, forged, or expired)
        }
      }
    }
  }

  return null;
}

