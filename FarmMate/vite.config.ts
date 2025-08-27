import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@app": path.resolve(import.meta.dirname, "client", "src", "app"),
      "@pages": path.resolve(import.meta.dirname, "client", "src", "pages"),
      "@widgets": path.resolve(import.meta.dirname, "client", "src", "widgets"),
      "@features": path.resolve(import.meta.dirname, "client", "src", "features"),
      "@entities": path.resolve(import.meta.dirname, "client", "src", "entities"),
      "@shared": path.resolve(import.meta.dirname, "client", "src", "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
