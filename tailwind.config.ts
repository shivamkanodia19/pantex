import type { Config } from "tailwindcss";

// AlphaForge structure + Pantex light tokens (navy avoided; blue is accent).
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F1F2F2",
        surface: "#FFFFFF",
        border: {
          DEFAULT: "#D8DADB",
          subtle: "#E8E9EA",
        },
        ink: {
          DEFAULT: "#33383D",
          muted: "#8A8D8F",
          faint: "#A8ABAD",
        },
        accent: {
          DEFAULT: "#1597D4",
          muted: "#E6F5FB",
        },
        doe: {
          DEFAULT: "#D9232E",
          muted: "#FDE8E9",
          soft: "#F9C5C8",
        },
        accepted: {
          DEFAULT: "#0F7A4A",
          muted: "#E3F5EC",
        },
      },
      fontFamily: {
        sans: ["var(--font-grotesk)", "Helvetica Neue", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        card: "6px",
      },
    },
  },
  plugins: [],
};

export default config;
