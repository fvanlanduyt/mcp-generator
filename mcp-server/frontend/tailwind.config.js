/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary accent (teal/mint)
        accent: {
          50: '#f0fdf9',
          100: '#ccfbef',
          200: '#99f6e0',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        // Sidebar gradient colors
        sidebar: {
          start: '#e6f7f4',
          end: '#f0fdf9',
        },
        // Status colors
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        // Text colors
        text: {
          primary: '#1f2937',
          secondary: '#6b7280',
        },
        // Border color
        border: '#e5e7eb',
        // Code block background
        code: '#1e293b',
      },
      backgroundImage: {
        'gradient-main': 'linear-gradient(180deg, #ffffff 0%, #f0fdf9 100%)',
        'gradient-sidebar': 'linear-gradient(180deg, #e6f7f4 0%, #f0fdf9 100%)',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      },
      borderRadius: {
        'card': '12px',
      },
    },
  },
  plugins: [],
}
