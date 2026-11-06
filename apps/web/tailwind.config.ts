import type { Config } from "tailwindcss";
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in-up": "fadeInUp 0.5s ease-out both",
        "slide-in-right": "slideInRight 0.4s ease-out both",
        "scale-in": "scaleIn 0.3s ease-out both",
      },
      colors: {
        primary: {
          50: "#f4f7f2",
          100: "#e8efe4",
          200: "#d5e2d1",
          300: "#315d42",
          400: "#36734e",
          500: "#3f8156",
          600: "#204f36",
          700: "#173e2a",
          800: "#143323",
          900: "#10291d",
        },
        slate: {
          50: "#f6f7f4",
          100: "#edf1eb",
          200: "#e3e8e1",
          300: "#cbd4cc",
          400: "#667269",
          500: "#54635a",
          600: "#46564d",
          700: "#35463d",
          800: "#22372b",
          900: "#14251d",
        },
        clinical: {
          bg: "#fcfcfa",
          card: "#ffffff",
          border: "#e3e7df",
          muted: "#526058",
          success: "#10b981",
          warning: "#f59e0b",
          danger: "#ef4444",
          critical: "#dc2626",
          "danger-action": "#b42338",
          "danger-action-hover": "#9c1f31",
        },
      },
    },
  },
  plugins: [],
};

export default config;
