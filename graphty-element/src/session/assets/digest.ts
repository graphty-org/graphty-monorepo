/**
 * @file The digest of a model's file set: SHA-256 over the sorted (path, bytes) pairs.
 *
 * The id of an unnamed asset is this digest, and a saved project will verify stored bytes against
 * it, so the encoding below is fixed for ever: changing a byte of it changes every id.
 *
 * For each path in ascending UTF-16 code unit order: the path's UTF-8 length as a 4-byte
 * big-endian integer, the path's UTF-8, the content length as an 8-byte big-endian integer, the
 * content. SHA-256 of that, as lower-case hex.
 *
 * `crypto.subtle` exists only on secure pages (https, localhost) and in Node; elsewhere graph-io's
 * plain-JavaScript SHA-256 is used, so a digest is never skipped.
 */

import { sha256HexSync } from "@graphty/graph-io";

/**
 * Lower-case hex of bytes.
 * @param bytes - The bytes.
 * @returns The hex string.
 */
function hex(bytes: Uint8Array): string {
    let out = "";
    for (const byte of bytes) {
        out += byte.toString(16).padStart(2, "0");
    }

    return out;
}

/** The subset of SubtleCrypto used here, so this module names no DOM type. */
interface DigestOnly {
    digest(algorithm: string, data: Uint8Array): Promise<ArrayBuffer>;
}

/**
 * SHA-256 of bytes as hex, through `crypto.subtle` when the page has it.
 * @param data - The bytes.
 * @param useSubtle - False to force the bundled implementation (tests).
 * @returns The digest as lower-case hex.
 */
export async function sha256Hex(data: Uint8Array, useSubtle = true): Promise<string> {
    const subtle = (globalThis as { crypto?: { subtle?: DigestOnly } }).crypto?.subtle;
    if (useSubtle && subtle !== undefined) {
        return hex(new Uint8Array(await subtle.digest("SHA-256", data)));
    }

    return sha256HexSync(data);
}

/**
 * The canonical byte string of a file set, which its digest is taken over.
 * @param files - Path to bytes.
 * @returns The encoding described at the top of this file.
 */
export function canonicalFileSet(files: ReadonlyMap<string, Uint8Array>): Uint8Array {
    const encoder = new TextEncoder();
    const paths = [...files.keys()].sort((a, b) => (a < b ? -1 : Number(a > b)));
    const encoded = paths.map((path) => encoder.encode(path));
    let total = 0;
    for (let i = 0; i < paths.length; i++) {
        total += 4 + encoded[i].length + 8 + (files.get(paths[i])?.length ?? 0);
    }

    const out = new Uint8Array(total);
    const view = new DataView(out.buffer);
    let at = 0;
    for (let i = 0; i < paths.length; i++) {
        const bytes = files.get(paths[i]) ?? new Uint8Array(0);
        view.setUint32(at, encoded[i].length, false);
        out.set(encoded[i], at + 4);
        at += 4 + encoded[i].length;
        view.setUint32(at, Math.floor(bytes.length / 0x100000000), false);
        view.setUint32(at + 4, bytes.length >>> 0, false);
        out.set(bytes, at + 8);
        at += 8 + bytes.length;
    }

    return out;
}

/**
 * The digest of a file set.
 * @param files - Path to bytes.
 * @param useSubtle - False to force the bundled SHA-256 (tests).
 * @returns The SHA-256 of {@link canonicalFileSet}, as hex.
 */
export function digestFileSet(files: ReadonlyMap<string, Uint8Array>, useSubtle = true): Promise<string> {
    return sha256Hex(canonicalFileSet(files), useSubtle);
}
