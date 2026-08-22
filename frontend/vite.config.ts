import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/ondevaipassar/",
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
  server: {
    fs: {
      allow: [".."],
    },
  },
});
