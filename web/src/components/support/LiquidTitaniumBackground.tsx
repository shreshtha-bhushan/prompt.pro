"use client"

import * as React from "react"

export function LiquidTitaniumBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none" aria-hidden="true">
      {/* ── Base Obsidian Foundation ── */}
      <div className="absolute inset-0 bg-[#050505]" />

      {/* ── Layer 2: Asymmetric Graphite Atmospheric Gradients ── */}
      {/* Upper-Left Graphite Sheen */}
      <div
        className="absolute -top-[20%] -left-[10%] w-[70vw] max-w-[850px] h-[55vh] rounded-full opacity-60 blur-[130px] mix-blend-screen motion-safe:animate-[pulse_14s_ease-in-out_infinite]"
        style={{
          background: "radial-gradient(ellipse at center, rgba(255, 255, 255, 0.04) 0%, rgba(180, 180, 195, 0.015) 50%, transparent 75%)"
        }}
      />

      {/* Center-Right Metallic Curve Reflection */}
      <div
        className="absolute top-[25%] -right-[15%] w-[65vw] max-w-[800px] h-[60vh] rounded-full opacity-50 blur-[140px] mix-blend-screen motion-safe:animate-[pulse_18s_ease-in-out_infinite]"
        style={{
          background: "radial-gradient(ellipse at center, rgba(230, 230, 240, 0.035) 0%, rgba(140, 140, 155, 0.01) 55%, transparent 80%)"
        }}
      />

      {/* Lower-Left Deep Charcoal Horizon */}
      <div
        className="absolute -bottom-[20%] -left-[5%] w-[60vw] max-w-[700px] h-[50vh] rounded-full opacity-40 blur-[120px] mix-blend-screen"
        style={{
          background: "radial-gradient(circle, rgba(255, 255, 255, 0.025) 0%, transparent 70%)"
        }}
      />

      {/* ── Layer 3: Curved Liquid Titanium Light Streaks ── */}
      <svg
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[1440px] h-full opacity-40 mix-blend-screen pointer-events-none"
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M-100 150C300 180 650 50 900 180C1150 310 1400 250 1600 100"
          stroke="url(#titanium-sweep-1)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M-50 750C350 700 700 850 1050 720C1300 620 1500 780 1650 700"
          stroke="url(#titanium-sweep-2)"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="titanium-sweep-1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="30%" stopColor="white" stopOpacity="0.12" />
            <stop offset="60%" stopColor="#C0C0C8" stopOpacity="0.18" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="titanium-sweep-2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="50%" stopColor="white" stopOpacity="0.08" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* ── Layer 4: Signature PromptPro ✦ Titanium Reflection Form ── */}
      {/* Positioned centrally behind the auth surface like light reflecting off machined metal */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] pointer-events-none opacity-[0.06] blur-[2px] transition-transform duration-1000">
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <path
            d="M100 10C100 70 130 100 190 100C130 100 100 130 100 190C100 130 70 100 10 100C70 100 100 70 100 10Z"
            fill="url(#sparkle-metal-grad)"
          />
          <defs>
            <radialGradient id="sparkle-metal-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
              <stop offset="45%" stopColor="#E2E2E8" stopOpacity="0.6" />
              <stop offset="85%" stopColor="#808090" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      {/* Top Specular Edge Highlight */}
      <div
        className="absolute top-0 inset-x-0 h-[1px] opacity-25"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)"
        }}
      />
    </div>
  )
}
