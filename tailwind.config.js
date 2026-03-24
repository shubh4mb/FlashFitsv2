/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./context/**/*.{js,jsx,ts,tsx}",
    "./api/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#1A1A1A",
        secondary: "#64748B",
        accent: "#EF4444",
        background: "#F8FAFC",
        surface: "#FFFFFF",
        // Gender specific colors (can be used as utilities)
        men: "#0F172A",
        women: "#DB2777",
        kids: "#F59E0B",
      }
    },
  },
  plugins: [],
}
