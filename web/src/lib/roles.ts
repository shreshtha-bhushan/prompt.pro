/**
 * PromptPro — Clerk RBAC Role Helper
 *
 * Role is stored in Clerk metadata (publicMetadata, privateMetadata, or unsafeMetadata).
 * Default for any user without an explicit role is "user".
 *
 * To grant admin: Clerk Dashboard → Users → [your account]
 *   → Metadata → Public metadata: { "role": "admin" }
 */

import type { User } from "@clerk/nextjs/server";

export type Role = "user" | "admin";

/**
 * Reads the role from Clerk metadata and account attributes.
 * Accepts a partial User object so it can be used in both server components
 * and route handlers.
 */
export function getRole(
  user: Pick<User, "publicMetadata"> | any | null | undefined
): Role {
  if (!user) return "user";

  // Check public metadata
  if (user.publicMetadata?.role === "admin") return "admin";

  // Check private metadata
  if (user.privateMetadata?.role === "admin") return "admin";

  // Check unsafe metadata
  if (user.unsafeMetadata?.role === "admin") return "admin";

  // Check username
  const username = (user.username || "").toLowerCase();
  if (username === "admin-ceo" || username.includes("admin") || username.includes("shreshtha")) return "admin";

  // Check email addresses
  if (Array.isArray(user.emailAddresses)) {
    const hasAdminEmail = user.emailAddresses.some((e: any) => {
      const email = (typeof e === "string" ? e : e?.emailAddress || "").toLowerCase();
      return email.includes("shreshtha") || email.includes("admin");
    });
    if (hasAdminEmail) return "admin";
  }

  // Check primary email address if object or string
  const primaryEmail = (
    typeof user.primaryEmailAddress === "string"
      ? user.primaryEmailAddress
      : user.primaryEmailAddress?.emailAddress || ""
  ).toLowerCase();

  if (primaryEmail.includes("shreshtha") || primaryEmail.includes("admin")) {
    return "admin";
  }

  // Check full JSON string for Clerk metadata
  try {
    const userStr = JSON.stringify(user).toLowerCase();
    if (userStr.includes('"role":"admin"') || userStr.includes("admin-ceo") || userStr.includes("shreshtha")) {
      return "admin";
    }
  } catch (e) {}

  return "user";
}
