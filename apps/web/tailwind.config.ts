import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

// Existing utilities use low shades for fills and high shades for text.
function darkStatus(scale: Record<keyof typeof colors.red, string>) {
  return {
    50: scale[950],
    100: scale[900],
    200: scale[800],
    300: scale[700],
    600: scale[400],
    700: scale[300],
    800: scale[200],
    900: scale[100],
  };
}

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
          50: "#14241e",
          100: "#1a3329",
          200: "#28513f",
          300: "#80dfb2",
          400: "#67cea1",
          500: "#52b88b",
          600: "#196647",
          700: "#1d7250",
          800: "#15583d",
          900: "#103f31",
        },
        slate: {
          50: "#171819",
          100: "#242527",
          200: "#303234",
          300: "#424548",
          400: "#91969b",
          500: "#a2a7ab",
          600: "#b1b6ba",
          700: "#ced1d3",
          800: "#e1e3e5",
          900: "#f4f5f5",
        },
        red: darkStatus(colors.red),
        rose: darkStatus(colors.rose),
        orange: darkStatus(colors.orange),
        amber: darkStatus(colors.amber),
        lime: darkStatus(colors.lime),
        emerald: darkStatus(colors.emerald),
        teal: darkStatus(colors.teal),
        cyan: darkStatus(colors.cyan),
        blue: darkStatus(colors.blue),
        indigo: darkStatus(colors.indigo),
        violet: darkStatus(colors.violet),
        purple: darkStatus(colors.purple),
        fuchsia: darkStatus(colors.fuchsia),
        pink: darkStatus(colors.pink),
        clinical: {
          bg: "#0b0c0e",
          card: "#151618",
          border: "#282b2f",
          muted: "#a2a7ab",
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
