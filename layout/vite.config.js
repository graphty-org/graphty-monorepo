import { readFileSync } from "fs";
import { resolve } from "path";
import { defineConfig, loadEnv } from "vite";
import { layoutRedirectPlugin } from "./vite-plugin-layout-redirect.js";

export default defineConfig(({ mode }) => {
    // Load env from monorepo root (one level up from package directory)
    const monorepoRoot = resolve(import.meta.dirname, "..");
    const env = loadEnv(mode, monorepoRoot, "");

    const server = {
        host: env.HOST || true,
        allowedHosts: true,
        open: "/examples-legacy/",
        fs: {
            // Allow serving files from the dist directory
            allow: [".."],
        },
    };

    if (env.PORT) {
        server.port = parseInt(env.PORT);
    }

    if (env.HTTPS_KEY_PATH && env.HTTPS_CERT_PATH) {
        server.https = {
            key: readFileSync(env.HTTPS_KEY_PATH),
            cert: readFileSync(env.HTTPS_CERT_PATH),
        };
    }

    return {
        plugins: [layoutRedirectPlugin()],
        server,
        build: {
            outDir: "dist",
        },
        publicDir: false,
    };
});
