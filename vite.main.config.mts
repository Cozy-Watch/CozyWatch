import { defineConfig } from "vite";
import { cp, mkdir } from "node:fs/promises";

export default defineConfig(async () => {
  const isOfficialBuild = process.env.COZYWATCH_OFFICIAL_BUILD === "true";
  const isDiagnosticsBuild =
    process.env.COZYWATCH_DIAGNOSTICS_BUILD === "true";

  return {
    define: {
      __COZYWATCH_OFFICIAL_BUILD__: JSON.stringify(isOfficialBuild),
      __COZYWATCH_LICENSE_TEST_MODE__: JSON.stringify(process.env.COZYWATCH_LICENSE_TEST_MODE === "true"),
      __COZYWATCH_LIFETIME_PRODUCT_ID__: JSON.stringify(Number(process.env.COZYWATCH_LIFETIME_PRODUCT_ID) || null),
      __COZYWATCH_DIAGNOSTICS_BUILD__: JSON.stringify(isDiagnosticsBuild),
    },
    build: {
      outDir: ".vite/build", // Specify your output directory
    },
    plugins: [
      {
        name: "copy-existing-app-images",
        async writeBundle() {
          await mkdir(".vite/build", { recursive: true });
          await cp("public/images", ".vite/build/images", { recursive: true });
        },
      },
    ],
  };
});
