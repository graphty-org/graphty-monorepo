/**
 * sigma.js settings the Gephi JSON specimen sheets and the worldcup sample showed graph-io dropping: two rules sigma
 * draws in screen pixels, whatever the file's lengths (`graph-io/test/fidelity/specimens/gephi-json/`).
 */

import { describe, expect, it } from "vitest";

import { createRegistry } from "../../src/registry.js";
import { resolveStyles, type StyleProperty, type StyleTarget } from "../../src/styles/internal.js";

const registry = createRegistry();

/** A Gephi JSON Exporter document: two nodes of sizes 2 and 10, one edge of size 1 and one of size 0. */
const DOC = {
    nodes: [
        { id: "small", label: "Small", x: 0, y: 0, size: 2, color: "rgb(200,0,0)", attributes: {} },
        { id: "big", label: "Big", x: 100, y: 0, size: 10, color: "rgb(0,0,200)", attributes: {} },
    ],
    edges: [
        { id: "e1", source: "small", target: "big", size: 1, color: "rgb(0,0,0)", attributes: {} },
        { id: "e0", source: "big", target: "small", size: 0, color: "rgb(0,0,0)", attributes: {} },
    ],
};

/**
 * The value of a property for each node or edge of the document.
 * @param target - nodes or edges
 * @param property - the property
 * @returns the values, by element index
 */
async function values(target: StyleTarget, property: string): Promise<readonly unknown[]> {
    const r = await registry.importGraph(JSON.stringify(DOC), { format: "json", styles: true });
    if (r.styles === null || r.styles === undefined) {
        throw new Error("no styles");
    }
    return resolveStyles(r.styles, target, property as StyleProperty, r.snapshot);
}

describe("sigma.js's screen-pixel rules on a Gephi JSON export", () => {
    it("draws no edge thinner than sigma's minEdgeThickness, in screen pixels (0.85 px drawn)", async () => {
        // sigma's edge program draws max(size, minEdgeThickness 1.7) half as wide, in screen pixels: worldcup's 9,228
        // edges of size 1 draw 0.85 px however small the framing makes a size, and size 0 draws 0.85 px too
        expect(await values("edge", "minScreenWidth")).toEqual([0.85, 0.85]);
    });

    it("hides the label of a node drawn under sigma's labelRenderedSizeThreshold (a 6 px radius)", async () => {
        // sigma's renderLabels skips a node whose rendered size (a radius) is under 6 px: 12 px across
        expect(await values("node", "labelMinNodeScreenSize")).toEqual([12, 12]);
        expect(await values("node", "label")).toEqual(["Small", "Big"]);
    });
});
