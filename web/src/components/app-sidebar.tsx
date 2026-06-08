"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import {
  Home,
  Clock,
  BookOpen,
  Zap,
  Settings,
  Info,
  PanelLeftClose,
  PanelRightClose
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar
} from "@/components/ui/sidebar"
import { UserButton, useUser } from "@clerk/nextjs"

const workspaceItems = [
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
  { title: "About", url: "#", icon: Info },
]

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  historyCount?: number
  libraryCount?: number
}

export function AppSidebar({ historyCount = 0, libraryCount = 0, ...props }: AppSidebarProps) {
  const { user, isLoaded } = useUser()
  const pathname = usePathname()
  const { state, toggleSidebar } = useSidebar()
  const isCollapsed = state === "collapsed"

  const navItems = [
    { title: "Home", url: "/dashboard", icon: Home },
    { title: "History", url: "/dashboard/history", icon: Clock, count: historyCount },
    { title: "Library", url: "/dashboard/library", icon: BookOpen, count: libraryCount },
    { title: "Optimization", url: "/dashboard/optimization", icon: Zap },
  ]

  return (
    <Sidebar collapsible="icon" className="border-r border-[--border-side] bg-[--layer-1]" {...props}>
      <div className="flex items-center justify-between p-4 mb-2">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden overflow-hidden">
          <div className="w-[10px] h-[10px] shrink-0 bg-[--text-primary]" />
          <span className="text-[15px] font-medium text-[--text-primary] truncate">PromptPro</span>
        </div>
        <button onClick={toggleSidebar} className="p-1.5 rounded-md hover:bg-white/10 text-[--text-secondary] hover:text-[--text-primary] transition-colors shrink-0">
          {isCollapsed ? <PanelRightClose className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>
      
      {!isCollapsed && (
        <div className="px-4 flex items-center gap-2 mb-4 animate-in fade-in duration-200">
          <div className="status-dot w-[6px] h-[6px] shrink-0 rounded-full bg-[--accent-green]" />
          <span className="text-[10px] text-[--accent-green] truncate">Extension active</span>
        </div>
      )}

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarMenu>
            {navItems.map((item) => {
              const isActive = pathname === item.url
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive} 
                    tooltip={item.title}
                    className={`h-[38px] transition-colors ${
                      isActive 
                        ? "bg-white/5 text-[--text-primary]" 
                        : "text-[--text-secondary] hover:bg-white/[0.03] hover:text-[--text-primary]"
                    }`}
                  >
                    <a href={item.url} className="flex items-center">
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                      {item.count && !isCollapsed && (
                        <span className="ml-auto text-[10px] bg-white/10 text-[--text-secondary] px-1.5 py-px rounded-full">
                          {item.count}
                        </span>
                      )}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>

        <div className="h-px bg-white/5 my-2 mx-4 group-data-[collapsible=icon]:hidden" />

        <SidebarGroup>
          <SidebarMenu>
            {workspaceItems.map((item) => {
              const isActive = pathname === item.url
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive} 
                    tooltip={item.title}
                    className={`h-[38px] transition-colors ${
                      isActive 
                        ? "bg-white/5 text-[--text-primary]" 
                        : "text-[--text-secondary] hover:bg-white/[0.03] hover:text-[--text-primary]"
                    }`}
                  >
                    <a href={item.url} className="flex items-center">
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 flex flex-col gap-4">
        {!isCollapsed && (
          <div className="flex flex-col gap-1.5 px-2 animate-in fade-in duration-200">
            <div className="text-[12px] text-[--text-secondary]">
              <span className="text-[--accent-amber]">4</span> day streak
            </div>
            <div className="flex items-center gap-1.5">
              {[...Array(7)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-2 h-2 rounded-full ${i < 4 ? "bg-[--accent-amber]" : "bg-white/10"}`} 
                />
              ))}
            </div>
          </div>
        )}

        <div className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between p-3 rounded-xl border border-white/5 bg-white/5"} transition-all`}>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden animate-in fade-in duration-200">
              <span className="text-[13px] text-[--text-primary] font-medium truncate">
                {isLoaded && user ? user.firstName || user.primaryEmailAddress?.emailAddress?.split('@')[0] : "Loading..."}
              </span>
              <span className="text-[10px] text-[--text-secondary]">
                Account Settings
              </span>
            </div>
          )}
          <UserButton appearance={{ elements: { userButtonAvatarBox: "w-8 h-8 rounded-full" } }} />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
