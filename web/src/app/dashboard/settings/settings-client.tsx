"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { SaveIcon } from "lucide-react"

const DEFAULT_SETTINGS = {
  enabled: true,
  defaultStrategy: "enhance",
  defaultTone: "professional",
  lowTokenEnabled: false,
  noFluff: false,
  siteMemory: true,
  autocompleteEnabled: true,
  openrouterApiKey: "",
}

export function SettingsClient({ userId, clerkToken }: { userId: string, clerkToken: string | null }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [isSaving, setIsSaving] = useState(false)

  // Load settings from localStorage on mount (fallback if extension not connected)
  useEffect(() => {
    const saved = localStorage.getItem("promptpro_dashboard_settings")
    if (saved) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) })
      } catch (e) {}
    }
  }, [])

  const handleToggle = (key: keyof typeof settings) => (checked: boolean) => {
    setSettings(prev => ({ ...prev, [key]: checked }))
  }

  const handleChange = (key: keyof typeof settings) => (val: string) => {
    setSettings(prev => ({ ...prev, [key]: val }))
  }

  const handleSavePreferences = async () => {
    setIsSaving(true)
    
    // 1. Save locally for dashboard fallback
    localStorage.setItem("promptpro_dashboard_settings", JSON.stringify(settings))
    
    // 2. Broadcast to extension via content script
    window.postMessage({ 
      type: "PROMPTPRO_UPDATE_SETTINGS", 
      payload: settings 
    }, "*")

    await new Promise((resolve) => setTimeout(resolve, 600))
    toast.success("Preferences saved successfully!")
    setIsSaving(false)
  }

  return (
    <div className="w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[--text-primary]">Preferences</h1>
        <p className="text-sm text-[--text-secondary]">Configure how PromptPro behaves across the web.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Core Behavior */}
        <Card className="card bg-transparent text-[--text-primary] border-[--border-side]">
          <CardHeader className="border-b border-[--border-side] pb-4">
            <CardTitle className="text-lg">Core Behavior</CardTitle>
            <CardDescription className="text-[--text-secondary]">
              Manage the default optimization logic.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Enable Extension</Label>
                <p className="text-xs text-[--text-secondary]">Toggle PromptPro across all sites</p>
              </div>
              <Switch checked={settings.enabled} onCheckedChange={handleToggle("enabled")} />
            </div>

            <div className="space-y-3">
              <Label className="text-sm text-[--text-secondary] uppercase tracking-wider font-semibold">Default Strategy</Label>
              <Select value={settings.defaultStrategy} onValueChange={handleChange("defaultStrategy")}>
                <SelectTrigger className="bg-[--layer-3] border-[--border-side] text-[--text-primary]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[--layer-3] border-[--border-side] text-[--text-primary]">
                  <SelectItem value="enhance" className="focus:bg-[--layer-4] focus:text-[--text-primary]">Enhance</SelectItem>
                  <SelectItem value="elaborate" className="focus:bg-[--layer-4] focus:text-[--text-primary]">Elaborate</SelectItem>
                  <SelectItem value="concise" className="focus:bg-[--layer-4] focus:text-[--text-primary]">Concise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-sm text-[--text-secondary] uppercase tracking-wider font-semibold">Default Tone</Label>
              <Select value={settings.defaultTone} onValueChange={handleChange("defaultTone")}>
                <SelectTrigger className="bg-[--layer-3] border-[--border-side] text-[--text-primary]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[--layer-3] border-[--border-side] text-[--text-primary]">
                  <SelectItem value="none" className="focus:bg-[--layer-4] focus:text-[--text-primary]">None</SelectItem>
                  <SelectItem value="professional" className="focus:bg-[--layer-4] focus:text-[--text-primary]">Professional</SelectItem>
                  <SelectItem value="casual" className="focus:bg-[--layer-4] focus:text-[--text-primary]">Casual</SelectItem>
                  <SelectItem value="direct" className="focus:bg-[--layer-4] focus:text-[--text-primary]">Direct / Assertive</SelectItem>
                  <SelectItem value="creative" className="focus:bg-[--layer-4] focus:text-[--text-primary]">Creative</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Features & API */}
        <Card className="card bg-transparent text-[--text-primary] border-[--border-side]">
          <CardHeader className="border-b border-[--border-side] pb-4">
            <CardTitle className="text-lg">Features & API</CardTitle>
            <CardDescription className="text-[--text-secondary]">
              Toggle advanced features and LLM settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Autocomplete Prompts</Label>
                <p className="text-xs text-[--text-secondary]">Show AI suggestions while typing</p>
              </div>
              <Switch checked={settings.autocompleteEnabled} onCheckedChange={handleToggle("autocompleteEnabled")} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Low Token Mode</Label>
                <p className="text-xs text-[--text-secondary]">Optimize for minimal LLM cost</p>
              </div>
              <Switch checked={settings.lowTokenEnabled} onCheckedChange={handleToggle("lowTokenEnabled")} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>No Fluff Mode</Label>
                <p className="text-xs text-[--text-secondary]">Remove filler words and pleasantries</p>
              </div>
              <Switch checked={settings.noFluff} onCheckedChange={handleToggle("noFluff")} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Site Memory</Label>
                <p className="text-xs text-[--text-secondary]">Remember settings per website</p>
              </div>
              <Switch checked={settings.siteMemory} onCheckedChange={handleToggle("siteMemory")} />
            </div>

            <div className="space-y-3 pt-2">
              <Label className="text-sm text-[--text-secondary] uppercase tracking-wider font-semibold">OpenRouter API Key (Optional)</Label>
              <Input
                type="password"
                placeholder="sk-or-v1-..."
                value={settings.openrouterApiKey}
                onChange={(e) => handleChange("openrouterApiKey")(e.target.value)}
                className="bg-[--layer-3] border-[--border-side] text-[--text-primary]"
              />
              <p className="text-[10px] text-[--text-secondary]">
                Overrides the shared API pool and uses your own billing for OpenRouter models.
              </p>
            </div>

          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end pt-4">
        <Button 
          onClick={handleSavePreferences}
          disabled={isSaving}
          className="bg-white text-[#111111] hover:bg-white/90 font-semibold px-8 h-12 rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_25px_rgba(255,255,255,0.25)] flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <span className="flex items-center gap-2 text-[#111111]">
              <div className="w-4 h-4 rounded-full border-2 border-[#111111] border-t-transparent animate-spin" />
              Saving...
            </span>
          ) : (
            <span className="flex items-center gap-2 font-semibold text-[#111111]">
              <SaveIcon className="w-4 h-4 text-[#111111]" />
              Save Preferences
            </span>
          )}
        </Button>
      </div>
    </div>
  )
}
