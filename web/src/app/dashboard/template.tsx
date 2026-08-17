"use client"

import { AnimatePresence } from "motion/react"
import { usePathname } from "next/navigation"
import { PageTransition } from "@/components/layout/PageTransition"

export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait">
      <div key={pathname} className="h-full">
        <PageTransition>{children}</PageTransition>
      </div>
    </AnimatePresence>
  )
}
