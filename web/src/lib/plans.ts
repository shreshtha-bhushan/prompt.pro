/**
 * PromptPro — Central Plan Configuration (Single Source of Truth)
 *
 * Defines the locked PromptPro tier, credit, mode, and workspace architecture.
 * Modes:
 *   - quick: 1 credit
 *   - advanced: 5 credits
 *   - max: 10 credits
 *
 * Tiers:
 *   - Free: 50 credits / mo — Quick mode only (Advanced & Max locked)
 *   - Plus: 500 credits / mo — Quick & Advanced modes (Max locked)
 *   - Max: 2,000 credits / mo — Quick, Advanced & Max modes
 */

export type PlanTier = "free" | "plus" | "max";
export type OptimizationMode = "quick" | "advanced" | "max";

/** Credit cost per optimization mode */
export const CREDIT_COSTS: Record<OptimizationMode, number> = {
  quick: 1,
  advanced: 5,
  max: 10,
};

export interface ModeDefinition {
  enabled: boolean;
  credits: number;
  requiredTier?: "plus" | "max";
  label?: string;
  emoji?: string;
  description?: string;
}

export const MODE_EMOJIS: Record<OptimizationMode, string> = {
  quick: "⚡",
  advanced: "🚀",
  max: "👑",
};

/** Full locked product configuration */
export const PLAN_CONFIG = {
  free: {
    id: "free" as PlanTier,
    name: "Free",
    price: 0,
    period: "forever",
    monthlyCredits: 50,
    historyDays: 30,
    savedPrompts: 25,
    contextBlocks: 5,
    collections: 3,
    description: "Essential AI prompt optimization with 50 monthly credits.",
    modes: {
      quick: { enabled: true, credits: 1, label: "Quick", emoji: "⚡", description: "Fast AI prompt optimization" },
      advanced: { enabled: false, credits: 5, requiredTier: "plus" as const, label: "Advanced", emoji: "🚀", description: "Deep contextual reasoning" },
      max: { enabled: false, credits: 10, requiredTier: "max" as const, label: "Max", emoji: "👑", description: "Frontier model optimization" },
    },
    features: [
      "50 optimization credits / month",
      "Quick AI optimization (1 cr)",
      "25 saved prompts in library",
      "5 active context blocks",
      "3 collections",
      "30-day history timeline",
    ],
  },
  plus: {
    id: "plus" as PlanTier,
    name: "Plus",
    price: 10,
    period: "per month",
    badge: "POPULAR",
    monthlyCredits: 500,
    historyDays: 90,
    savedPrompts: 250,
    contextBlocks: 50,
    collections: "unlimited" as const,
    description: "High-speed LLM upgrades & intelligence tools for power users.",
    modes: {
      quick: { enabled: true, credits: 1, label: "Quick", emoji: "⚡", description: "Fast AI prompt optimization" },
      advanced: { enabled: true, credits: 5, label: "Advanced", emoji: "🚀", description: "Deep contextual reasoning" },
      max: { enabled: false, credits: 10, requiredTier: "max" as const, label: "Max", emoji: "👑", description: "Frontier model optimization" },
    },
    features: [
      "500 optimization credits / month",
      "Quick (1 cr) & Advanced (5 cr) modes",
      "250 saved prompts & unlimited collections",
      "50 rich context blocks",
      "90-day history timeline",
      "Prompt versioning & scoring",
      "Basic analytics",
    ],
  },
  max: {
    id: "max" as PlanTier,
    name: "Max",
    price: 25,
    period: "per month",
    monthlyCredits: 2000,
    historyDays: 365,
    savedPrompts: "unlimited" as const,
    contextBlocks: "unlimited" as const,
    collections: "unlimited" as const,
    description: "Premium frontier AI optimization with autonomous multi-pass reasoning.",
    modes: {
      quick: { enabled: true, credits: 1, label: "Quick", emoji: "⚡", description: "Fast AI prompt optimization" },
      advanced: { enabled: true, credits: 5, label: "Advanced", emoji: "🚀", description: "Deep contextual reasoning" },
      max: { enabled: true, credits: 10, label: "Max", emoji: "👑", description: "Frontier model optimization" },
    },
    features: [
      "2,000 optimization credits / month",
      "Quick (1 cr), Advanced (5 cr) & Max (10 cr) modes",
      "Unlimited saved prompts & context blocks",
      "Unlimited collections & 365-day history",
      "Personal Memory & Optimization Studio",
      "Batch & Multi-Pass Optimization",
      "Large-Context Optimization & Advanced workflows",
    ],
  },
};

/** Plan feature limits representation */
export const PLAN_LIMITS = {
  free: {
    monthlyCredits: PLAN_CONFIG.free.monthlyCredits,
    savedPrompts: PLAN_CONFIG.free.savedPrompts,
    contextBlocks: PLAN_CONFIG.free.contextBlocks,
    collections: PLAN_CONFIG.free.collections,
    historyDays: PLAN_CONFIG.free.historyDays,
    allowedModes: ["quick"] as OptimizationMode[],
  },
  plus: {
    monthlyCredits: PLAN_CONFIG.plus.monthlyCredits,
    savedPrompts: PLAN_CONFIG.plus.savedPrompts,
    contextBlocks: PLAN_CONFIG.plus.contextBlocks,
    collections: PLAN_CONFIG.plus.collections,
    historyDays: PLAN_CONFIG.plus.historyDays,
    allowedModes: ["quick", "advanced"] as OptimizationMode[],
  },
  max: {
    monthlyCredits: PLAN_CONFIG.max.monthlyCredits,
    savedPrompts: PLAN_CONFIG.max.savedPrompts,
    contextBlocks: PLAN_CONFIG.max.contextBlocks,
    collections: PLAN_CONFIG.max.collections,
    historyDays: PLAN_CONFIG.max.historyDays,
    allowedModes: ["quick", "advanced", "max"] as OptimizationMode[],
  },
};

/**
 * Check whether a given plan tier is permitted to use an optimization mode.
 */
export function canUseMode(tier: PlanTier, mode: OptimizationMode | string): boolean {
  const normalizedMode = mode as OptimizationMode;
  return PLAN_CONFIG[tier]?.modes[normalizedMode]?.enabled ?? false;
}

/**
 * Convenience: monthly credit allotment for the reset Edge Function.
 */
export const MONTHLY_CREDITS: Record<PlanTier, number> = {
  free: 50,
  plus: 500,
  max: 2000,
};
