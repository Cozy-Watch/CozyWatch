import { defineConfig } from "vite";

export default defineConfig(async () => {
  const { viteStaticCopy } = await import("vite-plugin-static-copy");
  const isOfficialBuild = process.env.COZYWATCH_OFFICIAL_BUILD === "true";

  return {
    define: {
      __COZYWATCH_OFFICIAL_BUILD__: JSON.stringify(isOfficialBuild),
    },
    build: {
      outDir: ".vite/build", // Specify your output directory
    },
    plugins: [
      viteStaticCopy({
        targets: [
          {
            src: "public/images",
            dest: "",
            rename: { stripBase: 1 },
          },
        ],
      }),
    ],
  };
});
