import type { Metadata } from "next";
import BottomDrawers from "@/components/ui/bottom-drawers";

export const metadata: Metadata = {
  title: "Interactive Demo — Experience Real-Time Prompt Engineering",
  description:
    "Test PromptPro's real-time prompt enhancement engine live in your browser with zero latency and 5-component decomposition frameworks.",
};

export default function DemoOnePage() {
  return <BottomDrawers />;
}
