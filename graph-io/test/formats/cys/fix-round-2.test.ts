/**
 * Cytoscape session specimen fixes, round 2: what Cytoscape desktop 3.10.5's own SVG export draws for the session
 * sheets' settings (the cys-specimen-* oracles in graph-io/test/fidelity/oracles/), read from the sessions Cytoscape
 * itself saved.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { createRegistry } from "../../../src/registry.js";
import { type ExtractedStyles, resolveStyles } from "../../../src/styles/internal.js";
import type { StyleProperty } from "../../../src/styles/types.js";

const registry = createRegistry();
const SHEETS = resolve(import.meta.dirname, "../../fidelity/specimens/cys");

/**
 * Imports a specimen session and reads its edges' values by their specimen names.
 * @param sheet - the sheet's file name
 * @returns a getter of one property of the named edges
 */
async function edges(sheet: string): Promise<(property: StyleProperty, names: readonly string[]) => unknown[]> {
    const bytes = new Uint8Array(readFileSync(resolve(SHEETS, sheet)));
    const { snapshot, styles } = await registry.importGraph(bytes, { format: "cys", styles: true });
    const name = snapshot.edges.get("name");
    const at = new Map<string, number>();
    for (let i = 0; i < snapshot.edgeCount; i++) {
        if (name?.isSet(i) === true) {
            at.set(String(name.value(i)), i);
        }
    }
    return (property, names) => {
        const values = resolveStyles(styles as ExtractedStyles, "edge", property, snapshot);
        return names.map((n) => values[at.get(n) ?? -1]);
    };
}

describe("session arrows and parallel edges", () => {
    it("draws ARROW as the filled delta Cytoscape desktop draws (cys-specimen-arrows)", async () => {
        const get = await edges("specimen-arrows.cys");
        expect(get("targetArrow", ["target-arrow-shape-arrow"])).toEqual(["triangle"]);
        expect(get("sourceArrow", ["source-arrow-shape-arrow"])).toEqual(["triangle"]);
    });

    it("draws HAYSTACK parallel edges straight and fans AUTO_BEND ones under EDGE_CURVED false", async () => {
        const get = await edges("specimen-edges-lines.cys");
        const haystack = ["stacking-haystack-a", "stacking-haystack-b", "stacking-haystack-c"];
        expect(get("curved", haystack).map((c) => c === true)).toEqual([false, false, false]);
        expect(get("fanSpacing", haystack)).toEqual([null, null, null]);
        // desktop draws the newest of a pair's edges straight and bends the ones before it, curved or not
        const uncurved = ["curved-false-parallel-a", "curved-false-parallel-b", "curved-false-parallel-c"];
        expect(get("curved", uncurved)).toEqual([false, true, true]);
        expect(get("fanSpacing", uncurved).map((v) => typeof v)).toEqual(["object", "number", "number"]);
    });
});
