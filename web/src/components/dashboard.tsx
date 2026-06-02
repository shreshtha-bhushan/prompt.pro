'use client';

import * as React from 'react';
import { 
  Plus, 
  Trash2, 
  BookOpen, 
  History, 
  Layers, 
  LogOut, 
  User as UserIcon, 
  Clock, 
  Sparkles, 
  Database,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDrawer } from '@/components/ui/confirm-drawer';
import { 
  getUserDashboardData, 
  saveLibraryEntry, 
  deleteLibraryEntry, 
  addContextBlock, 
  deleteContextBlock, 
  toggleContextBlock, 
  clearUserHistory 
} from '@/app/actions';

type HistoryItem = { id: string; text: string; score: number | null; createdAt: Date };
type LibraryItem = { id: string; title: string; text: string; createdAt: Date };
type ContextBlock = { id: string; title: string; content: string; active: boolean; createdAt: Date };

interface DashboardProps {
  user: {
    name?: string | null;
    email?: string | null;
    picture?: string | null;
  };
}

export function Dashboard({ user }: DashboardProps) {
  const [history, setHistory] = React.useState<HistoryItem[]>([]);
  const [library, setLibrary] = React.useState<LibraryItem[]>([]);
  const [contextBlocks, setContextBlocks] = React.useState<ContextBlock[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  // Form states
  const [libTitle, setLibTitle] = React.useState('');
  const [libText, setLibText] = React.useState('');
  const [ctxTitle, setCtxTitle] = React.useState('');
  const [ctxContent, setCtxContent] = React.useState('');

  // Tab state
  const [activeTab, setActiveTab] = React.useState<'library' | 'context' | 'history'>('library');

  // Load initial data
  const loadData = React.useCallback(async () => {
    setLoading(true);
    const result = await getUserDashboardData();
    if (result.success) {
      setHistory(result.history as HistoryItem[]);
      setLibrary(result.library as LibraryItem[]);
      setContextBlocks(result.contextBlocks as ContextBlock[]);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers
  const handleAddLibrary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!libTitle.trim() || !libText.trim()) return;

    setActionLoading('library-add');
    const result = await saveLibraryEntry(libTitle, libText);
    if (result.success && result.item) {
      setLibrary((prev) => [result.item as LibraryItem, ...prev]);
      setLibTitle('');
      setLibText('');
    }
    setActionLoading(null);
  };

  const handleDeleteLibrary = async (id: string) => {
    setActionLoading(`lib-delete-${id}`);
    const result = await deleteLibraryEntry(id);
    if (result.success) {
      setLibrary((prev) => prev.filter((x) => x.id !== id));
    }
    setActionLoading(null);
  };

  const handleAddContext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ctxTitle.trim() || !ctxContent.trim()) return;

    setActionLoading('context-add');
    const result = await addContextBlock(ctxTitle, ctxContent);
    if (result.success && result.item) {
      setContextBlocks((prev) => [...prev, result.item as ContextBlock]);
      setCtxTitle('');
      setCtxContent('');
    }
    setActionLoading(null);
  };

  const handleDeleteContext = async (id: string) => {
    setActionLoading(`ctx-delete-${id}`);
    const result = await deleteContextBlock(id);
    if (result.success) {
      setContextBlocks((prev) => prev.filter((x) => x.id !== id));
    }
    setActionLoading(null);
  };

  const handleToggleContext = async (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    // Optimistic UI update
    setContextBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, active: nextStatus } : b))
    );

    const result = await toggleContextBlock(id, nextStatus);
    if (!result.success) {
      // Revert if failed
      setContextBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, active: currentStatus } : b))
      );
    }
  };

  const handleClearHistory = async () => {
    setActionLoading('history-clear');
    const result = await clearUserHistory();
    if (result.success) {
      setHistory([]);
    }
    setActionLoading(null);
  };

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 flex flex-col relative overflow-hidden font-sans select-none">
      {/* Dynamic Glowing Spotlight Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_65%)] pointer-events-none z-0" />
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(255,255,255,0.015),transparent_70%)] pointer-events-none z-0" />

      {/* Main Grid Wrapper */}
      <div className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-8 relative z-10">
        
        {/* Apple-style minimalist Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-zinc-700 via-zinc-800 to-zinc-700 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-1000" />
              <div className="relative bg-zinc-950 border border-white/10 w-11 h-11 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white animate-pulse" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                PromptPro <span className="text-[10px] tracking-widest font-mono uppercase bg-white/10 px-2 py-0.5 rounded-full text-zinc-300">Console</span>
              </h1>
              <p className="text-xs text-zinc-400 font-medium">Database Node: Supabase PostgreSQL (Prisma 7)</p>
            </div>
          </div>

          {/* User Account Controls Card */}
          <div className="flex items-center gap-4 bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl rounded-2xl p-2.5 pl-4 shadow-2xl">
            {user.picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={user.picture} 
                alt={user.name || 'User'} 
                className="w-9 h-9 rounded-xl border border-white/10 object-cover shadow"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl border border-white/10 bg-zinc-900 flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-zinc-400" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-white truncate max-w-[150px]">
                {user.name || 'Account Console'}
              </span>
              <span className="text-[10px] text-zinc-400 truncate max-w-[150px]">
                {user.email}
              </span>
            </div>
            
            <a href="/auth/logout">
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-9 h-9 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all duration-300"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </a>
          </div>
        </header>

        {/* Dashboard Grid System */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT PANEL: Live Settings & Creator Forms */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Database Sync Status Widget */}
            <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-5 flex flex-col gap-4">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-zinc-500" /> Database Link
              </h3>
              
              <div className="flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-emerald-300">Supabase Connected</span>
                  <span className="text-[10px] text-emerald-400/80">Real-time persistence enabled</span>
                </div>
              </div>
            </div>

            {/* Quick Creation Form Card */}
            <div className="bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl rounded-2xl p-6 shadow-xl flex flex-col gap-5">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-zinc-400" /> Create Item
                </h2>
                <p className="text-xs text-zinc-400">Save custom snippets or context blocks</p>
              </div>

              {/* Form Toggles */}
              <div className="grid grid-cols-2 p-0.5 bg-white/5 rounded-xl border border-white/[0.06]">
                <button 
                  onClick={() => setActiveTab('library')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${activeTab === 'library' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
                >
                  Prompt Snippet
                </button>
                <button 
                  onClick={() => setActiveTab('context')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${activeTab === 'context' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
                >
                  Context Block
                </button>
              </div>

              {activeTab === 'library' ? (
                <form onSubmit={handleAddLibrary} className="flex flex-col gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Title</label>
                    <Input 
                      placeholder="e.g. Senior Code Reviewer" 
                      value={libTitle}
                      onChange={(e) => setLibTitle(e.target.value)}
                      className="bg-white/[0.01] border-white/[0.08] text-white placeholder:text-zinc-600 focus-visible:ring-white/10"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Prompt Content</label>
                    <Textarea 
                      placeholder="Paste your optimized instructions..." 
                      value={libText}
                      onChange={(e) => setLibText(e.target.value)}
                      className="bg-white/[0.01] border-white/[0.08] text-white placeholder:text-zinc-600 focus-visible:ring-white/10 min-h-[100px] resize-none"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-white hover:bg-zinc-200 text-black font-semibold rounded-xl"
                    disabled={actionLoading === 'library-add'}
                  >
                    {actionLoading === 'library-add' ? 'Saving...' : 'Add to Library'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleAddContext} className="flex flex-col gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Block Name</label>
                    <Input 
                      placeholder="e.g. Brand Voice / Stack" 
                      value={ctxTitle}
                      onChange={(e) => setCtxTitle(e.target.value)}
                      className="bg-white/[0.01] border-white/[0.08] text-white placeholder:text-zinc-600 focus-visible:ring-white/10"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Context Data</label>
                    <Textarea 
                      placeholder="e.g. React 19, Tailwind, TypeScript..." 
                      value={ctxContent}
                      onChange={(e) => setCtxContent(e.target.value)}
                      className="bg-white/[0.01] border-white/[0.08] text-white placeholder:text-zinc-600 focus-visible:ring-white/10 min-h-[100px] resize-none"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-white hover:bg-zinc-200 text-black font-semibold rounded-xl"
                    disabled={actionLoading === 'context-add'}
                  >
                    {actionLoading === 'context-add' ? 'Saving...' : 'Add Context Block'}
                  </Button>
                </form>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: Tabbed View of library data, active prompts and telemetry */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Navigation Tabs */}
            <div className="flex border-b border-white/[0.06] pb-px gap-6">
              <button 
                onClick={() => setActiveTab('library')}
                className={`pb-3 text-sm font-semibold relative transition-all ${activeTab === 'library' ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Snippet Library
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 font-mono text-zinc-400">{library.length}</span>
                </span>
                {activeTab === 'library' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
                )}
              </button>

              <button 
                onClick={() => setActiveTab('context')}
                className={`pb-3 text-sm font-semibold relative transition-all ${activeTab === 'context' ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
              >
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4" /> Context Modules
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 font-mono text-zinc-400">{contextBlocks.length}</span>
                </span>
                {activeTab === 'context' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
                )}
              </button>

              <button 
                onClick={() => setActiveTab('history')}
                className={`pb-3 text-sm font-semibold relative transition-all ${activeTab === 'history' ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
              >
                <span className="flex items-center gap-2">
                  <History className="w-4 h-4" /> Optimization Logs
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 font-mono text-zinc-400">{history.length}</span>
                </span>
                {activeTab === 'history' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
                )}
              </button>
            </div>

            {/* TAB CONTAINER */}
            <div className="min-h-[400px]">
              
              {loading ? (
                <div className="h-[300px] w-full flex flex-col items-center justify-center gap-3">
                  <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span className="text-xs text-zinc-500 font-medium">Syncing with Supabase Cluster...</span>
                </div>
              ) : (
                <>
                  {/* TAB 1: LIBRARY SNIPPETS */}
                  {activeTab === 'library' && (
                    <div className="flex flex-col gap-4">
                      {library.length === 0 ? (
                        <div className="h-[250px] border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center p-6 text-center gap-2">
                          <BookOpen className="w-8 h-8 text-zinc-600" />
                          <h3 className="text-sm font-semibold text-zinc-300">Your library is empty</h3>
                          <p className="text-xs text-zinc-500 max-w-[280px]">Add prompt presets using the creation engine on the left panel to reuse in optimization flows.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {library.map((item) => (
                            <div 
                              key={item.id}
                              className="bg-white/[0.01] hover:bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-300 shadow-md group relative overflow-hidden"
                            >
                              <div className="absolute top-0 right-0 w-24 h-24 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.01),transparent_70%)] pointer-events-none" />
                              <div className="space-y-1">
                                <h3 className="text-sm font-bold text-white tracking-tight">{item.title}</h3>
                                <p className="text-xs text-zinc-400 line-clamp-4 leading-relaxed font-normal">{item.text}</p>
                              </div>
                              <div className="flex items-center justify-between pt-3 border-t border-white/[0.04] mt-2">
                                <span className="text-[10px] text-zinc-500 font-medium flex items-center gap-1.5">
                                  <Clock className="w-3 h-3" />
                                  {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                                
                                <ConfirmDrawer
                                  trigger={
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="w-8 h-8 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                      disabled={actionLoading === `lib-delete-${item.id}`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  }
                                  title="Delete Snippet?"
                                  description={`This will permanently remove "${item.title}" from your PostgreSQL library database.`}
                                  confirmLabel="Delete permanently"
                                  onConfirm={() => handleDeleteLibrary(item.id)}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: CONTEXT BLOCKS */}
                  {activeTab === 'context' && (
                    <div className="flex flex-col gap-4">
                      {contextBlocks.length === 0 ? (
                        <div className="h-[250px] border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center p-6 text-center gap-2">
                          <Layers className="w-8 h-8 text-zinc-600" />
                          <h3 className="text-sm font-semibold text-zinc-300">No active context modules</h3>
                          <p className="text-xs text-zinc-500 max-w-[280px]">Context blocks are injected into optimization tasks to give target models custom knowledge boundaries.</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {contextBlocks.map((block) => (
                            <div 
                              key={block.id}
                              className={`border rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 relative overflow-hidden ${
                                block.active 
                                  ? 'border-white/20 bg-white/[0.03] shadow-md' 
                                  : 'border-white/[0.05] bg-white/[0.01]'
                              }`}
                            >
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="text-sm font-bold text-white tracking-tight">{block.title}</h3>
                                  {block.active && (
                                    <span className="text-[9px] font-bold text-white bg-white/10 px-2 py-0.5 rounded-full border border-white/10">Active</span>
                                  )}
                                </div>
                                <p className="text-xs text-zinc-400 leading-relaxed font-normal">{block.content}</p>
                              </div>
                              <div className="flex items-center gap-2 self-end md:self-center border-t md:border-t-0 border-white/[0.04] pt-3 md:pt-0 shrink-0">
                                <Button 
                                  variant="secondary" 
                                  size="sm" 
                                  onClick={() => handleToggleContext(block.id, block.active)}
                                  className={`rounded-xl text-xs font-semibold px-3 h-8 border transition-all duration-300 ${
                                    block.active 
                                      ? 'bg-white hover:bg-zinc-200 text-black border-white' 
                                      : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                                  }`}
                                >
                                  {block.active ? 'Disable' : 'Enable'}
                                </Button>

                                <ConfirmDrawer
                                  trigger={
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="w-8 h-8 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                      disabled={actionLoading === `ctx-delete-${block.id}`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  }
                                  title="Delete Context Module?"
                                  description={`Remove "${block.title}"? Note: Disabled context blocks are no longer merged into prompt optimizations.`}
                                  confirmLabel="Delete block"
                                  onConfirm={() => handleDeleteContext(block.id)}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: OPTIMIZATION HISTORY LOGS */}
                  {activeTab === 'history' && (
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-zinc-500">Telemetry logs mapped from Chrome extension activity</span>
                        {history.length > 0 && (
                          <ConfirmDrawer
                            trigger={
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 rounded-xl text-xs border-white/10 text-zinc-400 hover:text-white hover:bg-white/5"
                                disabled={actionLoading === 'history-clear'}
                              >
                                Clear Optimization Logs
                              </Button>
                            }
                            title="Purge Optimization Logs?"
                            description="This will permanently delete all records of upgraded prompts from your secure PostgreSQL history tables. This action cannot be reverted."
                            confirmLabel="Purge history"
                            onConfirm={handleClearHistory}
                          />
                        )}
                      </div>

                      {history.length === 0 ? (
                        <div className="h-[250px] border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center p-6 text-center gap-2">
                          <History className="w-8 h-8 text-zinc-600" />
                          <h3 className="text-sm font-semibold text-zinc-300">No optimization history found</h3>
                          <p className="text-xs text-zinc-500 max-w-[280px]">Your history will sync automatically when you use PromptPro Chrome extension to optimize prompts.</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {history.map((log) => (
                            <div 
                              key={log.id}
                              className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-5 flex flex-col gap-3 transition-all duration-300"
                            >
                              <div className="flex justify-between items-start gap-4">
                                <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-medium">
                                  <Clock className="w-3.5 h-3.5" />
                                  {new Date(log.createdAt).toLocaleString(undefined, { 
                                    month: 'short', 
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                                {log.score != null && (
                                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-[10px] font-bold text-zinc-300">Score Quality: {log.score}/100</span>
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-zinc-300 font-mono bg-white/[0.01] border border-white/[0.04] p-3 rounded-xl line-clamp-3 leading-relaxed">
                                {log.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
