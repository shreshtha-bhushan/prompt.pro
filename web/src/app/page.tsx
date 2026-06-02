import { auth0 } from '@/lib/auth0';
import { Dashboard } from '@/components/dashboard';
import { Sparkles, ArrowRight, ShieldCheck, Zap, Chrome } from 'lucide-react';
import Link from 'next/link';

export default async function HomePage() {
  const session = await auth0.getSession();
  const user = session?.user;

  if (user) {
    return <Dashboard user={user} />;
  }

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 flex flex-col relative overflow-hidden font-sans select-none justify-center">
      {/* Background Spotlight Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_65%)] pointer-events-none z-0" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(255,255,255,0.01),transparent_70%)] pointer-events-none z-0" />

      {/* Landing Page Content Grid */}
      <div className="w-full max-w-5xl mx-auto px-4 md:px-8 py-16 flex flex-col items-center text-center gap-12 relative z-10">
        
        {/* Floating Accent Tech Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl animate-fade-in">
          <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-[10px] font-bold text-zinc-300 tracking-wider uppercase">Next-Gen Prompt Optimization</span>
        </div>

        {/* Elegant typography with white-to-gray gradients */}
        <div className="space-y-4 max-w-3xl">
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400 leading-[1.1] sm:leading-[1.1]">
            Transform Vague Prompts <br />
            Into Expert Directives.
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed font-normal">
            PromptPro securely engineers your prompts using 5-component structured decomposition, advanced tone modifiers, and multi-dimensional quality scoring.
          </p>
        </div>

        {/* Social Authentication Glass Card */}
        <div className="w-full max-w-md bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl rounded-3xl p-8 shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col gap-6 relative">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white tracking-tight">Access PromptPro Dashboard</h2>
            <p className="text-xs text-zinc-400">Sign in securely using Auth0 connection portal</p>
          </div>

          <div className="flex flex-col gap-3">
            {/* Primary Google Login Button */}
            <a href="/auth/login" className="w-full">
              <button className="w-full h-11 inline-flex items-center justify-center gap-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition-all duration-300 shadow-[0_4px_20px_rgba(255,255,255,0.1)] active:scale-[0.98]">
                {/* SVG Google Logo */}
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>
            </a>

            {/* Standard Email Signup/Signin */}
            <a href="/auth/login" className="w-full">
              <button className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-all duration-300 active:scale-[0.98]">
                Sign In with Email
              </button>
            </a>
          </div>

          <div className="flex items-center justify-center gap-6 pt-4 border-t border-white/[0.04] mt-2">
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" /> Secure Encryption
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-medium">
              <Zap className="w-3.5 h-3.5 text-zinc-500" /> JIT Sync Node
            </div>
          </div>
        </div>

        {/* Feature Grid Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full pt-8">
          <div className="bg-white/[0.01] border border-white/[0.04] p-6 rounded-2xl flex flex-col items-center md:items-start text-center md:text-left gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
              <Chrome className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-sm font-bold text-white">Browser Extension Link</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Companion extension optimizes prompts in ChatGPT, Claude, and Gemini with zero extra network load.
            </p>
          </div>

          <div className="bg-white/[0.01] border border-white/[0.04] p-6 rounded-2xl flex flex-col items-center md:items-start text-center md:text-left gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-sm font-bold text-white">Central Config Hub</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Synchronize libraries, custom context guidelines, and history metrics to the cloud automatically.
            </p>
          </div>

          <div className="bg-white/[0.01] border border-white/[0.04] p-6 rounded-2xl flex flex-col items-center md:items-start text-center md:text-left gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-sm font-bold text-white">Enterprise Privacy</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Your API keys and database parameters are strictly locked behind administrative edge walls.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
