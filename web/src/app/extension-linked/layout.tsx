import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Extension Linked | PromptPro",
  description: "PromptPro Chrome Extension has been successfully authenticated.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ExtensionLinkedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
