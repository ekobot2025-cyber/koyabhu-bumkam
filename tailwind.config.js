/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dikta: {
          green: {
            50: '#f2f9ed',
            100: '#e1f2d6',
            200: '#c5e5b0',
            300: '#a3d485',
            400: '#7ebd58',
            500: '#55a938', // Dikta Primary Leaf Green
            600: '#46902e',
            700: '#377326',
            800: '#2c5b20',
            900: '#18321c', // Deep Forest Green Text
            950: '#0e1f11'
          },
          mint: '#edf6d7',
          mintLight: '#f1f9f5',
          forest: '#18321c',
          sky: '#35a4f7',
          skyLight: '#e7f6ff',
          gold: '#ffc220',
          goldLight: '#fff8db'
        },
        brand: {
          navy: {
            950: '#070f1e',
            900: '#0b192c',
            800: '#142742',
            700: '#1e385c',
            600: '#2b4d7c'
          },
          green: {
            50: '#ecfdf5',
            100: '#d1fae5',
            200: '#a7f3d0',
            300: '#6ee7b7',
            400: '#34d399',
            500: '#10b981',
            600: '#059669',
            700: '#047857',
            800: '#065f46',
            900: '#064e3b'
          }
        }
      }
    },
  },
  plugins: [],
}
