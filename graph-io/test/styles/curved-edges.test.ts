/**
 * An edge is `curved` only when the file's own tool draws it curved: Cytoscape desktop rounds the bends of an edge
 * that has them, Cytoscape.js bows `bezier` edges only where several join the same two nodes, and yEd smooths the
 * bends of an edge that has them. An edge with no bends between two nodes it alone joins is drawn straight by all
 * three, so it is never marked curved.
 */

import { describe, expect, it } from "vitest";

import { createRegistry } from "../../src/registry.js";
import { resolveStyles } from "../../src/styles/internal.js";

const registry = createRegistry();

/**
 * Each edge's `curved` value, by edge index.
 * @param doc - the file
 * @param format - its format
 * @returns the values
 */
async function curved(doc: string, format: string): Promise<unknown[]> {
    const r = await registry.importGraph(doc, { format, styles: true, errorLimit: Infinity });
    if (!r.styles) {
        throw new Error("no styles");
    }
    return [...resolveStyles(r.styles, "edge", "curved", r.snapshot)];
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

    it("draws an edge of a file with no style straight, as Cytoscape's default style does", async () => {
        expect(await curved(cx2([[1, 2]], {}), "cx2")).toEqual([false]);
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

    it("bows every unbundled-bezier edge, and draws segments and taxi edges as straight pieces", async () => {
        const one: [string, string][] = [["a", "b"]];
        expect(await curved(cyjs(one, "unbundled-bezier"), "json")).toEqual([true]);
        expect(await curved(cyjs(one, "segments"), "json")).toEqual([false]);
        expect(await curved(cyjs(one, "round-taxi"), "json")).toEqual([false]);
    });
});
