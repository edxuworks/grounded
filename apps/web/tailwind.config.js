/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // Custom colour palette — light architectural theme matching marketing site.
      // Using semantic names (land-*) rather than raw colours means we can
      // adjust the palette in one place without touching components.
      colors: {
        // Page/app backgrounds
        "land-bg": "#F7F7F4",        // Warm off-white (matches marketing site)
        "land-panel": "#FFFFFF",     // Floating panel backgrounds
        "land-surface": "#F0F2EF",   // Card/input surfaces within panels

        // Text
        "land-text": "#111315",      // Primary text
        "land-muted": "#8C9691",     // Secondary/placeholder text

        // Accent
        "land-accent": "#5F8D76",    // Primary interactive colour (sage green)
        "land-accent-hover": "#4F7E68",

        // Status colours (deal pipeline stages)
        "status-sourcing": "#6366f1",
        "status-underwriting": "#f59e0b",
        "status-legals": "#8b5cf6",
        "status-planning": "#3b82f6",
        "status-approved": "#10b981",
        "status-rejected": "#ef4444",

        // Annotation category colours
        "ann-access": "#22d3ee",
        "ann-green-space": "#4ade80",
        "ann-competitor": "#f97316",
        "ann-demand-generator": "#a78bfa",
        "ann-hazard": "#fbbf24",
        "ann-risk-zone": "#f87171",
        "ann-new-project": "#34d399",
      },
      // Glassmorphism utilities — semi-transparent backgrounds with blur.
      // Used on floating panels overlaid on the map.
      backdropBlur: {
        xs: "2px",
      },
      // Custom animation for panel slide-in transitions.
      keyframes: {
        "slide-in-right": {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "slide-in-left": {
          "0%": { transform: "translateX(-100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "slide-in-up": {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "slide-in-right": "slide-in-right 0.2s ease-out",
        "slide-in-left": "slide-in-left 0.2s ease-out",
        "slide-in-up": "slide-in-up 0.25s ease-out",
        "fade-in": "fade-in 0.15s ease-out",
      },
    },
  },
  plugins: [
    // tailwindcss-animate provides utilities like animate-in, animate-out
    // used by Radix UI components for enter/exit animations.
    require("tailwindcss-animate"),
  ],
};
