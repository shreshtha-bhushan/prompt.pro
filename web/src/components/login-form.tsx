"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg("")
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setErrorMsg(error.message)
      setIsLoading(false)
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  const handleSignUp = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setErrorMsg("Please enter email and password to sign up.")
      return
    }
    
    setIsLoading(true)
    setErrorMsg("")
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setErrorMsg(error.message)
      setIsLoading(false)
    } else {
      setErrorMsg("Sign up successful! You can now log in.")
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="bg-[--bg-elevated] border-[--border-subtle] text-[--text-primary]">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome to PromptPro</CardTitle>
          <CardDescription className="text-[--text-muted]">
            Enter your email and password to login
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="grid gap-6">
              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-[--text-secondary]">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-[#111113] border-[--border-subtle] text-[--text-primary]"
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password" className="text-[--text-secondary]">Password</Label>
                  </div>
                  <Input 
                    id="password" 
                    type="password" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-[#111113] border-[--border-subtle] text-[--text-primary]"
                  />
                </div>
                
                {errorMsg && (
                  <div className="text-sm text-red-500 font-medium text-center">
                    {errorMsg}
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full bg-[--text-primary] text-[--bg-base] hover:bg-[--text-secondary]"
                  disabled={isLoading}
                >
                  {isLoading ? "Loading..." : "Login"}
                </Button>
              </div>
              <div className="text-center text-sm text-[--text-muted]">
                Don&apos;t have an account?{" "}
                <button 
                  type="button" 
                  onClick={handleSignUp}
                  className="underline underline-offset-4 hover:text-[--text-primary]"
                  disabled={isLoading}
                >
                  Sign up
                </button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
