/**
 * PromptPro — Admin Layout Guard
 *
 * Protects all routes under /admin from non-admin users.
 * Admin role is stored in Clerk publicMetadata: { "role": "admin" }
 * Set manually via Clerk Dashboard — no self-service UI.
 */

import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getRole } from "@/lib/roles";
import * as React from "react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  if (getRole(user) !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen" style={{ background: "#111111" }}>
      {/* Admin top bar */}
      <div
        className="border-b px-6 py-3 flex items-center gap-4"
        style={{
          background: "#151515",
          borderColor: "rgba(255,255,255,0.05)",
        }}
      >
        <a
          href="/dashboard"
          className="text-[12px] font-mono text-white/40 hover:text-white/70 transition-colors"
        >
          ← Dashboard
        </a>
        <div className="h-3 w-px bg-white/10" />
        <span className="text-[12px] font-mono text-white/30 uppercase tracking-wider">
          Admin Panel
        </span>
        <div
          className="ml-auto px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider"
          style={{
            background: "rgba(255,159,10,0.12)",
            color: "rgba(255,159,10,0.9)",
            border: "1px solid rgba(255,159,10,0.2)",
          }}
        >
          Admin
        </div>
      </div>

      <main className="p-6">{children}</main>
    </div>
  );
}
