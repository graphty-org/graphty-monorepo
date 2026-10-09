/**
 * Golden fixtures: outputs of the positional layout functions of layout 1.x, recorded in node-index order before
 * 2.0.0 removed them (the recording code is in the commit that added the fixtures), against which the layouts and the
 * simulations are checked. NaN and the infinities are stored as strings, which JSON cannot hold as numbers.
 */

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { LayoutResult } from "../../src";
import { rescaleInPlace } from "../../src/positions";

/**
 * Golden rows put through the rescale every one-shot layout ends with: centred on their mean, the farthest at 1.
 * @param rows - the golden rows in node-index order
 * @returns the rescaled rows
 */
export function rescaledRows(rows: number[][]): number[][] {
    const dim = rows[0]?.length ?? 2;
    const flat = rescaleInPlace(Float64Array.from(rows.flat()), dim);
    return rows.map((_, i) => Array.from(flat.subarray(dim * i, dim * (i + 1))));
}

/**
 * The golden fixtures of one test file.
 * @param name - the fixture file's name, without the extension
 * @returns a lookup: the rows recorded under a key, in node-index order
 */
export function goldenFile(name: string): (key: string) => number[][] {
    // relative to the package root, where vitest runs: under happy-dom import.meta.url is not a file URL
    const file = resolve("test/layouts/fixtures", `${name}.golden.json`);
    const store = JSON.parse(readFileSync(file, "utf8")) as Record<string, (number | string)[][]>;
    return (key) => {
        const rows = store[key];
        assert.ok(rows !== undefined, `no golden fixture ${name}/${key}`);
        return rows.map((r) => r.map(Number));
    };
}

/**
 * Asserts every row of a layout result is within `tolerance` of the golden rows (f32 output against recorded f64).
 * @param actual - the layout result
 * @param expected - the golden rows in node-index order
 * @param tolerance - the largest difference allowed per component
 */
export function matchesGolden(actual: LayoutResult, expected: number[][], tolerance = 1e-6): void {
    assert.equal(actual.n, expected.length, "node count");
    expected.forEach((p, i) => {
        assert.equal(actual.dim, p.length, `node ${i} length`);
        p.forEach((v, k) => {
            const a = actual.positions[actual.dim * i + k];
            assert.ok(
                Object.is(a, v) || (Number.isNaN(a) && Number.isNaN(v)) || Math.abs(a - v) <= tolerance,
                `node ${i}[${k}]: ${a} vs ${v}`,
            );
        });
    });
}
