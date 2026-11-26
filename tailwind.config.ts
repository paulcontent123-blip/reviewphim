import type { Config } from "tailwindcss";

// Màu lấy từ Design Tokens (tech spec mục 8) và bản demo; giá trị nằm ở globals.css.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        bg2: "var(--bg2)",
        bg3: "var(--bg3)",
        bg4: "var(--bg4)",
        line: "var(--border)",
        fg: "var(--fg)",
        fg2: "var(--fg2)",
        fg3: "var(--fg3)",
        gold: "var(--gold)",
        goldtext: "var(--gold-text)",
        crimson: "var(--crimson)",
        green: "var(--green)",
        blue: "var(--blue)",
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      maxWidth: { page: "1280px" },
    },
  },
  plugins: [],
};

export default config;
