export const promptProClerkAppearance: any = {
  variables: {
    colorPrimary: "#FFFFFF",
    colorBackground: "#101012",
    colorText: "#F5F5F7",
    colorTextSecondary: "#8E8E93",
    colorInputBackground: "#141417",
    colorInputText: "#FFFFFF",
    colorDanger: "#F87171",
    borderRadius: "12px",
    fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  },
  elements: {
    // Outer Container & Titanium Card
    rootBox: "w-full max-w-[440px] mx-auto",
    card: "bg-[#101012] border border-white/[0.08] rounded-[24px] shadow-[0_32px_72px_-16px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.22)] p-7 sm:p-9 relative overflow-hidden transition-all duration-300",
    
    // Header & Titles
    headerTitle: "text-[23px] sm:text-[25px] font-semibold tracking-tight text-white font-sans",
    headerSubtitle: "text-[13.5px] sm:text-[14px] text-white/45 leading-relaxed font-sans mt-1",
    
    // Social / OAuth Buttons
    socialButtonsBlockButton: "h-[42px] rounded-xl bg-white/[0.035] hover:bg-white/[0.07] active:scale-[0.985] border border-white/[0.08] hover:border-white/[0.15] text-[#F5F5F7] text-[13.5px] font-medium transition-all duration-150 shadow-sm",
    socialButtonsBlockButtonText: "text-[13.5px] font-medium text-white/90 font-sans",
    socialButtonsProviderIcon: "w-4 h-4 mr-2",
    
    // Dividers
    dividerRow: "my-5",
    dividerLine: "bg-white/[0.06]",
    dividerText: "text-[11.5px] text-white/30 font-mono uppercase tracking-wider px-3",
    
    // Form Inputs & Labels
    formFieldLabel: "text-[12.5px] font-medium text-white/65 font-sans mb-1.5",
    formFieldInput: "h-[42px] px-3.5 rounded-xl bg-[#141417] hover:bg-[#18181C] border border-white/[0.08] hover:border-white/[0.13] focus:border-white/35 focus:ring-2 focus:ring-white/[0.08] text-[14px] text-white placeholder:text-white/25 transition-all duration-150 outline-none font-sans shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]",
    formFieldInputShowPasswordButton: "text-white/40 hover:text-white/80 transition-colors",
    
    // Primary Action Button (Apple Light Titanium Surface)
    formButtonPrimary: "h-[42px] rounded-xl bg-[#F0F0F2] hover:bg-white hover:-translate-y-0.5 active:scale-[0.985] text-[#0A0A0C] text-[14px] font-semibold tracking-tight transition-all duration-150 shadow-[0_2px_10px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,1)] border border-white/20 mt-2 font-sans",
    
    // Links & Secondary Footers
    footerAction: "mt-6 pt-4 border-t border-white/[0.05] text-center",
    footerActionText: "text-[13px] text-white/40 font-sans",
    footerActionLink: "text-[13px] text-white font-medium hover:underline underline-offset-4 ml-1 font-sans",
    
    // Alerts & Errors
    formFieldErrorText: "text-[12px] text-rose-400 mt-1.5 font-sans",
    alertText: "text-[13px] text-white/80 font-sans",
    alert: "bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 mb-4",
    
    // Dev Mode Tag (Cleanly integrated and de-emphasized)
    devModeBadge: "opacity-35 hover:opacity-90 transition-opacity text-[10px] font-mono",
    
    // Identity Preview
    identityPreview: "bg-white/[0.035] border border-white/[0.08] rounded-xl p-3",
    identityPreviewText: "text-[13px] text-white/80 font-sans",
    identityPreviewEditButton: "text-white/50 hover:text-white text-[12px]",
  },
}
