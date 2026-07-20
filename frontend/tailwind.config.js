/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#178582', // Turquoise
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#178582',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        secondary: {
          DEFAULT: '#0A1828', // Dark Classic Blue
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0A1828',
        },
        accent: {
          DEFAULT: '#BFA181', // Gold
          50: '#fefdfb',
          100: '#fdf9f0',
          200: '#fbf1d9',
          300: '#f8e6b8',
          400: '#f4d691',
          500: '#BFA181',
          600: '#a68b6b',
          700: '#8b7357',
          800: '#705c46',
          900: '#5a4a39',
        },
        success: {
          DEFAULT: '#BFA181', // Gold for success messages
          50: '#fefdfb',
          100: '#fdf9f0',
          200: '#fbf1d9',
          300: '#f8e6b8',
          400: '#f4d691',
          500: '#BFA181',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

