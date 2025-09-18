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
      name: "rename-html-files",
      closeBundle() {
        const distDir = resolve(__dirname, "dist");

        // 1️⃣ index.html → enter.html
        try {
          const oldIndex = resolve(distDir, "index.html");
          const newEnter = resolve(distDir, "enter.html");
          renameSync(oldIndex, newEnter);
          console.log("✅ index.html umbenannt zu enter.html");
        } catch (err) {
          console.warn("⚠️ Konnte index.html nicht umbenennen:", err.message);
        }

        // 2️⃣ index_start.html → index.html
        try {
          const oldStart = resolve(distDir, "index_start.html");
          const newIndex = resolve(distDir, "index.html");
          renameSync(oldStart, newIndex);
          console.log("✅ index_start.html umbenannt zu index.html");
        } catch (err) {
          console.warn(
            "⚠️ Konnte index_start.html nicht umbenennen:",
            err.message
          );
        }
      },
    },
  ],
});
