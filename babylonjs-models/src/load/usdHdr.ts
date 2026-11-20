/**
 * @file A USD model's Radiance HDR (`.hdr`) and OpenEXR (`.exr`) pictures, drawn. OpenUSD's importer
 * hands Babylon only PNG, JPEG, BMP and WebP pictures, chosen by file name, and leaves any other
 * off: a part textured with an `.hdr` or `.exr` drew in its plain color. So each one is decoded with
 * Babylon's `HDRTools` or its EXR decoder (../decoders/floatPictures.ts, loaded only when a set
 * holds one) and given to the importer as a BMP named
 * `<picture>.bmp` (`sky.hdr.bmp`), with every layer's asset paths renamed to match (a text layer's
 * `@...hdr@`, a binary layer's tokens). One that cannot be decoded is given as a white stand-in and
 * taken off once loaded, so its parts are marked as drawn without their picture
 * (`drawsWithoutPicture`).
 */

import type { AssetContainer } from "@babylonjs/core/assetContainer.js";

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

    const { exrAsBmp, hdrAsBmp } = await import("../decoders/floatPictures.js");
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
