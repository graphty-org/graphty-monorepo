/**
 * @file A pulled batch's table grows wider, never taller than the card allows, and refuses with
 * `E_TOO_LARGE` once no texture the card can hold has room (issue #9160).
 */

import { assert, describe, it } from "vitest";

import { GraphtyError } from "../../src/errors/GraphtyError";
import { CURVE_STRIDE, curveShape, MAX_PIECES, ROUTE_SPLIT } from "../../src/meshes/pulledCurve";
import { tableShape } from "../../src/meshes/PulledLineBatch";

/**
 * The code a call throws with, or null.
 * @param call - The call.
 * @returns Its `GraphtyError` code.
 */
function codeOf(call: () => unknown): string | null {
    try {
        call();
    } catch (error) {
        return error instanceof GraphtyError ? error.code : "not a GraphtyError";
    }

    return null;
}

describe("tableShape", () => {
    it("keeps 1024 texels across while the table fits the card's height", () => {
        assert.deepStrictEqual(tableShape(1024 * 8192, 8192), { width: 1024, texels: 1024 * 8192 });
    });

    it("widens a table that would pass the card's height, in whole lines", () => {
        // 60,000 long curves: 3,866,624 pieces of 4 texels, 15,104 lines of 1024 on an 8192 card
        const { width, texels } = tableShape(3_866_624 * 4, 8192);
        assert.strictEqual(width, 2048);
        assert.isAtMost(texels / width, 8192);
        assert.isAtLeast(texels, 3_866_624 * 4);
        assert.strictEqual(texels % width, 0);
    });

    it("starts narrower on a card whose largest texture is under 1024", () => {
        assert.deepStrictEqual(tableShape(1000, 256), { width: 256, texels: 1024 });
    });

    it("refuses with E_TOO_LARGE past the card's largest texture", () => {
        assert.strictEqual(
            codeOf(() => tableShape(2048 * 2048 + 1, 2048)),
            "E_TOO_LARGE",
        );
    });

    it("refuses with E_TOO_LARGE past what a float's bits name", () => {
        assert.strictEqual(
            codeOf(() => tableShape(1024, 16384, 2 ** 26 + 1)),
            "E_TOO_LARGE",
        );
    });

    it("holds a million curves of a curve's most pieces, an entry of four texels for every 16, on a 4096 card", () => {
        const entries = 1_000_000 * Math.ceil(MAX_PIECES / CURVE_STRIDE);
        const { width, texels } = tableShape(entries * 4, 4096, entries);
        assert.isAtMost(texels / width, 4096);
        assert.isAtMost(width, 4096);
        // and their draw slots, a name a piece and four to a texel
        const slots = tableShape((1_000_000 * MAX_PIECES) / 4, 4096, 0);
        assert.isAtMost(slots.texels / slots.width, 4096);
    });

    it("holds a million 65-point routes on an 8192 card, past what a float names", () => {
        const { width, texels } = tableShape(65_000_000, 8192, 0);
        assert.strictEqual(width, 8192);
        assert.isAtMost(texels / width, 8192);
    });

    it("keeps every width a power of two on a card whose largest texture is not one", () => {
        assert.deepStrictEqual(tableShape(1000, 600), { width: 512, texels: 1024 });
    });
});

describe("curveShape", () => {
    it("names a route texel past 2^24 exactly, in two floats", () => {
        const route = 2 ** 24 + 3;
        const [low, kind, high] = curveShape({ bends: [0.5, 0.1] } as never, route);
        assert.strictEqual(kind, 8);
        assert.strictEqual(high * ROUTE_SPLIT + low, route);
        assert.strictEqual(Math.fround(low), low);
        assert.strictEqual(Math.fround(high), high);
    });
});
