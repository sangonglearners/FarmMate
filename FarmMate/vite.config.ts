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
      "@": path.resolve(__dirname, "src"),
      "@app": path.resolve(__dirname, "src", "app"),
      "@pages": path.resolve(__dirname, "src", "pages"),
      "@widgets": path.resolve(__dirname, "src", "widgets"),
      "@features": path.resolve(__dirname, "src", "features"),
      "@entities": path.resolve(__dirname, "src", "entities"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  // root: "client", // client 폴더 제거로 인해 주석처리
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-select'],
          utils: ['date-fns', 'zod', 'react-hook-form'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    host: "localhost",
    port: 5175,
    strictPort: true,
    open: true,
  },
});
