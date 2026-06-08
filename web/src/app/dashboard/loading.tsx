import { Sparkle } from "lucide-react"

export default function DashboardLoading() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-8">
        
        {/* Logo / Brand */}
        <div className="flex flex-col items-center gap-3">
          <Sparkle className="w-8 h-8 text-[--text-primary] opacity-80 animate-pulse" />
          <span className="text-[12px] font-medium text-[--text-primary] tracking-[0.3em] uppercase opacity-80">
            PromptPro
          </span>
        </div>

        {/* Apple-style sleek progress bar */}
        <div className="w-[180px] h-[3px] bg-white/[0.05] rounded-full overflow-hidden backdrop-blur-sm border border-white/[0.02]">
          <div className="h-full w-full bg-gradient-to-r from-[--text-secondary] via-[--text-primary] to-[--text-secondary] opacity-80"
               style={{
                 animation: "loadingBar 2s ease-in-out infinite",
                 backgroundSize: "200% 100%"
               }}
          />
        </div>
        
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes loadingBar {
              0% { background-position: 200% 0; transform: translateX(-100%); }
              50% { transform: translateX(0); }
              100% { background-position: -200% 0; transform: translateX(100%); }
            }
          `
        }} />
      </div>
    </div>
  )
}
