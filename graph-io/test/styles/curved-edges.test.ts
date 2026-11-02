/**
 * An edge is `curved` only when the file's own tool draws it curved: Cytoscape desktop rounds the bends of an edge
 * that has them, Cytoscape.js bows `bezier` edges only where several join the same two nodes, and yEd smooths the
 * bends of an edge that has them. An edge with no bends between two nodes it alone joins is drawn straight by all
 * three, so it is never marked curved.
 */

import { describe, expect, it } from "vitest";

import { createRegistry } from "../../src/registry.js";
import { toolDefaults } from "../../src/styles/defaults.js";
import { resolveStyles, type StyleProperty } from "../../src/styles/internal.js";

const registry = createRegistry();

/**
 * Each edge's `curved` value, by edge index.
 * @param doc - the file
 * @param format - its format
 * @returns the values
 */
async function curved(doc: string, format: string): Promise<unknown[]> {
    return edgeValues(doc, format, "curved");
}

/**
 * Each edge's value of one property, by edge index.
 * @param doc - the file
 * @param format - its format
 * @param property - the property
 * @returns the values
 */
async function edgeValues(doc: string, format: string, property: StyleProperty): Promise<unknown[]> {
    const r = await registry.importGraph(doc, { format, styles: true, errorLimit: Infinity });
    if (!r.styles) {
        throw new Error("no styles");
    }
    return [...resolveStyles(r.styles, "edge", property, r.snapshot)];
}

