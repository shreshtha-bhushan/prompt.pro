"use client"

import * as React from "react"
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
  PanelLeftClose,
  PanelRightClose
} from "lucide-react"

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
}

export function AppSidebar({ historyCount = 0, libraryCount = 0, streakCount = 0, ...props }: AppSidebarProps) {
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
    { title: "Settings", url: "/dashboard/settings", icon: Settings },
    { title: "Help", url: "/dashboard/help", icon: HelpCircle },
  ]

  const renderNavGroup = (label: string, items: typeof workspaceItems) => (
    <div className="mb-4">
      {!isCollapsed && (
        <div className="px-3 mb-1.5 text-[10px] font-mono font-semibold tracking-[0.12em] text-white/30 uppercase">
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
                className={`transition-all duration-200 group ${
                  isCollapsed
                    ? "h-9 w-9 p-0 flex items-center justify-center mx-auto rounded-xl"
                    : "h-[36px] rounded-xl px-3"
                } ${
                  isActive
                    ? "bg-white/[0.12] text-white font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_0_20px_rgba(255,255,255,0.15)] border border-white/[0.12]"
                    : "text-white/60 hover:bg-white/[0.04] hover:text-white/90"
                }`}
              >
                <a
                  href={item.url}
                  className={`flex items-center ${isCollapsed ? "justify-center w-full h-full" : "justify-between w-full"}`}
                >
                  <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3 min-w-0"}`}>
                    <item.icon
                      className={`w-4 h-4 shrink-0 transition-all ${
                        isActive
                          ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.85)] scale-105"
                          : "text-white/60 group-hover:text-white"
                      }`}
                    />
                    {!isCollapsed && (
                      <span
                        className={`text-[13px] truncate transition-all ${
                          isActive
                            ? "text-white font-semibold drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]"
                            : "text-white/70"
                        }`}
                      >
                        {item.title}
                      </span>
                    )}
                  </div>
                  {item.count !== undefined && !isCollapsed && (
                    <span
                      className={`ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-mono transition-all ${
                        isActive
                          ? "bg-white/20 border border-white/20 text-white shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                          : "bg-white/[0.06] border border-white/[0.06] text-white/60"
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </div>
  )

  return (
    <Sidebar collapsible="icon" className="border-r-0 bg-transparent h-full w-full" {...props}>
      {/* App brand header */}
      <div className={`flex items-center ${isCollapsed ? "justify-center p-3 pt-4" : "justify-between p-4 pb-3"}`}>
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <PromptProIcon size={22} variant="dark" />
            <span className="text-[14px] font-semibold text-white tracking-tight truncate">PromptPro</span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className={`p-2 rounded-lg hover:bg-white/[0.06] text-white/50 hover:text-white/90 transition-colors shrink-0 ${
            isCollapsed ? "mx-auto" : "ml-auto"
          }`}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <PanelRightClose className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="mx-3 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center gap-2 mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-[--score-positive] shrink-0" />
          <span className="text-[11px] font-medium text-white/80">Extension Active</span>
        </div>
      )}

      {/* Divider */}
      {!isCollapsed && <div className="h-px bg-white/[0.05] mx-3 mb-4" />}

      <SidebarContent className={isCollapsed ? "px-0" : "px-2"}>
        {renderNavGroup("Workspace", workspaceItems)}
        {!isCollapsed && <div className="h-px bg-white/[0.05] mx-3 my-3" />}
        {renderNavGroup("Insights", insightsItems)}
        {!isCollapsed && <div className="h-px bg-white/[0.05] mx-3 my-3" />}
        {renderNavGroup("Preferences", preferencesItems)}
      </SidebarContent>

      <SidebarFooter className={`flex flex-col gap-3 mt-auto ${isCollapsed ? "p-2 items-center" : "p-3 pb-4"}`}>
        {!isCollapsed && streakCount > 0 && (
          <div className="flex flex-col gap-1.5 px-2 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center justify-between text-[11px] text-white/60">
              <span>Streak</span>
              <span className="font-mono text-[--warning] font-semibold">{streakCount}d</span>
            </div>
            <div className="flex items-center gap-1">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-1 rounded-full ${i < Math.min(streakCount, 7) ? "bg-[--warning]" : "bg-white/[0.06]"}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Profile Card */}
        <div
          className={`flex items-center ${
            isCollapsed
              ? "justify-center p-1.5 rounded-xl border border-white/[0.06] bg-[#1A1A1C]/80"
              : "justify-between p-2.5 rounded-xl border border-white/[0.06] bg-[#1A1A1C]/80"
          } transition-all`}
        >
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden min-w-0 pr-2">
              <span className="text-[13px] text-white font-medium truncate">
                {isLoaded && user ? user.firstName || user.primaryEmailAddress?.emailAddress?.split("@")[0] : "Account"}
              </span>
              <span className="text-[11px] text-white/40 truncate">Preferences & Plan</span>
            </div>
          )}
          <UserButton appearance={{ elements: { userButtonAvatarBox: "w-7 h-7 rounded-full" } }} />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
