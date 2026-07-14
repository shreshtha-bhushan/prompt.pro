"use client"

import * as React from "react"

interface PromptProIconProps extends React.SVGProps<SVGSVGElement> {
  variant?: "dark" | "light" | "transparent"
  size?: number
}

export function PromptProIcon({
  variant = "dark",
  size = 24,
  className = "",
  ...props
}: PromptProIconProps) {
  const bgFill =
    variant === "dark" ? "#0A0A0A" : variant === "light" ? "#FFFFFF" : "transparent"
  const starFill =
    variant === "dark"
      ? "#FFFFFF"
      : variant === "light"
      ? "#0A0A0A"
      : "currentColor"

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      {...props}
    >
      {variant !== "transparent" && (
        <rect width="32" height="32" rx="8" fill={bgFill} />
      )}
      <path
        d="M16 4C16 13 21 16 28 16C21 16 16 19 16 28C16 19 11 16 4 16C11 16 16 13 16 4Z"
        fill={starFill}
      />
    </svg>
  )
}
