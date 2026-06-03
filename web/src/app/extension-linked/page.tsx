import { Sparkles, CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

/**
 * Extension Linked — Success Page
 *
 * Shown briefly after the extension auth bridge redirects here with ?token=xxx.
 * The service worker detects this URL and auto-closes the tab within ~1.5s.
 * If the tab isn't closed (e.g. extension not loaded), the user sees this page.
 */
export default function ExtensionLinkedPage() {
  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 flex flex-col items-center justify-center relative overflow-hidden font-sans select-none">
      {/* Background Spotlight */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.08),transparent_65%)] pointer-events-none z-0" />

      <div className="relative z-10 flex flex-col items-center text-center gap-8 px-6 max-w-md">
        {/* Success Icon */}
        <div className="relative">
          <div className="absolute -inset-4 bg-emerald-500/10 rounded-full blur-xl animate-pulse" />
          <div className="relative w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-lg">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400">
            Extension Linked
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-xs mx-auto">
            Your PromptPro extension is now connected to your account.
            This tab will close automatically.
          </p>
        </div>

        {/* Feature badges */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-semibold text-zinc-300 tracking-wide uppercase">Cloud Sync Active</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <Sparkles className="w-3 h-3 text-zinc-400" />
            <span className="text-[10px] font-semibold text-zinc-300 tracking-wide uppercase">Data Merged</span>
          </div>
        </div>

        {/* Fallback link */}
        <Link
          href="/"
          className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mt-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
