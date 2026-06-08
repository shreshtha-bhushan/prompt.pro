"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClerkSupabaseClient } from "@/lib/supabase/client"
import { useAuth } from "@clerk/nextjs"

export function DashboardSync({ userId }: { userId: string }) {
  const router = useRouter()
  const { getToken } = useAuth()

  useEffect(() => {
    if (!userId) return

    let channel: any;

    const setupSync = async () => {
      const token = await getToken()
      const supabase = createClerkSupabaseClient(token)

      // Subscribe to cloud changes in Supabase
      channel = supabase
        .channel("dashboard-sync")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "optimization_logs", filter: `user_id=eq.${userId}` },
          () => {
            router.refresh()
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "snippets", filter: `user_id=eq.${userId}` },
          () => {
            router.refresh()
          }
        )
        .subscribe()
    }

    setupSync()

    // Subscribe to local changes sent from the extension via window messages
    const handleMessage = (event: MessageEvent) => {
      // If the extension pushes a local update or triggers a sync
      if (
        event.data?.type === "PROMPTPRO_SYNC" || 
        event.data?.type === "PROMPT_UPGRADED" || 
        event.data?.type === "LIBRARY_UPDATED" ||
        event.data?.type === "HISTORY_UPDATED"
      ) {
        router.refresh()
      }
    }
    
    window.addEventListener("message", handleMessage)

    return () => {
      if (channel) channel.unsubscribe()
      window.removeEventListener("message", handleMessage)
    }
  }, [userId, router, getToken])

  return null
}
