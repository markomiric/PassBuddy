/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class", // Enable class-based dark mode support
  theme: {
    extend: {
      container: {
        center: true,
        padding: "2rem",
      },
      height: {
        "screen-90": "90vh",
      },
      colors: {
        // Custom color palette
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
      },
      animation: {
        "bounce-slow": "bounce 3s infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      transitionProperty: {
        height: "height",
        spacing: "margin, padding",
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "100%",
            pre: {
              color: "inherit",
              backgroundColor: "transparent",
              border: "none",
              borderRadius: "0",
              padding: "0",
              margin: "0",
            },
          },
        },
      },
    },
    screens: {
      xs: "475px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
  },
  plugins: [],
};
