import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin, UserConfig } from "vite";

import { aliases, elementSourcePlugins } from "./vite.aliases";
import { buildStampPlugin } from "./vite.build-stamp";
import { sampleDataPlugin } from "./vite.sample-data";

/**
 * Serves the dev server's unversioned pre-bundled chunks with `no-cache` instead of Vite's
 * `immutable`.
 *
 * Vite marks every file under `node_modules/.vite/deps/` immutable, including the chunks Babylon.js
 * imports lazily (its shaders), which are fetched without a `?v=` version. Their bodies import
 * other chunks WITH the current version, so after the dependencies are optimized again (a restart
 * with a changed lockfile or config, another branch) a browser that cached one runs the old body,
 * asks for a chunk at the old version, gets Vite's 504 "Outdated Optimize Dep", and the import
 * fails ("Importing a module script failed." in Safari). Versioned URLs stay immutable.
 * @returns The dev-server plugin.
 */
function unversionedDepsNotImmutable(): Plugin {
    return {
        name: "graphty:unversioned-deps-not-immutable",
        apply: "serve",
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const url = req.url ?? "";
                if (url.includes("/.vite/deps/") && !/[?&]v=/.test(url)) {
                    const setHeader = res.setHeader.bind(res);
                    res.setHeader = (name, value) =>
                        setHeader(name, name.toLowerCase() === "cache-control" ? "no-cache" : value);
                }
                next();
            });
        },
    };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // Load env file from monorepo root (one level up from this package).
    // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
    const monorepoRoot = resolve(__dirname, "..");
    const env = loadEnv(mode, monorepoRoot, "");
    const plugins = [
        react(),
        ...elementSourcePlugins,
        unversionedDepsNotImmutable(),
        // The commit and release tag in a <meta name="graphty-build">, read by Help > About.
        buildStampPlugin(),
        // graph-samples' datasets at graphty.app's path, from this machine (dev server only).
        sampleDataPlugin(),
    ];

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
            // The release Sentry files this build's events under (the SDK reads __SENTRY_RELEASE__).
            // CI sets it to the commit and uploads the source maps under the same name after the
            // build (.github/workflows/ci.yml, "Upload graphty's source maps to Sentry").
            ...(process.env.SENTRY_RELEASE ? { __SENTRY_RELEASE__: JSON.stringify(process.env.SENTRY_RELEASE) } : {}),
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
