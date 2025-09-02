import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@app": path.resolve(__dirname, "client", "src", "app"),
      "@pages": path.resolve(__dirname, "client", "src", "pages"),
      "@widgets": path.resolve(__dirname, "client", "src", "widgets"),
      "@features": path.resolve(__dirname, "client", "src", "features"),
      "@entities": path.resolve(__dirname, "client", "src", "entities"),
      "@shared": path.resolve(__dirname, "client", "src", "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: "client",
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: "localhost",
    port: 5175,
    strictPort: false,
    open: true,
  },
});
