import type { ComponentProps } from "react"
import type { SignIn } from "@clerk/nextjs"

export type ClerkAppearance = NonNullable<ComponentProps<typeof SignIn>["appearance"]>

export const clerkAppearance: ClerkAppearance = {
  variables: {
    colorPrimary: "var(--auth-accent-start)",
    colorBackground: "transparent",
    colorText: "var(--text-primary)",
    colorTextSecondary: "var(--text-secondary)",
    colorInputBackground: "var(--surface-inset)",
    colorInputText: "var(--text-primary)",
    colorDanger: "var(--danger)",
    borderRadius: "var(--auth-radius-input)",
    fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  },
  elements: {
    // Outer Container & Glass Surface
    rootBox: "w-full max-w-[400px] mx-auto",
    card: "auth-card p-6 sm:p-8 relative overflow-hidden transition-all duration-200",
    cardBox: "w-full shadow-none bg-transparent",

    // Headers & Titles
    headerTitle: "text-[22px] sm:text-[24px] font-semibold tracking-tight text-white/90 font-sans text-center",
    headerSubtitle: "text-[13px] sm:text-[13.5px] text-white/50 leading-relaxed font-sans mt-1 text-center",
    formHeaderTitle: "text-[22px] sm:text-[24px] font-semibold tracking-tight text-white/90 font-sans text-center",
    formHeaderSubtitle: "text-[13px] sm:text-[13.5px] text-white/50 leading-relaxed font-sans mt-1 text-center",

    // Social / OAuth Buttons
    socialButtonsBlockButton:
      "h-[42px] rounded-[var(--auth-radius-button)] bg-white/[0.035] hover:bg-white/[0.07] active:scale-[0.985] border border-white/[0.08] hover:border-white/[0.15] text-white/90 text-[13.5px] font-medium transition-all duration-150 shadow-sm",
    socialButtonsBlockButtonText: "text-[13.5px] font-medium text-white/90 font-sans",
    socialButtonsProviderIcon: "w-4 h-4 mr-2",

    // Dividers
    dividerRow: "my-5",
    dividerLine: "bg-white/[0.06]",
    dividerText: "text-[11px] text-white/30 font-mono uppercase tracking-wider px-3",

    // Form Inputs & Labels
    formFieldLabel: "text-[12.5px] font-medium text-white/70 font-sans mb-1.5",
    formFieldLabelRow: "mb-1.5 flex items-center justify-between",
    formFieldInput:
      "h-[42px] px-3.5 rounded-[var(--auth-radius-input)] bg-black/40 hover:bg-black/55 border border-white/[0.08] hover:border-white/[0.14] focus:border-white/40 focus:ring-2 focus:ring-white/15 text-[14px] text-white placeholder:text-white/25 transition-all duration-150 outline-none font-sans shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]",
    formFieldInputShowPasswordButton:
      "text-white/40 hover:text-white/80 transition-colors focus:outline-none focus:text-white/90",
    formFieldAction:
      "text-[12px] text-white/60 hover:text-white transition-colors font-medium font-sans focus:outline-none",

    // Primary Action Button (Apple Pure White Surface)
    formButtonPrimary:
      "h-[42px] rounded-[var(--auth-radius-button)] bg-white hover:bg-zinc-200 active:bg-zinc-300 text-black text-[14px] font-semibold tracking-tight transition-all duration-150 shadow-[0_1px_2px_rgba(0,0,0,0.1),0_0_16px_rgba(255,255,255,0.15)] border-none mt-2 font-sans focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-1 focus:ring-offset-black active:scale-[0.985]",

    // Secondary / Reset Buttons
    formButtonReset:
      "text-[13px] text-white/50 hover:text-white/90 transition-colors font-sans focus:outline-none",

    // Links & Footers
    footer: "bg-transparent border-none mt-4",
    footerAction: "mt-5 pt-4 border-t border-white/[0.05] text-center",
    footerActionText: "text-[13px] text-white/40 font-sans",
    footerActionLink:
      "text-[13px] text-white/80 hover:text-white font-medium hover:underline underline-offset-4 ml-1 font-sans transition-colors focus:outline-none focus:ring-1 focus:ring-white/40 rounded-sm",

    // Alerts & Validation
    formFieldErrorText: "text-[12px] text-rose-400 mt-1.5 font-sans",
    formFieldSuccessText: "text-[12px] text-white/60 mt-1.5 font-sans",
    alertText: "text-[13px] text-white/80 font-sans",
    alert: "bg-rose-500/10 border border-rose-500/20 rounded-[var(--auth-radius-input)] p-3 mb-4",

    // Native Verification & MFA Elements
    otpCodeFieldInput:
      "h-[44px] rounded-[var(--auth-radius-input)] bg-black/40 border border-white/[0.08] focus:border-white/40 focus:ring-2 focus:ring-white/15 text-[18px] text-white font-mono text-center outline-none transition-all",

    // Badges & Dev Mode
    badge: "bg-white/[0.06] text-white/60 border border-white/[0.08] text-[11px] rounded-md px-1.5 py-0.5 font-sans",
    devModeBadge:
      "opacity-40 hover:opacity-90 transition-opacity text-[10px] font-mono text-zinc-400",

    // Identity Preview
    identityPreview: "bg-white/[0.035] border border-white/[0.08] rounded-[var(--auth-radius-input)] p-3",
    identityPreviewText: "text-[13px] text-white/80 font-sans",
    identityPreviewEditButton:
      "text-white/70 hover:text-white text-[12px] font-medium transition-colors focus:outline-none",
    footerPages: "mt-4 text-center",
    footerPagesLink:
      "text-[12px] text-white/40 hover:text-white/70 transition-colors underline-offset-2 hover:underline",
    formResendCodeLink:
      "text-[13px] text-white/70 hover:text-white font-medium transition-colors focus:outline-none",
    formFieldHintText: "text-[12px] text-white/40 mt-1 font-sans",
  },
}
