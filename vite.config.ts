import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
import checker from "vite-plugin-checker";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    checker({
      oxlint: true, // Run oxlint for code quality checks
      typescript: {
        tsconfigPath: "./tsconfig.app.json", // Exclude test files from build checks
      },
      vueTsc: true, // Vue template type checking
    }),
    vue(),
  ],

  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },

  // Vite options tailored for Tauri development
  clearScreen: false,

  server: {
    port: 5173,
    strictPort: true,
    watch: {
      // Tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },

  // Build options
  build: {
    // Tauri uses Chromium on Windows and WebKit on macOS and Linux
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    // Don't minify for debug builds
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    // Produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },

  // Environment variables
  envPrefix: ["VITE_", "TAURI_ENV_"],
});
