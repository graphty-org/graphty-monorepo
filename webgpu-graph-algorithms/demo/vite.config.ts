// The demo's own vite config (root = demo/); run it with `npm run demo` through servherd, which sets PORT. WebGPU is
// a secure-context API, so on anything but localhost the page must be served over HTTPS: as
// graphty-monorepo/graphty-element/vite.config.ts does, the server turns on HTTPS when HTTPS_KEY_PATH and
// HTTPS_CERT_PATH point at a key / certificate pair (servherd passes {{httpsKey}} / {{httpsCert}}) and accepts any
// hostname (vite 6+ blocks non-localhost hosts by default), so a phone or headset can open it. It serves files only
// from this package and the workspace packages the demo imports.
import { existsSync, readFileSync } from "node:fs";

import { defineConfig, type UserConfig } from "vite";

export default defineConfig(() => {
    const port = Number(process.env.PORT);
    if (!Number.isInteger(port) || port <= 0) {
        throw new Error("PORT is not set: start the demo through servherd, which sets PORT");
    }
    const config: UserConfig = {
        server: {
            port,
            strictPort: true,
            host: process.env.HOST ?? "0.0.0.0",
            allowedHosts: true,
            fs: { allow: ["..", "../../graph-format", "../../remote-logger"] },
        },
    };
    const keyPath = process.env.HTTPS_KEY_PATH;
    const certPath = process.env.HTTPS_CERT_PATH;
    if (
        keyPath !== undefined &&
        certPath !== undefined &&
        existsSync(keyPath) &&
        existsSync(certPath) &&
        config.server
    ) {
        config.server.https = { key: readFileSync(keyPath), cert: readFileSync(certPath) };
    }
    return config;
});
