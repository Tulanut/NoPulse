/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Cormorant Garamond"', '"EB Garamond"', 'Lora', 'Georgia', 'serif'],
        display: ['"Cormorant Garamond"', '"EB Garamond"', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        claude: {
          bg: '#191816',
          surface: '#252320',
          surfaceHover: '#2E2B27',
          surfaceActive: '#36332E',
          surfaceDark: '#1E1D1A',
          border: '#383530',
          borderHover: '#4D4740',
          borderSubtle: '#2E2B26',
          text: '#F5F2EB',
          textMuted: '#A8A297',
          textDim: '#706B62',
          terracotta: '#CC6543',
          terracottaLight: '#DE7C5A',
          terracottaDark: '#A84A2C',
          amber: '#E08E45',
          sage: '#789D74',
          rose: '#D45B5B',
          sand: '#EAE5DB',
        }
      }
    },
  },
  plugins: [],
}
