import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAFAF7",
        "paper-2": "#F0EFEA",
        ink: "#0E1C2B",
        slate: "#5C6E7E",
        "slate-light": "#8B98A2",
        navy: "#0F2740",
        "navy-deep": "#081726",
        "navy-line": "#1D3E5C",
        gold: "#C9A227",
        "gold-light": "#E6CE8F",
        "gold-deep": "#8A6D1C",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        text: ["var(--font-text)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      fontSize: {
        h1: ["clamp(46px, 6vw, 84px)", { lineHeight: "0.98", letterSpacing: "-0.03em" }],
        h2: ["clamp(32px, 3.6vw, 46px)", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
        h3: ["22px", { lineHeight: "1.3", letterSpacing: "-0.01em" }],
        body: ["17px", { lineHeight: "1.65" }],
        small: ["15px", { lineHeight: "1.5" }],
        caption: ["13.5px", { lineHeight: "1.4" }],
      },
      maxWidth: {
        measure: "72ch",
      },
      transitionTimingFunction: {
        house: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      borderColor: {
        DEFAULT: "#1D3E5C",
      },
    },
  },
  plugins: [],
};

export default config;
