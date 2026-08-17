/**
 * PromptPro — Whop SDK singleton
 *
 * Usage (server-only):
 *   import { whop } from "@/lib/whop";
 *   const ok = await whop.users.checkAccess(productId, { id: whopUserId });
 *
 * Never import this in client components — WHOP_API_KEY is server-side only.
 */
import Whop from "@whop/sdk";

export const whop = new Whop({
  apiKey: process.env.WHOP_API_KEY!,
});
