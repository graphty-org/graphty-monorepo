import {sentryVitePlugin} from "@sentry/vite-plugin";
import react from "@vitejs/plugin-react";
import {readFileSync} from "fs";
import {resolve} from "path";
import {defineConfig, loadEnv, UserConfig} from "vite";

// https://vitejs.dev/config/
export default defineConfig(({mode}) => {
    // Load env file based on `mode` in the current working directory.
    // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
    const env = loadEnv(mode, process.cwd(), "");
    const plugins = [
        react(),
        // Only include Sentry plugin in CI when auth token is available
        process.env.SENTRY_AUTH_TOKEN && sentryVitePlugin({
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
        },
        build: {
            outDir: "dist",
            sourcemap: true,
        },
        optimizeDeps: {
            include: ["@babylonjs/core/Meshes/instancedMesh", "@graphty/graphty-element"],
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
