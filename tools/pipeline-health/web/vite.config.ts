import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

/**
 * The pipeline health page. Build: `pnpm exec vite build --config tools/pipeline-health/web/vite.config.ts`
 * (VITE_HEALTH_API sets the API base; without it the page reads its fixtures). Dev and preview take
 * their port from PORT, which servherd sets.
 */
export default defineConfig(({ command, isPreview }) => {
    const serving = command === "serve" || isPreview;
    if (serving && !process.env.PORT) throw new Error("PORT is not set: start it through servherd, which sets PORT");
    const server = {
        port: Number(process.env.PORT),
        strictPort: true,
        host: process.env.HOST ?? "localhost",
        allowedHosts: process.env.HOST ? [process.env.HOST] : [],
    };
    return {
        root: fileURLToPath(new URL(".", import.meta.url)),
        base: "./",
        publicDir: false,
        build: { outDir: "dist", emptyOutDir: true, target: "es2022" },
        server,
        preview: server,
    };
});
