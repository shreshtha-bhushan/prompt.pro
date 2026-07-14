"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import { PromptProIcon } from "@/components/shared/PromptProIcon"

// Dynamically import Heatmap so SSR never fails
const Heatmap = dynamic(() => import("@/components/ui/heatmap"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-[#111111]" />,
})

// Eagerly preload icon image into browser cache so shader processes immediately
if (typeof window !== "undefined") {
  const preloadImg = new Image()
  preloadImg.src = "/icon.svg"
}

interface HeatmapLoadingScreenProps {
  children: React.ReactNode
  durationMs?: number
}

export function HeatmapLoadingScreen({
  children,
  durationMs = 2800,
}: HeatmapLoadingScreenProps) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, durationMs)

    return () => clearTimeout(timer)
  }, [durationMs])

  return (
    <div className="relative w-full h-full min-h-screen bg-[#111111]">
      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div
            key="heatmap-loader"
            initial={{ opacity: 1 }}
            exit={{
              opacity: 0,
              scale: 1.03,
              transition: { duration: 0.9, ease: [0.32, 0.72, 0, 1] },
            }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#111111]"
          >
            {/* Background Shader Heatmap Animation */}
            <div className="absolute inset-0 opacity-90 pointer-events-none">
              <Heatmap
                suspendWhenProcessingImage={false}
                colorBack="#000000"
                contour={0.5}
                angle={45}
                noise={0}
                innerGlow={0.5}
                outerGlow={0.5}
                speed={0.5}
                scale={0.25}
                rotation={0}
                offsetX={0}
                offsetY={-0.1}
                colors={["#ffffff", "#000000"]}
                image="/icon.svg"
                style={{ width: "100%", height: "100%" }}
              />
            </div>

            {/* Subtle Ambient Radial Mask */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at center, transparent 20%, #111111 88%)",
              }}
            />

            {/* Calm Native macOS App Loading Content */}
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 flex flex-col items-center text-center px-6"
            >
              <div className="w-16 h-16 rounded-3xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl mb-6">
                <PromptProIcon size={34} variant="dark" />
              </div>

              <h2 className="text-[24px] font-semibold tracking-tight text-white font-sans">
                PromptPro
              </h2>

              {/* Minimal macOS Shimmer Progress Bar */}
              <div className="mt-8 w-48 h-[3px] rounded-full bg-white/10 overflow-hidden relative">
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.25,
                    ease: "easeInOut",
                  }}
                  className="w-1/2 h-full rounded-full bg-gradient-to-r from-transparent via-white/80 to-transparent"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main App Workspace Content */}
      <motion.div
        animate={{
          opacity: isLoading ? 0 : 1,
          scale: isLoading ? 0.985 : 1,
        }}
        transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </div>
  )
}
