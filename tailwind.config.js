/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cairo', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Deep blue-black base — designed for dark, not an inverted light theme.
        night: { DEFAULT: '#0A0F1A', raised: '#0F1626' },
        surface: { DEFAULT: '#151E30', hi: '#1E2A42' },
        line: { DEFAULT: '#27324B', soft: '#1B2540' },
        fg: { DEFAULT: '#F1F5F9', dim: '#93A2BC', mute: '#5C6B87' },
        brand: { DEFAULT: '#10B981', bright: '#34D399', ink: '#04231A' },
        info: '#38BDF8',
        warn: '#F5B841',
        danger: { DEFAULT: '#F2415A', bright: '#FB7185' },
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,.4), 0 8px 24px -12px rgba(0,0,0,.5)',
        pop: '0 8px 40px -8px rgba(0,0,0,.6)',
        'glow-brand': '0 0 0 1px rgba(52,211,153,.35), 0 8px 30px -10px rgba(16,185,129,.45)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in .15s ease-out both',
        'scale-in': 'scale-in .16s cubic-bezier(.2,.8,.2,1) both',
        'slide-up': 'slide-up .18s cubic-bezier(.2,.8,.2,1) both',
      },
    },
  },
  plugins: [],
}
