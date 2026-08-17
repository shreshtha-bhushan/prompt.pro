"use client"

import { useAuth } from "@clerk/nextjs"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { SupportPageShell } from "@/components/support/SupportPageShell"
import { LoadingState } from "@/components/support/LoadingState"

export default function SignOutPage() {
  const { signOut, isLoaded } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded) {
      signOut().then(() => {
        // If this was opened in a background tab by the extension, try to close it
        if (typeof window !== "undefined" && window.history.length <= 1) {
          window.close()
        } else {
          router.push("/")
        }
      })
    }
  }, [isLoaded, signOut, router])

  return (
    <SupportPageShell showFooter={false}>
      <LoadingState
        title="Signing Out"
        description="Securing your session and clearing local tokens..."
      />
    </SupportPageShell>
  )
}

