import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        surface: {
          DEFAULT: "#f9f9f9",
          container: "#eeeeee",
          "container-high": "#e8e8e8",
          "container-highest": "#e2e2e2",
          "container-low": "#f3f3f4",
          "container-lowest": "#ffffff",
          dim: "#dadada",
        },
        primary: "#000000",
        "on-primary": "#e2e2e2",
        "on-surface": "#1a1c1c",
        "on-surface-variant": "#474747",
        outline: "#777777",
        "outline-variant": "#c6c6c6",
      },
      borderRadius: {
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
    },
  },
  plugins: [],
};

export default config;
