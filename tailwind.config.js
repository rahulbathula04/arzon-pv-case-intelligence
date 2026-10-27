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
          paper: '#FAF9F6',
          slate: '#334155',
          stone: '#E2E8F0',
          border: '#E2E8F0',
          emerald: '#065F46',
          'emerald-bg': '#ECFDF5',
          amber: '#92400E',
          'amber-bg': '#FFFBEB',
          rose: '#9F1239',
          'rose-bg': '#FFF1F2'
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'Cambria', 'serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"SF Mono"', 'ui-monospace', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}
