import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Vercel serves at the domain root, unlike GitHub Pages' project-page
  // subpath — no base needed.
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
  server: {
    fs: {
      allow: [".."],
    },
  },
  // @ondevaipassar/shared is a workspace symlink, but Vite's dep
  // pre-bundler treats it like any other node_modules package: it esbuild-
  // bundles it once into node_modules/.vite/deps and only invalidates that
  // on a package.json/lockfile hash change, not when `tsc` rebuilds
  // shared's dist/*.js. Without this exclude, editing packages/shared with
  // the dev server already running silently serves stale code until
  // node_modules/.vite is cleared and the server restarted (hit this for
  // real this session) — excluding it makes Vite resolve straight from the
  // symlinked dist/ on every request instead.
  optimizeDeps: {
    exclude: ["@ondevaipassar/shared"],
  },
});
