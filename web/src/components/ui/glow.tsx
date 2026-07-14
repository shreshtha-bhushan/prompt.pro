import { cva, type VariantProps } from "class-variance-authority"
import React from "react"
import { cn } from "@/lib/utils"

const glowVariants = cva("absolute pointer-events-none z-0 flex items-center justify-center", {
  variants: {
    variant: {
      top: "top-0 w-full",
      above: "-top-[128px] w-full",
      bottom: "bottom-0 w-full",
      below: "-bottom-[128px] w-full",
      center: "top-[50%] -translate-y-1/2 w-full",
      left: "left-0 h-full",
      right: "right-0 h-full",
    },
  },
  defaultVariants: {
    variant: "top",
  },
})

const innerGlowVariants = cva(
  "absolute rounded-[100%] from-white/40 via-gray-200/20 to-transparent blur-[60px] mix-blend-screen",
  {
    variants: {
      variant: {
        top: "h-[300px] w-[80%] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]",
        above: "h-[300px] w-[80%] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]",
        bottom: "h-[300px] w-[80%] bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))]",
        below: "h-[300px] w-[80%] bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))]",
        center: "h-[300px] w-[80%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))]",
        left: "w-[300px] h-[80%] bg-[radial-gradient(ellipse_at_left,_var(--tw-gradient-stops))]",
        right: "w-[300px] h-[80%] bg-[radial-gradient(ellipse_at_right,_var(--tw-gradient-stops))]",
      },
    },
    defaultVariants: {
      variant: "top",
    },
  }
)

export const Glow = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof glowVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(glowVariants({ variant }), className)}
    {...props}
  >
    <div className={innerGlowVariants({ variant })} />
  </div>
))
Glow.displayName = "Glow"
