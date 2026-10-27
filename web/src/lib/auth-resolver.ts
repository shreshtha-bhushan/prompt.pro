import type { NextRequest } from "next/server";
import { auth, clerkClient, verifyToken } from "@clerk/nextjs/server";

/**
 * Resolves the authenticated Clerk userId across:
 * 1. Authorization: Bearer <clerk_token> (standard JWT verification)
 * 2. Authorization: Bearer <clerk_token> (expired JWT fallback: decode sub + verify against Clerk users API)
 * 3. x-promptpro-user-id header (validated against Clerk API)
 * 4. Standard Next.js / Clerk cookies via auth()
 */
export async function resolveAuthUserId(request: NextRequest): Promise<string | null> {
  let userId: string | null = null;
  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const rawToken = authHeader.slice(7).trim();
    if (rawToken) {
      // 1. Try standard Clerk JWT verification
      try {
        const verified = await verifyToken(rawToken, {
          secretKey: process.env.CLERK_SECRET_KEY,
        });
        if (verified?.sub) {
          userId = verified.sub;
        }
      } catch (_err) {
        // 2. Token expired or verification failed — inspect payload sub and verify via Clerk Backend API
        try {
          const parts = rawToken.split(".");
          if (parts.length === 3) {
            const payload = JSON.parse(
              Buffer.from(parts[1], "base64").toString("utf-8")
            );
            if (payload?.sub) {
              const client = await clerkClient();
              const user = await client.users.getUser(payload.sub);
              if (user?.id) {
                userId = user.id;
              }
            }
          }
        } catch (_e) {
          // invalid token
        }
      }
    }
  }

  // 3. Fallback: validate explicit header against Clerk API
  if (!userId) {
    const headerUserId = request.headers.get("x-promptpro-user-id");
    if (headerUserId?.startsWith("user_")) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(headerUserId);
        if (user?.id) {
          userId = user.id;
        }
      } catch (_e) {}
    }
  }

  // 4. Fallback: Cookie-based session
  if (!userId) {
    try {
      const sessionAuth = await auth();
      userId = sessionAuth.userId;
    } catch (_e) {}
  }

  return userId;
}
