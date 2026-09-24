import { describe, expect, it } from "vitest";

import { threefry2x32 } from "../../src/random/threefry.js";

/**
 * Known-answer vectors of Threefry-2x32 with 20 rounds from Random123 (Salmon et al., SC11),
 * `examples/kat_vectors`, the same three vectors JAX's `threefry_2x32` test checks. A failure
 * here means the block function no longer IS Threefry-2x32-20, so every seeded graph changed.
 */
const KAT: readonly (readonly [readonly number[], readonly number[], readonly number[]])[] = [
    [
        [0x00000000, 0x00000000],
        [0x00000000, 0x00000000],
        [0x6b200159, 0x99ba4efe],
    ],
    [
        [0xffffffff, 0xffffffff],
        [0xffffffff, 0xffffffff],
        [0x1cb996fc, 0xbb002be7],
    ],
    [
        [0x243f6a88, 0x85a308d3],
        [0x13198a2e, 0x03707344],
        [0xc4923a9c, 0x483df7a0],
    ],
];

describe("threefry2x32", () => {
    it.each(KAT)("matches the Random123 known-answer vector for counter %j key %j", (ctr, key, expected) => {
        const out = new Uint32Array(2);
        threefry2x32(key[0], key[1], ctr[0], ctr[1], out);
        expect([out[0], out[1]]).toEqual(expected);
    });

    it("returns unsigned 32-bit words and does not depend on the output array's previous contents", () => {
        const a = new Uint32Array([123, 456]);
        const b = new Uint32Array(2);
        threefry2x32(7, 8, 9, 10, a);
        threefry2x32(7, 8, 9, 10, b);
        expect(Array.from(a)).toEqual(Array.from(b));
    });
});
