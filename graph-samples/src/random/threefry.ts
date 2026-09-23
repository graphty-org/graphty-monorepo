/**
 * Threefry-2x32 with 20 rounds: the counter-based block function of J. K. Salmon, M. A. Moraes,
 * R. O. Dror and D. E. Shaw, "Parallel random numbers: as easy as 1, 2, 3", SC11 (2011),
 * doi:10.1145/2063384.2063405, as specified by the Random123 library and used by JAX.
 *
 * It maps a 64-bit key and a 64-bit counter to 64 random bits using only 32-bit addition,
 * rotation and xor, so JavaScript computes it exactly on every engine: no floating point, no
 * 64-bit multiply, no BigInt. It passes BigCrush with 13 rounds; 20 is Random123's default.
 */

/** Rotation constants R_32x2 of Threefry-2x32 (Random123 threefry.h). */
const ROTATIONS = [13, 15, 26, 6, 17, 29, 16, 24] as const;

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
    const ks = [ks0, ks1, ks2];
    let x0 = (c0 + ks0) | 0;
    let x1 = (c1 + ks1) | 0;
    for (let round = 0; round < 20; round++) {
        x0 = (x0 + x1) | 0;
        const r = ROTATIONS[round & 7];
        x1 = (x1 << r) | (x1 >>> (32 - r));
        x1 ^= x0;
        if ((round & 3) === 3) {
            const s = (round + 1) >>> 2;
            x0 = (x0 + ks[s % 3]) | 0;
            x1 = (x1 + ks[(s + 1) % 3] + s) | 0;
        }
    }
    out[0] = x0;
    out[1] = x1;
}
