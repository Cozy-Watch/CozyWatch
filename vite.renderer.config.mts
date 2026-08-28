import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (
            id.includes("react") ||
            id.includes("react-dom") ||
            id.includes("@radix-ui/themes") ||
            id.includes("@tanstack/react-router")
          ) {
            return "vendor";
          }
        },
      },
    },
  },
});
