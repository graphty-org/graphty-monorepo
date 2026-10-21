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
 * `crypto.subtle` exists only on secure pages (https, localhost) and in Node; elsewhere the
 * bundled implementation below is used, so a digest is never skipped.
 */

/** SHA-256 round constants. */
const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98,
    0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8,
    0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
    0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
    0xc67178f2,
]);

/**
 * SHA-256 in plain TypeScript, for pages without `crypto.subtle`.
 * @param data - The bytes.
 * @returns The 32-byte digest.
 */
export function sha256Fallback(data: Uint8Array): Uint8Array {
    const h = new Uint32Array([
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ]);
    const bitLength = data.length * 8;
    const padded = new Uint8Array((((data.length + 9 + 63) >> 6) << 6) >>> 0);
    padded.set(data);
    padded[data.length] = 0x80;
    const view = new DataView(padded.buffer);
    view.setUint32(padded.length - 8, Math.floor(bitLength / 0x100000000), false);
    view.setUint32(padded.length - 4, bitLength >>> 0, false);

    const w = new Uint32Array(64);
    for (let offset = 0; offset < padded.length; offset += 64) {
        for (let i = 0; i < 16; i++) {
            w[i] = view.getUint32(offset + i * 4, false);
        }

        for (let i = 16; i < 64; i++) {
            const a = w[i - 15];
            const b = w[i - 2];
            const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
            const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
            w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
        }

        let [a, b, c, d, e, f, g, hh] = h;
        for (let i = 0; i < 64; i++) {
            const s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
            const ch = (e & f) ^ (~e & g);
            const t1 = (hh + s1 + ch + K[i] + w[i]) >>> 0;
            const s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const t2 = (s0 + maj) >>> 0;
            hh = g;
            g = f;
            f = e;
            e = (d + t1) >>> 0;
            d = c;
            c = b;
            b = a;
            a = (t1 + t2) >>> 0;
        }

        h[0] += a;
        h[1] += b;
        h[2] += c;
        h[3] += d;
        h[4] += e;
        h[5] += f;
        h[6] += g;
        h[7] += hh;
    }

    const out = new Uint8Array(32);
    const outView = new DataView(out.buffer);
    for (let i = 0; i < 8; i++) {
        outView.setUint32(i * 4, h[i], false);
    }

    return out;
}

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

    return hex(sha256Fallback(data));
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
