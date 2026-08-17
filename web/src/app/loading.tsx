import * as React from "react"
import { SupportPageShell } from "@/components/support/SupportPageShell"
import { LoadingState } from "@/components/support/LoadingState"

export default function GlobalAppLoading() {
  return (
    <SupportPageShell showFooter={false}>
      <LoadingState
        title="Loading Workspace"
        description="Synchronizing models, telemetry, and prompt history..."
      />
    </SupportPageShell>
  )
}
