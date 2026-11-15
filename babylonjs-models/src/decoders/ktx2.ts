/**
 * @file KTX2 / Basis Universal textures (`KHR_texture_basisu`), decoded by the `@babylonjs/ktx2decoder`
 * dependency with transcoders served from this package's own files.
 *
 * Babylon.js fetches its KTX2 decoder and every transcoder from cdn.babylonjs.com by default.
 * Here the decoder's JavaScript is the installed dependency, and its transcoders are the files in
 * its `wasm/` folder (Apache-2.0), copied at build time into `dist/wasm/`. Decoding runs on the
 * page's thread. Importing this module registers the glTF loader's `KHR_texture_basisu`
 * extension. Imported by ../load/loadModel.ts only for a glTF that uses KTX2.
 */

import "@babylonjs/core/Materials/Textures/Loaders/ktxTextureLoader.js";
import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_texture_basisu.js";

import { KhronosTextureContainer2 } from "@babylonjs/core/Misc/khronosTextureContainer2.js";
import * as decoder from "@babylonjs/ktx2decoder";

import { decoderFile } from "./config.js";

/** True: this module is the decoder. A build that leaves it out puts one in its place that says false. */
export const available: boolean = true;

const mscJsUrl = decoderFile("msc_basis_transcoder.js", new URL("../wasm/msc_basis_transcoder.js", import.meta.url));
const mscWasmUrl = decoderFile(
    "msc_basis_transcoder.wasm",
    new URL("../wasm/msc_basis_transcoder.wasm", import.meta.url),
);
const astcUrl = decoderFile("uastc_astc.wasm", new URL("../wasm/uastc_astc.wasm", import.meta.url));
const bc7Url = decoderFile("uastc_bc7.wasm", new URL("../wasm/uastc_bc7.wasm", import.meta.url));
const r8Url = decoderFile("uastc_r8_unorm.wasm", new URL("../wasm/uastc_r8_unorm.wasm", import.meta.url));
const rg8Url = decoderFile("uastc_rg8_unorm.wasm", new URL("../wasm/uastc_rg8_unorm.wasm", import.meta.url));
const srgbUrl = decoderFile("uastc_rgba8_srgb_v2.wasm", new URL("../wasm/uastc_rgba8_srgb_v2.wasm", import.meta.url));
const unormUrl = decoderFile(
    "uastc_rgba8_unorm_v2.wasm",
    new URL("../wasm/uastc_rgba8_unorm_v2.wasm", import.meta.url),
);
const zstdUrl = decoderFile("zstddec.wasm", new URL("../wasm/zstddec.wasm", import.meta.url));

/** Each transcoder: its key in Babylon's URL configuration, the class that loads it, and its file. */
const transcoders: readonly (readonly [
    keyof typeof KhronosTextureContainer2.URLConfig,
    { WasmModuleURL: string },
    string,
])[] = [
    ["wasmZSTDDecoder", decoder.ZSTDDecoder, zstdUrl],
    ["wasmUASTCToASTC", decoder.LiteTranscoder_UASTC_ASTC, astcUrl],
    ["wasmUASTCToBC7", decoder.LiteTranscoder_UASTC_BC7, bc7Url],
    ["wasmUASTCToR8_UNORM", decoder.LiteTranscoder_UASTC_R8_UNORM, r8Url],
    ["wasmUASTCToRG8_UNORM", decoder.LiteTranscoder_UASTC_RG8_UNORM, rg8Url],
    ["wasmUASTCToRGBA_SRGB", decoder.LiteTranscoder_UASTC_RGBA_SRGB, srgbUrl],
    ["wasmUASTCToRGBA_UNORM", decoder.LiteTranscoder_UASTC_RGBA_UNORM, unormUrl],
];
const config = { ...KhronosTextureContainer2.URLConfig };
for (const [key, transcoder, url] of transcoders) {
    transcoder.WasmModuleURL = url;
    config[key] = transcoder.WasmModuleURL;
}
decoder.MSCTranscoder.JSModuleURL = mscJsUrl;
decoder.MSCTranscoder.WasmModuleURL = mscWasmUrl;
// Babylon resolves every one of these when it starts, loaded or not, so none may name its CDN.
KhronosTextureContainer2.URLConfig = {
    ...config,
    // Never loaded: the decoder module is the installed dependency, below.
    jsDecoderModule: "data:text/javascript,",
    jsMSCTranscoder: decoder.MSCTranscoder.JSModuleURL,
    wasmMSCTranscoder: decoder.MSCTranscoder.WasmModuleURL,
};
// Babylon's KTX2 container takes the decoder module from this global, and with no workers decodes
// on this thread with the URLs set above.
(globalThis as { KTX2DECODER?: unknown }).KTX2DECODER = decoder;
KhronosTextureContainer2.DefaultNumWorkers = 0;
