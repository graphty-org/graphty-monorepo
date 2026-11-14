/**
 * @file KTX2 / Basis Universal textures (`KHR_texture_basisu`), decoded by the `@babylonjs/ktx2decoder`
 * dependency with transcoders served from graphty-element's own package files.
 *
 * Babylon.js fetches its KTX2 decoder and every transcoder from cdn.babylonjs.com by default.
 * Here the decoder's JavaScript is the installed dependency, and its transcoders are the files in
 * its `wasm/` folder (Apache-2.0; package.json's `#ktx2-transcoders/*` import names it), which the
 * library build writes beside this chunk. Decoding runs on the page's thread. Importing this
 * module registers the glTF loader's `KHR_texture_basisu` extension. Loaded by
 * src/models/loadModel.ts only for a model whose summary says it uses KTX2.
 */

import "@babylonjs/core/Materials/Textures/Loaders/ktxTextureLoader.js";
import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_texture_basisu.js";

import { KhronosTextureContainer2 } from "@babylonjs/core/Misc/khronosTextureContainer2.js";
import * as decoder from "@babylonjs/ktx2decoder";

import mscJsUrl from "#ktx2-transcoders/msc_basis_transcoder.js?url&no-inline";
import mscWasmUrl from "#ktx2-transcoders/msc_basis_transcoder.wasm?url&no-inline";
import astcUrl from "#ktx2-transcoders/uastc_astc.wasm?url&no-inline";
import bc7Url from "#ktx2-transcoders/uastc_bc7.wasm?url&no-inline";
import r8Url from "#ktx2-transcoders/uastc_r8_unorm.wasm?url&no-inline";
import rg8Url from "#ktx2-transcoders/uastc_rg8_unorm.wasm?url&no-inline";
import srgbUrl from "#ktx2-transcoders/uastc_rgba8_srgb_v2.wasm?url&no-inline";
import unormUrl from "#ktx2-transcoders/uastc_rgba8_unorm_v2.wasm?url&no-inline";
import zstdUrl from "#ktx2-transcoders/zstddec.wasm?url&no-inline";

/**
 * An absolute URL, which the transcoders need (they may load from a script tag).
 * @param url - A URL relative to the page, or absolute.
 * @returns The absolute URL.
 */
function absolute(url: string): string {
    return new URL(url, globalThis.document?.baseURI ?? import.meta.url).href;
}

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
    transcoder.WasmModuleURL = absolute(url);
    config[key] = transcoder.WasmModuleURL;
}
decoder.MSCTranscoder.JSModuleURL = absolute(mscJsUrl);
decoder.MSCTranscoder.WasmModuleURL = absolute(mscWasmUrl);
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
