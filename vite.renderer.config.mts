import { defineConfig } from "vite";
import { getContentSecurityPolicy } from "./src/mainProcess/security/contentSecurityPolicy";

export default defineConfig(({ command }) => ({
  plugins: [
    {
      name: "renderer-content-security-policy",
      transformIndexHtml: {
        order: "pre",
        handler() {
          return [
          {
            tag: "meta",
            attrs: {
              "http-equiv": "Content-Security-Policy",
              content: getContentSecurityPolicy(command === "serve"),
            },
            injectTo: "head-prepend",
          },
          ];
        },
      },
    },
  ],
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
}));
