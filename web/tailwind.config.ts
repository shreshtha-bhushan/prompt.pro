import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        'glass': 'rgba(255,255,255,0.032)',
        'surface': {
          primary:  'rgba(12,12,12,0.92)',
          elevated: 'rgba(18,18,18,0.95)',
          inset:    'rgba(0,0,0,0.35)',
        },
        'score': {
          positive: 'rgba(52,199,89,0.85)',
          bar:      'rgba(52,199,89,0.60)',
          track:    'rgba(255,255,255,0.08)',
        }
      },
      borderRadius: {
        'glass': '20px',
        'pill':  '999px',
      },
      backdropBlur: {
        'glass':   '18px',
        'sidebar': '24px',
        'card':    '12px',
      },
      boxShadow: {
        'card':     '0 1px 1px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.4)',
        'elevated': '0 2px 4px rgba(0,0,0,0.6), 0 8px 32px rgba(0,0,0,0.5)',
        'floating': '0 8px 40px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.5)',
      },
      letterSpacing: {
        'tight-xl': '-0.03em',
        'caps':     '0.08em',
      },
      animation: {
        'fade-up': 'fadeUp 0.4s cubic-bezier(0.4,0,0.2,1) both',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        }
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
}
export default config
