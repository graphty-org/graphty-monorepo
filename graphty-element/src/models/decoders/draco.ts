/**
 * @file The Draco decoder, served from graphty-element's own package files.
 *
 * Babylon.js fetches its Draco decoder from cdn.babylonjs.com by default. Imported here, its
 * default configuration points at the copies in ./vendor/draco instead (Google's glTF build,
 * Apache-2.0), which the library build writes beside this chunk, and the glTF loader's
 * `KHR_draco_mesh_compression` extension is registered. One worker decodes. Loaded by
 * src/models/loadModel.ts only for a model whose summary says it uses Draco.
 */

import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_draco_mesh_compression.js";

import { DracoDecoder } from "@babylonjs/core/Meshes/Compression/dracoDecoder.js";

import wasmBinaryUrl from "./vendor/draco/draco_decoder_gltf.wasm?url&no-inline";
import wasmUrl from "./vendor/draco/draco_wasm_wrapper_gltf.js?url&no-inline";

DracoDecoder.DefaultConfiguration = { wasmUrl, wasmBinaryUrl, numWorkers: 1 };

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
