/**
 * Which LLM regression cases a rotating run executes.
 * @module test/ai/llm-regression-rotation.test
 */

import { assert, describe, it } from "vitest";

import { isSelected, type LlmRegressionSelection, sliceOf } from "../helpers/llm-regression-rotation";

const NAMES = Array.from(
    { length: 200 },
    (_, i) => `test/ai/llm-regression/file-${i % 13}.test.ts > suite ${i % 7} > case ${i}`,
);
const slice = (n: number, also: string[] = []): LlmRegressionSelection => ({ full: false, slice: n, slices: 4, also });

describe("LLM regression rotation", () => {
    it("puts a case in the same slice every time", () => {
        for (const name of NAMES) {
            assert.strictEqual(sliceOf(name, 4), sliceOf(name, 4));
            assert.isAtLeast(sliceOf(name, 4), 0);
            assert.isBelow(sliceOf(name, 4), 4);
        }
        // pinned: a changed hash would move every case to another slice and break the rotation's every-K-runs promise
        assert.deepEqual(
            [
                "a > b > c",
                "x > y",
                "test/ai/llm-regression/a.test.ts > b > c",
                "test/ai/llm-regression/a.test.ts > b > d",
            ].map((name) => sliceOf(name, 4)),
            [3, 2, 0, 1],
        );
    });

    it("runs every case exactly once across K runs, and splits them roughly evenly", () => {
        for (const name of NAMES) {
            const runs = [0, 1, 2, 3].filter((n) => isSelected(name, slice(n)));
            assert.strictEqual(runs.length, 1, name);
        }
        for (const n of [0, 1, 2, 3]) {
            const count = NAMES.filter((name) => isSelected(name, slice(n))).length;
            assert.isAtLeast(count, 30);
            assert.isAtMost(count, 70);
        }
    });

    it("always runs a case named in also, whatever its slice", () => {
        const name = NAMES[0];
        const other = (sliceOf(name, 4) + 1) % 4;
        assert.isFalse(isSelected(name, slice(other)));
        assert.isTrue(isSelected(name, slice(other, [name])));
    });

    it("runs every case when full, or with no selection", () => {
        assert.isTrue(NAMES.every((name) => isSelected(name, { ...slice(0), full: true })));
        assert.isTrue(NAMES.every((name) => isSelected(name, undefined)));
    });
});
