/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./utils/**/*.{js,ts,jsx,tsx}"],
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require("daisyui")],
  darkTheme: "dark",
  darkMode: ["selector", "[data-theme='dark']"],
  // DaisyUI theme colors
  daisyui: {
    themes: [
      {
        light: {
          primary: "#6025C0", // Lighter purple
          "primary-content": "#FFFFFF", // White text on primary
          secondary: "#8B74FA", // Lighter secondary purple
          "secondary-content": "#FFFFFF",
          accent: "#5A7AC0", // Lighter blue-purple
          "accent-content": "#FFFFFF",
          neutral: "#F4F7FE", // Very light blue-white
          "neutral-content": "#1E293B", // Dark text on neutral
          "base-100": "#FFFFFF", // White background
          "base-200": "#F0F3FA", // Light background
          "base-300": "#E4E9F5", // Slightly darker background
          "base-content": "#1E293B", // Dark text on base
          info: "#A02573", // Magenta
          success: "#38D9A9", // Teal
          warning: "#FFBB38", // Amber
          error: "#FF6060", // Red

          "--rounded-btn": "9999rem",

          ".tooltip": {
            "--tooltip-tail": "6px",
          },
          ".link": {
            textUnderlineOffset: "2px",
          },
          ".link:hover": {
            opacity: "80%",
          },
        },
      },
      {
        dark: {
          primary: "#8347E6", // Bright purple
          "primary-content": "#FFFFFF", // White text on primary
          secondary: "#A18EFA", // Light purple
          "secondary-content": "#FFFFFF",
          accent: "#6D8CD1", // Blue-purple
          "accent-content": "#FFFFFF",
          neutral: "#1A1A2E", // Very dark blue-black
          "neutral-content": "#E2E8F0", // Light text on neutral
          "base-100": "#1E1E32", // Dark background
          "base-200": "#2A2A45", // Slightly lighter background
          "base-300": "#383857", // Even lighter background
          "base-content": "#E2E8F0", // Light text on base
          info: "#C050A0", // Brighter magenta
          success: "#4AE3B5", // Brighter teal
          warning: "#FFCF4A", // Brighter amber
          error: "#FF7A7A", // Brighter red

          "--rounded-btn": "9999rem",

          ".tooltip": {
            "--tooltip-tail": "6px",
            "--tooltip-color": "oklch(var(--p))",
          },
          ".link": {
            textUnderlineOffset: "2px",
          },
          ".link:hover": {
            opacity: "80%",
          },
        },
      },
    ],
  },
  theme: {
    extend: {
      boxShadow: {
        center: "0 0 12px -2px rgb(0 0 0 / 0.05)",
      },
      animation: {
        "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "gradient-xy": "gradient-xy 10s ease infinite",
        "fade-in-up": "fade-in-up 0.5s ease-out forwards",
        "spin-slow": "spin 8s linear infinite",
      },
      keyframes: {
        "gradient-xy": {
          "0%, 100%": {
            "background-size": "400% 400%",
            "background-position": "left center",
          },
          "50%": {
            "background-size": "200% 200%",
            "background-position": "right center",
          },
        },
        "fade-in-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(20px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
      },
      backgroundSize: {
        "size-200": "200% 200%",
      },
    },
  },
};
