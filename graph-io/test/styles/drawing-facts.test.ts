/**
 * The facts a program that draws a file's styles needs from graph-io beside the rules: which elements a rule's
 * condition selects, which imported columns are the file's own style slots, and how round a program draws a rounded
 * rectangle the file gives no radius for.
 */

import { describe, expect, it } from "vitest";

import { createRegistry } from "../../src/registry.js";
import {
    type ExtractedStyles,
    isStyleSlotColumn,
    matchPredicate,
    type Predicate,
    resolveStyles,
    TOOL_DEFAULTS,
} from "../../src/styles/internal.js";

const registry = createRegistry();

/** A CX2 document of three nodes and one edge, node 2 with a shape bypass. */
const CX2 = JSON.stringify([
    { CXVersion: "2.0", hasFragments: false },
    { attributeDeclarations: [{ nodes: { kind: { d: "string" }, size: { d: "double" } } }] },
    { nodes: [{ id: 1, v: { kind: "a", size: 1 } }, { id: 2, v: { kind: "b", size: 5 } }, { id: 3 }] },
    { edges: [{ id: 0, s: 1, t: 2 }] },
    { nodeBypasses: [{ id: 2, v: { NODE_SHAPE: "diamond" } }] },
    { status: [{ error: "", success: true }] },
]);

const XGMML = `<?xml version="1.0"?>
<graph label="g" directed="1" xmlns="http://www.cs.rpi.edu/XGMML">
  <node id="1" label="a"><att name="kind" type="string" value="a"/><graphics fill="#FF0000" w="30" h="30"/></node>
  <node id="2" label="b"><graphics fill="#00FF00"/></node>
  <edge id="3" source="1" target="2"><graphics fill="#0000FF"/></edge>
</graph>`;

const load = (text: string, format: string): ReturnType<typeof registry.importGraph> =>
    registry.importGraph(new TextEncoder().encode(text), { format, styles: true });

describe("matchPredicate", () => {
    it("selects exactly the elements a rule with that condition gives a value to", async () => {
        const { snapshot, styles } = await load(CX2, "cx2");
        const ex = styles as ExtractedStyles;
        const conditions: Predicate[] = [
            { all: true },
            { has: { data: "kind" } },
            { eq: [{ data: "kind" }, "a"] },
            { in: [{ data: "kind" }, ["a", "b"]] },
            { not: { eq: [{ data: "kind" }, "b"] } },
            { and: [{ has: { data: "kind" } }, { not: { eq: [{ data: "kind" }, "a"] } }] },
        ];
        const selected: string[][] = [];
        for (const where of conditions) {
            const got = matchPredicate(ex, "node", where, snapshot);
            const probe: ExtractedStyles = {
                ...ex,
                styles: {
                    ...ex.styles,
                    rules: [{ id: "p", target: "node", role: "group", origin: "inferred", where, set: { label: "x" } }],
                },
            };
            const want = resolveStyles(probe, "node", "label", snapshot).map((v) => v !== null);
            expect(got, JSON.stringify(where)).toEqual(want);
            selected.push(got.flatMap((m, i) => (m ? [String(snapshot.ids.idOf(i))] : [])));
        }
        expect(selected).toEqual([["1", "2", "3"], ["1", "2"], ["1"], ["1", "2"], ["1", "3"], ["2"]]);
        expect(matchPredicate(ex, "edge", { all: true }, snapshot)).toEqual([true]);
    });
});

describe("isStyleSlotColumn", () => {
    it("names a CX2 file's bypass columns and an XGMML element's graphics, never its data", async () => {
        const cx2 = await load(CX2, "cx2");
        const slots = (snapshot: typeof cx2.snapshot, table: "nodes" | "edges"): string[] =>
            [...snapshot[table]].filter((c) => isStyleSlotColumn(c.meta)).map((c) => c.meta.name);
        expect(slots(cx2.snapshot, "nodes").length).toBeGreaterThan(0);
        expect(slots(cx2.snapshot, "nodes")).not.toContain("kind");
        expect(slots(cx2.snapshot, "nodes")).not.toContain("size");

        const xgmml = await load(XGMML, "xgmml");
        expect(slots(xgmml.snapshot, "nodes")).toEqual(["graphics"]);
        expect(slots(xgmml.snapshot, "edges")).toEqual(["graphics"]);
    });
});

describe("TOOL_DEFAULTS roundedCornerRadius", () => {
    it("is Cytoscape.js's stated 8 for every program, each citing where it comes from", () => {
        for (const [tool, d] of TOOL_DEFAULTS) {
            expect(d.roundedCornerRadius?.value, tool).toBe(8);
            expect(d.roundedCornerRadius?.source, tool).toMatch(/^cytoscape\.js 3\.34\.3 .* line 4386/);
        }
    });
});

