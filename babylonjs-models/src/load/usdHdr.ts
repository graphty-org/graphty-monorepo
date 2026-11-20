/**
 * @file A USD model's Radiance HDR (`.hdr`) and OpenEXR (`.exr`) pictures, drawn. OpenUSD's importer
 * hands Babylon only PNG, JPEG, BMP and WebP pictures, chosen by file name, and leaves any other
 * off: a part textured with an `.hdr` or `.exr` drew in its plain color. So each one is decoded with
 * Babylon's `HDRTools` or its EXR decoder and given to the importer as a BMP named
 * `<picture>.bmp` (`sky.hdr.bmp`), with every layer's asset paths renamed to match (a text layer's
 * `@...hdr@`, a binary layer's tokens). One that cannot be decoded is given as a white stand-in and
 * taken off once loaded, so its parts are marked as drawn without their picture
 * (`drawsWithoutPicture`).
 */

import type { AssetContainer } from "@babylonjs/core/assetContainer.js";
import { ExrLoaderGlobalConfiguration } from "@babylonjs/core/Materials/Textures/Loaders/EXR/exrLoader.configuration.js";
import { ReadExrDataAsync as readExr } from "@babylonjs/core/Materials/Textures/Loaders/exrTextureLoader.js";
import {
    RGBE_ReadHeader as readHdrHeader,
    RGBE_ReadPixels as readHdrPixels,
} from "@babylonjs/core/Misc/HighDynamicRange/hdr.js";

import { renameCrateTokens } from "../files/readers/usdc.js";
import { WHITE_PNG } from "../files/textFormats.js";

/** A picture OpenUSD leaves off that is decoded and drawn as a BMP. */
const FLOAT_PICTURE = /\.(?:hdr|exr)$/i;

/**
 * The name a picture is given to OpenUSD: an `.hdr` or `.exr` one is drawn as a BMP beside it.
 * @param path - The picture's path.
 * @returns The path OpenUSD reads it under.
 */
export function drawnAs(path: string): string {
    return FLOAT_PICTURE.test(path) ? `${path}.bmp` : path;
}

/**
 * Float pixels as a 24-bit BMP. Values are kept as they are (linear, as OpenUSD reads an `.hdr` or
 * `.exr`), clamped to 0..1.
 * ponytail: 8 bits a channel and clamped, so light brighter than white is lost; swap the texture
 * for a float RawTexture once a model needs that range.
 * @param width - Pixels across.
 * @param height - Pixels down.
 * @param pixels - The values, row by row, `channels` a pixel: R, G, B (and A, unread); one channel is gray.
 * @param channels - Values a pixel.
 * @param topDown - Whether the first row is the top one.
 * @returns The BMP.
 */
function bmpOf(
    width: number,
    height: number,
    pixels: ArrayLike<number>,
    channels: number,
    topDown: boolean,
): Uint8Array {
    const row = (width * 3 + 3) & ~3;
    const out = new Uint8Array(54 + row * height);
    const view = new DataView(out.buffer);
    out.set([0x42, 0x4d]);
    view.setUint32(2, out.length, true);
    view.setUint32(10, 54, true);
    view.setUint32(14, 40, true);
    view.setInt32(18, width, true);
    // A negative height: rows top to bottom.
    view.setInt32(22, topDown ? -height : height, true);
    view.setUint16(26, 1, true);
    view.setUint16(28, 24, true);
    view.setUint32(34, row * height, true);
    const byte = (v: number): number => Math.round(Math.min(Math.max(v, 0), 1) * 255);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * channels;
            const o = 54 + y * row + x * 3;
            // One channel is gray; two are red and green.
            const r = pixels[i];
            const g = channels === 1 ? r : pixels[i + 1];
            let b = channels === 1 ? r : 0;
            if (channels >= 3) {
                b = pixels[i + 2];
            }
            out[o] = byte(b);
            out[o + 1] = byte(g);
            out[o + 2] = byte(r);
        }
    }

    return out;
}

/**
 * Decode a Radiance HDR picture into a 24-bit BMP ({@link bmpOf}).
 * @param bytes - The `.hdr` file.
 * @returns The BMP, or undefined for a file `HDRTools` cannot read.
 */
export function hdrAsBmp(bytes: Uint8Array): Uint8Array | undefined {
    try {
        const info = readHdrHeader(bytes);
        return bmpOf(info.width, info.height, readHdrPixels(bytes, info), 3, true);
    } catch {
        return undefined;
    }
}

