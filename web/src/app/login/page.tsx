import { SignIn } from "@clerk/nextjs"

export default function LoginPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center relative overflow-hidden bg-[#050505]">
      <div 
        className="absolute inset-0 pointer-events-none opacity-40 z-0 mix-blend-screen"
        style={{
          background: `
            radial-gradient(circle at 15% 50%, rgba(255,255,255,0.03), transparent 25%),
            radial-gradient(circle at 85% 30%, rgba(255,255,255,0.04), transparent 35%),
            radial-gradient(circle at 50% 80%, rgba(255,255,255,0.02), transparent 40%)
          `
        }}
      />
      
      <div className="z-10 relative">
        <SignIn />
      </div>
    </div>
  )
}
