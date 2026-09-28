/**
 * Golden fixtures: outputs of the positional layout functions of layout 1.x, recorded before 2.0.0 removed them,
 * against which the promoted layouts are checked. Each fixture file holds, per key, the rows of one call in node-index
 * order. NaN and the infinities are stored as strings, which JSON cannot hold as numbers.
 */

import assert from "node:assert";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type { NodeIdMap } from "@graphty/graph-format";

import type { LayoutResult, PositionMap } from "../../src";

type Stored = (number | string)[][];

/** Set to 1 to rerun the legacy calls and rewrite the fixture files; only possible while the legacy code exists. */
const RECORD = process.env.LAYOUT_GOLDEN_RECORD === "1";

const encode = (v: number): number | string => (Number.isFinite(v) ? v : String(v));
const decode = (v: number | string): number => (typeof v === "number" ? v : Number(v));

/**
 * The golden fixtures of one test file.
 * @param name - the fixture file's name, without the extension
 * @returns a lookup: the rows recorded under a key (with `legacy` and LAYOUT_GOLDEN_RECORD=1, recorded now)
 */
export function goldenFile(name: string): (key: string, ids: NodeIdMap, legacy?: () => PositionMap) => number[][] {
    // relative to the package root, where vitest runs: under happy-dom import.meta.url is not a file URL
    const file = resolve("test/indexed/fixtures", `${name}.golden.json`);
    const store: Record<string, Stored> = existsSync(file)
        ? (JSON.parse(readFileSync(file, "utf8")) as Record<string, Stored>)
        : {};
    return (key, ids, legacy) => {
        if (RECORD && legacy !== undefined) {
            const map = legacy();
            store[key] = Array.from({ length: ids.size }, (_, i) => map[ids.idOf(i) as string].map(encode));
            // one row per line
            const body = Object.entries(store).map(
                ([k, rows]) => `  ${JSON.stringify(k)}: [\n${rows.map((r) => `    ${JSON.stringify(r)}`).join(",\n")}\n  ]`,
            );
            writeFileSync(file, `{\n${body.join(",\n")}\n}\n`);
        }
        const rows = store[key];
        assert.ok(rows !== undefined, `no golden fixture ${name}/${key}`);
        return rows.map((r) => r.map(decode));
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