/**
 * Decode an OpenEXR picture into a 24-bit BMP ({@link bmpOf}) with Babylon's EXR decoder. A
 * ZIP- or PXR24-compressed one needs fflate, which the decoder loads as a script from unpkg.com:
 * here it is handed this package's own fflate and an empty script instead, so nothing is fetched.
 * @param bytes - The `.exr` file.
 * @returns The BMP, or undefined for a file the decoder cannot read.
 */
export async function exrAsBmp(bytes: Uint8Array): Promise<Uint8Array | undefined> {
    const global = globalThis as { fflate?: unknown };
    global.fflate ??= await import("fflate");
    const url = ExrLoaderGlobalConfiguration.FFLATEUrl;
    ExrLoaderGlobalConfiguration.FFLATEUrl = "data:text/javascript,";
    // The decoder reads the script's URL before its first await, so it is put back at once.
    const decoding = readExr(bytes.slice().buffer).catch(() => undefined);
    ExrLoaderGlobalConfiguration.FFLATEUrl = url;
    const decoded = await decoding;
    if (decoded?.data === null || decoded === undefined || decoded.width <= 0 || decoded.height <= 0) {
        return undefined;
    }
    const { width, height, data } = decoded;
    // The decoder writes the rows bottom to top.
    return bmpOf(width, height, data, data.length / (width * height), false);
}

/**
 * A USD set with its `.hdr` and `.exr` pictures drawn as BMPs and every layer naming them renamed.
 * @param files - The set, as OpenUSD will read it (a picture drawn without is already a stand-in).
 * @param gone - Pictures drawn without, by path in the set: given as they are.
 * @param budget - The most bytes a binary layer's tokens may decompress to.
 * @returns The set, and the pictures that could not be decoded, by path.
 */
export async function withFloatPicturesAsBmp(
    files: ReadonlyMap<string, Uint8Array>,
    gone: readonly string[],
    budget: number,
): Promise<{ files: ReadonlyMap<string, Uint8Array>; undecoded: string[] }> {
    if (![...files.keys()].some((path) => FLOAT_PICTURE.test(path))) {
        return { files, undecoded: [] };
    }

    const left = new Set(gone.map((g) => g.toLowerCase()));
    const out = new Map<string, Uint8Array>();
    const undecoded: string[] = [];
    for (const [path, bytes] of files) {
        if (!FLOAT_PICTURE.test(path)) {
            out.set(path, renameLayer(bytes, budget));
            continue;
        }
        let bmp: Uint8Array | undefined = WHITE_PNG;
        if (!left.has(path.toLowerCase())) {
            bmp = /\.exr$/i.test(path) ? await exrAsBmp(bytes) : hdrAsBmp(bytes);
        }
        if (bmp === undefined) {
            undecoded.push(path);
        }
        out.set(drawnAs(path), bmp ?? WHITE_PNG);
    }

    return { files: out, undecoded };
}

/**
 * A layer with its `.hdr` and `.exr` asset paths renamed; any other file as it is.
 * @param bytes - The file.
 * @param budget - The most bytes a binary layer's tokens may decompress to.
 * @returns The file.
 */
function renameLayer(bytes: Uint8Array, budget: number): Uint8Array {
    const head = new TextDecoder().decode(bytes.subarray(0, 8));
    if (head === "PXR-USDC") {
        return renameCrateTokens(bytes, drawnAs, budget);
    }
    if (head.startsWith("#usda ")) {
        const text = new TextDecoder().decode(bytes);
        const renamed = text.replaceAll(/@([^@\n]*\.(?:hdr|exr))@/gi, "@$1.bmp@");
        return renamed === text ? bytes : new TextEncoder().encode(renamed);
    }

    return bytes;
}

/**
 * After a USD load: sample every picture drawn from an `.hdr` or `.exr` as linear. OpenUSD reads
 * those as linear, but sees a BMP, which it reads as sRGB unless the shader says `raw`.
 * ponytail: a shader that says `sRGB` for one is read as linear too; tell it apart once the
 * importer reports a texture's color space.
 * @param container - The loaded model.
 */
export function floatPicturesAsLinear(container: AssetContainer): void {
    for (const texture of container.textures) {
        if (/\.(?:hdr|exr)\.bmp$/i.test(texture.name)) {
            texture.gammaSpace = false;
        }
    }
}
