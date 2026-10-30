import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#050912",
          900: "#080f1e",
          850: "#0e182e",
          800: "#15223f",
          700: "#1f325c",
        },
        retail: {
          primary: "#1e3a8a",
          accent: "#2563eb",
          success: "#059669",
          warning: "#d97706",
          danger: "#dc2626",
          surface: "#f8fafc",
          card: "#ffffff",
        },
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "Inter", "-apple-system", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        premium: "0 10px 30px -5px rgba(0, 0, 0, 0.05), 0 4px 10px -2px rgba(0, 0, 0, 0.02)",
        glow: "0 0 20px -3px rgba(37, 99, 235, 0.3)",
        card: "0 2px 10px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
