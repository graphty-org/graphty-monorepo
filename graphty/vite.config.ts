import { sentryVitePlugin } from "@sentry/vite-plugin";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";
import { resolve } from "path";
import { defineConfig, loadEnv, UserConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // Load env file from monorepo root (one level up from this package).
    // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
    const monorepoRoot = resolve(__dirname, "..");
    const env = loadEnv(mode, monorepoRoot, "");
    const plugins = [
        react(),
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
        resolve: {
            // An ordered list, not a map: the graphty-element rules must be tried before the
            // bare "@" rule, and the root entry point before the subpath one.
            alias: [
                // graphty-element is read from SOURCE rather than from its published dist, so
                // the dev server hot-reloads element changes without a rebuild. Its exports map
                // names one file per entry point at the package root (index.ts, schema.ts,
                // catalog.ts, extend.ts, format.ts, logging.ts, session.ts, commands.ts, ai.ts,
                // webgpu.ts, react.ts), so a subpath maps to the file of the same name.
                // tsconfig.json
                // carries the same two rules; change them together or the editor and the
                // bundler will disagree about what @graphty/graphty-element/schema means.
                {
                    find: /^@graphty\/graphty-element$/,
                    replacement: resolve(__dirname, "../graphty-element/index.ts"),
                },
                {
                    find: /^@graphty\/graphty-element\/(.+)$/,
                    replacement: resolve(__dirname, "../graphty-element/$1.ts"),
                },
                // @mlc-ai/web-llm is an optional peer of graphty-element, loaded by a dynamic
                // import inside its WebLlmProvider and nowhere else. It is not a dependency of
                // this app, but it IS installed in graphty-element/node_modules, so without
                // this rule the source alias above would pull the whole package into the
                // bundle. The stub throws an install instruction if that path is ever taken.
                {
                    find: "@mlc-ai/web-llm",
                    replacement: resolve(__dirname, "./src/stubs/web-llm-stub.ts"),
                },
                { find: "@", replacement: resolve(__dirname, "./src") },
            ],
        },
        server: {
            host: true,
            port: 9000,
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
        optimizeDeps: {
            // main.tsx imports this module for its side effect, and Babylon.js only registers
            // InstancedMesh when it is loaded. Pre-bundling it keeps that registration in the
            // same optimized chunk as the rest of Babylon.
            include: ["@babylonjs/core/Meshes/instancedMesh"],
        },
    };

    if (env.HOST && config.server) {
        config.server.host = env.HOST;
    }

    if (env.PORT && config.server) {
        config.server.port = parseInt(env.PORT);
    }

    if (env.HTTPS_KEY_PATH && env.HTTPS_CERT_PATH && config.server) {
        config.server.https = {
            key: readFileSync(env.HTTPS_KEY_PATH),
            cert: readFileSync(env.HTTPS_CERT_PATH),
        };
    }

    return config;
});
