/**
 * `curved` means the edge is drawn curved. A setting that only rounds off bends (Cytoscape's `EDGE_CURVED`, yEd's
 * `smoothed` and `smoothBends`) curves an edge only when it has bends, and Cytoscape.js's `bezier` bows only loops
 * and parallel edges: a lone edge, and the middle one of an odd bundle, stays straight.
 */

import { describe, expect, it } from "vitest";

import { createRegistry } from "../../src/registry.js";
import { type ExtractedStyles, resolveStyles } from "../../src/styles/internal.js";

const registry = createRegistry();

/**
 * Each edge's `curved`, by edge index.
 * @param doc - the file
 * @param format - its format
 * @returns the values
 */
async function curved(doc: string, format: string): Promise<readonly unknown[]> {
    const { snapshot, styles } = await registry.importGraph(new TextEncoder().encode(doc), {
        format,
        styles: true,
        errorLimit: Infinity,
    });
    return resolveStyles(styles as ExtractedStyles, "edge", "curved", snapshot);
}

const BEND = "0.7071067811865476,-0.7071067811865475,0.5";

describe("edges that only round off bends are curved only with bends", () => {
    it("CX: EDGE_CURVED curves only the edge with bends", async () => {
        const doc = JSON.stringify([
            { nodes: [{ "@id": 1 }, { "@id": 2 }, { "@id": 3 }] },
            {
                edges: [
                    { "@id": 10, s: 1, t: 2 },
                    { "@id": 11, s: 2, t: 3 },
                    { "@id": 12, s: 1, t: 3 },
                ],
            },
            {
                cyVisualProperties: [
                    { properties_of: "edges:default", properties: { EDGE_CURVED: "true", EDGE_BEND: "" } },
                    { properties_of: "edges", applies_to: 11, properties: { EDGE_BEND: BEND } },
                    { properties_of: "edges", applies_to: 12, properties: { EDGE_CURVED: "false", EDGE_BEND: BEND } },
                ],
            },
        ]);
        expect(await curved(doc, "cx")).toEqual([false, true, false]);
    });

    it("CX2: EDGE_CURVED curves only the edge with bends", async () => {
        const doc = JSON.stringify([
            { CXVersion: "2.0", hasFragments: false },
            { nodes: [{ id: 1 }, { id: 2 }, { id: 3 }] },
            {
                edges: [
                    { id: 10, s: 1, t: 2 },
                    { id: 11, s: 2, t: 3 },
                ],
            },
            { visualProperties: [{ default: { edge: { EDGE_CURVED: true } }, nodeMapping: {}, edgeMapping: {} }] },
            { edgeBypasses: [{ id: 11, v: { EDGE_BEND: BEND } }] },
            { status: [{ error: "", success: true }] },
        ]);
        expect(await curved(doc, "cx2")).toEqual([false, true]);
    });

    it("XGMML: EDGE_CURVED and a 2.x CURVED_LINES curve only the edges with bends", async () => {
        const doc = `<?xml version="1.0"?>
<graph label="g" directed="1" xmlns:cy="http://www.cytoscape.org" xmlns="http://www.cs.rpi.edu/XGMML">
<node id="a" label="a"/><node id="b" label="b"/><node id="c" label="c"/>
<edge source="a" target="b"><graphics><att name="EDGE_CURVED" value="true" type="string"/><att name="EDGE_BEND" value="" type="string"/></graphics></edge>
<edge source="b" target="c"><graphics><att name="EDGE_CURVED" value="true" type="string"/><att name="EDGE_BEND" value="${BEND}" type="string"/></graphics></edge>
<edge source="a" target="c"><graphics cy:curved="CURVED_LINES"/></edge>
<edge source="c" target="a"><graphics cy:curved="CURVED_LINES"><att name="edgeBend"><att name="handle" x="1" y="2"/></att></graphics></edge>
</graph>
`;
        expect(await curved(doc, "xgmml")).toEqual([false, true, false, true]);
    });

    const YED = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:y="http://www.yworks.com/xml/graphml">
<key for="edge" id="d10" yfiles.type="edgegraphics"/>
<graph edgedefault="directed" id="G"><node id="a"/><node id="b"/>`;
    const edge = (realizer: string, inner: string): string =>
        `<edge source="a" target="b"><data key="d10"><y:${realizer}>${inner}</y:${realizer}></data></edge>`;

    it("yEd GraphML: a smoothed polyline curves only with bends, a quad curve is flattened, an arc is always curved", async () => {
        const path = '<y:Path sx="0" sy="0" tx="0" ty="0"/>';
        const bent = '<y:Path sx="0" sy="0" tx="0" ty="0"><y:Point x="10" y="20"/></y:Path>';
        const doc = `${YED}
${edge("PolyLineEdge", `${path}<y:BendStyle smoothed="true"/>`)}
${edge("PolyLineEdge", `${bent}<y:BendStyle smoothed="true"/>`)}
${edge("PolyLineEdge", `${bent}<y:BendStyle smoothed="false"/>`)}
${edge("BezierEdge", path)}
${edge("QuadCurveEdge", bent)}
${edge("ArcEdge", path)}
</graph></graphml>`;
        // a quad curve is flattened into the points it passes through and drawn straight between them
        expect(await curved(doc, "graphml")).toEqual([false, true, false, false, false, true]);
    });

    it("yEd GML: smoothBends curves only an edge whose Line has a point between its two ends", async () => {
        const line = (points: number): string =>
            `Line [ ${Array.from({ length: points }, (_, i) => `point [ x ${String(i)} y 0 ]`).join(" ")} ]`;
        const doc = `Creator "yFiles"
graph [
  node [ id 1 ] node [ id 2 ]
  edge [ source 1 target 2 graphics [ smoothBends 1 ${line(2)} ] ]
  edge [ source 1 target 2 graphics [ smoothBends 1 ${line(3)} ] ]
  edge [ source 1 target 2 graphics [ smoothBends 1 ] ]
]`;
        expect(await curved(doc, "gml")).toEqual([false, true, false]);
    });
});

describe("Cytoscape.js bezier bows only loops and parallel edges", () => {
    it("draws a lone edge and the middle of an odd bundle straight, every other bundle member and a loop curved", async () => {
        const doc = JSON.stringify({
            elements: {
                nodes: ["a", "b", "c", "d"].map((id) => ({ data: { id } })),
                edges: [
                    { data: { id: "lone", source: "a", target: "b" } },
                    { data: { id: "p1", source: "b", target: "c" } },
                    { data: { id: "p2", source: "c", target: "b" } },
                    { data: { id: "t1", source: "c", target: "d" } },
                    { data: { id: "t2", source: "c", target: "d" } },
                    { data: { id: "t3", source: "c", target: "d" } },
                    { data: { id: "loop", source: "d", target: "d" } },
                    { data: { id: "plain", source: "a", target: "d" }, classes: "flat" },
                    { data: { id: "bowed", source: "a", target: "c" }, classes: "bowed" },
                ],
            },
            style: [
                { selector: "edge", style: { "curve-style": "bezier" } },
                { selector: ".flat", style: { "curve-style": "straight" } },
                { selector: ".bowed", style: { "curve-style": "unbundled-bezier" } },
            ],
        });
        expect(await curved(doc, "json")).toEqual([false, true, true, true, false, true, true, false, true]);
    });
});
