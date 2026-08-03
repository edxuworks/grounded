import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#F7F7F4',
        surface: '#FFFFFF',
        border: '#E3E6E2',
        accent: {
          DEFAULT: '#5F8D76',
          hover: '#4F7E68',
          soft: 'rgba(95,141,118,0.14)',
        },
        ink: {
          DEFAULT: '#111315',
          secondary: '#5B6460',
          muted: '#8C9691',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        '8xl': '88rem',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [animate],
}

export default config
