import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.{js,ts,jsx,tsx,mdx}",
    "./utils/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        satoshi: ["Satoshi", "sans-serif"],
        sans: ["Satoshi", "sans-serif"],
      },
      colors: {
        background: {
          DEFAULT: "#ffffff",
          muted: "#f4f4f5",
          dark: "#0f0f0f",
          mutedDark: "#1a1a1a",
        },
        text: {
          primary: "#18181b",
          secondary: "#51525c",
          muted: "#9ca3af",
          feature: "#222222",
          darkPrimary: "#ffffff",
          darkSecondary: "#d4d4d8",
          darkMuted: "#a1a1aa",
          darkFeature: "#e4e4e7",
        },
        primary: {
          DEFAULT: "#2563eb",
          dark: "#0063f7",
          hover: "#1d4ed8",
          darkHover: "#0056b3",
        },
        accent: "#b2ccff",
        border: {
          DEFAULT: "#ccc",
          dark: "#666",
        },
      },
      fontSize: {
        base: ["1rem", { lineHeight: "1.6" }],
        xl: ["1.25rem", { lineHeight: "1.6" }],
        "2xl": ["1.5rem", { lineHeight: "1.5" }],
        "3xl": ["2.25rem", { lineHeight: "1.25" }],
        "4xl": ["3rem", { lineHeight: "1.25" }],
        "5xl": ["3.75rem", { lineHeight: "1.25" }],
      },
      lineHeight: {
        tight: "1.25",
      },
      spacing: {
        lg: "1.5rem",
        "18": "4.5rem",
        "88": "22rem",
      },
      backgroundSize: {
        desktop: "100% min(150vw, 150vh)",
        tablet: "100% min(170vw, 170vh)",
        mobile: "100% min(220vw, 220vh)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.6s ease-out",
        "bounce-gentle": "bounceGentle 2s infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        bounceGentle: {
          "0%, 20%, 50%, 80%, 100%": { transform: "translateY(0)" },
          "40%": { transform: "translateY(-10px)" },
          "60%": { transform: "translateY(-5px)" },
        },
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      boxShadow: {
        soft: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        medium:
          "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        large:
          "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
        "card-hover":
          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      },
      backdropBlur: {
        xs: "2px",
      },
      backgroundImage: {
        "hero-gradient":
          "radial-gradient(circle farthest-side at 50% -20%, #000000 57%, #004fdb 76%, #64afff 86%, #ffffff 100%)",
      },
    },
  },
  plugins: [],
  darkMode: "class",
};

export default config;
