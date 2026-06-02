"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserData = exports.upgradePrompt = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
exports.upgradePrompt = functions.https.onCall(async (request) => {
    // 1. Enforce active authentication
    const auth = request.auth;
    if (!auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication is required to perform prompt upgrades.");
    }
    const uid = auth.uid;
    const data = request.data;
    const { text, strategy = "enhance", tone = null, lowTokenEnabled = false, noFluff = true } = data;
    if (!text || typeof text !== "string" || text.trim().length === 0) {
        throw new functions.https.HttpsError("invalid-argument", "Empty prompt text provided.");
    }
    if (text.length > 10000) {
        throw new functions.https.HttpsError("invalid-argument", "Prompt text exceeds maximum allowed limit of 10,000 characters.");
    }
    try {
        // 2. Secure API Key retrieval
        // Under production, we retrieve this securely from GCloud Secret Manager
        // or the user's specific record in Firestore.
        // Fallback to config parameters or Secret Manager environment binding.
        let apiKey = process.env.OPENROUTER_API_KEY || "";
        if (!apiKey) {
            // Fallback: Check if user has uploaded their own private OpenRouter key in user profile
            const userSnap = await db.collection("users").doc(uid).get();
            const userData = userSnap.data();
            if (userData?.openrouterApiKey) {
                apiKey = String(userData.openrouterApiKey).trim();
            }
        }
        if (!apiKey) {
            throw new functions.https.HttpsError("failed-precondition", "OpenRouter API Key has not been configured on this instance.");
        }
        // 3. Construct optimization instructions
        let systemPrompt = "You are PromptPro, an expert prompt engineering AI. Your job is to rewrite and optimize the user's input prompt based on their chosen strategy and tone.";
        if (strategy === "elaborate") {
            systemPrompt += "\n\nStrategy [ELABORATE]: Expand the prompt with a systematic reasoning scaffold and chain-of-thought structure. Encourage deep analysis.";
        }
        else if (strategy === "concise") {
            systemPrompt += "\n\nStrategy [CONCISE]: Strip away any fluff, focus on directness, and enforce short, bullet-pointed, high-density instructions.";
        }
        else {
            systemPrompt += "\n\nStrategy [ENHANCE]: Apply a complete 5-component decomposition framework: define an expert ROLE, state the clarified core TASK, preserve existing CONTEXT, outline a clear output FORMAT, and establish quality CONSTRAINTS.";
        }
        if (tone) {
            systemPrompt += `\n\nTone [${tone.toUpperCase()}]: Enforce a ${tone} tone throughout the response.`;
        }
        if (lowTokenEnabled) {
            systemPrompt += "\n\nCRITICAL CONSTRAINTS (LOW TOKEN MODE):\nEnsure the upgraded prompt instructs the target model to be extremely concise, utilizing minimal tokens. Inject strict length limits (e.g., \"keep response under 150 words\"), restrict verbose explanations, and enforce direct fact-based answers with zero filler.";
        }
        if (noFluff) {
            systemPrompt += "\n\nCRITICAL CONSTRAINTS (NO-FLUFF):\n1. Output ONLY the raw, enhanced prompt that the user will copy and paste.\n2. Do NOT include any greetings, introduction, closing remarks, explanations of changes, or conversational filler.\n3. Do NOT wrap the prompt in markdown code blocks or backticks. Output pure, copyable text.";
        }
        // 4. Secure HTTPS request to OpenRouter API (utilizing global fetch built into Node.js 18+)
        const openrouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": "https://github.com/shreshtha-bhushan/prompt.pro",
                "X-Title": "PromptPro Cloud Portal"
            },
            body: JSON.stringify({
                model: "anthropic/claude-3.5-sonnet",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: text }
                ],
                temperature: 0.3
            })
        });
        if (!openrouterResponse.ok) {
            const errorPayload = await openrouterResponse.json();
            const apiErrorMessage = errorPayload.error?.message || `HTTP status ${openrouterResponse.status}`;
            throw new Error(`OpenRouter API rejected call: ${apiErrorMessage}`);
        }
        const completion = await openrouterResponse.json();
        let aiText = completion.choices?.[0]?.message?.content;
        if (!aiText) {
            throw new Error("Received empty completion from OpenRouter.");
        }
        let cleanText = aiText.trim();
        if (noFluff) {
            // Strip outer markdown fences
            if (cleanText.startsWith("```") && cleanText.endsWith("```")) {
                cleanText = cleanText.replace(/^```[a-zA-Z]*\n/, "").replace(/\n```$/, "");
            }
            // Strip introductory text
            cleanText = cleanText.replace(/^(here is|here's|sure, here is|sure, here's) the (enhanced|rewritten|optimized|upgraded)? prompt:?\n*/i, "");
            cleanText = cleanText.trim();
        }
        // 5. Usage telemetry logging to Cloud Firestore
        const promptTokens = completion.usage?.prompt_tokens || 0;
        const completionTokens = completion.usage?.completion_tokens || 0;
        // Estimate cost based on Claude 3.5 Sonnet token rates
        // Input: $3.00 / M tokens, Output: $15.00 / M tokens
        const estimatedCost = (promptTokens * 0.000003) + (completionTokens * 0.000015);
        await db.collection("users").doc(uid).collection("usage").add({
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            strategy,
            tone,
            inputTokens: promptTokens,
            outputTokens: completionTokens,
            estimatedCost: estimatedCost,
            model: "anthropic/claude-3.5-sonnet"
        });
        return {
            success: true,
            rewritten: cleanText,
            tokensUsed: promptTokens + completionTokens,
            estimatedCost
        };
    }
    catch (error) {
        const err = error;
        console.error("[upgradePrompt] Secure enhancement failed:", err);
        throw new functions.https.HttpsError("internal", err.message || "An unexpected error occurred during prompt enhancement.");
    }
});
// ═══════════════════════════════════════════════════════════════
// CLOUD FUNCTION TRIGGER: deleteUserData (Auth onDelete Trigger)
// ═══════════════════════════════════════════════════════════════
// Automatically wipes user documents and data subcollections
// upon account deletion to enforce absolute user privacy.
// ═══════════════════════════════════════════════════════════════
exports.deleteUserData = functions.auth.user().onDelete(async (user) => {
    const uid = user.uid;
    console.log(`[deleteUserData] Triggered account deletion for user: ${uid}`);
    try {
        // Recursive deletion helper for Firestore subcollections
        const userDocRef = db.collection("users").doc(uid);
        // 1. Delete prompts subcollection
        const promptsSnap = await userDocRef.collection("prompts").get();
        const promptBatch = db.batch();
        promptsSnap.docs.forEach((doc) => {
            promptBatch.delete(doc.ref);
        });
        await promptBatch.commit();
        console.log(`[deleteUserData] Wiped prompts subcollection for ${uid}`);
        // 2. Delete usage subcollection
        const usageSnap = await userDocRef.collection("usage").get();
        const usageBatch = db.batch();
        usageSnap.docs.forEach((doc) => {
            usageBatch.delete(doc.ref);
        });
        await usageBatch.commit();
        console.log(`[deleteUserData] Wiped usage telemetry subcollection for ${uid}`);
        // 3. Delete parent profile doc
        await userDocRef.delete();
        console.log(`[deleteUserData] Account document successfully removed for user: ${uid}`);
        // 4. Optionally wipe Cloud Storage assets folder mapping uid
        const bucket = admin.storage().bucket();
        const folderPrefix = `users/${uid}/`;
        await bucket.deleteFiles({ prefix: folderPrefix });
        console.log(`[deleteUserData] Cloud storage files completely wiped for user: ${uid}`);
    }
    catch (error) {
        console.error(`[deleteUserData] Critical failure wiping data for user ${uid}:`, error);
    }
});
//# sourceMappingURL=index.js.map