/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'game-bg': '#0f172a',
        'game-card': '#1e293b',
        'game-hover': '#334155',
        'game-selected': '#3b82f6',
      }
    },
  },
  plugins: [],
}
