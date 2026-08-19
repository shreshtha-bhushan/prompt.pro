import type { Metadata } from "next";
import { SupportPageShell } from "@/components/support/SupportPageShell";
import { SupportCard } from "@/components/support/SupportCard";

export const metadata: Metadata = {
  title: "Terms of Service | PromptPro",
  description:
    "Review the PromptPro Terms of Service governing platform usage, subscription memberships, and API access rules.",
};

export default function TermsPage() {
  return (
    <SupportPageShell backHref="/about" backLabel="About">
      <div className="w-full max-w-[760px] py-4">
        <SupportCard size="lg" className="text-left space-y-8">
          {/* Header */}
          <div className="border-b border-white/[0.08] pb-6">
            <span className="text-[11px] font-mono uppercase tracking-widest text-white/40 block mb-1">
              Legal Documentation
            </span>
            <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-white font-sans">
              Terms of Service
            </h1>
            <p className="text-[13px] text-white/40 font-mono mt-1">
              Last updated: August 19, 2026 · Effective immediately
            </p>
          </div>

          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-[18px] font-semibold text-white font-sans">
              1. Acceptance of Terms
            </h2>
            <p className="text-[14px] text-white/60 leading-relaxed font-sans">
              By accessing, browsing, or utilizing the PromptPro web application, Chrome browser extension, or associated API services (collectively, the &ldquo;Service&rdquo;), you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you disagree with any portion of these Terms, you must immediately discontinue your use of the Service.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-[18px] font-semibold text-white font-sans">
              2. Description of Service & License
            </h2>
            <p className="text-[14px] text-white/60 leading-relaxed font-sans">
              PromptPro provides software tools for analyzing, decomposing, and optimizing artificial intelligence prompts. PromptPro grants you a limited, non-exclusive, non-transferable, revocable license to use the Service in accordance with these Terms and your active subscription tier.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-[18px] font-semibold text-white font-sans">
              3. Account Registration & Security
            </h2>
            <p className="text-[14px] text-white/60 leading-relaxed font-sans">
              Authentication for the Service is managed through Clerk. You are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify PromptPro immediately of any unauthorized account access.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-[18px] font-semibold text-white font-sans">
              4. Subscriptions, Credits & Billing
            </h2>
            <p className="text-[14px] text-white/60 leading-relaxed font-sans">
              Paid plans (Plus, Max) and recurring billing are processed through our merchant partner, Whop. Optimization modes consume account credits on a transactional basis (Quick: 1 credit, Advanced: 5 credits, Max: 10 credits).
            </p>
            <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[13px] text-white/50 font-mono">
              [PLACEHOLDER: Insert specific refund window, billing disputes procedure, and cancellation grace period policy — consult legal counsel]
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-[18px] font-semibold text-white font-sans">
              5. Acceptable Use & Conduct
            </h2>
            <p className="text-[14px] text-white/60 leading-relaxed font-sans">
              You agree not to misuse the Service. Prohibited activities include attempting to bypass API rate limits, reverse engineering backend routing logic, exploiting credit deduction systems, or utilizing PromptPro to generate illegal, harmful, or abusive prompt payloads.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-[18px] font-semibold text-white font-sans">
              6. Intellectual Property & Prompt Ownership
            </h2>
            <p className="text-[14px] text-white/60 leading-relaxed font-sans">
              You retain full ownership of all prompt text, snippets, and context data you submit to PromptPro. PromptPro does not claim any intellectual property rights over your input prompts or the resulting rewritten output.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-[18px] font-semibold text-white font-sans">
              7. Disclaimers & Limitation of Liability
            </h2>
            <p className="text-[14px] text-white/60 leading-relaxed font-sans">
              THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND. PROMPTPRO DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED.
            </p>
            <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[13px] text-white/50 font-mono">
              [PLACEHOLDER: Insert formal limitation of liability clause, maximum monetary damage cap, and consequential damages disclaimer — consult legal counsel]
            </div>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-[18px] font-semibold text-white font-sans">
              8. Governing Law & Dispute Resolution
            </h2>
            <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[13px] text-white/50 font-mono">
              [PLACEHOLDER: Specify governing state/country law, arbitration agreement, class action waiver, and designated court venue — consult legal counsel]
            </div>
          </section>

          {/* Section 9 */}
          <section className="space-y-3 border-t border-white/[0.08] pt-6">
            <h2 className="text-[18px] font-semibold text-white font-sans">
              9. Contact Information
            </h2>
            <p className="text-[14px] text-white/60 leading-relaxed font-sans">
              For legal inquiries regarding these Terms, please contact{" "}
              <a
                href="mailto:legal@promptpro.dev"
                className="text-white hover:underline underline-offset-4"
              >
                legal@promptpro.dev
              </a>
              .
            </p>
          </section>
        </SupportCard>
      </div>
    </SupportPageShell>
  );
}
