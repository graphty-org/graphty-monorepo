/**
 * What Cytoscape desktop 3.10.5 draws for the CX settings fix round 3 of its specimen sheets showed graph-io read
 * otherwise.
 */

import { describe, expect, it } from "vitest";

import { createRegistry } from "../../../src/registry.js";
import { type ExtractedStyles, resolveStyles } from "../../../src/styles/internal.js";

const registry = createRegistry();

/**
 * Imports a CX document of two nodes, `s` left of `t`, joined by two edges from `s` to `t`, with its styles.
 * @param ids - the node ids of `s` and `t`, and the two edges' ids
 * @param idsAs - how the import reads ids (`string`, as graphty-element asks)
 * @returns a getter of what graphty draws for an edge property of both edges
 */
async function pair(ids: readonly [s: number, t: number, a: number, b: number], idsAs?: "string") {
    const [s, t, a, b] = ids;
    const doc = JSON.stringify([
        {
            nodes: [
                { "@id": s, n: "s" },
                { "@id": t, n: "t" },
            ],
        },
        {
            edges: [
                { "@id": a, s, t },
                { "@id": b, s, t },
            ],
        },
        {
            cartesianLayout: [
                { node: s, x: 0, y: 0 },
                { node: t, x: 100, y: 0 },
            ],
        },
        {
            cyVisualProperties: [
                { properties_of: "nodes:default", properties: { NODE_WIDTH: "20", NODE_HEIGHT: "20" } },
                { properties_of: "edges:default", properties: { EDGE_CURVED: "true" } },
            ],
        },
        { status: [{ error: "", success: true }] },
    ]);
    const { snapshot, styles } = await registry.importGraph(new TextEncoder().encode(doc), {
        format: "cx",
        styles: true,
        ...(idsAs === undefined ? {} : { ids: idsAs }),
    });
    return (property: string): readonly unknown[] =>
        resolveStyles(styles as ExtractedStyles, "edge", property as never, snapshot);
}

/**
 * The side a bend lies on, left of its edge's direction (1) or right (-1), or null without one.
 * @param bends - an edge's bends
 * @returns the side
 */
function side(bends: unknown): number | null {
    return typeof bends === "string" ? Math.sign(Number(bends.split(",")[1])) : null;
}

describe("CX parallel edges fanned by Cytoscape desktop", () => {
    it("bows the fanned edge to the side desktop's hash-ordered creation puts it", async () => {
        // cx-specimen-edges-lines parallel-2 bows up, cx-specimen-mappings-bypass-p10 down, from files whose node
        // and edge order is the same: desktop's CX reader creates nodes as a HashMap of their ids iterates, makes
        // views newest node first, and fans from the node whose view it made first
        const before = await pair([1, 2, 3, 4]);
        expect(before("bends").map(side)).toEqual([1, null]);
        expect(before("bendCurve")[0]).toBe("bezier");
        // the newest edge in hash order stays straight; the other bows twice its fan spacing off at its control point
        expect(before("bends")[0]).toBe(`0.5,${String((2 * 10) / 100)}`);
        const swapped = await pair([2, 1, 3, 4]);
        expect(swapped("bends").map(side)).toEqual([-1, null]);
        // ids read as text are still the file's integers
        const text = await pair([2, 1, 3, 4], "string");
        expect(text("bends").map(side)).toEqual([-1, null]);
    });

    it("leaves the fan to graphty in a collection, whose elements desktop creates in list order", async () => {
        const doc = JSON.stringify([
            { cySubNetworks: [{ "@id": 9, nodes: "all", edges: "all" }] },
            { nodes: [{ "@id": 1 }, { "@id": 2 }] },
            {
                edges: [
                    { "@id": 3, s: 1, t: 2 },
                    { "@id": 4, s: 1, t: 2 },
                ],
            },
            {
                cartesianLayout: [
                    { node: 1, x: 0, y: 0, view: 9 },
                    { node: 2, x: 100, y: 0, view: 9 },
                ],
            },
            { status: [{ error: "", success: true }] },
        ]);
        const { snapshot, styles } = await registry.importGraph(new TextEncoder().encode(doc), {
            format: "cx",
            styles: true,
        });
        const bends = resolveStyles(styles as ExtractedStyles, "edge", "bends", snapshot);
        expect(bends.every((v) => v === null)).toBe(true);
    });
});
