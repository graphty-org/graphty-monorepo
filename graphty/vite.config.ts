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
            alias: {
                "@": resolve(__dirname, "./src"),
                // Resolve to source files for proper tree-shaking and to avoid bundling
                // the entire Babylon.js library (graphty-element's dist externalizes it)
                "@graphty/graphty-element": resolve(__dirname, "../graphty-element/index.ts"),
                // Stub out @mlc-ai/web-llm - it's an optional dependency of graphty-element
                // that throws a helpful error when used without being installed
                "@mlc-ai/web-llm": resolve(__dirname, "./src/stubs/web-llm-stub.ts"),
            },
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
            watch: {
                // Watch graphty-element source for HMR across monorepo packages
                // The alias resolves to source files, so Vite should pick up changes
            },
        },
        build: {
            outDir: "dist",
            sourcemap: true,
            rollupOptions: {
                // Externalize @mlc-ai/web-llm - it's an optional dependency of graphty-element
                // that is dynamically loaded only when WebLLM provider is explicitly requested
                external: ["@mlc-ai/web-llm"],
            },
        },
        optimizeDeps: {
            include: ["@babylonjs/core/Meshes/instancedMesh"],
            // Exclude from pre-bundling:
            // - @graphty/graphty-element: We access exports dynamically (ApiKeyManager, etc.)
            //   and Vite's tree-shaking removes them during pre-bundling
            // - @mlc-ai/web-llm: Optional dependency loaded only when WebLLM is used
            exclude: ["@graphty/graphty-element", "@mlc-ai/web-llm"],
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
