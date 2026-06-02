import type { Metadata } from "next";
import { Auth0Provider } from '@auth0/nextjs-auth0';
import "./globals.css";

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
      <Auth0Provider>
        <body className="min-h-screen bg-[#050505] text-white antialiased selection:bg-white/10 selection:text-white">
          {children}
        </body>
      </Auth0Provider>
    </html>
  );
}
