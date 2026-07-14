"use client"

import * as React from "react"

interface PromptSparkleIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number
}

export function PromptSparkleIcon({
  size = 16,
  className = "",
  ...props
}: PromptSparkleIconProps) {
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
      <path
        d="M16 4C16 13 21 16 28 16C21 16 16 19 16 28C16 19 11 16 4 16C11 16 16 13 16 4Z"
        fill="currentColor"
      />
    </svg>
  )
}
