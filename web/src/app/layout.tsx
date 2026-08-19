import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Geist, Geist_Mono } from 'next/font/google'
import '../styles/tokens.css'
import './globals.css'
import { ExtensionSync } from '@/components/extension-sync'

import { clerkAppearance } from '@/lib/clerk-appearance'
import { PostHogProvider } from '@/components/providers/posthog-provider'
import { CookieConsentBanner } from '@/components/marketing/CookieConsentBanner'
import { StickyMobileCTA } from '@/components/marketing/StickyMobileCTA'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://prompt-pro-liart.vercel.app"),
  title: {
    default: "PromptPro — AI Prompt Engineering & Token Optimization",
    template: "%s | PromptPro",
  },
  description:
    "Enterprise-grade prompt engineering, instant structure enhancement, and token optimization for high-performance AI workflows.",
  keywords: [
    "Prompt Engineering",
    "AI Optimization",
    "ChatGPT",
    "Claude",
    "OpenAI",
    "Anthropic",
    "Prompt Optimizer",
    "Token Optimization",
  ],
  authors: [{ name: "PromptPro Team" }],
  creator: "PromptPro",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon", type: "image/png" },
    ],
    shortcut: "/icon.svg",
    apple: "/apple-icon",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://prompt-pro-liart.vercel.app",
    siteName: "PromptPro",
    title: "PromptPro — AI Prompt Engineering & Token Optimization",
    description:
      "Decompose, structure, and optimize prompts instantly across ChatGPT, Claude, and Gemini with real-time token savings and deep reasoning frameworks.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PromptPro — AI Prompt Engineering & Token Optimization",
    description:
      "Decompose, structure, and optimize prompts instantly across ChatGPT, Claude, and Gemini with zero token fluff.",
    creator: "@promptpro",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable}`}>
        <body>
          <PostHogProvider>
            <ExtensionSync />
            {children}
            <StickyMobileCTA />
            <CookieConsentBanner />
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
