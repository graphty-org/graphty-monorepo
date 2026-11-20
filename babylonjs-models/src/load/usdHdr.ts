/**
 * @file A USD model's Radiance HDR (`.hdr`) pictures, drawn. OpenUSD's importer hands Babylon only
 * PNG, JPEG, BMP and WebP pictures, chosen by file name, and leaves any other off: a part textured
 * with an `.hdr` drew in its plain color. So each one is decoded with Babylon's `HDRTools` and
 * given to the importer as a BMP named `<picture>.hdr.bmp`, with every layer's asset paths renamed
 * to match (a text layer's `@...hdr@`, a binary layer's tokens). An `.hdr` that cannot be decoded
 * is given as a white stand-in and taken off once loaded, so its parts are marked as drawn without
 * their picture (`drawsWithoutPicture`).
 */

import type { AssetContainer } from "@babylonjs/core/assetContainer.js";
import {
    RGBE_ReadHeader as readHdrHeader,
    RGBE_ReadPixels as readHdrPixels,
} from "@babylonjs/core/Misc/HighDynamicRange/hdr.js";

import { renameCrateTokens } from "../files/readers/usdc.js";
import { WHITE_PNG } from "../files/textFormats.js";

const HDR = /\.hdr$/i;

/**
 * The name a picture is given to OpenUSD: an `.hdr` one is drawn as a BMP beside it.
 * @param path - The picture's path.
 * @returns The path OpenUSD reads it under.
 */
export function drawnAs(path: string): string {
    return HDR.test(path) ? `${path}.bmp` : path;
}

/**
 * Decode a Radiance HDR picture into a 24-bit BMP. Its values are kept as they are (linear, as
 * OpenUSD reads an `.hdr`), clamped to 0..1.
 * ponytail: 8 bits a channel and clamped, so light brighter than white is lost; swap the texture
 * for a float RawTexture once a model needs that range.
 * @param bytes - The `.hdr` file.
 * @returns The BMP, or undefined for a file `HDRTools` cannot read.
 */
export function hdrAsBmp(bytes: Uint8Array): Uint8Array | undefined {
    let width: number;
    let height: number;
    let rgb: Float32Array;
    try {
        const info = readHdrHeader(bytes);
        ({ width, height } = info);
        rgb = readHdrPixels(bytes, info);
    } catch {
        return undefined;
    }

    const row = (width * 3 + 3) & ~3;
    const out = new Uint8Array(54 + row * height);
    const view = new DataView(out.buffer);
    out.set([0x42, 0x4d]);
    view.setUint32(2, out.length, true);
    view.setUint32(10, 54, true);
    view.setUint32(14, 40, true);
    view.setInt32(18, width, true);
    // A negative height: rows top to bottom, as the HDR file stores them.
    view.setInt32(22, -height, true);
    view.setUint16(26, 1, true);
    view.setUint16(28, 24, true);
    view.setUint32(34, row * height, true);
    const byte = (v: number): number => Math.round(Math.min(Math.max(v, 0), 1) * 255);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 3;
            const o = 54 + y * row + x * 3;
            out[o] = byte(rgb[i + 2]);
            out[o + 1] = byte(rgb[i + 1]);
            out[o + 2] = byte(rgb[i]);
        }
    }

    return out;
}

/**
 * A USD set with its `.hdr` pictures drawn as BMPs and every layer naming them renamed.
 * @param files - The set, as OpenUSD will read it (a picture drawn without is already a stand-in).
 * @param gone - Pictures drawn without, by path in the set: given as they are.
 * @param budget - The most bytes a binary layer's tokens may decompress to.
 * @returns The set, and the `.hdr` pictures that could not be decoded, by path.
 */
export function withHdrAsBmp(
    files: ReadonlyMap<string, Uint8Array>,
    gone: readonly string[],
    budget: number,
): { files: ReadonlyMap<string, Uint8Array>; undecoded: string[] } {
    if (![...files.keys()].some((path) => HDR.test(path))) {
        return { files, undecoded: [] };
    }

    const left = new Set(gone.map((g) => g.toLowerCase()));
    const out = new Map<string, Uint8Array>();
    const undecoded: string[] = [];
    for (const [path, bytes] of files) {
        if (!HDR.test(path)) {
            out.set(path, renameLayer(bytes, budget));
            continue;
        }
        const bmp = left.has(path.toLowerCase()) ? WHITE_PNG : hdrAsBmp(bytes);
        if (bmp === undefined) {
            undecoded.push(path);
        }
        out.set(drawnAs(path), bmp ?? WHITE_PNG);
    }

    return { files: out, undecoded };
}

/**
 * A layer with its `.hdr` asset paths renamed; any other file as it is.
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
        const renamed = text.replaceAll(/@([^@\n]*\.hdr)@/gi, "@$1.bmp@");
        return renamed === text ? bytes : new TextEncoder().encode(renamed);
    }

    return bytes;
}

/**
 * After a USD load: sample every picture drawn from an `.hdr` as linear. OpenUSD reads an `.hdr`
 * as linear, but sees a BMP, which it reads as sRGB unless the shader says `raw`.
 * ponytail: a shader that says `sRGB` for an `.hdr` is read as linear too; tell it apart once the
 * importer reports a texture's color space.
 * @param container - The loaded model.
 */
export function hdrAsLinear(container: AssetContainer): void {
    for (const texture of container.textures) {
        if (/\.hdr\.bmp$/i.test(texture.name)) {
            texture.gammaSpace = false;
        }
    }
}
