/**
 * @file The OpenUSD importer (`.usd`, `.usda`, `.usdc`, `.usdz`), served from this package's own files.
 *
 * Babylon.js's USD loader runs OpenUSD compiled to WebAssembly in a module worker, and by default
 * fetches the worker, its glue JavaScript, the WebAssembly and OpenUSD's resource bundle from
 * cdn.babylonjs.com. Here those four files are the ones Babylon.js publishes for its loader
 * (protocol 5, built from BabylonJS/babylon-usd-importer; OpenUSD is under the Tomorrow Open
 * Source Technology License 1.0, oneTBB under Apache-2.0, zlib under its own license), copied at
 * build time into `dist/wasm/` (about 10 MB, 2.5 MB compressed). Imported by ../load/loadModel.ts
 * only for a USD model, so a page that never loads one never downloads them.
 */

import { decoderFile } from "./config.js";

/** True: this module is the importer. A build that leaves it out puts one in its place that says false. */
export const available: boolean = true;

/** Where the USD loader finds its worker and the files the worker loads. */
export interface UsdImporterUrls {
    readonly workerUrl: string;
    readonly glueUrl: string;
    readonly wasmUrl: string;
    readonly dataUrl: string;
}

/**
 * The importer's file locations, read when a USD model loads (so `configureDecoders` may move them).
 * @returns The four URLs.
 */
export function usdImporterUrls(): UsdImporterUrls {
    return {
        workerUrl: decoderFile(
            "babylon-usd-importer.worker.js",
            new URL("../wasm/babylon-usd-importer.worker.js", import.meta.url),
        ),
        glueUrl: decoderFile("babylon-usd-importer.js", new URL("../wasm/babylon-usd-importer.js", import.meta.url)),
        wasmUrl: decoderFile(
            "babylon-usd-importer.wasm",
            new URL("../wasm/babylon-usd-importer.wasm", import.meta.url),
        ),
        dataUrl: decoderFile(
            "babylon-usd-importer.data",
            new URL("../wasm/babylon-usd-importer.data", import.meta.url),
        ),
    };
}
