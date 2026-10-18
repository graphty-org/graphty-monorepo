import { createReadStream, existsSync } from "node:fs";
import { resolve } from "node:path";

import type { Plugin } from "vite";

/** Where graphty.app publishes graph-samples' datasets, and where this server answers for them. */
export const SAMPLE_DATA_PATH = "/data/graph-samples/v1/";

/** The datasets graph-samples' build writes: the files graphty.app serves at SAMPLE_DATA_PATH. */
const BUILT = resolve(__dirname, "../graph-samples/dist/data/v1");

/**
 * Serves graph-samples' built datasets at the path graphty.app serves them, on the dev server and
 * in the tests, so a sample opens from this machine instead of the network.
 * @returns The plugin
 */
export function sampleDataPlugin(): Plugin {
    return {
        name: "graphty-sample-data",
        configureServer(server) {
            server.middlewares.use(SAMPLE_DATA_PATH, (request, response, next) => {
                const name = (request.url ?? "").split("?")[0].replace(/^\//, "");
                const file = resolve(BUILT, name);
                if (!/^[a-z0-9-]+\.(gsnp\.gz|webp)$/.test(name) || !existsSync(file)) {
                    next();
                    return;
                }
                // The bytes as stored: graph-samples unzips them itself. A dataset's picture is a WebP.
                response.setHeader("Content-Type", name.endsWith(".webp") ? "image/webp" : "application/octet-stream");
                createReadStream(file).pipe(response);
            });
        },
    };
}
