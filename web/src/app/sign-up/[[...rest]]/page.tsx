import type { Metadata } from "next"
import { SignUp } from "@clerk/nextjs"
import { AuthLayout } from "@/components/auth/AuthLayout"
import { clerkAppearance } from "@/lib/clerk-appearance"

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Create your PromptPro account to start engineering high-performance prompts with 50 free monthly credits.",
}

export default function SignUpPage() {
  return (
    <AuthLayout backHref="/login" backLabel="Sign in">
      <SignUp
        appearance={clerkAppearance}
        routing="path"
        path="/sign-up"
        signInUrl="/login"
      />
    </AuthLayout>
  )
}
