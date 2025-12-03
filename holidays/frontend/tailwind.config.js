/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mint: {
          50: '#f0fdf9',
          100: '#e6f7f4',
          200: '#ccefea',
          300: '#99dfda',
          400: '#5cc8c3',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        }
      },
      backgroundImage: {
        'sidebar-gradient': 'linear-gradient(180deg, #e6f7f4 0%, #f0fdf9 100%)',
        'main-gradient': 'linear-gradient(180deg, #ffffff 0%, #f0fdf9 100%)',
      }
    },
  },
  plugins: [],
}
