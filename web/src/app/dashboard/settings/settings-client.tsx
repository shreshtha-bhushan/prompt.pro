"use client"

import { UserProfile } from "@clerk/nextjs"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { toast } from "sonner"

export function SettingsClient({ userId, clerkToken }: { userId: string, clerkToken: string | null }) {
  const [apiKey, setApiKey] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const handleSavePreferences = async () => {
    setIsSaving(true)
    // Simulate an API call to save preferences
    await new Promise((resolve) => setTimeout(resolve, 800))
    toast.success("Preferences saved successfully!")
    setIsSaving(false)
  }

  return (
    <Tabs defaultValue="account" className="w-full max-w-4xl">
      <TabsList className="mb-6 bg-transparent border-b border-[--border-subtle] rounded-none w-full justify-start h-auto p-0 gap-6">
        <TabsTrigger 
          value="account"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-[--text-primary] data-[state=active]:bg-transparent data-[state=active]:text-[--text-primary] text-[--text-muted] pb-3 px-1"
        >
          Account
        </TabsTrigger>
        <TabsTrigger 
          value="extension"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-[--text-primary] data-[state=active]:bg-transparent data-[state=active]:text-[--text-primary] text-[--text-muted] pb-3 px-1"
        >
          Extension Preferences
        </TabsTrigger>
      </TabsList>

      <TabsContent value="account" className="mt-0">
        <div className="glass p-1 rounded-xl border border-[--border-subtle] overflow-hidden">
          <UserProfile 
            appearance={{
              elements: {
                rootBox: "w-full",
                cardBox: "w-full shadow-none border-none bg-transparent rounded-none",
                navbar: "hidden", // Hide clerk's internal navbar to keep it clean
                pageScrollBox: "bg-transparent",
                profileSectionTitleText: "text-[--text-primary]",
                profileSectionPrimaryButton: "text-[--text-secondary] hover:bg-[--bg-elevated]",
                badge: "bg-[--bg-elevated] text-[--text-primary] border-[--border-subtle]",
                formButtonPrimary: "bg-[--text-primary] text-[--bg-base] hover:bg-[--text-secondary]",
              }
            }}
            routing="hash"
          />
        </div>
      </TabsContent>

      <TabsContent value="extension" className="mt-0">
        <Card className="glass border-[--border-subtle] bg-transparent text-[--text-primary]">
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
            <CardDescription className="text-[--text-muted]">
              Configure your default API keys for the PromptPro extension.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="api-key" className="text-[--text-secondary]">OpenAI API Key (Optional)</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-[#111113] border-[--border-subtle] text-[--text-primary] max-w-md"
              />
              <p className="text-xs text-[--text-muted]">
                If provided, the extension will use your own key instead of the shared pool.
              </p>
            </div>

            <Button 
              onClick={handleSavePreferences}
              disabled={isSaving}
              className="bg-[--bg-elevated] text-[--text-primary] border border-[--border-mid] hover:bg-[#222222]"
            >
              {isSaving ? "Saving..." : "Save Preferences"}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
