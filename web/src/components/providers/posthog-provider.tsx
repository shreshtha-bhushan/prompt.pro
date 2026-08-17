"use client"

import * as React from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import posthog from "posthog-js"
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react"

// Initialize once at module level — idempotent, safe to call in render
if (typeof window !== "undefined") {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (key && key !== "phc_placeholder") {
    posthog.init(key, {
      // Route through our /ingest proxy to bypass ad blockers
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "/ingest",
      // Only create person profiles for identified (signed-in) users
      person_profiles: "identified_only",
      // We fire pageviews manually via PageviewTracker (App Router requires it)
      capture_pageview: false,
      capture_pageleave: true,
      session_recording: {
        // Prompts may contain sensitive text — mask everything by default
        maskAllInputs: true,
        maskTextSelector: "[data-ph-mask]",
      },
    })
  }
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      {/* Wrapped in Suspense because useSearchParams() suspends */}
      <React.Suspense fallback={null}>
        <PageviewTracker />
      </React.Suspense>
      <UserIdentifier />
      {children}
    </PHProvider>
  )
}

/**
 * Tracks pageviews on every App Router navigation.
 * Must be a client component with Suspense because useSearchParams() suspends.
 */
function PageviewTracker() {
  const ph = usePostHog()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  React.useEffect(() => {
    if (pathname && ph) {
      let url = window.location.origin + pathname
      if (searchParams && searchParams.toString()) {
        url += `?${searchParams.toString()}`
      }
      ph.capture("$pageview", { $current_url: url })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams])

  return null
}

/**
 * Identifies the signed-in Clerk user in PostHog.
 * Also attaches plan_tier from Clerk public metadata when available.
 * Resets anonymous identity on sign-out.
 */
function UserIdentifier() {
  const ph = usePostHog()
  const { user, isLoaded, isSignedIn } = useUser()

  React.useEffect(() => {
    if (!ph || !isLoaded) return

    if (isSignedIn && user) {
      ph.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName || user.firstName,
        username: user.username,
        // plan_tier is stored in Clerk public metadata by the Whop webhook handler
        plan_tier: (user.publicMetadata as any)?.plan_tier ?? "free",
        role: (user.publicMetadata as any)?.role ?? "user",
        created_at: user.createdAt,
      })
    } else if (isLoaded && !isSignedIn) {
      ph.reset()
    }
  }, [ph, isLoaded, isSignedIn, user])

  return null
}
