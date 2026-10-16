/**
 * Defects found in the style fidelity corpus, each pinned by the small file that reproduces it
 * (`test/corpus/styles/<format>/fidelity/repro-*`, written by `test/fidelity/generators/gen_repros.py`)
 * or by a few lines of the format: what graph-io's planned styles say each element looks like,
 * read through `resolveStyles()`.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { createRegistry } from "../../src/registry.js";
import { resolveStyles, type StyleTarget } from "../../src/styles/internal.js";

const registry = createRegistry();
const CORPUS = resolve(import.meta.dirname, "../corpus/styles");

/**
 * Imports a document with its styles.
 * @param doc - the file's bytes or text
 * @param format - its format
 * @returns the import result
 */
async function load(doc: string | Uint8Array, format: string): ReturnType<typeof registry.importGraph> {
    const r = await registry.importGraph(doc, { format, styles: true, errorLimit: Infinity });
    if (!r.styles) {
        throw new Error("no styles");
    }
    return r;
}

/**
 * A corpus file's bytes.
 * @param path - relative to the styles corpus
 * @returns the bytes
 */
function corpus(path: string): Uint8Array {
    return new Uint8Array(readFileSync(resolve(CORPUS, path)));
}

/**
 * Each element's planned value of one property.
 * @param r - the import result
 * @param target - nodes or edges
 * @param property - the property
 * @returns the values by element index
 */
function planned(r: Awaited<ReturnType<typeof load>>, target: StyleTarget, property: string): unknown[] {
    if (!r.styles) {
        throw new Error("no styles");
    }
    return [...resolveStyles(r.styles, target, property, r.snapshot)];
}

describe("Cytoscape's size lock", () => {
    it("draws a node that sets its own width and height at them, the rest at the locked size", async () => {
        const r = await load(corpus("cx/fidelity/repro-locked-own-size.cx"), "cx");
        const width = planned(r, "node", "width") as number[];
        const height = planned(r, "node", "height") as number[];
        // nodes 0..9 set their own size (node 0: 61.3678, node 3: 187.7697); 10 and 11 take the mapped size
        expect(width[0]).toBeCloseTo(61.3678, 3);
        expect(height[3]).toBeCloseTo(187.7697, 3);
        expect(width.slice(0, 10).every((w, i) => w === height[i])).toBe(true);
        for (const i of [10, 11]) {
            expect(width[i]).toBeGreaterThanOrEqual(10);
            expect(width[i]).toBeLessThanOrEqual(30);
        }
    });
});
