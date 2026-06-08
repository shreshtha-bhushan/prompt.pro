"use client"

import { useState, useEffect, useCallback } from "react"
import { createClerkSupabaseClient } from "@/lib/supabase/client"
import { Trash2Icon, CheckIcon, PlusIcon } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export function LibraryClient({ userId, clerkToken }: { userId: string, clerkToken: string | null }) {
  const supabase = createClerkSupabaseClient(clerkToken)
  
  const [snippets, setSnippets] = useState<any[]>([])
  const [activeCategory, setActiveCategory] = useState("all")
  
  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newContent, setNewContent] = useState("")
  const [newType, setNewType] = useState<"snippet" | "context">("snippet")
  


  const fetchSnippets = useCallback(async () => {
    const uuid = userId
    const { data } = await supabase
      .from("snippets")
      .select("*")
      .eq("user_id", uuid)
      .order("created_at", { ascending: false })
      
    if (data) setSnippets(data)
  }, [supabase, userId])

  useEffect(() => {
    fetchSnippets()
  }, [fetchSnippets])

  const handleSave = async () => {
    if (!newTitle.trim() || !newContent.trim()) return

    const uuid = userId
    const { data, error } = await supabase
      .from("snippets")
      .insert({
        user_id: uuid,
        title: newTitle.trim(),
        content: newContent.trim(),
        type: newType
      })
      .select()

    if (!error && data) {
      const updatedSnippets = [data[0], ...snippets]
      setSnippets(updatedSnippets)
      setIsDialogOpen(false)
      setNewTitle("")
      setNewContent("")
      setNewType("snippet")
      
      // Sync to extension
      window.postMessage({ type: "PROMPTPRO_SYNC", payload: updatedSnippets }, "*")
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("snippets").delete().eq("id", id)
    if (!error) {
      const updatedSnippets = snippets.filter(s => s.id !== id)
      setSnippets(updatedSnippets)
      window.postMessage({ type: "PROMPTPRO_SYNC", payload: updatedSnippets }, "*")
    }
  }

  const filteredSnippets = snippets.filter(s => activeCategory === "all" || s.type === activeCategory)
  
  const allCount = snippets.length
  const snippetCount = snippets.filter(s => s.type === "snippet").length
  const contextCount = snippets.filter(s => s.type === "context").length

  return (
    <div className="flex h-full min-h-0">
      {/* Left Sidebar */}
      <div className="w-[280px] shrink-0 border-r border-[--border-side] bg-[#111113] flex flex-col p-6">
        <h2 className="text-sm font-medium text-[--text-primary] mb-6 tracking-wide">LIBRARY</h2>
        
        <div className="flex flex-col gap-2 flex-1">
          <button 
            onClick={() => setActiveCategory("all")}
            className={`flex items-center justify-between text-sm py-1.5 px-3 -ml-3 rounded transition-colors ${activeCategory === "all" ? 'text-[--text-primary] border-l-2 border-[--text-primary] bg-[rgba(255,255,255,0.04)]' : 'text-[--text-secondary] hover:text-[--text-primary] hover:bg-[rgba(255,255,255,0.02)] border-l-2 border-transparent'}`}
          >
            <span>All Items</span>
            <span className="text-[11px] bg-[--layer-3] px-1.5 py-0.5 rounded-full text-[--text-secondary]">{allCount}</span>
          </button>

          <button 
            onClick={() => setActiveCategory("snippet")}
            className={`flex items-center justify-between text-sm py-1.5 px-3 -ml-3 rounded transition-colors ${activeCategory === "snippet" ? 'text-[--text-primary] border-l-2 border-[--text-primary] bg-[rgba(255,255,255,0.04)]' : 'text-[--text-secondary] hover:text-[--text-primary] hover:bg-[rgba(255,255,255,0.02)] border-l-2 border-transparent'}`}
          >
            <span>Prompt Snippets</span>
            <span className="text-[11px] bg-[--layer-3] px-1.5 py-0.5 rounded-full text-[--text-secondary]">{snippetCount}</span>
          </button>

          <button 
            onClick={() => setActiveCategory("context")}
            className={`flex items-center justify-between text-sm py-1.5 px-3 -ml-3 rounded transition-colors ${activeCategory === "context" ? 'text-[--text-primary] border-l-2 border-[--text-primary] bg-[rgba(255,255,255,0.04)]' : 'text-[--text-secondary] hover:text-[--text-primary] hover:bg-[rgba(255,255,255,0.02)] border-l-2 border-transparent'}`}
          >
            <span>Context Blocks</span>
            <span className="text-[11px] bg-[--layer-3] px-1.5 py-0.5 rounded-full text-[--text-secondary]">{contextCount}</span>
          </button>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full justify-start bg-transparent border border-dashed border-[--border-mid] text-[--text-secondary] hover:text-[--text-primary] hover:bg-[rgba(255,255,255,0.02)]">
              <PlusIcon className="w-4 h-4 mr-2" />
              New Snippet
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#111113] border border-[--border-side] text-[--text-primary] sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add to Library</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-5 py-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-[--text-secondary]">Title</label>
                <Input 
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. SEO Persona Context"
                  className="bg-[--layer-3] border-[--border-side] text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-[--text-secondary]">Type</label>
                <div className="flex bg-[--layer-3] p-1 rounded-lg w-fit border border-[--border-side]">
                  <button 
                    onClick={() => setNewType("snippet")}
                    className={`text-xs px-3 py-1.5 rounded-md transition-colors ${newType === "snippet" ? 'bg-[rgba(255,255,255,0.1)] text-[--text-primary]' : 'text-[--text-secondary] hover:text-[--text-secondary]'}`}
                  >
                    Prompt Snippet
                  </button>
                  <button 
                    onClick={() => setNewType("context")}
                    className={`text-xs px-3 py-1.5 rounded-md transition-colors ${newType === "context" ? 'bg-[rgba(255,255,255,0.1)] text-[--text-primary]' : 'text-[--text-secondary] hover:text-[--text-secondary]'}`}
                  >
                    Context Block
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-[--text-secondary]">Content</label>
                <Textarea 
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  rows={6}
                  placeholder="Paste the prompt or context content here..."
                  className="bg-[--layer-3] border-[--border-side] text-sm font-mono resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} className="bg-[--layer-3] border border-[--border-mid] text-[--text-primary] hover:bg-[rgba(255,255,255,0.1)]">
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Grid */}
      <div className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredSnippets.length === 0 ? (
            <div className="col-span-full text-center text-[--text-secondary] py-20 text-sm">
              No items in this category.
            </div>
          ) : (
            filteredSnippets.map(snippet => (
              <div key={snippet.id} className="card p-5 flex flex-col gap-4">
                <div className="text-base font-medium text-[--text-primary]">
                  {snippet.title}
                </div>
                <div className="text-sm text-[--text-secondary] line-clamp-3 font-mono leading-relaxed bg-[rgba(255,255,255,0.02)] p-3 rounded-lg border border-[--border-side]">
                  {snippet.content}
                </div>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] border border-[--border-side] rounded-full px-2 py-0.5 text-[--text-secondary] uppercase tracking-wider">
                      {snippet.type === "snippet" ? "Snippet" : "Context"}
                    </span>
                    <span className="text-xs text-[--text-secondary]">
                      {new Date(snippet.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="p-1.5 rounded-md transition-colors text-[--text-secondary] hover:bg-[--layer-3] hover:text-[--text-primary]">
                        <Trash2Icon className="w-4 h-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-[#111113] border-[--border-side] text-[--text-primary]">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this {snippet.type}?</AlertDialogTitle>
                        <AlertDialogDescription className="text-[--text-secondary]">
                          This action cannot be undone. This will permanently delete "{snippet.title}" from your library.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-[--layer-3] border-[--border-side] text-[--text-primary] hover:bg-[rgba(255,255,255,0.1)]">Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          className="bg-red-500 text-white hover:bg-red-600"
                          onClick={() => handleDelete(snippet.id)}
                        >
                          Yes, delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
