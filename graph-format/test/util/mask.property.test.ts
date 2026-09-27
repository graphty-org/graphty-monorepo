import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { type U32 } from "../../src/types/index.js";
import {
    makeMask,
    maskAnd,
    maskAndNot,
    maskCount,
    maskNot,
    maskOr,
    maskSet,
    maskTest,
    maskXor,
} from "../../src/util/mask.js";
import { fcParams } from "../helpers/fc-params.js";

/** A random boolean model of a mask over 0 to 2,000 indices, with two operands of the same length. */
const operands = fc
    .integer({ min: 0, max: 2000 })
    .chain((length) =>
        fc.tuple(
            fc.constant(length),
            fc.array(fc.boolean(), { minLength: length, maxLength: length }),
            fc.array(fc.boolean(), { minLength: length, maxLength: length }),
        ),
    );

/**
 * Pack a boolean model into a mask.
 * @param model - one boolean per index
 * @returns the mask
 */
function pack(model: readonly boolean[]): U32 {
    const mask = makeMask(model.length);
    model.forEach((bit, i) => {
        if (bit) {
            maskSet(mask, i, true);
        }
    });
    return mask;
}

/**
 * Unpack a mask into a boolean model, asserting no bit is set at or above length.
 * @param mask - the mask
 * @param length - the number of indices
 * @returns one boolean per index
 */
function unpack(mask: U32, length: number): boolean[] {
    expect(mask.length).toBe(Math.ceil(length / 32));
    expect(maskCount(mask, mask.length * 32)).toBe(maskCount(mask, length));
    return Array.from({ length }, (_, i) => maskTest(mask, i));
}

const count = (model: readonly boolean[]): number => model.filter(Boolean).length;

describe("mask algebra against a boolean[] model", () => {
    it("every helper equals the model, and maskCount equals the model's count", () => {
        fc.assert(
            fc.property(operands, ([length, x, y]) => {
                const a = pack(x);
                const b = pack(y);
                const cases: [U32, boolean[]][] = [
                    [maskAnd(a, b, length), x.map((v, i) => v && y[i])],
                    [maskOr(a, b, length), x.map((v, i) => v || y[i])],
                    [maskAndNot(a, b, length), x.map((v, i) => v && !y[i])],
                    [maskXor(a, b, length), x.map((v, i) => v !== y[i])],
                    [maskNot(a, length), x.map((v) => !v)],
                ];
                for (const [mask, model] of cases) {
                    expect(unpack(mask, length)).toEqual(model);
                    expect(maskCount(mask, length)).toBe(count(model));
                }
                expect(unpack(a, length)).toEqual(x);
                expect(unpack(b, length)).toEqual(y);
            }),
            fcParams(1000),
        );
    });

    it("obeys De Morgan, andNot(a, b) == and(a, not b), and xor(a, b) == andNot(or(a, b), and(a, b))", () => {
        fc.assert(
            fc.property(operands, ([length, x, y]) => {
                const a = pack(x);
                const b = pack(y);
                const words = (m: U32): number[] => Array.from(m);
                expect(words(maskNot(maskAnd(a, b, length), length))).toEqual(
                    words(maskOr(maskNot(a, length), maskNot(b, length), length)),
                );
                expect(words(maskNot(maskOr(a, b, length), length))).toEqual(
                    words(maskAnd(maskNot(a, length), maskNot(b, length), length)),
                );
                expect(words(maskAndNot(a, b, length))).toEqual(words(maskAnd(a, maskNot(b, length), length)));
                expect(words(maskXor(a, b, length))).toEqual(
                    words(maskAndNot(maskOr(a, b, length), maskAnd(a, b, length), length)),
                );
                expect(words(maskNot(maskNot(a, length), length))).toEqual(words(a));
            }),
            fcParams(1000),
        );
    });
});
