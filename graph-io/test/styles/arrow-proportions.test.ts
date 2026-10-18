/**
 * Each end's arrow as the writing program draws it beyond its neutral shape: Cytoscape's source arrow at its own
 * size and its short and crossed arrows' proportions, and Graphviz's arrow names of several shapes and halves.
 */
import { describe, expect, it } from "vitest";

import { createRegistry } from "../../src/registry.js";
import { resolveStyles } from "../../src/styles/index.js";

const registry = createRegistry();

/**
 * Each edge's values of some properties, as an import with styles resolves them.
 * @param format - the format
 * @param doc - the file
 * @param props - the properties
 * @returns the values per property
 */
async function edgeValues(format: string, doc: string, props: readonly string[]): Promise<Record<string, unknown[]>> {
    const result = await registry.importGraph(doc, { format, styles: true, errorLimit: Infinity });
    const { styles, snapshot } = result;
    if (styles === null || styles === undefined) {
        throw new Error("no styles");
    }
    return Object.fromEntries(props.map((p) => [p, resolveStyles(styles, "edge", p as never, snapshot)]));
}

/**
 * A CX2 file of two edges with the given edge defaults and the second edge's bypasses.
 * @param defaults - the edge defaults
 * @param bypass - the second edge's own values
 * @returns the file
 */
function cx2(defaults: Record<string, unknown>, bypass: Record<string, unknown> = {}): string {
    return JSON.stringify([
        { CXVersion: "2.0", hasFragments: false },
        { nodes: [{ id: 1 }, { id: 2 }, { id: 3 }] },
        {
            edges: [
                { id: 10, s: 1, t: 2 },
                { id: 11, s: 2, t: 3 },
            ],
        },
        { visualProperties: [{ default: { edge: defaults } }] },
        { edgeBypasses: [{ id: 11, v: bypass }] },
        { status: [{ error: "", success: true }] },
    ]);
}

describe("Cytoscape's arrows", () => {
    it("keeps the source end's size where it differs from the target's, Cytoscape's 6 where unset", async () => {
        const doc = cx2({ EDGE_TARGET_ARROW_SIZE: 9, EDGE_SOURCE_ARROW_SIZE: 12 }, { EDGE_SOURCE_ARROW_SIZE: 9 });
        const v = await edgeValues("cx2", doc, ["arrowSize", "sourceArrowSize"]);
        expect(v.arrowSize).toEqual([1.5, 1.5]);
        expect(v.sourceArrowSize).toEqual([2, 1.5]);
        const unset = await edgeValues("cx2", cx2({ EDGE_TARGET_ARROW_SIZE: 9 }), ["sourceArrowSize"]);
        expect(unset.sourceArrowSize).toEqual([1, 1]);
    });

    it("leaves out the source size when both ends are sized alike", async () => {
        const v = await edgeValues("cx2", cx2({ EDGE_TARGET_ARROW_SIZE: 9, EDGE_SOURCE_ARROW_SIZE: 9 }), [
            "sourceArrowSize",
        ]);
        expect(v.sourceArrowSize).toEqual([null, null]);
    });

    it("draws a short or crossed arrow as its neutral shape, shorter or longer, and a bypass back at full size", async () => {
        const doc = cx2(
            { EDGE_TARGET_ARROW_SHAPE: "DELTA_SHORT_1", EDGE_SOURCE_ARROW_SHAPE: "ARROW_SHORT" },
            { EDGE_TARGET_ARROW_SHAPE: "DELTA", EDGE_SOURCE_ARROW_SHAPE: "CROSS_DELTA" },
        );
        const v = await edgeValues("cx2", doc, [
            "targetArrow",
            "targetArrowLength",
            "targetArrowWidth",
            "sourceArrow",
            "sourceArrowLength",
            "sourceArrowWidth",
        ]);
        expect(v.targetArrow).toEqual(["triangle", "triangle"]);
        expect(v.targetArrowLength).toEqual([0.5, null]);
        expect(v.targetArrowWidth).toEqual([null, null]);
        expect(v.sourceArrow).toEqual(["vee", "vee"]);
        expect(v.sourceArrowLength).toEqual([0.6, 1.5]);
        expect(v.sourceArrowWidth).toEqual([0.8, 1.5]);
    });

    it("states no proportion for a file of arrows drawn in their shapes' own", async () => {
        const v = await edgeValues("cx2", cx2({ EDGE_TARGET_ARROW_SHAPE: "DELTA", EDGE_SOURCE_ARROW_SHAPE: "T" }), [
            "targetArrowLength",
            "sourceArrowWidth",
        ]);
        expect(v.targetArrowLength).toEqual([null, null]);
        expect(v.sourceArrowWidth).toEqual([null, null]);
    });
});

describe("Graphviz's arrow names", () => {
    it("draws the shape at the edge's end, half as wide for an l or r half, and a one-sided normal as half", async () => {
        const doc = `digraph {
            a -> b [arrowhead=dotodot]; b -> c [arrowhead=ltee]; c -> d [arrowhead=lteeoldiamond];
            d -> e [arrowhead=olnormal]; e -> f [arrowhead=rcrow]; f -> g [arrowhead=nonenormal];
            g -> h [arrowhead=obox]; h -> i [arrowhead=empty]; i -> j [dir=back, arrowtail=lbox];
        }`;
        const v = await edgeValues("dot", doc, ["targetArrow", "targetArrowWidth", "sourceArrow", "sourceArrowWidth"]);
        expect(v.targetArrow).toEqual([
            "circle",
            "tee",
            "tee",
            "half",
            "crow",
            "triangle",
            "square",
            "triangle-open",
            "none",
        ]);
        expect(v.targetArrowWidth).toEqual([null, 0.5, 0.5, null, 0.5, null, null, null, null]);
        expect(v.sourceArrow.at(-1)).toBe("square");
        expect(v.sourceArrowWidth.at(-1)).toBe(0.5);
    });
});
