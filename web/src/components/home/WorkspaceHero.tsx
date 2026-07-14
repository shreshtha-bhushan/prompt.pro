"use client"

import * as React from "react"
import dynamic from "next/dynamic"

const Heatmap = dynamic(() => import("@/components/ui/heatmap"), {
  ssr: false,
})

interface WorkspaceHeroProps {
  displayName: string
  totalUpgrades?: number
  avgScoreLift?: number
  latestPrompt?: {
    upgraded_prompt?: string
    source?: string
  }
}

export function WorkspaceHero({
  displayName,
}: WorkspaceHeroProps) {
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening"

  const cleanName = displayName || "there"
  const formattedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1)

  return (
    <div className="card relative w-full mb-8 p-8 md:p-10 border border-white/[0.06] bg-[#1A1A1C] overflow-hidden rounded-[24px]">
      {/* ─── Seamless Right-Side Ambient Heatmap Shader Container ─── */}
      <div
        className="absolute right-0 top-0 bottom-0 w-full md:w-[62%] lg:w-[54%] pointer-events-none overflow-hidden"
        // style={{
        //   WebkitMaskImage:
        //     "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.35) 28%, rgba(0,0,0,0.9) 75%, rgba(0,0,0,1) 100%)",
        //   maskImage:
        //     "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.35) 28%, rgba(0,0,0,0.9) 75%, rgba(0,0,0,1) 100%)",
        // }}
      >
        <div className="w-full h-full opacity-90 scale-100">
          <Heatmap
            suspendWhenProcessingImage={false}
            colorBack="#111111"
            contour={1}
            angle={90}
            noise={1}
            innerGlow={0.75}
            outerGlow={0.25}
            speed={0.25}
            scale={2}
            rotation={0}
            offsetX={0}
            offsetY={0}
            colors={["#ffffff", "#000000"]}
            image="/icon.svg"
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      </div>

      {/* ─── Dark Gradient Feathering Overlays Towards Greeting & Edges ─── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to right, #1A1A1C 0%, #1A1A1C 36%, rgba(26,26,28,0.7) 62%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, #1A1A1C 0%, transparent 18%, transparent 82%, #1A1A1C 100%)",
        }}
      />

      {/* ─── Primary Greeting Content (Left Aligned) ─── */}
      <div className="relative z-10 max-w-2xl">
        <h1 className="text-[48px] md:text-[56px] font-semibold tracking-tight text-white leading-[1.08] font-sans">
          {greeting},<br />
          {formattedName}.
        </h1>
        <p className="text-[18px] text-white/50 font-sans mt-3">
          Ready to improve your next prompt?
        </p>
      </div>
    </div>
  )
}
