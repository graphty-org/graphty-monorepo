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

/** Drop the decoder after a failed decode, so the next model starts a fresh worker. */
export function resetDraco(): void {
    DracoDecoder.ResetDefault();
}
