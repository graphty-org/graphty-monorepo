import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { sentryVitePlugin } from "@sentry/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, UserConfig } from "vite";

import { aliases } from "./vite.aliases";
import { buildStampPlugin } from "./vite.build-stamp";
import { sampleDataPlugin } from "./vite.sample-data";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // Load env file from monorepo root (one level up from this package).
    // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
    const monorepoRoot = resolve(__dirname, "..");
    const env = loadEnv(mode, monorepoRoot, "");
    const plugins = [
        react(),
        // The commit and release tag in a <meta name="graphty-build">, read by Help > About.
        buildStampPlugin(),
        // graph-samples' datasets at graphty.app's path, from this machine (dev server only).
        sampleDataPlugin(),
        // Only include Sentry plugin in CI when auth token is available
        process.env.SENTRY_AUTH_TOKEN &&
            sentryVitePlugin({
                org: env.VITE_SENTRY_ORG,
                project: env.VITE_SENTRY_PROJECT,
                authToken: process.env.SENTRY_AUTH_TOKEN,
            }),
    ].filter(Boolean);

    const config: UserConfig = {
        plugins,
        // Set base path for GitHub Pages deployment
        base: env.VITE_BASE_PATH || "/",
        resolve: { alias: aliases },
        // graphty-element is compiled from source here (vite.aliases.ts), so its version, which its
        // own build stamps into every saved project file, is stamped the same way.
        define: {
            __GRAPHTY_ELEMENT_VERSION__: JSON.stringify(
                (
                    JSON.parse(readFileSync(resolve(__dirname, "../graphty-element/package.json"), "utf8")) as {
                        version: string;
                    }
                ).version,
            ),
        },
        server: {
            host: true,
            fs: {
                allow: [
                    // Allow serving files from the project root
                    resolve(__dirname, ".."),
                ],
            },
        },
        build: {
            outDir: "dist",
            sourcemap: true,
            rollupOptions: {
                output: {
                    // Babylon.js in a chunk of its own. In one entry chunk with the app it made an
                    // 11 MB chunk whose 44 MB sourcemap took the build past Node's default heap
                    // (#2563). graphty-element (bundled from source, see vite.aliases.ts) is not
                    // named here: the app loads its renderer with a dynamic import
                    // (src/elementLoader.ts), so Rollup puts it in a chunk of its own, and the
                    // Node-safe entries the start page imports (session types, schema, catalog)
                    // stay with the app instead of pulling Babylon.js into the first load.
                    manualChunks(id) {
                        // Vite's dynamic-import helper in a chunk of its own: left to Rollup it
                        // lands in the Babylon.js chunk, and the first load then fetches all of
                        // Babylon.js to get one small function.
                        if (id.includes("vite/preload-helper")) {
                            return "preload-helper";
                        }
                        if (id.includes("/node_modules/@babylonjs/")) {
                            return "babylon";
                        }
                        return undefined;
                    },
                },
            },
        },
    };

    if (env.HOST && config.server) {
        config.server.host = env.HOST;
    }

    if (env.HTTPS_KEY_PATH && env.HTTPS_CERT_PATH && config.server) {
        config.server.https = {
            key: readFileSync(env.HTTPS_KEY_PATH),
            cert: readFileSync(env.HTTPS_CERT_PATH),
        };
    }

    return config;
});
