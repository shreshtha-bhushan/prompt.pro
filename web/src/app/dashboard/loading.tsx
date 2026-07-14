import { ProgressiveFluxLoader } from "@/components/ui/progressive-flux-loader"

export default function DashboardLoading() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-screen">
      <ProgressiveFluxLoader showLabel={true} />
    </div>
  )
}
