/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        obsidian: "#07090E",
        surface: "#0D111A",
        raised: "#121826",
        glass: "rgba(255,255,255,0.08)",
        emerald: { DEFAULT: "#10B981", light: "#34D399" },
        crimson: { DEFAULT: "#EF4444", light: "#F87171" },
        violet: { DEFAULT: "#8B5CF6", light: "#A78BFA", indigo: "#6366F1" },
        amber: { DEFAULT: "#F59E0B", light: "#FBBF24" },
        cyan: { DEFAULT: "#22D3EE", light: "#67E8F9" },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      keyframes: {
        rise: { "0%": { opacity: "0", transform: "translateY(4px)" }, "100%": { opacity: "1", transform: "none" } },
      },
      animation: { rise: "rise 0.25s ease-out both" },
    },
  },
  plugins: [],
};
