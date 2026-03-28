# PromptPro Web (Next.js + shadcn-style UI)

This folder is a **Next.js 15** app with **TypeScript**, **Tailwind CSS**, and UI primitives under `src/components/ui` (shadcn-style paths and `components.json`).

The **extension popup** (`popup/popup.html` + `popup.js`) cannot run React without a bundler, so destructive confirmations use a **vanilla bottom-sheet** that mirrors the UX of `web/src/components/ui/confirm-drawer.tsx` (vaul/shadcn-style: backdrop + slide-up panel). The Next.js app is where the real React + Tailwind + shadcn components live.

## Prerequisites

- Node.js 18+

## Install

```bash
cd web
npm install
```

### Windows: `ENOTEMPTY` / `EPERM` on `node_modules`

If `npm install` fails while cleaning `node_modules`, another process may be locking files (IDE, antivirus, a stuck `npm` run). Close other terminals using this folder, then remove the folder from **cmd** (often more reliable than Explorer):

```bat
cd web
rmdir /s /q node_modules
del /f /q package-lock.json
npm install
```

Then run `npm run build` to confirm.

## Commands

```bash
npm run dev    # http://localhost:3000
npm run build
npm run lint
```

## shadcn CLI (optional)

If you prefer the official generator:

```bash
cd web
npx shadcn@latest init
# then add components, e.g.:
npx shadcn@latest add drawer button input label textarea
```

This project already includes those files manually so `npm install` is enough.

## Security updates (Next.js / React)

Keep `next` and `eslint-config-next` on a **patched** release for your line (see [Next.js security advisories](https://nextjs.org/blog)). You can also run:

```bash
npx fix-react2shell-next
```

## Routes

| Path | Description |
|------|-------------|
| `/` | Links to demos |
| `/demo` | Bottom drawer example (`bottom-drawers.tsx`) |
| `/prompt-data` | History / library / context mock with **ConfirmDrawer** |

## Why `components/ui`?

The `@/components/ui` convention matches shadcn/ui defaults so imports like `@/components/ui/button` stay stable across docs, CLI snippets, and team expectations. If you use a different folder, update `components.json` and `tsconfig.json` `paths`.
