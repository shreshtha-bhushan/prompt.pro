import { Sidebar } from '@/components/layout/Sidebar'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Deep canvas */}
      <div className="fixed inset-0 z-0" style={{ background: '#050505' }} />

      {/* Ambient gradient */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 55% at 15% 0%,
              rgba(255,255,255,0.018) 0%, transparent 55%),
            radial-gradient(ellipse 55% 40% at 85% 95%,
              rgba(180,180,200,0.012) 0%, transparent 50%)
          `
        }}
      />

      {/* App shell */}
      <div className="relative z-10 flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </>
  )
}
