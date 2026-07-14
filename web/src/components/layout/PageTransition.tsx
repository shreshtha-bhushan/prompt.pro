'use client'
import { motion } from 'framer-motion'

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      style={{ minHeight: '100%' }}
    >
      {children}
    </motion.div>
  )
}
