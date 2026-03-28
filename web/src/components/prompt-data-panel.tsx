"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { ConfirmDrawer } from "@/components/ui/confirm-drawer";
import { Button } from "@/components/ui/button";

type HistoryItem = { id: string; text: string; score?: number };
type LibraryItem = { id: string; title: string; text: string };
type ContextItem = { id: string; title: string; content: string; active: boolean };

/** Mirrors extension popup sections: History / Library / Context with drawer confirmations. */
export function PromptDataPanel() {
  const [history, setHistory] = React.useState<HistoryItem[]>([
    { id: "h1", text: "Example upgraded prompt text…", score: 72 },
  ]);
  const [library, setLibrary] = React.useState<LibraryItem[]>([
    { id: "l1", title: "Example: Senior Review", text: "Review this code for edge cases…" },
  ]);
  const [context, setContext] = React.useState<ContextItem[]>([
    { id: "c1", title: "React Stack", content: "Using React 18, Tailwind, TypeScript.", active: false },
  ]);

  function clearHistory() {
    setHistory([]);
  }

  function deleteLibrary(id: string) {
    setLibrary((prev) => prev.filter((x) => x.id !== id));
  }

  function deleteContext(id: string) {
    setContext((prev) => prev.filter((x) => x.id !== id));
  }

  function toggleContext(id: string) {
    setContext((prev) =>
      prev.map((b) => (b.id === id ? { ...b, active: !b.active } : b)),
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-10 px-4 py-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">PromptPro data (demo)</h1>
        <p className="text-sm text-muted-foreground">
          Same destructive flows as the extension popup: confirmations use bottom drawers here;
          the MV3 popup uses native <code className="rounded bg-muted px-1">confirm()</code>.
        </p>
      </header>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-medium">Recent upgrades</h2>
          <ConfirmDrawer
            trigger={
              <Button variant="outline" size="sm" disabled={history.length === 0}>
                Clear history
              </Button>
            }
            title="Clear all history?"
            description="This removes saved upgraded prompts from this demo list. This cannot be undone."
            confirmLabel="Clear"
            onConfirm={clearHistory}
          />
        </div>
        <ul className="space-y-2">
          {history.length === 0 ? (
            <li className="text-sm text-muted-foreground">No items.</li>
          ) : (
            history.map((h) => (
              <li key={h.id} className="rounded-lg border bg-card p-3 text-sm">
                {h.score != null && (
                  <p className="mb-1 text-xs text-muted-foreground">Quality {h.score}</p>
                )}
                <p className="text-foreground/90">{h.text}</p>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Library</h2>
        <ul className="space-y-2">
          {library.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-2 rounded-lg border bg-card p-3 text-sm"
            >
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-muted-foreground line-clamp-2">{item.text}</p>
              </div>
              <ConfirmDrawer
                trigger={
                  <Button variant="ghost" size="icon" className="shrink-0 text-destructive" aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                }
                title="Delete library entry?"
                description={`Remove “${item.title}” from your library.`}
                confirmLabel="Delete"
                onConfirm={() => deleteLibrary(item.id)}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Context blocks</h2>
        <ul className="space-y-2">
          {context.map((b) => (
            <li
              key={b.id}
              className={`flex flex-col gap-2 rounded-lg border p-3 text-sm ${
                b.active ? "border-emerald-500/50 bg-emerald-500/5" : "bg-card"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{b.title}</p>
                  <p className="text-muted-foreground">{b.content}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="secondary" size="sm" onClick={() => toggleContext(b.id)}>
                    {b.active ? "Turn off" : "Use"}
                  </Button>
                  <ConfirmDrawer
                    trigger={
                      <Button variant="ghost" size="icon" className="text-destructive" aria-label="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    }
                    title="Delete context block?"
                    description={`Remove “${b.title}”. Active blocks are no longer merged into upgrades.`}
                    confirmLabel="Delete"
                    onConfirm={() => deleteContext(b.id)}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
