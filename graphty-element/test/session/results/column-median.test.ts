/**
 * @file The column median is found by selection, not by sorting, and agrees with a sort exactly.
 *
 * The reference below is the sort-based code `computeColumnStatistics` used before: copy the
 * finite values, sort them numerically, read the lower median and count the run at the minimum.
 * Every published figure must match it bit for bit, including the sign of a zero median.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { arrayColumn, computeColumnStatistics } from "../../../src/session/results/statistics";

/** The median and minimum tie count the old implementation published. */
function sortedReference(values: readonly number[]): { median: number; tiedAtMin: number } {
    const finite = Float64Array.from(values.filter((value) => Number.isFinite(value)));
    if (finite.length === 0) {
        return { median: Number.NaN, tiedAtMin: 0 };
    }

    const sorted = finite.slice().sort();
    let tiedAtMin = 0;
    while (tiedAtMin < sorted.length && sorted[tiedAtMin] === sorted[0]) {
        tiedAtMin++;
    }

    return { median: sorted[Math.floor((sorted.length - 1) / 2)], tiedAtMin };
}

/** A seeded generator, so a failure names an input that can be rebuilt. */
function seeded(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 2 ** 32;
    };
}

const SPECIALS = [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0, -0];

/** Inputs of one size in every shape the selection must agree with the sort on. */
function shapes(size: number, random: () => number): Record<string, number[]> {
    const ints = (range: number): number[] => Array.from({ length: size }, () => Math.floor(random() * range));
    return {
        uniform: Array.from({ length: size }, () => random() * 2 - 1),
        heavyTies: ints(3),
        fewDistinct: ints(Math.max(1, Math.floor(size / 10))),
        allEqual: Array.from({ length: size }, () => 4),
        ascending: Array.from({ length: size }, (_, index) => index),
        descending: Array.from({ length: size }, (_, index) => size - index),
        signedZeros: Array.from({ length: size }, () => [0, -0, 1, -1][Math.floor(random() * 4)]),
        nonFinite: Array.from({ length: size }, () =>
            random() < 0.3 ? SPECIALS[Math.floor(random() * SPECIALS.length)] : Math.floor(random() * 5) - 2,
        ),
        allNonFinite: Array.from({ length: size }, () => SPECIALS[Math.floor(random() * 3)]),
    };
}

describe("computeColumnStatistics median and tiedAtMin", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("agrees with the sort-based implementation bit for bit", () => {
        const random = seeded(1517);
        let checked = 0;
        for (const size of [0, 1, 2, 3, 4, 5, 8, 9, 31, 32, 100, 101, 1000, 1001, 4096, 4097]) {
            for (let repeat = 0; repeat < 4; repeat++) {
                for (const [shape, values] of Object.entries(shapes(size, random))) {
                    const expected = sortedReference(values);
                    const actual = computeColumnStatistics(arrayColumn(values));
                    const label = `${shape} of ${size}, repeat ${repeat}`;
                    assert.isTrue(Object.is(actual.median, expected.median), `median of ${label}`);
                    assert.strictEqual(actual.tiedAtMin, expected.tiedAtMin, `tiedAtMin of ${label}`);
                    checked++;
                }
            }
        }

        assert.isAbove(checked, 500);
    });

    it("does not sort to find the median of a large column", () => {
        const typedSort = vi.spyOn(Float64Array.prototype, "sort");
        const arraySort = vi.spyOn(Array.prototype, "sort");
        const random = seeded(42);

        for (const values of Object.values(shapes(200_000, random))) {
            computeColumnStatistics(arrayColumn(values));
        }

        assert.strictEqual(typedSort.mock.calls.length, 0, "Float64Array sort calls");
        assert.strictEqual(arraySort.mock.calls.length, 0, "Array sort calls");
    });
});
