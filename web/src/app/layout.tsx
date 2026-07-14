import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Geist, Geist_Mono } from 'next/font/google'
import '../styles/tokens.css'
import './globals.css'
import { ExtensionSync } from '@/components/extension-sync'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'PromptPro',
  description: 'Upgrade your prompts with PromptPro.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: 'white',
          colorBackground: '#0d0d0d',
          colorText: 'white',
          colorTextSecondary: '#a1a1aa',
        }
      }}
    >
      <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable}`}>
        <body>
          <ExtensionSync />
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
