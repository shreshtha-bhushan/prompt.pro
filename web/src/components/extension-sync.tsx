"use client"
import { useAuth, useUser } from "@clerk/nextjs"
import { useEffect } from "react"

export function ExtensionSync() {
  const { getToken, isLoaded: isAuthLoaded } = useAuth()
  const { user, isLoaded: isUserLoaded } = useUser()

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (!isAuthLoaded || !isUserLoaded) return;

    if (!user) {
      window.postMessage({ type: "PROMPT_PRO_SYNC_SIGNOUT" }, "*")
      return
    }

    const syncToken = async () => {
      try {
        // Use standard Clerk token since the extension calls our Next.js API
        const token = await getToken()
        if (token) {
          window.postMessage({
            type: "PROMPT_PRO_SYNC_TOKEN",
            payload: {
              token,
              user: {
                id: user.id,
                email: user.primaryEmailAddress?.emailAddress || "",
                name: user.fullName || "",
                picture: user.imageUrl || null
              }
            }
          }, "*")
        }
      } catch (err) {
        console.error("Failed to sync extension token", err)
      }
    }

    // Initial sync
    syncToken()
    
    // Sync periodically to handle race conditions if the content script loads slightly late
    intervalId = setInterval(syncToken, 2000)

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [user, getToken])

  return null
}
