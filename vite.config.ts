import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    dts({ rollupTypes: true, tsconfigPath: "./tsconfig.app.json" }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "lib/parser.ts"),
      name: "Parsnip",
      formats: ["es", "umd"],
      fileName: (format) => `parsnip.${format}.js`,
    },
    rollupOptions: {
      external: [], // Define your external dependencies
      output: {
        globals: {}, // Define globals for UMD if needed
      },
    },
  },
});
