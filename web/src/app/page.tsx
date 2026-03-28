import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
      <div className="max-w-md space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">PromptPro Web</h1>
        <p className="text-sm text-muted-foreground">
          shadcn-style primitives live under{" "}
          <code className="rounded bg-muted px-1">src/components/ui</code> (import alias{" "}
          <code className="rounded bg-muted px-1">@/components/ui</code>).
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/demo"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Bottom drawers demo
        </Link>
        <Link
          href="/prompt-data"
          className="inline-flex h-10 items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground ring-offset-background transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          History / library / context (confirm drawers)
        </Link>
      </div>
    </main>
  );
}
