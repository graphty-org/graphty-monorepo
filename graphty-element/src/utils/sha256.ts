/**
 * @file SHA-256 of a text, synchronously, with no platform dependency.
 *
 * Shader trust is keyed by the hash of the shader's text (design/rendering/shader-styles.md
 * section 4.6). `crypto.subtle` is asynchronous and missing in an insecure context, and the hash
 * is needed where an answer must be synchronous (a layer naming a held shader, `list()`), so the
 * element hashes the text itself. The digest is the standard one: the same text gives the same
 * hex string `crypto.subtle.digest("SHA-256", ...)` gives.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

/** The round constants. */
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
 * Rotate a 32-bit word right.
 * @param x - The word.
 * @param n - By how many bits.
 * @returns The rotated word.
 */
function rotr(x: number, n: number): number {
    return (x >>> n) | (x << (32 - n));
}

/**
 * The SHA-256 digest of a text, its UTF-8 bytes, as 64 lowercase hex digits.
 * @param text - The text.
 * @returns The digest.
 */
export function sha256Hex(text: string): string {
    const bytes = new TextEncoder().encode(text);
    const { length } = bytes;
    const blocks = Math.ceil((length + 9) / 64);
    const padded = new Uint8Array(blocks * 64);
    padded.set(bytes);
    padded[length] = 0x80;
    const view = new DataView(padded.buffer);
    // The bit length, as a 64-bit big-endian number; texts here are far below 2^32 bytes.
    view.setUint32(padded.length - 8, Math.floor((length * 8) / 2 ** 32));
    view.setUint32(padded.length - 4, (length * 8) >>> 0);

    const h = new Uint32Array([
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ]);
    const w = new Uint32Array(64);
    for (let block = 0; block < blocks; block++) {
        for (let i = 0; i < 16; i++) {
            w[i] = view.getUint32(block * 64 + i * 4);
        }

        for (let i = 16; i < 64; i++) {
            const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
            const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
            w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
        }

        let [a, b, c, d, e, f, g, hh] = h;
        for (let i = 0; i < 64; i++) {
            const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
            const ch = (e & f) ^ (~e & g);
            const t1 = (hh + s1 + ch + K[i] + w[i]) >>> 0;
            const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
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

    return [...h].map((word) => word.toString(16).padStart(8, "0")).join("");
}
