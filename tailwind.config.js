/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#05060d',
          900: '#0a0c18',
          850: '#0e1124',
          800: '#141a33',
          700: '#1d2545',
        },
        violet: { neon: '#a855ff' },
        electric: '#3b82f6',
        cyanx: '#22d3ee',
        bull: '#22c55e',
        bear: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glass: '0 10px 30px -10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
        glow: '0 0 24px -4px rgba(168,85,255,0.35)',
      },
    },
  },
  plugins: [],
};
