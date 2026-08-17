import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Geist, Geist_Mono } from 'next/font/google'
import '../styles/tokens.css'
import './globals.css'
import { ExtensionSync } from '@/components/extension-sync'

import { promptProClerkAppearance } from '@/lib/clerk-theme'
import { PostHogProvider } from '@/components/providers/posthog-provider'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'PromptPro — Liquid Prompt Engineering',
  description: 'Upgrade your prompts with PromptPro.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider appearance={promptProClerkAppearance}>
      <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable}`}>
        <body>
          <PostHogProvider>
            <ExtensionSync />
            {children}
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