describe("TOOL_DEFAULTS arrowhead", () => {
    const length = (tool: string, size: number, width: number): number | undefined =>
        TOOL_DEFAULTS.get(tool)?.arrowhead?.length(size, width);

    it("sizes each program's arrowhead the way its own SVG export draws it", () => {
        // Cytoscape desktop: a DELTA twice (EDGE_*_ARROW_SIZE 6 + width) long, half as wide
        expect(length("cytoscape", 1, 1)).toBe(14);
        expect(length("cytoscape", 1, 2)).toBe(16);
        // an edge whose source arrow is a half arrow: EDGE_*_ARROW_SIZE times the width, at both ends
        const half = TOOL_DEFAULTS.get("cytoscape")?.arrowhead?.length;
        expect(half?.(10 / 6, 1.5, "half")).toBeCloseTo(30, 9);
        expect(half?.(1, 2, "other:half-bottom")).toBe(24);
        expect(half?.(1, 2, "triangle")).toBe(16);
        expect(TOOL_DEFAULTS.get("cytoscape")?.arrowhead?.aspect).toBe(0.5);
        // its T bar as wide as the DELTA is long, a tenth of that deep
        expect(TOOL_DEFAULTS.get("cytoscape")?.arrowhead?.shapes?.tee).toEqual({ length: 0.1, aspect: 10 });
        // Cytoscape.js: 0.3 of max((13.37 width)^0.9, 29) times arrow-scale
        expect(length("cytoscape-js", 1, 3)).toBeCloseTo(8.7, 6);
        expect(length("cytoscape-js", 2, 10)).toBeCloseTo(0.6 * 133.7 ** 0.9, 6);
        // Graphviz: ARROW_LENGTH 10 times arrowsize, whatever the pen width
        expect(length("graphviz", 1.5, 4)).toBe(15);
        // Gephi: in proportion to the edge's thickness
        expect(length("gephi", 1, 4)).toBe(13);
        // vis-network: 15 times scaleFactor plus 3 widths
        expect(length("vis-network", 1, 1)).toBe(18);
        // yEd, as draw.io draws its files: endSize 6 plus the width
        expect(length("yed", 1, 1)).toBe(7);
    });

    it("reads Cytoscape's EDGE_TARGET_ARROW_SIZE as the factor of its normal 6", async () => {
        const cx2 = JSON.stringify([
            { CXVersion: "2.0", hasFragments: false },
            { nodes: [{ id: 1 }, { id: 2 }] },
            { edges: [{ id: 0, s: 1, t: 2 }] },
            { visualProperties: [{ default: { edge: { EDGE_TARGET_ARROW_SIZE: 12, EDGE_SOURCE_ARROW_SIZE: 9 } } }] },
            { status: [{ error: "", success: true }] },
        ]);
        const r = await load(cx2, "cx2");
        expect(resolveStyles(r.styles as ExtractedStyles, "edge", "arrowSize", r.snapshot)).toEqual([2]);
    });

    it("names where each rule comes from", () => {
        for (const [tool, d] of TOOL_DEFAULTS) {
            if (d.arrowhead !== undefined) {
                expect(d.arrowhead.source.length, tool).toBeGreaterThan(10);
                expect(d.arrowhead.aspect, tool).toBeGreaterThan(0);
            }
        }
    });
});

describe("the background of a file that names none", () => {
    it.each([
        ["dot", "digraph { a -> b }"],
        [
            "json",
            JSON.stringify({ elements: [{ data: { id: "a" } }], style: [{ selector: "node", style: { width: 9 } }] }),
        ],
        [
            "json",
            JSON.stringify({
                nodes: [
                    { id: 1, label: "a", color: { background: "#ff0000" } },
                    { id: 2, label: "b" },
                ],
                edges: [{ from: 1, to: 2, arrows: "to" }],
            }),
        ],
    ])("is the white its program draws (%s %s)", async (format, text) => {
        const { styles } = await load(text, format);
        expect((styles as ExtractedStyles).styles.graph.background).toBe("#ffffff");
    });

    it("is the file's own when it names one", async () => {
        const { styles } = await load('digraph { bgcolor="#f8f4e8"; a -> b }', "dot");
        expect((styles as ExtractedStyles).styles.graph.background).toBe("#f8f4e8");
    });
});

describe("TOOL_DEFAULTS nodeBorderOnScreen", () => {
    it("is set for vis-network alone, which divides a node's border width by its view's scale", () => {
        const onScreen = [...TOOL_DEFAULTS].filter(([, d]) => d.nodeBorderOnScreen?.value === true).map(([t]) => t);
        expect(onScreen).toEqual(["vis-network"]);
        expect(TOOL_DEFAULTS.get("vis-network")?.nodeBorderOnScreen?.source).toMatch(/view\.scale/);
    });
});

describe("TOOL_DEFAULTS labelSizeOnScreen", () => {
    it("is set for sigma alone, which draws every label at its size in screen pixels whatever the zoom", () => {
        const onScreen = [...TOOL_DEFAULTS].filter(([, d]) => d.labelSizeOnScreen?.value === true).map(([t]) => t);
        expect(onScreen).toEqual(["sigma"]);
        expect(TOOL_DEFAULTS.get("sigma")?.labelSizeOnScreen?.source).toMatch(/zoomToLabelSizeRatioFunction/);
    });
});
