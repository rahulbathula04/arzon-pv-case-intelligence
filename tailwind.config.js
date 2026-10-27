/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        arzon: {
          ink: '#0B1325',
          navy: '#1B3F8B',
          'navy-light': '#2A56B8',
          'navy-subtle': '#EEF2FF',
          paper: '#FAF9F6',
          canvas: '#F6F6F8',
          slate: '#334155',
          stone: '#E2E8F0',
          border: 'rgba(0, 0, 0, 0.08)',
          emerald: '#065F46',
          'emerald-bg': '#ECFDF5',
          amber: '#92400E',
          'amber-bg': '#FFFBEB',
          rose: '#9F1239',
          'rose-bg': '#FFF1F2'
        },
        apple: {
          gray: '#F5F5F7',
          border: 'rgba(0, 0, 0, 0.07)',
          card: '#FFFFFF',
          hover: '#F8F9FA'
        }
      },
      fontFamily: {
        serif: [
          '"Inter"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif'
        ],
        sans: [
          '"Inter"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Segoe UI"',
          'Roboto',
          'system-ui',
          'sans-serif'
        ],
        mono: [
          '"JetBrains Mono"',
          '"SF Mono"',
          'ui-monospace',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace'
        ]
      },
      boxShadow: {
        'apple-subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 3px 0 rgba(0, 0, 0, 0.02)',
        'apple-card': '0 2px 8px -2px rgba(11, 19, 37, 0.04), 0 8px 24px -4px rgba(11, 19, 37, 0.06)',
        'apple-elevated': '0 8px 28px -6px rgba(11, 19, 37, 0.08), 0 2px 8px -2px rgba(11, 19, 37, 0.04)',
        'apple-modal': '0 20px 48px -12px rgba(11, 19, 37, 0.18), 0 4px 12px -2px rgba(11, 19, 37, 0.06)',
        'apple-glow': '0 0 0 3px rgba(27, 63, 139, 0.15)',
        'apple-inner': 'inset 0 1px 2px 0 rgba(0, 0, 0, 0.04)'
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '22px',
        '4xl': '28px'
      }
    },
  },
  plugins: [],
}
