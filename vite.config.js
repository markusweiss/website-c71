import { defineConfig } from "vite";
import { renameSync } from "fs";
import { resolve } from "path";

export default defineConfig({
  base: "./",
  build: {
    minify: "terser",
  },
  plugins: [
    {
      name: "rename-index",
      closeBundle() {
        const distDir = resolve(__dirname, "dist");
        const oldPath = resolve(distDir, "index.html");
        const newPath = resolve(distDir, "enter.html");
        try {
          renameSync(oldPath, newPath);
          console.log("✅ index.html umbenannt zu enter.html");
        } catch (err) {
          console.warn("⚠️ Konnte index.html nicht umbenennen:", err.message);
        }
      },
    },
  ],
});
