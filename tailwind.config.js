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
        brand: "#00C2E8",
        "brand-light": "#28DCF4",
        "brand-dark": "#0088B8",
        "brand-electric": "#00F5FF",
        "brand-soft": "#E1FAFE",
        "matte-black": "#111418",
        "off-white": "#F8FAFC",
        primary: "#00C2E8",
        secondary: "#28DCF4",
        electric: "#00F5FF",
        accent: "#00C2E8",
        background: "#F8FAFC",
        surface: "#FFFFFF",
        // Gender specific colors (can be used as utilities)
        men: "#111418",
        women: "#DB2777",
        kids: "#F59E0B",
      }
    },
  },
  plugins: [],
}
