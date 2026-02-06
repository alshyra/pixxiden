import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./tests/helpers/setup.ts"],
    include: ["src/**/*.{test,spec}.{js,ts,vue}", "tests/**/*.{test,spec}.{js,ts}"],
    coverage: {
      reporter: ["text", "json", "html"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
