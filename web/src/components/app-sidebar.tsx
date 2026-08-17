"use client"

import * as React from "react"
import { motion } from "motion/react"
import { usePathname } from "next/navigation"
import { PromptProIcon } from "@/components/shared/PromptProIcon"
import { PromptSparkleIcon } from "@/components/shared/PromptSparkleIcon"
import {
  Home,
  Clock,
  BookOpen,
  BarChart2,
  TrendingUp,
  Settings,
  HelpCircle,
  CreditCard,
  PanelLeftClose,
  PanelRightClose
} from "lucide-react"
import { UsageMeter } from "@/components/shared/UsageMeter"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar
} from "@/components/ui/sidebar"
import { UserButton, useUser } from "@clerk/nextjs"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  historyCount?: number
  libraryCount?: number
  streakCount?: number
  creditsBalance?: number
  monthlyCredits?: number
  planTier?: string
  creditsResetAt?: string | null
  isAdmin?: boolean
  planStatus?: string
}

export function AppSidebar({ 
  historyCount = 0, 
  libraryCount = 0, 
  streakCount = 0, 
  creditsBalance, 
  monthlyCredits, 
  planTier = "free", 
  creditsResetAt,
  isAdmin = false,
  planStatus = "none",
  ...props 
}: AppSidebarProps) {
  const { user, isLoaded } = useUser()
  const pathname = usePathname()
  const { state, toggleSidebar } = useSidebar()
  const isCollapsed = state === "collapsed"

  const workspaceItems = [
    { title: "Home", url: "/dashboard", icon: Home },
    { title: "History", url: "/dashboard/history", icon: Clock, count: historyCount },
    { title: "Prompt Library", url: "/dashboard/library", icon: BookOpen, count: libraryCount },
    { title: "Optimization Studio", url: "/dashboard/optimization", icon: PromptSparkleIcon },
  ]

  const insightsItems = [
    { title: "Analytics", url: "/dashboard/analytics", icon: BarChart2 },
    { title: "Trends", url: "/dashboard/analytics?view=trends", icon: TrendingUp },
  ]

  const preferencesItems = [
    { title: "Billing & Plans", url: "/dashboard/billing", icon: CreditCard },
    { title: "Settings", url: "/dashboard/settings", icon: Settings },
    { title: "Help", url: "/dashboard/help", icon: HelpCircle },
  ]

  const renderNavGroup = (label: string, items: typeof workspaceItems) => (
    <div className="mb-3">
      {!isCollapsed && (
        <div className="px-3 mb-1 text-[10px] font-mono font-semibold tracking-[0.14em] text-white/30 uppercase">
          {label}
        </div>
      )}
      <SidebarMenu className={`space-y-0.5 ${isCollapsed ? "items-center" : ""}`}>
        {items.map((item) => {
          const isActive = pathname === item.url || (item.url !== "/dashboard" && pathname?.startsWith(item.url.split("?")[0]))
          return (
            <SidebarMenuItem key={item.title} className={isCollapsed ? "flex justify-center w-full" : ""}>
              <SidebarMenuButton
                asChild
                isActive={isActive}
                tooltip={item.title}
                className={`transition-colors duration-200 group ${
                  isCollapsed
                    ? "h-10 w-10 p-0 flex items-center justify-center mx-auto rounded-xl"
                    : "h-[38px] rounded-xl px-3"
                } ${
                  isActive
                    ? "bg-white/[0.1] text-white font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_0_20px_rgba(255,255,255,0.08)] border border-white/[0.12]"
                    : "text-white/60 hover:bg-white/[0.04] hover:text-white/95 border border-transparent"
                }`}
              >
                <motion.a
                  href={item.url}
                  className={`flex items-center ${isCollapsed ? "justify-center w-full h-full" : "justify-between w-full"}`}
                  whileHover={{ scale: isActive ? 1 : 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3 min-w-0"}`}>
                    <item.icon
                      className={`w-4 h-4 shrink-0 transition-all ${
                        isActive
                          ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.85)] scale-105"
                          : "text-white/50 group-hover:text-white/90"
                      }`}
                    />
                    {!isCollapsed && (
                      <span className="text-[13.5px] tracking-[-0.01em] truncate font-medium">
                        {item.title}
                      </span>
                    )}
                  </div>
                  {!isCollapsed && item.count !== undefined && item.count > 0 && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.06] text-white/60 tabular-nums">
                      {item.count}
                    </span>
                  )}
                </motion.a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </div>
  )

  return (
    <Sidebar
      collapsible="icon"
      className="border-none bg-transparent h-full flex flex-col justify-between overflow-hidden"
      {...props}
    >
      {/* Sidebar Header */}
      <div className={`flex items-center shrink-0 ${isCollapsed ? "justify-center p-3" : "justify-between px-4 py-4"}`}>
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.09] flex items-center justify-center shrink-0 shadow-sm">
              <PromptProIcon size={18} className="text-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[14px] font-semibold text-white tracking-tight">PromptPro</span>
                {planTier && planTier !== "free" && (
                  <span className="px-1.5 py-0.5 rounded-[5px] bg-white text-black text-[9px] font-bold tracking-wider uppercase font-mono shadow-sm">
                    {planTier}
                  </span>
                )}
                {isAdmin && (
                  <span className="px-1.5 py-0.5 rounded-[5px] bg-white/20 text-white text-[9px] font-bold tracking-wider uppercase font-mono border border-white/10">
                    ADMIN
                  </span>
                )}
              </div>
              <span className="text-[11px] text-white/40 font-mono tracking-tight">Workspace</span>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => toggleSidebar()}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors border border-transparent hover:border-white/[0.06]"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <PanelRightClose className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Sidebar Content (Scrollable if height constrained) */}
      <SidebarContent className={`flex-1 min-h-0 overflow-y-auto ${isCollapsed ? "px-0" : "px-3"}`}>
        {renderNavGroup("Workspace", workspaceItems)}
        {!isCollapsed && <div className="h-px bg-white/[0.04] mx-2 my-2.5" />}
        {renderNavGroup("Insights", insightsItems)}
        {!isCollapsed && <div className="h-px bg-white/[0.04] mx-2 my-2.5" />}
        {renderNavGroup("Preferences", preferencesItems)}
      </SidebarContent>

      {/* Sidebar Footer */}
      <SidebarFooter className={`shrink-0 flex flex-col gap-2.5 ${isCollapsed ? "p-2 items-center" : "p-3 pb-3.5"}`}>
        {/* Plan Header + Shared Usage Meter */}
        {!isCollapsed && (
          <div className="flex flex-col gap-2 p-3 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] shadow-sm">
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="text-white/60 font-medium">
                {isAdmin ? "Admin Plan" : `${planTier ? planTier.charAt(0).toUpperCase() + planTier.slice(1) : "Free"} Plan`}
              </span>
              {isAdmin ? (
                <span className="px-1.5 py-0.5 rounded-[5px] bg-white/20 text-white text-[9px] font-bold tracking-wider uppercase font-mono border border-white/10">
                  ADMIN
                </span>
              ) : planTier && planTier !== "free" ? (
                <span className="px-1.5 py-0.5 rounded-[5px] bg-white text-black text-[9px] font-bold tracking-wider uppercase font-mono">
                  {planTier}
                </span>
              ) : (
                <a
                  href="/dashboard/billing"
                  className="text-[10px] text-white/70 hover:text-white transition-colors"
                >
                  Upgrade →
                </a>
              )}
            </div>

            <UsageMeter
              balance={creditsBalance}
              allotment={monthlyCredits}
              resetAt={creditsResetAt}
              tier={planTier}
              isAdmin={isAdmin}
              planStatus={planStatus}
              showUpgradeLink={true}
            />
          </div>
        )}

        {/* Streak Counter */}
        {!isCollapsed && streakCount > 0 && (
          <div className="flex flex-col gap-1.5 px-3 py-2.5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] shadow-sm">
            <div className="flex items-center justify-between text-[11.5px] text-white/70 font-medium">
              <span>Optimization Streak</span>
              <span className="font-mono text-[--warning] font-semibold">{streakCount}d</span>
            </div>
            <div className="flex items-center gap-1.5">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-1 rounded-full ${i < Math.min(streakCount, 7) ? "bg-[--warning]" : "bg-white/[0.08]"}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Profile Card */}
        <div
          className={`flex items-center gap-2 ${
            isCollapsed
              ? "justify-center p-2 rounded-2xl border border-white/[0.06] bg-black/40 backdrop-blur-xl"
              : "justify-between p-2.5 px-3 rounded-2xl border border-white/[0.06] bg-black/40 backdrop-blur-xl shadow-sm"
          } transition-all`}
        >
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden min-w-0 flex-1">
              <span className="text-[13px] text-white font-medium truncate">
                {isLoaded && user ? user.fullName || user.firstName || user.primaryEmailAddress?.emailAddress?.split("@")[0] : "Account"}
              </span>
              <span className="text-[11px] text-white/40 truncate font-mono">Preferences</span>
            </div>
          )}
          <div className="shrink-0 flex items-center justify-center">
            <UserButton appearance={{ elements: { userButtonAvatarBox: "w-7 h-7 rounded-full" } }} />
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
