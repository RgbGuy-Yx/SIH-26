/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        railway: {
          dark: '#0f172a',
          primary: '#1e3a8a',
          accent: '#0284c7',
          success: '#16a34a',
          warning: '#eab308',
          danger: '#dc2626',
        }
      }
    },
  },
  plugins: [],
}
