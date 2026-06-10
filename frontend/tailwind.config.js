/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'andersen-red':      '#E4002B',
        'andersen-burgundy': '#6B0000',
        'andersen-dark':     '#1C0000',
        'andersen-blue':     '#1B3A6B',
        'wc-gold':           '#FFD700',
      },
      fontFamily: {
        condensed: ["'Barlow Condensed'", 'Impact', 'sans-serif'],
      },
      animation: {
        'spin-slow':   'spin 3s linear infinite',
        'bounce-slow': 'bounce 2s infinite',
        'fade-in':     'fadeIn 0.5s ease-in',
        'slide-up':    'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',     opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
