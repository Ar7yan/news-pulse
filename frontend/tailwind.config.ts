import type { Config } from 'tailwindcss'

const config: Config = {
  // Tell Tailwind where to look for class names
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Custom colors for our news sources
      colors: {
        bbc: {
          DEFAULT: '#BB1919',
          light  : '#FF4444',
          bg     : '#FFF5F5',
        },
        reuters: {
          DEFAULT: '#FF8000',
          light  : '#FFA040',
          bg     : '#FFF8F0',
        },
        npr: {
          DEFAULT: '#2B6CB0',
          light  : '#4299E1',
          bg     : '#EBF8FF',
        },
      },
      // Custom animations
      animation: {
        'fade-in'   : 'fadeIn 0.3s ease-in-out',
        'slide-up'  : 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%'  : { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%'  : { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',     opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config