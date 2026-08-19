import { z } from "zod";

// ── Array Length Constants ─────────────────────────────────────
export const MAX_SYNC_HISTORY_ITEMS = 500;
export const MAX_SYNC_LIBRARY_ITEMS = 500;
export const MAX_SYNC_CONTEXT_ITEMS = 500;
export const MAX_PROMPT_LENGTH = 10000;
export const MAX_SNIPPET_CONTENT_LENGTH = 20000;

// ── /api/optimize Schema ───────────────────────────────────────
export const optimizeSchema = z.object({
  mode: z.enum(["quick", "advanced", "max"], {
    message: "mode must be 'quick', 'advanced', or 'max'",
  }),
  prompt: z
    .string({ message: "prompt is required" })
    .min(1, "prompt cannot be empty")
    .max(MAX_PROMPT_LENGTH, `prompt cannot exceed ${MAX_PROMPT_LENGTH} characters`),
});

export type OptimizeInput = z.infer<typeof optimizeSchema>;

// ── /api/upgrade Schema (Legacy & Extension Compatibility) ────
export const upgradeSchema = z.object({
  text: z
    .string({ message: "text is required" })
    .min(1, "prompt text cannot be empty")
    .max(MAX_PROMPT_LENGTH, `prompt text cannot exceed ${MAX_PROMPT_LENGTH} characters`),
  strategy: z.string().optional().default("enhance"),
  tone: z.string().max(50).nullable().optional(),
  lowTokenEnabled: z.boolean().optional().default(false),
  noFluff: z.boolean().optional().default(true),
  mode: z.enum(["quick", "advanced", "max"]).optional(),
});

export type UpgradeInput = z.infer<typeof upgradeSchema>;

// ── /api/admin/grant-credits Schema ───────────────────────────
export const adminGrantCreditsSchema = z.object({
  profileId: z
    .string({ message: "profileId is required" })
    .min(1, "profileId cannot be empty")
    .max(128, "profileId is invalid"),
  amount: z
    .number({ message: "amount is required" })
    .int("amount must be an integer")
    .min(1, "amount must be at least 1")
    .max(10000, "amount cannot exceed 10,000"),
});

export type AdminGrantCreditsInput = z.infer<typeof adminGrantCreditsSchema>;

// ── /api/extension/sync Schemas ────────────────────────────────
const syncHistoryItemSchema = z.object({
  id: z.string().optional(),
  text: z.string().max(MAX_PROMPT_LENGTH),
  originalText: z.string().max(MAX_PROMPT_LENGTH).optional(),
  score: z.number().optional().default(0),
  scoreBefore: z.number().optional().default(0),
  site: z.string().max(100).optional().default("unknown"),
  strategy: z.string().max(50).optional().default("enhance"),
  createdAt: z.string().optional(),
});

const syncSnippetItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().max(200).optional().default("Untitled"),
  text: z.string().max(MAX_SNIPPET_CONTENT_LENGTH),
  createdAt: z.string().optional(),
});

const syncContextItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().max(200).optional().default("Context"),
  content: z.string().max(MAX_SNIPPET_CONTENT_LENGTH),
  active: z.boolean().optional().default(false),
  createdAt: z.string().optional(),
});

export const bulkMergeSchema = z.object({
  action: z.literal("bulkMerge"),
  history: z.array(syncHistoryItemSchema).max(MAX_SYNC_HISTORY_ITEMS, `history array exceeds max length of ${MAX_SYNC_HISTORY_ITEMS}`).optional().default([]),
  library: z.array(syncSnippetItemSchema).max(MAX_SYNC_LIBRARY_ITEMS, `library array exceeds max length of ${MAX_SYNC_LIBRARY_ITEMS}`).optional().default([]),
  contextBlocks: z.array(syncContextItemSchema).max(MAX_SYNC_CONTEXT_ITEMS, `contextBlocks array exceeds max length of ${MAX_SYNC_CONTEXT_ITEMS}`).optional().default([]),
});

export const saveLibrarySchema = z.object({
  action: z.literal("saveLibrary"),
  title: z.string().max(200).optional().default("Untitled"),
  text: z.string().max(MAX_SNIPPET_CONTENT_LENGTH).optional().default(""),
});

export const deleteLibrarySchema = z.object({
  action: z.literal("deleteLibrary"),
  id: z.string().min(1, "id is required"),
});

export const addContextSchema = z.object({
  action: z.literal("addContext"),
  title: z.string().max(200).optional().default("Context"),
  content: z.string().max(MAX_SNIPPET_CONTENT_LENGTH).optional().default(""),
});

export const deleteContextSchema = z.object({
  action: z.literal("deleteContext"),
  id: z.string().min(1, "id is required"),
});

export const clearHistorySchema = z.object({
  action: z.literal("clearHistory"),
});

export const toggleContextSchema = z.object({
  action: z.literal("toggleContext"),
  id: z.string().optional(),
});

export const syncActionSchema = z.discriminatedUnion("action", [
  bulkMergeSchema,
  saveLibrarySchema,
  deleteLibrarySchema,
  addContextSchema,
  deleteContextSchema,
  clearHistorySchema,
  toggleContextSchema,
]);

export type SyncActionInput = z.infer<typeof syncActionSchema>;
