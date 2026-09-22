import type { Config } from "tailwindcss";

/**
 * Apple-style monochrome glass theme.
 * Semantic tokens map old names so every existing page restyles automatically.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#000000", // page background — pure black
        panel: "#0d0d0f", // solid fallback surface
        line: "rgba(255,255,255,0.12)", // hairline borders
        mist: "#8e8e93", // Apple system gray — secondary text
        mint: "#0a84ff", // Apple system blue — accent (links, active states)
        mintdim: "#0066cc",
        gold: "#ffffff", // jackpot highlights render white
      },
      fontFamily: {
        display: [
          "-apple-system", "BlinkMacSystemFont", '"SF Pro Display"',
          '"Inter"', '"Segoe UI"', "system-ui", "sans-serif",
        ],
        body: [
          "-apple-system", "BlinkMacSystemFont", '"SF Pro Text"',
          '"Inter"', '"Segoe UI"', "system-ui", "sans-serif",
        ],
      },
      letterSpacing: {
        tightest: "-0.045em",
      },
      keyframes: {
        floaty: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shine: {
          "0%": { backgroundPosition: "200% center" },
          "100%": { backgroundPosition: "-200% center" },
        },
        pulseSoft: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
      },
      animation: {
        floaty: "floaty 7s ease-in-out infinite",
        fadeUp: "fadeUp .7s cubic-bezier(.22,1,.36,1) both",
        shine: "shine 6s linear infinite",
        pulseSoft: "pulseSoft 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
