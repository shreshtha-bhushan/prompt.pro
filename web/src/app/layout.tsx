import type { Metadata } from "next";
import { ClerkProvider } from '@clerk/nextjs'
import "./globals.css";

import { ExtensionSync } from "@/components/extension-sync";

export const metadata: Metadata = {
  title: "PromptPro Web",
  description: "PromptPro UI (shadcn + Next.js)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#050505] text-white antialiased selection:bg-white/10 selection:text-white">
        <ClerkProvider
          appearance={{
            baseTheme: undefined, // Let our globals.css override, but we could use dark theme here
            variables: {
              colorPrimary: 'white',
              colorBackground: '#111113',
              colorText: 'white',
              colorTextSecondary: '#888888',
            }
          }}
        >
          <ExtensionSync />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