const YED_HEAD = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:y="http://www.yworks.com/xml/graphml">
<key for="edge" id="d10" yfiles.type="edgegraphics"/>
<graph edgedefault="directed" id="G"><node id="a"/><node id="b"/><node id="c"/>`;

/**
 * A yEd edge from a to b.
 * @param realizer - the realizer element's local name
 * @param inner - its children
 * @returns the edge element
 */
const yedEdge = (realizer: string, inner: string): string =>
    `<edge source="a" target="b"><data key="d10"><y:${realizer}>${inner}</y:${realizer}></data></edge>`;

const BEND = `<y:Path sx="0" sy="0" tx="0" ty="0"><y:Point x="50" y="80"/></y:Path>`;

describe("curved edges: yEd GraphML", () => {
    it("smooths only the bends an edge has: a smoothed edge with no bends is straight", async () => {
        const doc = `${YED_HEAD}
            ${yedEdge("PolyLineEdge", `<y:BendStyle smoothed="true"/>`)}
            ${yedEdge("PolyLineEdge", `${BEND}<y:BendStyle smoothed="true"/>`)}
            ${yedEdge("PolyLineEdge", `${BEND}<y:BendStyle smoothed="false"/>`)}
            </graph></graphml>`;
        expect(await curved(doc, "graphml")).toEqual([false, true, false]);
    });

    it("draws a Bezier, quad curve or spline edge straight until it has control points, and an arc curved", async () => {
        const doc = `${YED_HEAD}
            ${yedEdge("BezierEdge", "")}
            ${yedEdge("BezierEdge", BEND)}
            ${yedEdge("QuadCurveEdge", "")}
            ${yedEdge("SplineEdge", BEND)}
            ${yedEdge("ArcEdge", `<y:Arc height="20" ratio="1" type="fixedRatio"/>`)}
            </graph></graphml>`;
        expect(await curved(doc, "graphml")).toEqual([false, true, false, true, true]);
    });

    it("never fans parallel edges: two arc edges between the same nodes each keep their own arc", async () => {
        const arc = yedEdge("ArcEdge", `<y:Arc height="20" ratio="1" type="fixedRatio"/>`);
        const doc = `${YED_HEAD}${arc}${arc}</graph></graphml>`;
        expect(await edgeValues(doc, "graphml", "fanned")).toEqual([false, false]);
    });
});

describe("fanned edges: each tool's own drawing", () => {
    it("fans Cytoscape desktop's and Cytoscape.js's parallel edges, and neither yEd's nor Gephi's", () => {
        expect(toolDefaults("cytoscape")?.edge.fanned?.value).toBe(true);
        expect(toolDefaults("cytoscape-js")?.edge.fanned?.value).toBe(true);
        expect(toolDefaults("yed")?.edge.fanned?.value).toBe(false);
        expect(toolDefaults("yfiles3")?.edge.fanned?.value).toBe(false);
        expect(toolDefaults("gephi")?.edge.fanned?.value).toBe(false);
    });
});

describe("curved edges: yEd GML", () => {
    /**
     * A yEd GML edge from node 1 to node 2 whose line passes through the given points.
     * @param points - the line's points, the two ends included
     * @returns the edge record
     */
    const gmlEdge = (points: [number, number][]): string => {
        const line = points.map(([x, y]) => `point [ x ${x} y ${y} ]`).join(" ");
        return `edge [ source 1 target 2 graphics [ smoothBends 1 fill "#000000" Line [ ${line} ] ] ]`;
    };

    it("smooths a line's bends, and draws a line with only its two ends straight", async () => {
        const doc = `Creator "yFiles"
            graph [ directed 1
            node [ id 1 graphics [ x 0 y 0 w 30 h 30 ] ]
            node [ id 2 graphics [ x 100 y 0 w 30 h 30 ] ]
            ${gmlEdge([
                [0, 0],
                [100, 0],
            ])}
            ${gmlEdge([
                [0, 0],
                [50, 80],
                [100, 0],
            ])}
            edge [ source 2 target 1 graphics [ smoothBends 1 fill "#000000" ] ]
            ]`;
        expect(await curved(doc, "gml")).toEqual([false, true, false]);
    });
});

describe("curved edges: Cytoscape desktop", () => {
    /**
     * A CX2 file of three nodes and the given edges, with the given edge defaults and bypasses.
     * @param edges - the edges' ends
     * @param defaults - the edge defaults of the style
     * @param bypasses - edge bypasses by edge id
     * @returns the file
     */
    const cx2 = (
        edges: [number, number][],
        defaults: Record<string, unknown>,
        bypasses: Record<number, Record<string, unknown>> = {},
    ): string =>
        JSON.stringify([
            { CXVersion: "2.0", hasFragments: false },
            { nodes: [{ id: 1 }, { id: 2 }, { id: 3 }] },
            { edges: edges.map(([s, t], id) => ({ id, s, t })) },
            { visualProperties: [{ default: { edge: defaults }, edgeMapping: {} }] },
            { edgeBypasses: Object.entries(bypasses).map(([id, v]) => ({ id: Number(id), v })) },
            { status: [{ error: "", success: true }] },
        ]);

    it("rounds only the bends an edge has: EDGE_CURVED on an edge with no bends is straight", async () => {
        const doc = cx2(
            [
                [1, 2],
                [2, 3],
                [1, 3],
            ],
            { EDGE_CURVED: true, EDGE_BEND: "" },
            { 1: { EDGE_BEND: "0.6,0.8,0.5" }, 2: { EDGE_BEND: "0.6,0.8,0.5", EDGE_CURVED: false } },
        );
        expect(await curved(doc, "cx2")).toEqual([false, true, false]);
    });

    it("fans parallel edges: the last of a bundle straight, each earlier one without bends curved", async () => {
        const doc = cx2(
            [
                [1, 2],
                [1, 2],
                [2, 3],
                [3, 3],
                [3, 3],
            ],
            { EDGE_CURVED: true, EDGE_BEND: "" },
        );
        expect(await curved(doc, "cx2")).toEqual([true, false, false, false, false]);
    });

    it("draws straight the newest edge out of the pair's newer node, though an edge out of the older one is newer", async () => {
        // desktop walks a pair's edges as it made their views: the newer node's outgoing edges first, newest first
        // (cx2-signor-aml: 68 -> 27 straight, the later 27 -> 68 curved)
        const doc = cx2(
            [
                [2, 1],
                [1, 2],
                [2, 1],
                [1, 2],
            ],
            { EDGE_CURVED: true, EDGE_BEND: "" },
        );
        expect(await curved(doc, "cx2")).toEqual([true, true, false, true]);
    });

    it("fans nothing when the bundle's last edge has bends; fans them under EDGE_CURVED false too", async () => {
        const bentFirst = cx2(
            [
                [1, 2],
                [1, 2],
            ],
            { EDGE_CURVED: true, EDGE_BEND: "" },
            { 1: { EDGE_BEND: "0.6,0.8,0.5" } },
        );
        expect(await curved(bentFirst, "cx2")).toEqual([false, true]);
        const straight = cx2(
            [
                [1, 2],
                [1, 2],
            ],
            { EDGE_CURVED: false, EDGE_BEND: "" },
        );
        // desktop still curves the earlier one apart (xgmml-specimen-edges-lines.svg, curved-false-parallel)
        expect(await curved(straight, "cx2")).toEqual([true, false]);
    });

    it("spaces the fanned edges by the larger side of the two nodes times the stacking density", async () => {
        const nodes = (doc: string, sizes: Record<number, [number, number]>): string => {
            const parsed = JSON.parse(doc) as Record<string, unknown>[];
            parsed.splice(-1, 0, {
                nodeBypasses: Object.entries(sizes).map(([id, [w, h]]) => ({
                    id: Number(id),
                    v: { NODE_WIDTH: w, NODE_HEIGHT: h },
                })),
            });
            return JSON.stringify(parsed);
        };
        const bundle: [number, number][] = [
            [1, 2],
            [1, 2],
            [2, 1],
            [2, 3],
        ];
        const sized = { 1: [40, 20], 2: [30, 60], 3: [10, 10] } as Record<number, [number, number]>;
        // the anchors are 60 x 2 x 0.5 apart, so the curves' middles 30; the last edge and the lone one are straight
        const plain = nodes(cx2(bundle, { EDGE_CURVED: true, EDGE_BEND: "" }), sized);
        expect(await edgeValues(plain, "cx2", "fanSpacing")).toEqual([30, 30, null, null]);
        const dense = nodes(cx2(bundle, { EDGE_CURVED: true, EDGE_BEND: "", EDGE_STACKING_DENSITY: 0.2 }), sized);
        expect(await edgeValues(dense, "cx2", "fanSpacing")).toEqual([12, 12, null, null]);
    });

    it("gives each self-loop the two handles desktop loops it round, curved through their midpoints", async () => {
        const doc = JSON.parse(
            cx2(
                [
                    [1, 1],
                    [1, 1],
                    [1, 2],
                ],
                { EDGE_CURVED: true, EDGE_BEND: "" },
            ),
        ) as Record<string, unknown>[];
        doc.splice(-1, 0, { nodeBypasses: [{ id: 1, v: { NODE_WIDTH: 12, NODE_HEIGHT: 12, NODE_BORDER_WIDTH: 1 } }] });
        const loops = JSON.stringify(doc);
        // the newest loop is desktop's first: (0 + 3) / 2 x 13 x 2 x 0.5 = 19.5 left and up, 3.25 half widths; the
        // older one (1 + 3) / 2 x 13 = 26
        expect(await edgeValues(loops, "cx2", "bends")).toEqual(["-4.3333,0 0,4.3333", "-3.25,0 0,3.25", null]);
        expect(await curved(loops, "cx2")).toEqual([true, true, false]);
        expect(await edgeValues(loops, "cx2", "bendCurve")).toEqual(["midpoints", "midpoints", "midpoints"]);
    });

    it("draws an edge of a file with no style straight, as Cytoscape's default style does", async () => {
        expect(await curved(cx2([[1, 2]], {}), "cx2")).toEqual([false]);
    });

    it("fans parallel edges of a style that leaves EDGE_CURVED unset, which Cytoscape defaults to true", async () => {
        const bundle: [number, number][] = [
            [1, 2],
            [2, 1],
            [2, 3],
        ];
        expect(await curved(cx2(bundle, {}), "cx2")).toEqual([true, false, false]);
    });
});

describe("curved edges: Cytoscape.js", () => {
    /**
     * A Cytoscape.js document with the given edges and one stylesheet rule for every edge.
     * @param edges - the edges' ends
     * @param curveStyle - the edges' curve style
     * @returns the document
     */
    const cyjs = (edges: [string, string][], curveStyle: string): string =>
        JSON.stringify({
            elements: {
                nodes: ["a", "b", "c"].map((id) => ({ data: { id } })),
                edges: edges.map(([source, target], i) => ({ data: { id: `e${i}`, source, target } })),
            },
            style: [{ selector: "edge", style: { "curve-style": curveStyle } }],
        });

    it("draws a bezier edge straight unless other bezier edges join the same two nodes", async () => {
        const edges: [string, string][] = [
            ["a", "b"],
            ["b", "c"],
            ["c", "b"],
            ["a", "c"],
            ["a", "c"],
            ["c", "a"],
            ["a", "a"],
        ];
        // b-c is a pair, both bowed; a-c is three, the middle one straight; the loop is always curved
        expect(await curved(cyjs(edges, "bezier"), "json")).toEqual([false, true, true, true, false, true, true]);
    });

    it("spaces a bundle's curves half its control-point-step-size apart at their middle, 40 by default", async () => {
        const doc = (style: Record<string, unknown>): string =>
            JSON.stringify({
                elements: {
                    nodes: ["a", "b"].map((id) => ({ data: { id } })),
                    edges: [0, 1].map((i) => ({ data: { id: `e${i}`, source: "a", target: "b" } })),
                },
                style: [{ selector: "edge", style: { "curve-style": "bezier", ...style } }],
            });
        expect(await edgeValues(doc({ "control-point-step-size": 30 }), "json", "fanSpacing")).toEqual([15, 15]);
        expect(await edgeValues(doc({}), "json", "fanSpacing")).toEqual([20, 20]);
    });

    it("bows every unbundled-bezier edge, and draws segments and taxi edges as straight pieces", async () => {
        const one: [string, string][] = [["a", "b"]];
        expect(await curved(cyjs(one, "unbundled-bezier"), "json")).toEqual([true]);
        expect(await curved(cyjs(one, "segments"), "json")).toEqual([false]);
        expect(await curved(cyjs(one, "round-taxi"), "json")).toEqual([false]);
    });
});
