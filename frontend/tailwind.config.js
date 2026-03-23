/** @type {import('tailwindcss').Config} */
export default {
  content: ["./**/*.{html,js,jsx}", "./*.{html,js,jsx}"],
  theme: {
    extend: {
      keyframes: {
        slideIn: {
          "0%": {
            opacity: 0,
            transform: "translateX(-20px)",
          },
          "100%": {
            opacity: 1,
            transform: "translateX(0)",
          },
        },
        slideOut: {
          "0%": {
            opacity: 1,
            transform: "translateX(0)",
          },
          "100%": {
            opacity: 0,
            transform: "translateX(-20px)",
          },
        },
      },
      animation: {
        ["slide-in"]: "slideIn .4s ease-in-out forwards",
        ["slide-out"]: "slideOut .4s ease-in-out forwards",
      },
    },
    plugins: ["tailwind-scrollbar"],
  },
};
