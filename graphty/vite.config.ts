import { sentryVitePlugin } from "@sentry/vite-plugin";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";
import { resolve } from "path";
import { defineConfig, loadEnv, UserConfig } from "vite";

import { aliases } from "./vite.aliases";
import { buildStampPlugin } from "./vite.build-stamp";

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
