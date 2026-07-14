'use client'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, Clock, BookOpen, Zap,
  Settings, Info, ChevronLeft, ChevronRight
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Tooltip, TooltipContent,
  TooltipProvider, TooltipTrigger
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Glow } from '@/components/ui/glow'

const NAV_PRIMARY = [
  { href: '/',             icon: Home,     label: 'Home',         badge: null },
  { href: '/history',      icon: Clock,    label: 'History',      badge: null },
  { href: '/library',      icon: BookOpen, label: 'Library',      badge: null },
  { href: '/optimization', icon: Zap,      label: 'Optimization', badge: null },
]
const NAV_SECONDARY = [
  { href: '/settings', icon: Settings, label: 'Settings', badge: null },
  { href: '/about',    icon: Info,     label: 'About',    badge: null },
]

const STREAK_DAYS = [true, true, true, true, false, false, false]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <TooltipProvider delayDuration={400}>
      <motion.aside
        animate={{ width: collapsed ? 56 : 220 }}
        initial={false}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        className="relative flex flex-col h-full flex-shrink-0 z-20"
        style={{
          background:    'rgba(10,10,10,0.92)',
          borderRight:   '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* ── Logo ── */}
        <div className="flex items-center h-14 px-4 gap-2.5 flex-shrink-0 overflow-hidden">
          <Glow variant="left" className="fixed -left-100" />
          <div
            className="w-5 h-5 rounded-[5px] flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.88)' }}
          />

          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.14 }}
                className="font-semibold text-[13px] tracking-tight whitespace-nowrap overflow-hidden"
                style={{ color: 'rgba(255,255,255,0.90)' }}
              >
                PromptPro
              </motion.span>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="ml-auto flex-shrink-0"
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(52,199,89,0.85)' }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Primary Nav ── */}
        <nav className="flex flex-col gap-0.5 px-2 mt-1 flex-1 overflow-hidden">
          {NAV_PRIMARY.map(({ href, icon: Icon, label, badge }) => {
            const active = pathname === href || (href !== '/' && pathname?.startsWith(href + '/'))
            return (
              <NavItem
                key={href}
                href={href}
                icon={<Icon size={15} strokeWidth={1.7} />}
                label={label}
                badge={badge}
                active={active}
                collapsed={collapsed}
              />
            )
          })}

          <div className="my-2">
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0 4px' }} />
          </div>

          {NAV_SECONDARY.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname?.startsWith(href + '/')
            return (
              <NavItem
                key={href}
                href={href}
                icon={<Icon size={15} strokeWidth={1.7} />}
                label={label}
                badge={null}
                active={active}
                collapsed={collapsed}
              />
            )
          })}
        </nav>

        {/* ── Streak ── */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 pb-3 overflow-hidden"
            >
              <p className="font-mono uppercase tracking-widest mb-1.5" style={{
                fontSize: '10px',
                color: 'rgba(255,255,255,0.25)',
              }}>
                4 day streak
              </p>
              <div className="flex gap-1.5">
                {STREAK_DAYS.map((filled, i) => (
                  <div
                    key={i}
                    className="rounded-full"
                    style={{
                      width: '5px',
                      height: '5px',
                      background: filled ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.08)',
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── User ── */}
        <div className="p-2 flex-shrink-0">
          <div
            className="flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-colors duration-150 hover:bg-[rgba(255,255,255,0.04)]"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <Avatar className="w-7 h-7 flex-shrink-0">
              <AvatarImage src="/avatar.png" />
              <AvatarFallback style={{
                background: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '11px',
                fontWeight: 600,
              }}>
                S
              </AvatarFallback>
            </Avatar>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  transition={{ duration: 0.12 }}
                  className="flex-1 min-w-0"
                >
                  <p style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.90)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    Shreshtha
                  </p>
                  <p style={{
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.30)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    Settings
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Collapse ── */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="absolute top-1/2 -translate-y-1/2 -right-3 w-6 h-6 rounded-full flex items-center justify-center z-30 transition-colors duration-150"
          style={{
            background: 'rgba(18,18,18,0.98)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.45)',
          }}
        >
          {collapsed
            ? <ChevronRight size={10} strokeWidth={2.5} />
            : <ChevronLeft  size={10} strokeWidth={2.5} />
          }
        </button>
      </motion.aside>
    </TooltipProvider>
  )
}

// ── NavItem ──────────────────────────────────────────────────
function NavItem({ href, icon, label, badge, active, collapsed }: {
  href: string, icon: React.ReactNode, label: string,
  badge: number | null, active: boolean, collapsed: boolean
}) {
  const item = (
    <Link href={href} className="block">
      <div
        className={cn(
          'flex items-center gap-2.5 px-3 py-2 rounded-lg relative transition-colors duration-100',
          active
            ? 'text-white bg-[rgba(255,255,255,0.08)]'
            : 'text-[rgba(255,255,255,0.42)] hover:text-[rgba(255,255,255,0.80)] hover:bg-[rgba(255,255,255,0.04)]'
        )}
        style={{ fontSize: '13px', fontWeight: active ? 500 : 400 }}
      >
        {active && (
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
            style={{ width: '2px', height: '14px', background: 'rgba(255,255,255,0.65)' }}
          />
        )}
        <span className="flex-shrink-0">{icon}</span>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              transition={{ duration: 0.12 }}
              className="flex-1 whitespace-nowrap overflow-hidden"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
        {!collapsed && badge !== null && (
          <span className="font-mono text-[10px] px-1.5 py-px rounded-full"
            style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.30)' }}>
            {badge}
          </span>
        )}
      </div>
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{item}</TooltipTrigger>
        <TooltipContent side="right" style={{
          background: 'rgba(18,18,18,0.99)',
          border: '1px solid rgba(255,255,255,0.06)',
          color: 'rgba(255,255,255,0.85)',
          fontSize: '12px',
        }}>
          {label}
        </TooltipContent>
      </Tooltip>
    )
  }
  return item
}
