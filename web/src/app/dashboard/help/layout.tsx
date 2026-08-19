import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help & Documentation | PromptPro",
  description:
    "Explore PromptPro guides, keyboard shortcuts, and troubleshooting documentation for the web dashboard and Chrome extension.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
