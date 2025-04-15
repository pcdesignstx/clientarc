/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out'
      },
      colors: {
        brand: {
          DEFAULT: '#2563EB', // blue-600
          dark: '#1D4ED8',    // blue-700
          light: '#3B82F6',   // blue-500
        }
      }
    },
  },
  plugins: [],
} 