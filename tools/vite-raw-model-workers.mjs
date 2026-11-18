/**
 * A Vite plugin for vitest's browser mode: serve babylonjs-models' OpenUSD importer (its module
 * worker and the glue the worker imports, in babylonjs-models/dist/wasm/) as the files they are.
 *
 * Vitest's browser runner rewrites every module it serves so that a dynamic `import()` goes
 * through `__vitest_browser_runner__`, which exists on the page but not inside a worker: the
 * worker's `import()` of the glue then threw and every USD model failed to load in a test (a plain
 * Vite dev server and a production build serve the files unchanged). Served from disk before Vite's
 * own middleware, the worker runs as published.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WASM = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../babylonjs-models/dist/wasm");

/**
 * The plugin.
 * @returns {import("vite").Plugin} The plugin.
 */
export function rawModelWorkers() {
    return {
        name: "graphty-raw-model-workers",
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const match = /\/babylonjs-models\/dist\/wasm\/(babylon-usd-importer(?:\.worker)?\.js)(?:\?|$)/.exec(
                    req.url ?? "",
                );
                if (match === null) {
                    next();
                    return;
                }

                res.setHeader("Content-Type", "text/javascript");
                res.end(readFileSync(path.join(WASM, match[1])));
            });
        },
    };
}
