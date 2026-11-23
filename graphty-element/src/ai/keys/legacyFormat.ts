/**
 * @file Reads values that graphty-element saved before Web Crypto, with the `encrypt-storage`
 * package, so a reader's saved keys are moved to the new format instead of being lost.
 *
 * `encrypt-storage` stored `crypto-js` AES output: base64 of `"Salted__"` | 8-byte salt |
 * AES-256-CBC ciphertext, the key and IV derived from the encryption key and the salt with
 * OpenSSL's `EVP_BytesToKey` (MD5, one round). Web Crypto decrypts AES-CBC but has no MD5, so the
 * derivation's MD5 is here. Read only: nothing is ever written in this format.
 */

/** Base64 of `"Salted__"`, the start of every value `encrypt-storage` saved. */
export const LEGACY_TAG = "U2FsdGVkX1";

const SHIFTS = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
const SINES = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);

/**
 * MD5 (RFC 1321), for the legacy key derivation only.
 * @param data - The bytes
 * @returns The 16-byte digest
 */
function md5(data: Uint8Array): Uint8Array<ArrayBuffer> {
    const padded = new Uint8Array((((data.length + 8) >>> 6) + 1) * 64);
    padded.set(data);
    padded[data.length] = 0x80;
    const view = new DataView(padded.buffer);
    view.setUint32(padded.length - 8, (data.length * 8) >>> 0, true);
    view.setUint32(padded.length - 4, Math.floor(data.length / 2 ** 29), true);

    const state = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
    for (let offset = 0; offset < padded.length; offset += 64) {
        let [a, b, c, d] = state as [number, number, number, number];
        for (let i = 0; i < 64; i++) {
            const round = i >>> 4;
            let f: number;
            let g: number;
            if (round === 0) {
                f = (b & c) | (~b & d);
                g = i;
            } else if (round === 1) {
                f = (d & b) | (~d & c);
                g = (5 * i + 1) % 16;
            } else if (round === 2) {
                f = b ^ c ^ d;
                g = (3 * i + 5) % 16;
            } else {
                f = c ^ (b | ~d);
                g = (7 * i) % 16;
            }

            const shift = SHIFTS[round * 4 + (i % 4)] ?? 0;
            const sum = (a + f + (SINES[i] ?? 0) + view.getUint32(offset + g * 4, true)) >>> 0;
            a = d;
            d = c;
            c = b;
            b = (b + ((sum << shift) | (sum >>> (32 - shift)))) >>> 0;
        }

        state[0] = ((state[0] ?? 0) + a) >>> 0;
        state[1] = ((state[1] ?? 0) + b) >>> 0;
        state[2] = ((state[2] ?? 0) + c) >>> 0;
        state[3] = ((state[3] ?? 0) + d) >>> 0;
    }

    const digest = new Uint8Array(16);
    const out = new DataView(digest.buffer);
    state.forEach((word, i) => {
        out.setUint32(i * 4, word, true);
    });
    return digest;
}

/**
 * Decrypt a value `encrypt-storage` saved.
 * @param raw - The stored text, starting with {@link LEGACY_TAG}
 * @param encryptionKey - The encryption key it was saved with
 * @returns The value (parsed JSON, or the text when it is not JSON)
 * @throws When the text is malformed or the key is wrong
 */
export async function readLegacy(raw: string, encryptionKey: string): Promise<unknown> {
    const bytes = Uint8Array.from(atob(raw), (char) => char.codePointAt(0) ?? 0);
    const salt = bytes.slice(8, 16);
    const secret = new TextEncoder().encode(encryptionKey);

    // EVP_BytesToKey: D1 = MD5(secret | salt), Dn = MD5(Dn-1 | secret | salt), 32 key + 16 IV bytes
    const derived = new Uint8Array(48);
    let block = new Uint8Array(0);
    for (let filled = 0; filled < derived.length; filled += 16) {
        block = md5(Uint8Array.of(...block, ...secret, ...salt));
        derived.set(block, filled);
    }

    const key = await crypto.subtle.importKey("raw", derived.slice(0, 32), "AES-CBC", false, ["decrypt"]);
    const plain = await crypto.subtle.decrypt({ name: "AES-CBC", iv: derived.slice(32) }, key, bytes.slice(16));
    const text = new TextDecoder("utf-8", { fatal: true }).decode(plain);
    try {
        return JSON.parse(text) as unknown;
    } catch {
        return text;
    }
}
