import * as React from "react"

interface ModelIconProps {
  site?: string
  className?: string
}

export function ModelIcon({ site = "", className = "w-4 h-4" }: ModelIconProps) {
  const s = (site || "").toLowerCase()

  if (s.includes("chatgpt") || s.includes("openai")) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a4.55 4.55 0 0 1-.456 10.129zm-9.873-4.2a4.512 4.512 0 0 1-.543-3.003l.142.08 4.778 2.759a.792.792 0 0 0 .788 0l5.834-3.368v2.336a4.544 4.544 0 0 1-11 1.196zm-1.127-10.45a4.53 4.53 0 0 1 2.333-1.963V11.53a.79.79 0 0 0 .396.685l5.833 3.368-2.02 1.166-4.779-2.758a4.54 4.54 0 0 1-1.763-6.211zM10.74 1.57a4.476 4.476 0 0 1 2.876 1.04l-.141.081-4.779 2.758a.795.795 0 0 0-.392.681v6.737l-2.02-1.168A4.55 4.55 0 0 1 10.74 1.57zm9.873 4.2a4.512 4.512 0 0 1 .543 3.003l-.142-.08-4.778-2.759a.792.792 0 0 0-.788 0l-5.834 3.368V7.001a4.544 4.544 0 0 1 11-1.196zm1.127 10.45a4.53 4.53 0 0 1-2.333 1.963V12.47a.79.79 0 0 0-.396-.685l-5.833-3.368 2.02-1.166 4.779 2.758a4.54 4.54 0 0 1 1.763 6.211z" />
      </svg>
    )
  }

  if (s.includes("claude") || s.includes("anthropic")) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M13.827 3.53h3.604L24 20.47h-3.604l-6.569-16.94zm-3.654 0H6.569L0 20.47h3.654l1.621-4.185h6.635l1.622 4.185h3.654L10.173 3.53zm-2.909 10.407L10.173 6.43l2.909 7.507H7.264z" />
      </svg>
    )
  }

  if (s.includes("gemini") || s.includes("google")) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
      </svg>
    )
  }

  if (s.includes("perplexity")) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 3v18M5 6.5l14 11M19 6.5L5 17.5" />
      </svg>
    )
  }

  return (
    <img src="/icon.svg" alt="PromptPro Extension" className={className} />
  )
}
