/**
 * @file Radiance HDR (`.hdr`) and OpenEXR (`.exr`) pictures decoded into 24-bit BMPs, with
 * Babylon's `HDRTools` and its EXR decoder. Imported by ../load/usdHdr.ts only for a USD model that
 * names such a picture, so a page that never loads one never loads these decoders or fflate.
 */

import { ExrLoaderGlobalConfiguration } from "@babylonjs/core/Materials/Textures/Loaders/EXR/exrLoader.configuration.js";
import { ReadExrDataAsync as readExr } from "@babylonjs/core/Materials/Textures/Loaders/exrTextureLoader.js";
import {
    RGBE_ReadHeader as readHdrHeader,
    RGBE_ReadPixels as readHdrPixels,
} from "@babylonjs/core/Misc/HighDynamicRange/hdr.js";

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
