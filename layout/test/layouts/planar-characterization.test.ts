/**
 * Pins planar's exact output, recorded before its canonical ordering was split into steps, so any refactor of the
 * shift method that changes a single coordinate fails here.
 */

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, it } from "vitest";

import * as layout from "../../src";
import { nonPlanarCases, planarCases } from "./planar-cases";

// relative to the package root, where vitest runs
const recorded = JSON.parse(
    readFileSync(resolve("test/layouts/fixtures/planar-characterization.json"), "utf8"),
) as Record<string, { d2: number[]; d3: number[] }>;

describe("planar: recorded output", () => {
    for (const [name, s] of planarCases()) {
        it(`${name} matches its recorded positions exactly`, () => {
            const expected = recorded[name];
            assert.ok(expected !== undefined, `no recording for ${name}`);
            assert.deepEqual(Array.from(layout.planar(s).positions), expected.d2);
            assert.deepEqual(
                Array.from(layout.planar(s, { dim: 3, scale: 7, center: [1, -2, 3] }).positions),
                expected.d3,
            );
        });
    }

    for (const [name, s] of nonPlanarCases()) {
        it(`${name} is refused with E_NOT_PLANAR`, () => {
            assert.throws(
                () => layout.planar(s),
                (e: Error & { code?: string }) => e.code === "E_NOT_PLANAR" && e.message === "G is not planar.",
            );
        });
    }
});
