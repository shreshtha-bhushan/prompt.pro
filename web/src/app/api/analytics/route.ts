import { auth, currentUser } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { PLAN_CONFIG, type PlanTier, CREDIT_COSTS, type OptimizationMode } from "@/lib/plans";
import { getRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

interface OptimizationRow {
  id: string;
  created_at: string;
  score_before?: number | null;
  score_after?: number | null;
  site?: string | null;
  strategy?: string | null;
  mode?: string | null;
  credits_spent?: number | null;
}

interface CreditLedgerRow {
  id: string;
  created_at: string;
  amount: number;
  reason: string;
  balance_after: number;
}

function calculateDateRange(range: string) {
  const now = new Date();
  let days = 30;
  if (range === "7d") days = 7;
  else if (range === "90d") days = 90;
  else if (range === "1y") days = 365;

  const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const prevStart = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000);

  return {
    days,
    currentStart,
    currentEnd: now,
    prevStart,
    prevEnd: currentStart,
  };
}

function normalizePlatform(site: string | null | undefined): string {
  if (!site) return "Extension";
  const s = site.toLowerCase();
  if (s.includes("chatgpt") || s.includes("openai")) return "ChatGPT";
  if (s.includes("claude") || s.includes("anthropic")) return "Claude";
  if (s.includes("gemini") || s.includes("bard") || s.includes("google")) return "Gemini";
  if (s.includes("perplexity")) return "Perplexity";
  if (s.includes("deepseek")) return "DeepSeek";
  if (s.includes("copilot") || s.includes("github")) return "Copilot";
  if (s.includes("grok") || s.includes("x.ai")) return "Grok";
  if (s.includes("dashboard") || s.includes("manual")) return "Web Dashboard";
  if (s.includes("extension")) return "Chrome Extension";
  return site;
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "30d";
  const { days, currentStart, currentEnd, prevStart, prevEnd } = calculateDateRange(range);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check admin role
  let isAdmin = false;
  try {
    const user = await currentUser();
    isAdmin = getRole(user) === "admin";
  } catch (e) {}

  // Fetch profile for tier & live credits
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_tier, credits_balance, credits_reset_at, plan_status")
    .eq("clerk_id", userId)
    .maybeSingle();

  const tier: PlanTier = (profile?.plan_tier as PlanTier) ?? "free";
  const config = isAdmin ? PLAN_CONFIG.max : (PLAN_CONFIG[tier] || PLAN_CONFIG.free);
  const monthlyAllowance = isAdmin ? 999999 : config.monthlyCredits;
  const creditsRemaining = isAdmin ? 999999 : (profile?.credits_balance ?? 50);

  // Fetch logs covering both current and previous comparison window (or full 365d for heatmap)
  const fullHistoryStart = new Date(Math.min(prevStart.getTime(), Date.now() - 365 * 24 * 60 * 60 * 1000));
  
  const { data: rawLogs, error: logsErr } = await supabase
    .from("optimization_logs")
    .select("id, created_at, score_before, score_after, site, strategy")
    .eq("user_id", userId)
    .gte("created_at", fullHistoryStart.toISOString())
    .order("created_at", { ascending: true });

  if (logsErr) {
    console.error("[/api/analytics] Error querying optimization_logs:", logsErr);
  }

  const allLogs: OptimizationRow[] = (rawLogs || []).map((l: any) => ({
    ...l,
    credits_spent: l.strategy === "cot" || l.strategy === "role" || l.strategy === "advanced" ? 5 : (l.strategy === "max" ? 10 : 1),
    mode: l.strategy === "max" ? "max" : (l.strategy === "cot" || l.strategy === "role" || l.strategy === "advanced" ? "advanced" : "quick")
  }));

  // Fetch credit ledger records
  const { data: rawLedger } = await supabase
    .from("credit_ledger")
    .select("id, created_at, amount, reason, balance_after")
    .eq("profile_clerk_id", userId)
    .gte("created_at", prevStart.toISOString())
    .order("created_at", { ascending: true });

  const ledger: CreditLedgerRow[] = (rawLedger || []).filter((r: any) => r.amount > 0);

  // Separate logs into current period and previous comparison period
  const currentLogs = allLogs.filter((l) => {
    const t = new Date(l.created_at).getTime();
    return t >= currentStart.getTime() && t <= currentEnd.getTime();
  });

  const prevLogs = allLogs.filter((l) => {
    const t = new Date(l.created_at).getTime();
    return t >= prevStart.getTime() && t < prevEnd.getTime();
  });

  // ── 1. Overview KPIs ──
  const currentOptCount = currentLogs.length;
  const prevOptCount = prevLogs.length;
  const optChangePct = prevOptCount > 0 ? ((currentOptCount - prevOptCount) / prevOptCount) * 100 : null;

  // Credits Used in current period
  const currentLedgerSpend = ledger
    .filter((r) => {
      const t = new Date(r.created_at).getTime();
      return t >= currentStart.getTime() && t <= currentEnd.getTime();
    })
    .reduce((sum, r) => sum + r.amount, 0);

  // Fallback to estimated credit spend from current logs if ledger is newly established
  const calculatedCreditsUsed = currentLedgerSpend > 0
    ? currentLedgerSpend
    : currentLogs.reduce((sum, l) => sum + (l.credits_spent || 1), 0);

  const prevLedgerSpend = ledger
    .filter((r) => {
      const t = new Date(r.created_at).getTime();
      return t >= prevStart.getTime() && t < prevEnd.getTime();
    })
    .reduce((sum, r) => sum + r.amount, 0);

  const prevCreditsUsed = prevLedgerSpend > 0
    ? prevLedgerSpend
    : prevLogs.reduce((sum, l) => sum + (l.credits_spent || 1), 0);

  const creditsChangePct = prevCreditsUsed > 0 ? ((calculatedCreditsUsed - prevCreditsUsed) / prevCreditsUsed) * 100 : null;
  const creditUsagePctOfAllowance = monthlyAllowance > 0 && !isAdmin
    ? Math.min(100, Math.round((calculatedCreditsUsed / monthlyAllowance) * 100))
    : 0;

  // Average Prompt Score
  const currentScored = currentLogs.filter((l) => typeof l.score_after === "number" && l.score_after > 0);
  const currentAvgScore = currentScored.length > 0
    ? Number((currentScored.reduce((sum, l) => sum + (l.score_after || 0), 0) / currentScored.length).toFixed(1))
    : null;

  const prevScored = prevLogs.filter((l) => typeof l.score_after === "number" && l.score_after > 0);
  const prevAvgScore = prevScored.length > 0
    ? Number((prevScored.reduce((sum, l) => sum + (l.score_after || 0), 0) / prevScored.length).toFixed(1))
    : null;

  const scoreChangePct = (currentAvgScore !== null && prevAvgScore !== null && prevAvgScore > 0)
    ? Number((((currentAvgScore - prevAvgScore) / prevAvgScore) * 100).toFixed(1))
    : null;

  // Active Days
  const uniqueActiveDays = new Set(
    currentLogs.map((l) => new Date(l.created_at).toISOString().split("T")[0])
  ).size;

  // ── 2. Time-Series Activity Aggregation ──
  const activityMap = new Map<string, { optimizations: number; credits: number }>();

  if (days <= 30) {
    // Daily buckets
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(currentEnd.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0];
      activityMap.set(key, { optimizations: 0, credits: 0 });
    }
    currentLogs.forEach((l) => {
      const key = new Date(l.created_at).toISOString().split("T")[0];
      if (activityMap.has(key)) {
        const item = activityMap.get(key)!;
        item.optimizations += 1;
        item.credits += l.credits_spent || 1;
      }
    });
  } else {
    // Weekly or monthly buckets
    const bucketInterval = days <= 90 ? 7 : 30;
    for (let i = Math.ceil(days / bucketInterval) - 1; i >= 0; i--) {
      const d = new Date(currentEnd.getTime() - i * bucketInterval * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0];
      activityMap.set(key, { optimizations: 0, credits: 0 });
    }
    currentLogs.forEach((l) => {
      const logTime = new Date(l.created_at).getTime();
      let matchedKey = "";
      let minDiff = Infinity;
      for (const key of activityMap.keys()) {
        const diff = Math.abs(logTime - new Date(key).getTime());
        if (diff < minDiff) {
          minDiff = diff;
          matchedKey = key;
        }
      }
      if (matchedKey && activityMap.has(matchedKey)) {
        const item = activityMap.get(matchedKey)!;
        item.optimizations += 1;
        item.credits += l.credits_spent || 1;
      }
    });
  }

  const activitySeries = Array.from(activityMap.entries()).map(([date, data]) => ({
    date,
    optimizations: data.optimizations,
    credits: data.credits,
  }));

  // ── 3. Prompt Quality Trend (Before vs. After) ──
  const qualityMap = new Map<string, { beforeSum: number; afterSum: number; count: number }>();
  currentLogs.forEach((l) => {
    if (typeof l.score_before === "number" && typeof l.score_after === "number" && l.score_after > 0) {
      const key = new Date(l.created_at).toISOString().split("T")[0];
      if (!qualityMap.has(key)) {
        qualityMap.set(key, { beforeSum: 0, afterSum: 0, count: 0 });
      }
      const item = qualityMap.get(key)!;
      item.beforeSum += l.score_before;
      item.afterSum += l.score_after;
      item.count += 1;
    }
  });

  const qualitySeries = Array.from(qualityMap.entries()).map(([date, data]) => ({
    date,
    originalScore: Number((data.beforeSum / data.count).toFixed(1)),
    optimizedScore: Number((data.afterSum / data.count).toFixed(1)),
    count: data.count,
  }));

  const hasScoringData = qualitySeries.length > 0 || currentScored.length > 0;

  // ── 4. Optimization Modes Breakdown ──
  const modeCounts: Record<OptimizationMode, number> = {
    quick: 0,
    advanced: 0,
    max: 0,
  };

  currentLogs.forEach((l) => {
    const m = (l.mode || "quick") as OptimizationMode;
    if (modeCounts[m] !== undefined) {
      modeCounts[m] += 1;
    } else {
      modeCounts.quick += 1;
    }
  });

  const totalModeCount = currentOptCount || 1;
  const modesData = [
    {
      id: "quick",
      label: "Quick",
      emoji: "⚡",
      creditsCost: 1,
      count: modeCounts.quick,
      percentage: currentOptCount > 0 ? Math.round((modeCounts.quick / totalModeCount) * 100) : 0,
      enabled: true,
    },
    {
      id: "advanced",
      label: "Advanced",
      emoji: "🚀",
      creditsCost: 5,
      count: modeCounts.advanced,
      percentage: currentOptCount > 0 ? Math.round((modeCounts.advanced / totalModeCount) * 100) : 0,
      enabled: tier === "plus" || tier === "max" || isAdmin,
    },
    {
      id: "max",
      label: "Max",
      emoji: "👑",
      creditsCost: 10,
      count: modeCounts.max,
      percentage: currentOptCount > 0 ? Math.round((modeCounts.max / totalModeCount) * 100) : 0,
      enabled: tier === "max" || isAdmin,
    },
  ];

  // ── 5. Platform Usage ──
  const platformCounts: Record<string, number> = {};
  currentLogs.forEach((l) => {
    const p = normalizePlatform(l.site);
    platformCounts[p] = (platformCounts[p] || 0) + 1;
  });

  const platformsData = Object.entries(platformCounts)
    .map(([name, count]) => ({
      name,
      count,
      percentage: currentOptCount > 0 ? Math.round((count / totalModeCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // ── 6. Credit Analytics & Burn Projection ──
  const dailyBurnRate = uniqueActiveDays > 0
    ? Number((calculatedCreditsUsed / uniqueActiveDays).toFixed(1))
    : 0;

  let projectedExhaustionDate: string | null = null;
  let hasProjectionData = false;

  if (dailyBurnRate > 0 && creditsRemaining > 0 && uniqueActiveDays >= 3 && !isAdmin) {
    const daysRemaining = Math.floor(creditsRemaining / dailyBurnRate);
    const projDate = new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000);
    projectedExhaustionDate = projDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    hasProjectionData = true;
  }

  // ── 7. Activity Heatmap (365 days) ──
  const heatmapMap = new Map<string, number>();
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  allLogs.forEach((l) => {
    const t = new Date(l.created_at);
    if (t >= oneYearAgo) {
      const key = t.toISOString().split("T")[0];
      heatmapMap.set(key, (heatmapMap.get(key) || 0) + 1);
    }
  });

  const heatmapData = Array.from(heatmapMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  // ── 8. Dynamic Deterministic Insights ──
  const insights: string[] = [];
  if (currentOptCount > 0) {
    if (platformsData.length > 0) {
      const topPlat = platformsData[0];
      insights.push(`Your most active environment is ${topPlat.name} (${topPlat.percentage}% of all optimizations).`);
    }
    if (modeCounts.advanced + modeCounts.max > 0) {
      const deepPct = Math.round(((modeCounts.advanced + modeCounts.max) / totalModeCount) * 100);
      insights.push(`Deep reasoning modes (Advanced & Max) account for ${deepPct}% of your prompt engineering workflow.`);
    }
    if (currentAvgScore !== null) {
      if (scoreChangePct !== null && scoreChangePct > 0) {
        insights.push(`Your average prompt quality score improved by +${scoreChangePct}% compared to the previous period.`);
      } else {
        insights.push(`Your prompts achieve an average benchmark score of ${currentAvgScore}/100.`);
      }
    }
    if (dailyBurnRate > 0 && !isAdmin) {
      insights.push(`You are consuming approximately ${dailyBurnRate} credits per active day.`);
    }
    if (uniqueActiveDays >= 7) {
      insights.push(`High engagement: active on ${uniqueActiveDays} days during this observation window.`);
    }
  }

  return Response.json({
    range,
    tier,
    isAdmin,
    overview: {
      optimizations: {
        value: currentOptCount,
        prevValue: prevOptCount,
        changePct: optChangePct,
      },
      creditsUsed: {
        value: calculatedCreditsUsed,
        prevValue: prevCreditsUsed,
        changePct: creditsChangePct,
        monthlyAllowance,
        usagePctOfAllowance: creditUsagePctOfAllowance,
      },
      averageScore: {
        value: currentAvgScore,
        prevValue: prevAvgScore,
        changePct: scoreChangePct,
        hasScoringData,
      },
      activeDays: {
        value: uniqueActiveDays,
        totalDays: days,
        percentage: Math.round((uniqueActiveDays / days) * 100),
      },
    },
    activity: activitySeries,
    quality: {
      series: qualitySeries,
      hasScoringData,
      averageGain: currentAvgScore !== null && currentLogs.length > 0
        ? Number(
            (
              currentLogs
                .filter((l) => l.score_after && l.score_before)
                .reduce((acc, l) => acc + ((l.score_after || 0) - (l.score_before || 0)), 0) /
              (currentLogs.filter((l) => l.score_after && l.score_before).length || 1)
            ).toFixed(1)
          )
        : null,
    },
    modes: modesData,
    platforms: platformsData,
    credits: {
      monthlyAllowance,
      creditsUsed: calculatedCreditsUsed,
      creditsRemaining,
      usagePct: creditUsagePctOfAllowance,
      dailyBurnRate,
      projectedExhaustionDate,
      hasProjectionData,
    },
    heatmap: heatmapData,
    insights,
    totalLogsCount: allLogs.length,
    updatedAt: new Date().toISOString(),
  });
}
