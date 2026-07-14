"use client"

import * as React from "react"
import dynamic from "next/dynamic"

const Heatmap = dynamic(() => import("@/components/ui/heatmap"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-[#111111]" />,
})

export default function HelpPage() {
  return (
    <div className="flex-1 flex flex-col min-h-[calc(100vh-64px)] w-full p-6 md:p-8">
      <div className="relative flex-1 w-full rounded-3xl border border-white/[0.08] bg-[#1A1A1C] overflow-hidden flex flex-col justify-between p-8">
        {/* Background Heatmap Shader */}
        <div className="absolute inset-0 opacity-80 pointer-events-none">
          <Heatmap
            suspendWhenProcessingImage={false}
            colorBack="#000000"
            contour={0.5}
            angle={0}
            noise={0}
            innerGlow={0.85}
            outerGlow={0.25}
            speed={0.5}
            scale={0.65}
            rotation={0}
            offsetX={0}
            offsetY={-0.1}
            colors={["#ffffff", "#000000"]}
            image="/icon.svg"
            style={{ width: "100%", height: "100%" }}
          />
        </div>

        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-white/90">
            PromptPro Help
          </h1>
          <span className="text-xs font-mono text-white/40 uppercase tracking-widest">
            Self-Reliance Engine
          </span>
        </div>

        {/* Center / Spacer */}
        <div className="relative z-10 flex-1" />

        {/* Bottom Text */}
        <div className="relative z-10 text-center pb-8">
          <p className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-[800] tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]">
            &ldquo;God Help Those Who Help Themselves&rdquo;
          </p>
        </div>
      </div>
    </div>
  )
}
