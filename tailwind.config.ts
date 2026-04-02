import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#f5f5f5",
        foreground: "#1a1a1a",
        surface: {
          base: "#f5f5f5",
          raised: "#ffffff",
          hover: "#f0f0f0",
          active: "#ffffff",
          overlay: "#e5e5e5",
          setup: "#ebe8e3",
        },
        border: {
          subtle: "#e5e5e5",
          DEFAULT: "#e5e5e5",
        },
        accent: {
          DEFAULT: "#a0644e",
          muted: "rgba(160, 100, 78, 0.12)",
          hover: "#8b5742",
        },
        text: {
          primary: "#1a1a1a",
          secondary: "#737373",
          muted: "#a6a6a6",
          faint: "#d9d9d9",
        },
        status: {
          success: "#1a8917",
          error: "#d32f2f",
          warning: "#f57c00",
        },
      },
      fontFamily: {
        serif: ["Fraunces", "serif"],
        sans: ["IBM Plex Sans", "sans-serif"],
      },
      fontSize: {
        h1: ["48px", { lineHeight: "1.2", fontWeight: "800" }],
        h2: ["20px", { lineHeight: "1.3", fontWeight: "700" }],
        h3: ["16px", { lineHeight: "1.4", fontWeight: "700" }],
        body: ["14px", { lineHeight: "1.6", fontWeight: "400" }],
        label: ["12px", { lineHeight: "1.5", fontWeight: "200" }],
      },
      spacing: {
        "gap-large": "60px",
        "gap-medium": "40px",
        "gap-small": "20px",
      },
    },
  },
  plugins: [],
};

export default config;
