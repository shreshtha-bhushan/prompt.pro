/**
 * PromptPro — Clerk RBAC Role Helper
 *
 * Role is strictly derived from verified server-side Clerk metadata (publicMetadata or privateMetadata).
 * Default for any user without an explicit admin role is "user".
 *
 * SECURITY:
 * Never trust client-writable fields (e.g. unsafeMetadata, usernames, or emails).
 *
 * To grant admin: Clerk Dashboard → Users → [your account]
 *   → Metadata → Public metadata: { "role": "admin" }
 */

import type { User } from "@clerk/nextjs/server";

export type Role = "user" | "admin";

/**
 * Reads the role strictly from server-verified Clerk metadata.
 * Accepts a User or session claims object containing publicMetadata or privateMetadata.
 */
export function getRole(
  user: { publicMetadata?: Record<string, unknown>; privateMetadata?: Record<string, unknown> } | null | undefined
): Role {
  if (!user) return "user";

  // Check server-controlled public metadata (read-only for client, set via Clerk Dashboard/API)
  if (user.publicMetadata && typeof user.publicMetadata === "object" && user.publicMetadata.role === "admin") {
    return "admin";
  }

  // Check server-only private metadata (never sent to client)
  if (user.privateMetadata && typeof user.privateMetadata === "object" && user.privateMetadata.role === "admin") {
    return "admin";
  }

  return "user";
}
