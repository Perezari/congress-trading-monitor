import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// GitHub Pages serves this fork from /congress-trading-monitor/. The production
// build needs that as its base so built asset URLs resolve under the subpath;
// dev stays at "/" so `bun run dev` keeps serving from http://localhost:5183/.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/congress-trading-monitor/" : "/",
  plugins: [react()],
  server: { port: 5183 },
}));
