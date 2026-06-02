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
    <html lang="en">
      <Auth0Provider>
        <body className="min-h-screen antialiased">{children}</body>
      </Auth0Provider>
    </html>
  );
}
