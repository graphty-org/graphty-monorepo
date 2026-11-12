import { createReadStream, existsSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { resolve } from "node:path";

import type { Plugin } from "vite";

/** Where graphty.app publishes graph-samples' datasets, and where this server answers for them. */
export const SAMPLE_DATA_PATH = "/data/graph-samples/v1/";

/** Where graphty.app publishes them. */
const PUBLISHED = `https://graphty.app${SAMPLE_DATA_PATH}`;

/** The datasets graph-samples' build writes: the files graphty.app serves at SAMPLE_DATA_PATH. */
const BUILT = resolve(__dirname, "../graph-samples/dist/data/v1");

/**
 * Serves graph-samples' built datasets at the path graphty.app serves them, on the dev server, in
 * the tests and on `vite preview` (for a build made with VITE_LOCAL_SAMPLE_DATA=true), so a sample
 * opens from this machine instead of the network; the large ones, which only graphty.app's deploy
 * builds, are sent on to graphty.app.
 * @returns The plugin
 */
export function sampleDataPlugin(): Plugin {
    return {
        name: "graphty-sample-data",
        configureServer(server) {
            server.middlewares.use(SAMPLE_DATA_PATH, serveSampleData);
        },
        configurePreviewServer(server) {
            server.middlewares.use(SAMPLE_DATA_PATH, serveSampleData);
        },
    };
}

/**
 * Answers one request under SAMPLE_DATA_PATH from graph-samples' build, or passes it on.
 * @param request - The request, its URL relative to SAMPLE_DATA_PATH.
 * @param response - The response.
 * @param next - Passes a request that is not for a dataset or its picture on.
 */
function serveSampleData(request: IncomingMessage, response: ServerResponse, next: () => void): void {
    const name = (request.url ?? "").split("?")[0].replace(/^\//, "");
    const file = resolve(BUILT, name);
    if (!/^[a-z0-9-]+\.(gsnp\.gz|webp)$/.test(name)) {
        next();
        return;
    }
    // The large datasets are built only for graphty.app, so they come from there.
    if (!existsSync(file)) {
        response.statusCode = 302;
        response.setHeader("Location", `${PUBLISHED}${name}`);
        response.end();
        return;
    }
    // The bytes as stored: graph-samples unzips them itself. A dataset's picture is a WebP.
    response.setHeader("Content-Type", name.endsWith(".webp") ? "image/webp" : "application/octet-stream");
    createReadStream(file).pipe(response);
}
