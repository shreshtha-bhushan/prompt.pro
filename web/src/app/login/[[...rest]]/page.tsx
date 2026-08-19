import type { Metadata } from "next"
import { SignIn } from "@clerk/nextjs"
import { AuthLayout } from "@/components/auth/AuthLayout"
import { clerkAppearance } from "@/lib/clerk-appearance"

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Log in to your PromptPro workspace to access your prompt library, optimization history, and credit usage analytics.",
}

export default function LoginPage() {
  return (
    <AuthLayout backHref="/" backLabel="Home">
      <SignIn
        appearance={clerkAppearance}
        routing="path"
        path="/login"
        signUpUrl="/sign-up"
      />
    </AuthLayout>
  )
}
