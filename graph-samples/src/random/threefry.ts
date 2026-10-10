/**
 * Threefry-2x32 with 20 rounds: the counter-based block function of J. K. Salmon, M. A. Moraes,
 * R. O. Dror and D. E. Shaw, "Parallel random numbers: as easy as 1, 2, 3", SC11 (2011),
 * doi:10.1145/2063384.2063405, as specified by the Random123 library and used by JAX.
 *
 * It maps a 64-bit key and a 64-bit counter to 64 random bits using only 32-bit addition,
 * rotation and xor, so JavaScript computes it exactly on every engine: no floating point, no
 * 64-bit multiply, no BigInt. It passes BigCrush with 13 rounds; 20 is Random123's default.
 */

/** The Skein key-schedule parity constant for 32-bit words. */
const KS_PARITY = 0x1bd11bda;

/**
 * Encrypt one 64-bit counter under one 64-bit key.
 * @param k0 - key word 0 (unsigned 32-bit)
 * @param k1 - key word 1 (unsigned 32-bit)
 * @param c0 - counter word 0 (unsigned 32-bit)
 * @param c1 - counter word 1 (unsigned 32-bit)
 * @param out - receives the two output words
 */
export function threefry2x32(k0: number, k1: number, c0: number, c1: number, out: Uint32Array): void {
    const ks0 = k0 >>> 0;
    const ks1 = k1 >>> 0;
    const ks2 = (KS_PARITY ^ ks0 ^ ks1) >>> 0;
    // 20 rounds, unrolled (a loop with a table lookup and an array per call was most of the
    // package's generation time): round i rotates by R_32x2[i mod 8] = 13, 15, 26, 6, 17, 29,
    // 16, 24 (Random123 threefry.h), and after round 4s - 1 the key injection s adds
    // ks[s mod 3] to x0 and ks[(s + 1) mod 3] + s to x1, for ks = (ks0, ks1, ks2).
    let x0 = (c0 + ks0) | 0;
    let x1 = (c1 + ks1) | 0;
    x0 = (x0 + x1) | 0;
    x1 = ((x1 << 13) | (x1 >>> 19)) ^ x0;
    x0 = (x0 + x1) | 0;
    x1 = ((x1 << 15) | (x1 >>> 17)) ^ x0;
    x0 = (x0 + x1) | 0;
    x1 = ((x1 << 26) | (x1 >>> 6)) ^ x0;
    x0 = (x0 + x1) | 0;
    x1 = ((x1 << 6) | (x1 >>> 26)) ^ x0;
    x0 = (x0 + ks1) | 0;
    x1 = (x1 + ks2 + 1) | 0;
    x0 = (x0 + x1) | 0;
    x1 = ((x1 << 17) | (x1 >>> 15)) ^ x0;
    x0 = (x0 + x1) | 0;
    x1 = ((x1 << 29) | (x1 >>> 3)) ^ x0;
    x0 = (x0 + x1) | 0;
    x1 = ((x1 << 16) | (x1 >>> 16)) ^ x0;
    x0 = (x0 + x1) | 0;
    x1 = ((x1 << 24) | (x1 >>> 8)) ^ x0;
    x0 = (x0 + ks2) | 0;
    x1 = (x1 + ks0 + 2) | 0;
    x0 = (x0 + x1) | 0;
    x1 = ((x1 << 13) | (x1 >>> 19)) ^ x0;
    x0 = (x0 + x1) | 0;
    x1 = ((x1 << 15) | (x1 >>> 17)) ^ x0;
    x0 = (x0 + x1) | 0;
    x1 = ((x1 << 26) | (x1 >>> 6)) ^ x0;
    x0 = (x0 + x1) | 0;
    x1 = ((x1 << 6) | (x1 >>> 26)) ^ x0;
    x0 = (x0 + ks0) | 0;
    x1 = (x1 + ks1 + 3) | 0;
    x0 = (x0 + x1) | 0;
    x1 = ((x1 << 17) | (x1 >>> 15)) ^ x0;
    x0 = (x0 + x1) | 0;
    x1 = ((x1 << 29) | (x1 >>> 3)) ^ x0;
    x0 = (x0 + x1) | 0;
    x1 = ((x1 << 16) | (x1 >>> 16)) ^ x0;
    x0 = (x0 + x1) | 0;
    x1 = ((x1 << 24) | (x1 >>> 8)) ^ x0;
    x0 = (x0 + ks1) | 0;
    x1 = (x1 + ks2 + 4) | 0;
    x0 = (x0 + x1) | 0;
    x1 = ((x1 << 13) | (x1 >>> 19)) ^ x0;
    x0 = (x0 + x1) | 0;
    x1 = ((x1 << 15) | (x1 >>> 17)) ^ x0;
    x0 = (x0 + x1) | 0;
    x1 = ((x1 << 26) | (x1 >>> 6)) ^ x0;
    x0 = (x0 + x1) | 0;
    x1 = ((x1 << 6) | (x1 >>> 26)) ^ x0;
    x0 = (x0 + ks2) | 0;
    x1 = (x1 + ks0 + 5) | 0;
    out[0] = x0;
    out[1] = x1;
}
