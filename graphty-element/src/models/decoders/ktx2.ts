/**
 * @file KTX2 / Basis Universal textures (`KHR_texture_basisu`), decoded by the optional peer
 * `@babylonjs/ktx2decoder` with transcoders served from graphty-element's own package files.
 *
 * Babylon.js fetches its KTX2 decoder and every transcoder from cdn.babylonjs.com by default.
 * Here the decoder's JavaScript is the installed peer, and its transcoders are the copies in
 * ./vendor/ktx2 (Apache-2.0), which the library build writes beside this chunk. Decoding runs on
 * the page's thread. Without the peer, {@link loadKtx2} throws and the model is reported with
 * `E_MODEL_DECODER_UNAVAILABLE { reason: "missing" }`. Loaded by src/models/loadModel.ts only for
 * a model whose summary says it uses KTX2.
 */

import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_texture_basisu.js";
import "@babylonjs/core/Materials/Textures/Loaders/ktxTextureLoader.js";

import { KhronosTextureContainer2 } from "@babylonjs/core/Misc/khronosTextureContainer2.js";

import mscJsUrl from "./vendor/ktx2/msc_basis_transcoder.js?url&no-inline";
import mscWasmUrl from "./vendor/ktx2/msc_basis_transcoder.wasm?url&no-inline";
import astcUrl from "./vendor/ktx2/uastc_astc.wasm?url&no-inline";
import bc7Url from "./vendor/ktx2/uastc_bc7.wasm?url&no-inline";
import r8Url from "./vendor/ktx2/uastc_r8_unorm.wasm?url&no-inline";
import rg8Url from "./vendor/ktx2/uastc_rg8_unorm.wasm?url&no-inline";
import srgbUrl from "./vendor/ktx2/uastc_rgba8_srgb_v2.wasm?url&no-inline";
import unormUrl from "./vendor/ktx2/uastc_rgba8_unorm_v2.wasm?url&no-inline";
import zstdUrl from "./vendor/ktx2/zstddec.wasm?url&no-inline";

/** The parts of the decoder module whose file locations are set here. */
interface Ktx2Module {
    readonly KTX2Decoder?: unknown;
    readonly MSCTranscoder: { JSModuleURL: string; WasmModuleURL: string };
    readonly ZSTDDecoder: { WasmModuleURL: string };
    readonly LiteTranscoder_UASTC_ASTC: { WasmModuleURL: string };
    readonly LiteTranscoder_UASTC_BC7: { WasmModuleURL: string };
    readonly LiteTranscoder_UASTC_R8_UNORM: { WasmModuleURL: string };
    readonly LiteTranscoder_UASTC_RG8_UNORM: { WasmModuleURL: string };
    readonly LiteTranscoder_UASTC_RGBA_SRGB: { WasmModuleURL: string };
    readonly LiteTranscoder_UASTC_RGBA_UNORM: { WasmModuleURL: string };
}

/** The package a page installs to draw KTX2 textures. */
export const KTX2_PACKAGE = "@babylonjs/ktx2decoder";

/** Thrown when the peer is not installed. */
export class Ktx2Missing extends Error {}

let ready: Promise<void> | undefined;

/**
 * An absolute URL, which the transcoders need (they may load from a script tag).
 * @param url - A URL relative to the page, or absolute.
 * @returns The absolute URL.
 */
function absolute(url: string): string {
    return new URL(url, globalThis.document?.baseURI ?? import.meta.url).href;
}

/**
 * Load the peer and point it at the bundled transcoders, once.
 * @returns A promise that settles when KTX2 textures can be decoded.
 * @throws {Ktx2Missing} When `@babylonjs/ktx2decoder` is not installed.
 */
export function loadKtx2(): Promise<void> {
    ready ??= (async () => {
        let module: Ktx2Module | undefined;
        try {
            module = await import("@babylonjs/ktx2decoder");
        } catch {
            module = undefined;
        }

        // Not installed, or not the package this was written for.
        if (typeof module?.KTX2Decoder !== "function") {
            ready = undefined;
            throw new Ktx2Missing(KTX2_PACKAGE);
        }

        const urls = {
            // Never loaded: the decoder module is the installed peer, below.
            jsDecoderModule: "data:text/javascript,",
            jsMSCTranscoder: absolute(mscJsUrl),
            wasmMSCTranscoder: absolute(mscWasmUrl),
            wasmZSTDDecoder: absolute(zstdUrl),
            wasmUASTCToASTC: absolute(astcUrl),
            wasmUASTCToBC7: absolute(bc7Url),
            wasmUASTCToR8_UNORM: absolute(r8Url),
            wasmUASTCToRG8_UNORM: absolute(rg8Url),
            wasmUASTCToRGBA_SRGB: absolute(srgbUrl),
            wasmUASTCToRGBA_UNORM: absolute(unormUrl),
        };
        // Babylon resolves every one of these when it starts, loaded or not, so none may name its CDN.
        KhronosTextureContainer2.URLConfig = urls;
        module.MSCTranscoder.JSModuleURL = urls.jsMSCTranscoder;
        module.MSCTranscoder.WasmModuleURL = urls.wasmMSCTranscoder;
        module.ZSTDDecoder.WasmModuleURL = urls.wasmZSTDDecoder;
        module.LiteTranscoder_UASTC_ASTC.WasmModuleURL = urls.wasmUASTCToASTC;
        module.LiteTranscoder_UASTC_BC7.WasmModuleURL = urls.wasmUASTCToBC7;
        module.LiteTranscoder_UASTC_R8_UNORM.WasmModuleURL = urls.wasmUASTCToR8_UNORM;
        module.LiteTranscoder_UASTC_RG8_UNORM.WasmModuleURL = urls.wasmUASTCToRG8_UNORM;
        module.LiteTranscoder_UASTC_RGBA_SRGB.WasmModuleURL = urls.wasmUASTCToRGBA_SRGB;
        module.LiteTranscoder_UASTC_RGBA_UNORM.WasmModuleURL = urls.wasmUASTCToRGBA_UNORM;
        // Babylon's KTX2 container takes the decoder module from this global, and with no
        // workers decodes on this thread with the URLs set above.
        (globalThis as { KTX2DECODER?: unknown }).KTX2DECODER = module;
        KhronosTextureContainer2.DefaultNumWorkers = 0;
    })();
    return ready;
}
