import type { Config } from "tailwindcss";

/**
 * Same brand palette as @nouveau/marketing, for visual continuity between
 * the public site and the authenticated app — but the type scale here is
 * tighter and the fonts are system fonts, not the marketing site's
 * Space Grotesk/Inter/JetBrains Mono webfonts. Per the brief: "Application
 * UI needs higher density than the marketing site — tighter spacing,
 * smaller type, more information per screen. Do not simply scale the
 * marketing layout down." This is Phase 2 (auth/onboarding forms); the
 * two fixed protected/at-risk colors called for on the dashboard (Phase 6)
 * aren't needed yet and shouldn't be invented ahead of that screen.
 */
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
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      maxWidth: {
        measure: "60ch",
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
