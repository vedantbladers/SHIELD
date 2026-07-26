import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand colors
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',  // primary brand (indigo)
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        // Surface colors (backgrounds)
        surface: {
          base:    '#ffffff',  // page background
          raised:  '#f8fafc',  // card background
          overlay: '#f1f5f9',  // hover/active states
          border:  '#e2e8f0',  // borders
        },
        // Text colors
        text: {
          primary:   '#0f172a',  // headings
          secondary: '#475569',  // body text
          muted:     '#94a3b8',  // placeholders, hints
          inverse:   '#ffffff',  // text on dark backgrounds
        },
        // Semantic colors
        success: '#10b981',
        warning: '#f59e0b',
        danger:  '#ef4444',
        info:    '#3b82f6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'xl':  '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'card':  '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)',
        'modal': '0 20px 25px rgba(0,0,0,0.15), 0 10px 10px rgba(0,0,0,0.04)',
      }
    },
  },
  plugins: [],
}

export default config;
