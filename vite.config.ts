import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Le site est servi dans un sous-dossier de GitHub Pages : /carnet-recettes/
export default defineConfig({
  base: "/carnet-recettes/",
  plugins: [react()],
  test: { environment: "node" }
});
