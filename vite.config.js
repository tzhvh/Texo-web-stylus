import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/texo-web-stylus/", // or '/' for custom domain
  worker: {
    format: "es",
  },
  optimizeDeps: {
    exclude: ["@huggingface/transformers"],
  },
});
