import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Prompt Data | PromptPro",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PromptDataPage() {
  redirect("/");
}
