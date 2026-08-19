import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Access Restricted | PromptPro",
  description: "Sign in required to access this PromptPro workspace resource.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function UnauthorizedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
