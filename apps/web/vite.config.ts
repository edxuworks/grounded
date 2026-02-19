import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // '@/' maps to 'src/' for clean imports throughout the app.
      // e.g. import { trpc } from '@/api/trpc' instead of '../../../api/trpc'
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    // Proxy /api/trpc to the local API server during development.
    // This avoids CORS issues in development — both app and API appear
    // to be on the same origin (localhost:5173) to the browser.
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    // Target modern browsers — no need to polyfill for IE11.
    target: "es2022",
    // Warn when any chunk exceeds 600KB (before compression).
    // Mapbox GL and deck.gl are large — we want to know if they grow.
    chunkSizeWarningLimit: 600,
  },
});
