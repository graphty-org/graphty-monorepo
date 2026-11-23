/**
 * @file The Draco decoder, served from this package's own files.
 *
 * Babylon.js fetches its Draco decoder from cdn.babylonjs.com by default. Imported here, its
 * default configuration points at Google's glTF build of the decoder instead (Apache-2.0, copied
 * at build time from the copy three.js publishes into `dist/wasm/`), and the glTF loader's
 * `KHR_draco_mesh_compression` extension is registered. One worker decodes. Imported by
 * ../load/loadModel.ts only for a glTF that uses Draco.
 */

import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_draco_mesh_compression.js";

import { DracoDecoder } from "@babylonjs/core/Meshes/Compression/dracoDecoder.js";

import { decoderFile } from "./config.js";

/** True: this module is the decoder. A build that leaves it out puts one in its place that says false. */
export const available: boolean = true;

DracoDecoder.DefaultConfiguration = {
    wasmUrl: decoderFile("draco_wasm_wrapper.js", new URL("../wasm/draco_wasm_wrapper.js", import.meta.url)),
    wasmBinaryUrl: decoderFile("draco_decoder.wasm", new URL("../wasm/draco_decoder.wasm", import.meta.url)),
    numWorkers: 1,
};

/** How many model loads that use Draco are running. */
let loading = 0;

/** Count a model load that uses Draco as started. */
export function dracoLoadStarted(): void {
    loading++;
}

/**
 * Count a model load that uses Draco as finished. When the decoder itself failed to load, drop it so
 * the next model starts a fresh worker -- but only once no other load is using it: disposing the
 * shared decoder terminates its worker without settling the decodes still waiting on it.
 * @param decoderFailed - Whether this load failed because the decoder could not be loaded.
 */
export function dracoLoadEnded(decoderFailed: boolean): void {
    loading--;
    if (decoderFailed && loading === 0) {
        DracoDecoder.ResetDefault();
    }
}
