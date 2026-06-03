"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import {
  HomeIcon,
  ClockIcon,
  BookOpenIcon,
  ZapIcon,
  SettingsIcon,
  InfoIcon,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import { UserButton, useUser } from "@clerk/nextjs"

const navItems = [
  {
    title: "Home",
    url: "/dashboard",
    icon: HomeIcon,
  },
  {
    title: "History",
    url: "/dashboard/history",
    icon: ClockIcon,
  },
  {
    title: "Library",
    url: "/dashboard/library",
    icon: BookOpenIcon,
  },
  {
    title: "Optimization",
    url: "/dashboard/optimization",
    icon: ZapIcon,
  },
]

const workspaceItems = [
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: SettingsIcon,
  },
  {
    title: "About",
    url: "#",
    icon: InfoIcon,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, isLoaded } = useUser()
  const [isSynced, setIsSynced] = useState(false)

  useEffect(() => {
    // Simulated connection status for Realtime (can be enhanced later)
    setIsSynced(true)
  }, [])

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5 hover:bg-transparent active:bg-transparent"
            >
              <a href="/dashboard">
                <div className="flex items-center gap-3 w-full">
                  <div className="w-[7px] h-[7px] bg-[#f0f0ee] shrink-0" />
                  <span className="text-[15px] font-medium font-sans text-[--text-muted]">PromptPro</span>
                </div>
              </a>
            </SidebarMenuButton>
            <div className="px-1.5 mt-1">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isSynced ? "bg-green-500" : "bg-gray-500"}`} />
                <span className="text-xs text-[--text-muted]">{isSynced ? "Synced" : "Offline"}</span>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <a href={item.url}>
                      <item.icon className="text-[--text-muted]" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <a href={item.url}>
                      <item.icon className="text-[--text-muted]" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-3 py-2 flex items-center gap-3">
          {isLoaded && user && (
            <>
              <UserButton 
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-8 h-8",
                    userButtonPopoverCard: "bg-[#111113] border border-[#222222]",
                  }
                }}
              />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[--text-primary] truncate max-w-[120px]">
                  {user.firstName || user.primaryEmailAddress?.emailAddress?.split('@')[0]}
                </span>
                <span className="text-xs text-[--text-muted] truncate max-w-[120px]">
                  {user.primaryEmailAddress?.emailAddress}
                </span>
              </div>
            </>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
