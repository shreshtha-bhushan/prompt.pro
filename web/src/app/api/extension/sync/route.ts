/**
 * PromptPro — /api/extension/sync — Extension History & Snippets Sync Route
 *
 * Security Hardening:
 *   1. Clerk authentication required
 *   2. Scoped strictly to authenticated user's clerk_id
 *   3. Rate limiting (60 requests / 60s)
 *   4. Zod schema validation with hard array length caps (500 items max)
 *   5. Error response sanitization (no DB error message leakage)
 *   6. Strict CORS allowlisting
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit, buildRateLimitResponse } from "@/lib/ratelimit";
import { syncActionSchema } from "@/lib/validations/api";
import { getCorsHeaders, handleOptions } from "@/lib/cors";

function createSupabaseClient(clerkToken: string | null) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: clerkToken ? { Authorization: `Bearer ${clerkToken}` } : undefined,
      },
    }
  );
}

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);

  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "unauthorized", code: "AUTH_REQUIRED" },
        { status: 401, headers: corsHeaders }
      );
    }

    const rateLimitResult = await rateLimit("sync", userId);
    if (!rateLimitResult.success) {
      return buildRateLimitResponse(rateLimitResult, corsHeaders);
    }

    const supabaseToken = await getToken({ template: "supabase" });
    const supabase = createSupabaseClient(supabaseToken);

    // 1. Fetch recent optimization history
    const { data: logs, error: logsError } = await supabase
      .from("optimization_logs")
      .select("id, original_prompt, upgraded_prompt, score_before, score_after, site, strategy, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    // 2. Fetch snippets and context blocks
    const { data: snippets, error: snippetsError } = await supabase
      .from("snippets")
      .select("id, title, content, type, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500);

    if (logsError || snippetsError) {
      console.error("[Sync GET DB Error]", logsError || snippetsError);
    }

    const history = (logs || []).map((log) => ({
      id: log.id,
      text: log.upgraded_prompt,
      score: log.score_after,
      originalText: log.original_prompt,
      scoreBefore: log.score_before,
      site: log.site,
      strategy: log.strategy,
      createdAt: log.created_at,
    }));

    const library = (snippets || [])
      .filter((s) => s.type === "snippet")
      .map((s) => ({
        id: s.id,
        title: s.title,
        text: s.content,
        createdAt: s.created_at,
      }));

    const contextBlocks = (snippets || [])
      .filter((s) => s.type === "context")
      .map((s) => ({
        id: s.id,
        title: s.title,
        content: s.content,
        active: false,
        createdAt: s.created_at,
      }));

    return NextResponse.json(
      {
        success: true,
        history,
        library,
        contextBlocks,
      },
      { headers: corsHeaders }
    );
  } catch (error: unknown) {
    console.error("[Sync GET Error]", error);
    return NextResponse.json(
      { error: "sync_fetch_failed", message: "Failed to retrieve sync data.", code: "SYNC_GET_ERROR" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);

  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "unauthorized", code: "AUTH_REQUIRED" },
        { status: 401, headers: corsHeaders }
      );
    }

    const rateLimitResult = await rateLimit("sync", userId);
    if (!rateLimitResult.success) {
      return buildRateLimitResponse(rateLimitResult, corsHeaders);
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { error: "invalid_json", detail: "Request body must be valid JSON", code: "INVALID_JSON" },
        { status: 400, headers: corsHeaders }
      );
    }

    const parseResult = syncActionSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "invalid_request",
          detail: parseResult.error.issues[0]?.message || "Validation failed",
          code: "VALIDATION_FAILED",
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const actionData = parseResult.data;
    const supabaseToken = await getToken({ template: "supabase" });
    const supabase = createSupabaseClient(supabaseToken);

    // ── Bulk Merge Action ─────────────────────────────────────
    if (actionData.action === "bulkMerge") {
      const { history, library, contextBlocks } = actionData;

      // Merge History
      if (history.length > 0) {
        const { data: existingLogs } = await supabase
          .from("optimization_logs")
          .select("id, upgraded_prompt, site, original_prompt")
          .eq("user_id", userId);

        const existingMap = new Map((existingLogs || []).map((l) => [l.upgraded_prompt, l]));
        const newLogs: Array<Record<string, unknown>> = [];
        const updatePromises: PromiseLike<unknown>[] = [];

        for (const h of history) {
          const existing = existingMap.get(h.text);
          if (!existing) {
            newLogs.push({
              user_id: userId,
              original_prompt: h.originalText || h.text,
              upgraded_prompt: h.text,
              score_before: h.scoreBefore || 0,
              score_after: h.score || 0,
              site: h.site || "unknown",
              strategy: h.strategy || "enhance",
            });
          } else {
            const updates: Record<string, unknown> = {};
            if (h.site && h.site !== "extension" && (existing.site === "extension" || !existing.site)) {
              updates.site = h.site;
            }
            if (
              h.originalText &&
              h.originalText !== "Synced from Extension" &&
              (existing.original_prompt === "Synced from Extension" || !existing.original_prompt)
            ) {
              updates.original_prompt = h.originalText;
            }

            if (Object.keys(updates).length > 0) {
              updatePromises.push(
                supabase.from("optimization_logs").update(updates).eq("id", existing.id)
              );
            }
          }
        }

        if (newLogs.length > 0) {
          await supabase.from("optimization_logs").insert(newLogs);
        }
        if (updatePromises.length > 0) {
          await Promise.all(updatePromises);
        }
      }

      // Merge Snippets & Context Blocks
      const newSnippets: Array<Record<string, unknown>> = [];
      const { data: existingSnippets } = await supabase
        .from("snippets")
        .select("title, content, type")
        .eq("user_id", userId);

      const snippetSet = new Set(
        (existingSnippets || []).map((s) => `${s.type}:${s.title}:${s.content}`)
      );

      for (const l of library) {
        if (!snippetSet.has(`snippet:${l.title}:${l.text}`)) {
          newSnippets.push({ user_id: userId, title: l.title, content: l.text, type: "snippet" });
        }
      }

      for (const c of contextBlocks) {
        if (!snippetSet.has(`context:${c.title}:${c.content}`)) {
          newSnippets.push({ user_id: userId, title: c.title, content: c.content, type: "context" });
        }
      }

      if (newSnippets.length > 0) {
        await supabase.from("snippets").insert(newSnippets);
      }

      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    if (actionData.action === "clearHistory") {
      await supabase.from("optimization_logs").delete().eq("user_id", userId);
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    if (actionData.action === "saveLibrary") {
      const { error } = await supabase.from("snippets").insert({
        user_id: userId,
        title: actionData.title || "Untitled",
        content: actionData.text || "",
        type: "snippet",
      });
      if (error) throw error;
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    if (actionData.action === "deleteLibrary") {
      await supabase.from("snippets").delete().eq("id", actionData.id).eq("user_id", userId);
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    if (actionData.action === "addContext") {
      const { error } = await supabase.from("snippets").insert({
        user_id: userId,
        title: actionData.title || "Context",
        content: actionData.content || "",
        type: "context",
      });
      if (error) throw error;
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    if (actionData.action === "deleteContext") {
      await supabase.from("snippets").delete().eq("id", actionData.id).eq("user_id", userId);
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    if (actionData.action === "toggleContext") {
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    return NextResponse.json({ error: "unknown_action", code: "INVALID_ACTION" }, { status: 400, headers: corsHeaders });
  } catch (error: unknown) {
    console.error("[Sync POST Error]", error);
    return NextResponse.json(
      { error: "sync_mutation_failed", message: "Failed to update synchronized data.", code: "SYNC_POST_ERROR" },
      { status: 500, headers: corsHeaders }
    );
  }
}
