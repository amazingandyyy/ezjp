/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
      },
      keyframes: {
        'fade-in-out': {
          '0%': { opacity: '0', transform: 'translate(-50%, -20px)' },
          '10%': { opacity: '1', transform: 'translate(-50%, 0)' },
          '90%': { opacity: '1', transform: 'translate(-50%, 0)' },
          '100%': { opacity: '0', transform: 'translate(-50%, -20px)' },
        },
        bounceIn: {
          '0%': { 
            opacity: '0',
            transform: 'scale(0.3) rotate(2deg)'
          },
          '30%': {
            opacity: '0.7',
            transform: 'scale(1.1) rotate(2deg)'
          },
          '50%': {
            opacity: '0.9',
            transform: 'scale(0.89) rotate(2deg)'
          },
          '70%': {
            opacity: '1',
            transform: 'scale(1.05) rotate(2deg)'
          },
          '85%': {
            transform: 'scale(0.95) rotate(2deg)'
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1) rotate(2deg)'
          }
        },
        rubberBand: {
          '0%': {
            transform: 'scale(1)'
          },
          '20%': {
            transform: 'scale(1.25)'
          },
          '30%': {
            transform: 'scale(0.95)'
          },
          '40%': {
            transform: 'scale(1.15)'
          },
          '50%': {
            transform: 'scale(0.95)'
          },
          '65%': {
            transform: 'scale(1.05)'
          },
          '75%': {
            transform: 'scale(0.95)'
          },
          '100%': {
            transform: 'scale(1)'
          }
        },
        fadeInUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(30px)'
          },
          '50%': {
            opacity: '0.5',
            transform: 'translateY(15px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          }
        }
      },
      animation: {
        'fade-in-out': 'fade-in-out 3s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'bounceIn': 'bounceIn 3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'rubberBand': 'rubberBand 3s ease-in-out',
        'fadeInUp': 'fadeInUp 2s ease-out forwards'
      },
    },
  },
  plugins: [],
};
