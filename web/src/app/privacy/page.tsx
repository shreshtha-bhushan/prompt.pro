import type { Metadata } from "next";
import { SupportPageShell } from "@/components/support/SupportPageShell";
import { SupportCard } from "@/components/support/SupportCard";

export const metadata: Metadata = {
  title: "Privacy Policy | PromptPro",
  description:
    "Learn how PromptPro collects, protects, and manages user data with industry-standard security and AI training opt-out configurations.",
};

export default function PrivacyPage() {
  return (
    <SupportPageShell backHref="/about" backLabel="About">
      <div className="w-full max-w-[760px] py-4">
        <SupportCard size="lg" className="text-left space-y-8">
          {/* Header */}
          <div className="border-b border-white/[0.08] pb-6">
            <span className="text-[11px] font-mono uppercase tracking-widest text-white/40 block mb-1">
              Privacy & Data Governance
            </span>
            <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-white font-sans">
              Privacy Policy
            </h1>
            <p className="text-[13px] text-white/40 font-mono mt-1">
              Last updated: August 19, 2026 · Effective immediately
            </p>
          </div>

          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-[18px] font-semibold text-white font-sans">
              1. AI Data Training & Privacy
            </h2>
            <p className="text-[14px] text-white/60 leading-relaxed font-sans">
              PromptPro is built with strict privacy boundaries. We do not sell, rent, or monetize your prompt data. We configure our AI infrastructure (via OpenRouter) to opt out of model training on your prompts.
            </p>
            <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[13px] text-white/50 font-mono">
              [PLACEHOLDER: Confirm this account-level setting (&ldquo;disallow providers that train on data&rdquo;) is enabled in your OpenRouter dashboard before publishing this claim]
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-[18px] font-semibold text-white font-sans">
              2. Information We Collect
            </h2>
            <ul className="space-y-2 text-[14px] text-white/60 leading-relaxed list-disc list-inside font-sans">
              <li>
                <strong className="text-white/80">Account Credentials:</strong> User ID, email address, and authentication metadata managed securely via Clerk.
              </li>
              <li>
                <strong className="text-white/80">Prompt Artifacts & History:</strong> Original and rewritten prompt text, quality benchmark metrics, and saved snippets stored in your isolated Supabase workspace.
              </li>
              <li>
                <strong className="text-white/80">Billing & Membership Data:</strong> Subscription status and plan tier managed through Whop (credit card details are handled directly by payment processors and never touch our servers).
              </li>
              <li>
                <strong className="text-white/80">Usage & Telemetry:</strong> Aggregated feature interactions and error diagnostics collected via PostHog.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-[18px] font-semibold text-white font-sans">
              3. Third-Party Service Providers & Sub-processors
            </h2>
            <p className="text-[14px] text-white/60 leading-relaxed font-sans">
              PromptPro relies on trusted third-party infrastructure providers to deliver our services. Our active sub-processors include:
            </p>
            <div className="space-y-2.5 pt-1">
              {[
                { name: "Clerk", role: "User Authentication & Identity Management", location: "USA" },
                { name: "Supabase", role: "Cloud PostgreSQL Database & Encrypted Storage", location: "USA" },
                { name: "Whop", role: "Subscription Billing & Customer Portal", location: "USA" },
                { name: "PostHog", role: "Product Telemetry & Diagnostic Analytics", location: "USA" },
                { name: "OpenRouter / LLM Providers", role: "Inference Routing for AI Optimizations", location: "USA" },
              ].map((sub, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] text-[13px]"
                >
                  <span className="font-semibold text-white font-mono">{sub.name}</span>
                  <span className="text-white/50">{sub.role}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-[18px] font-semibold text-white font-sans">
              4. Data Retention Policy
            </h2>
            <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[13px] text-white/50 font-mono">
              [PLACEHOLDER: Insert precise data retention timeline for prompt history logs, account deletion turnaround, and ledger archive periods — consult legal counsel]
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-[18px] font-semibold text-white font-sans">
              5. User Rights (GDPR & CCPA/CPRA)
            </h2>
            <p className="text-[14px] text-white/60 leading-relaxed font-sans">
              Depending on your jurisdiction, you have the right to access, export, rectify, or delete your personal data. You may delete your prompt history and saved snippets at any time directly through the PromptPro dashboard.
            </p>
            <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[13px] text-white/50 font-mono">
              [PLACEHOLDER: Specify formal data subject access request (DSAR) workflow and dedicated compliance officer contact]
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-[18px] font-semibold text-white font-sans">
              6. Security Safeguards
            </h2>
            <p className="text-[14px] text-white/60 leading-relaxed font-sans">
              We employ HTTPS encryption in transit, strict Row Level Security (RLS) policies in PostgreSQL, and serverless rate limiting to safeguard user workspaces against unauthorized access.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3 border-t border-white/[0.08] pt-6">
            <h2 className="text-[18px] font-semibold text-white font-sans">
              7. Contact Us
            </h2>
            <p className="text-[14px] text-white/60 leading-relaxed font-sans">
              If you have questions regarding this Privacy Policy or wish to exercise your privacy rights, please email{" "}
              <a
                href="mailto:privacy@promptpro.dev"
                className="text-white hover:underline underline-offset-4"
              >
                privacy@promptpro.dev
              </a>
              .
            </p>
          </section>
        </SupportCard>
      </div>
    </SupportPageShell>
  );
}
