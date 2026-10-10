import { readFileSync } from "node:fs";

import { remoteLoggerPlugin } from "@graphty/remote-logger/vite";
import { defineConfig, type ProxyOptions } from "vite";

// Served over HTTPS with servherd's certificate, because WebXR needs a secure context and the
// headsets reach this machine over the LAN (design/xr/sandbox/design.md, section 2.3).
const https =
    process.env.HTTPS_CERT_PATH && process.env.HTTPS_KEY_PATH
        ? { cert: readFileSync(process.env.HTTPS_CERT_PATH), key: readFileSync(process.env.HTTPS_KEY_PATH) }
        : undefined;

// The page posts its logs to its own origin; this forwards them to the log server, so the headset
// needs one URL and one certificate.
const proxy: Record<string, ProxyOptions> = {
    "/remote-log": {
        target: process.env.REMOTE_LOG_TARGET ?? "http://127.0.0.1:9080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/remote-log/, ""),
    },
};

const host = process.env.HOST ?? true;

export default defineConfig({
    plugins: [remoteLoggerPlugin()],
    define: { __BUILD_TIME__: JSON.stringify(new Date().toISOString()) },
    // A hot reload ends an immersive session, so the dev server never reloads on its own, and
    // every dependency, including the lazily imported emulator, is optimized up front.
    server: { https, host, proxy, hmr: false },
    preview: { https, host, proxy },
    optimizeDeps: { include: ["iwer", "@babylonjs/core", "@babylonjs/gui"] },
    build: { outDir: "dist", sourcemap: true, chunkSizeWarningLimit: 8000 },
});
