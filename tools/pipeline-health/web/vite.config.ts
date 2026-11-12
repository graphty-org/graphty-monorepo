import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

import { DEV_API_PATH, LIVE_API } from "./src/contract";

/**
 * The pipeline health page. Build: `pnpm exec vite build --config tools/pipeline-health/web/vite.config.ts`
 * (VITE_HEALTH_API_URL sets the API base, default the live API; `?fixtures` reads the fixtures in dev, or in a build made with VITE_HEALTH_FIXTURES=1). Dev and preview take
 * their port from PORT, which servherd sets. The dev server proxies DEV_API_PATH to the API, so the page it
 * serves reads the API from its own origin and no CORS rule has to list the dev host.
 */
export default defineConfig(({ command, isPreview }) => {
    const serving = command === "serve" || isPreview;
    if (serving && !process.env.PORT) {
        throw new Error("PORT is not set: start it through servherd, which sets PORT");
    }
    const target = (process.env.VITE_HEALTH_API_URL || LIVE_API).replace(/\/$/, "");
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
        server: {
            ...server,
            proxy: {
                [DEV_API_PATH]: {
                    target,
                    changeOrigin: true,
                    rewrite: (path: string) => path.slice(DEV_API_PATH.length),
                },
            },
        },
        preview: server,
    };
});
