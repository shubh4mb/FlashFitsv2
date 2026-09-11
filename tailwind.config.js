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
        brand: "#2fdbf7",
        "brand-light": "#5EE9F4",
        "brand-dark": "#0891B2",
        "brand-soft": "#EBFDFF",
        "matte-black": "#121212",
        "off-white": "#F8F9FA",
        primary: "#2ED3E6",
        secondary: "#5EE9F4",
        accent: "#2ED3E6",
        background: "#F8F9FA",
        surface: "#FFFFFF",
        // Gender specific colors (can be used as utilities)
        men: "#121212",
        women: "#DB2777",
        kids: "#F59E0B",
      }
    },
  },
  plugins: [],
}
