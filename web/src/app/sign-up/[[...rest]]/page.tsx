import { SignUp } from "@clerk/nextjs"
import { SupportPageShell } from "@/components/support/SupportPageShell"
import { promptProClerkAppearance } from "@/lib/clerk-theme"

export default function SignUpPage() {
  return (
    <SupportPageShell backHref="/login" backLabel="Sign in">
      <div className="w-full max-w-[440px] flex flex-col items-center">
        <SignUp
          appearance={promptProClerkAppearance}
          routing="path"
          path="/sign-up"
          signInUrl="/login"
        />
      </div>
    </SupportPageShell>
  )
}
