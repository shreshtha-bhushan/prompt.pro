"use client"

import { useState } from "react"
import { createClerkSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { CopyIcon, CheckIcon, Wand2Icon, AlertCircleIcon, SaveIcon } from "lucide-react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { clerkToUuid } from "@/lib/utils"

export function OptimizationClient({ userId, clerkToken }: { userId: string, clerkToken: string | null }) {
  const supabase = createClerkSupabaseClient(clerkToken)
  
  const [inputPrompt, setInputPrompt] = useState("")
  const [outputPrompt, setOutputPrompt] = useState("")
  const [strategy, setStrategy] = useState("enhance")
  const [tone, setTone] = useState("professional")
  const [lowToken, setLowToken] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleOptimize = async () => {
    if (!inputPrompt.trim()) {
      toast.error("Please enter a prompt to optimize")
      return
    }

    setIsOptimizing(true)
    setOutputPrompt("")

    try {
      const res = await fetch("/api/upgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: inputPrompt,
          strategy,
          tone: tone === "none" ? null : tone,
          lowTokenEnabled: lowToken,
          noFluff: true,
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to optimize prompt")
      }

      setOutputPrompt(data.rewritten)
      
      // Log to Supabase silently
      const uuid = userId
      supabase.from("optimization_logs").insert({
        user_id: uuid,
        site: "Dashboard (Manual)",
        strategy: strategy,
        tone: tone === "none" ? null : tone,
        original_prompt: inputPrompt,
        upgraded_prompt: data.rewritten,
        score_before: 50, // Mock baseline for manual entries
        score_after: 95,
      }).then(({ error }) => {
        if (error) console.error("Failed to log optimization:", error)
      })

    } catch (err: any) {
      toast.error(err.message || "An error occurred during optimization")
    } finally {
      setIsOptimizing(false)
    }
  }

  const handleCopy = () => {
    if (!outputPrompt) return
    navigator.clipboard.writeText(outputPrompt)
    setCopied(true)
    toast.success("Copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveToLibrary = async () => {
    if (!outputPrompt) return
    
    const uuid = userId
    const { error } = await supabase.from("snippets").insert({
      user_id: uuid,
      title: inputPrompt.substring(0, 30) + "...",
      content: outputPrompt,
      category: "optimized",
      tags: [strategy, tone !== "none" ? tone : "standard"]
    })

    if (error) {
      toast.error("Failed to save to library")
    } else {
      toast.success("Saved to your Library!")
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full p-6 md:p-10 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[--text-primary]">Studio</h1>
          <p className="text-sm text-[--text-secondary]">Manually optimize and test your prompts.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Left Column: Configuration */}
        <div className="col-span-1 space-y-6 overflow-y-auto pr-2 pb-6">
          <div className="bg-[--layer-2] border border-[--border-side] rounded-xl p-5 space-y-5">
            <h3 className="text-sm font-medium text-[--text-primary] border-b border-[--border-side] pb-2">Configuration</h3>
            
            <div className="space-y-3">
              <Label className="text-xs text-[--text-secondary] uppercase tracking-wider font-semibold">Strategy</Label>
              <Select value={strategy} onValueChange={setStrategy}>
                <SelectTrigger className="bg-[--layer-3] border-[--border-side] text-[--text-primary]">
                  <SelectValue placeholder="Select strategy" />
                </SelectTrigger>
                <SelectContent className="bg-[--layer-3] border-[--border-side] text-[--text-primary]">
                  <SelectItem value="enhance" className="focus:bg-[--layer-3] focus:text-[--text-primary]">Enhance (Default)</SelectItem>
                  <SelectItem value="elaborate" className="focus:bg-[--layer-3] focus:text-[--text-primary]">Elaborate</SelectItem>
                  <SelectItem value="concise" className="focus:bg-[--layer-3] focus:text-[--text-primary]">Concise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-xs text-[--text-secondary] uppercase tracking-wider font-semibold">Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="bg-[--layer-3] border-[--border-side] text-[--text-primary]">
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent className="bg-[--layer-3] border-[--border-side] text-[--text-primary]">
                  <SelectItem value="none" className="focus:bg-[--layer-3] focus:text-[--text-primary]">No specific tone</SelectItem>
                  <SelectItem value="professional" className="focus:bg-[--layer-3] focus:text-[--text-primary]">Professional</SelectItem>
                  <SelectItem value="casual" className="focus:bg-[--layer-3] focus:text-[--text-primary]">Casual</SelectItem>
                  <SelectItem value="direct" className="focus:bg-[--layer-3] focus:text-[--text-primary]">Direct / Assertive</SelectItem>
                  <SelectItem value="creative" className="focus:bg-[--layer-3] focus:text-[--text-primary]">Creative / Imaginative</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <Label className="text-sm text-[--text-primary]">Low Token Mode</Label>
                <p className="text-xs text-[--text-secondary]">Optimize for minimal LLM cost</p>
              </div>
              <Switch 
                checked={lowToken} 
                onCheckedChange={setLowToken} 
                className="data-[state=checked]:bg-[--text-primary]"
              />
            </div>
          </div>
          
          <Button 
            onClick={handleOptimize} 
            disabled={isOptimizing || !inputPrompt.trim()}
            className="w-full bg-[--text-primary] text-black hover:bg-[--text-secondary] py-6 rounded-xl shadow-lg transition-all"
          >
            {isOptimizing ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-[--bg-base] border-t-transparent animate-spin" />
                Optimizing...
              </span>
            ) : (
              <span className="flex items-center gap-2 font-medium">
                <Wand2Icon className="w-4 h-4" />
                Upgrade Prompt
              </span>
            )}
          </Button>
        </div>

        {/* Right Column: IO text areas */}
        <div className="col-span-1 lg:col-span-2 flex flex-col gap-4 min-h-0">
          
          {/* Input Area */}
          <div className="flex-1 min-h-[200px] flex flex-col card overflow-hidden relative group transition-colors focus-within:border-[--border-mid]">
            <div className="bg-[--layer-3] border-b border-[--border-subtle] px-4 py-2 flex items-center justify-between">
              <span className="text-xs font-medium text-[--text-secondary] uppercase tracking-widest">Original Prompt</span>
              <span className="text-[10px] text-[--text-secondary]">{inputPrompt.length} chars</span>
            </div>
            <Textarea
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Paste the prompt you want to optimize here..."
              className="flex-1 bg-transparent border-0 resize-none text-[--text-primary] p-4 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-[--text-secondary]"
            />
          </div>

          {/* Output Area */}
          <div className="flex-1 min-h-[250px] flex flex-col card overflow-hidden relative">
            <div className="bg-[--layer-3] border-b border-[--border-subtle] px-4 py-2 flex items-center justify-between">
              <span className="text-xs font-medium text-[--text-secondary] uppercase tracking-widest">Optimized Output</span>
              
              <AnimatePresence>
                {outputPrompt && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSaveToLibrary}
                      className="h-6 px-2 text-xs text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--layer-3]"
                    >
                      <SaveIcon className="w-3 h-3 mr-1.5" />
                      Save
                    </Button>
                    <div className="w-px h-3 bg-[--border-side]" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="h-6 px-2 text-xs text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--layer-3]"
                    >
                      {copied ? <CheckIcon className="w-3 h-3 mr-1.5 text-green-500" /> : <CopyIcon className="w-3 h-3 mr-1.5" />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto relative bg-[#0a0a0a]">
              {isOptimizing ? (
                <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]/50 backdrop-blur-sm z-10">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-6 h-6 rounded-full border-2 border-[--text-muted] border-t-[--text-primary] animate-spin" />
                    <span className="text-xs text-[--text-secondary] animate-pulse">Applying 5-component framework...</span>
                  </div>
                </div>
              ) : null}
              
              {!outputPrompt && !isOptimizing ? (
                <div className="h-full flex flex-col items-center justify-center text-[--text-secondary] opacity-50 select-none">
                  <Wand2Icon className="w-8 h-8 mb-3 opacity-20" />
                  <p className="text-sm">Your optimized prompt will appear here</p>
                </div>
              ) : (
                <div className="text-[--text-primary] whitespace-pre-wrap text-sm leading-relaxed">
                  {outputPrompt}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
