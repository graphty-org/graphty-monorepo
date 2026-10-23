/**
 * An edge's `bends`: the points its route passes through, relative to the line between its two node centers, so a
 * drawing that moves the nodes keeps the route's shape. yEd GraphML keeps them in `y:Path`, yEd GML between the
 * ends of `graphics Line`.
 */

import { describe, expect, it } from "vitest";

import { createRegistry } from "../../src/registry.js";
import {
    bendsToPoints,
    canonBends,
    canonNodeOffsets,
    flattenCubic,
    flattenQuadSpline,
    nodeOffsetsToPoints,
    resolveStyles,
} from "../../src/styles/internal.js";

const registry = createRegistry();

/**
 * Each edge's `bends` value, by edge index.
 * @param doc - the file
 * @param format - its format
 * @returns the values
 */
async function bends(doc: string, format: string, property = "bends"): Promise<unknown[]> {
    const r = await registry.importGraph(doc, { format, styles: true, errorLimit: Infinity });
    if (!r.styles) {
        throw new Error("no styles");
    }
    return [...resolveStyles(r.styles, "edge", property as "bends", r.snapshot)];
}

describe("canonBends", () => {
    it("places each bend along and to the left of the line between the centers, y up", () => {
        // source (0, 0), target (100, 0), y up: a point above the middle is half way, a fifth of the length left
        expect(canonBends([0, 0], [100, 0], [[50, 20]], false)).toBe("0.5,0.2");
        // the same file drawn y down: 20 below in the file is 20 above once y points up
        expect(canonBends([0, 0], [100, 0], [[50, 20]], true)).toBe("0.5,-0.2");
        // a right-angle route: down from the source, across, up to the target (y up)
        expect(
            canonBends(
                [0, 0],
                [100, 0],
                [
                    [0, -50],
                    [100, -50],
                ],
                false,
            ),
        ).toBe("0,-0.5 1,-0.5");
    });

    it("has no value without bends, without a line, or with a coordinate that is not a number", () => {
        expect(canonBends([0, 0], [100, 0], [], false)).toBeNull();
        expect(canonBends([5, 5], [5, 5], [[1, 1]], false)).toBeNull();
        expect(canonBends([0, 0], [Number.NaN, 0], [[1, 1]], false)).toBeNull();
        expect(canonBends([0, 0], [100, 0], [[Number.NaN, 1]], false)).toBeNull();
    });
});

describe("bendsToPoints", () => {
    it("places the points a value names, the inverse of canonBends", () => {
        expect(bendsToPoints([0, 0], [100, 0], "0,-0.5 1,-0.5", true)).toEqual([
            [0, 50],
            [100, 50],
        ]);
        const value = canonBends([3, 7], [40, -12], [[11, 2.5]], true) ?? "";
        const [[x, y]] = bendsToPoints([3, 7], [40, -12], value, true) ?? [[0, 0]];
        expect(canonBends([3, 7], [40, -12], [[x, y]], true)).toBe(value);
    });

    it("places nothing from a value that is not along,across pairs", () => {
        expect(bendsToPoints([0, 0], [1, 0], "0.5", false)).toBeNull();
        expect(bendsToPoints([0, 0], [1, 0], "0.5,1,2", false)).toBeNull();
        expect(bendsToPoints([0, 0], [1, 0], "a,b", false)).toBeNull();
    });
});

describe("bends: yEd GraphML", () => {
    const node = (id: string, x: number, y: number): string =>
        `<node id="${id}"><data key="d6"><y:ShapeNode><y:Geometry x="${x}" y="${y}" width="20" height="10"/></y:ShapeNode></data></node>`;
    const doc = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:y="http://www.yworks.com/xml/graphml">
<key for="node" id="d6" yfiles.type="nodegraphics"/><key for="edge" id="d10" yfiles.type="edgegraphics"/>
<graph edgedefault="directed" id="G">${node("a", -10, -5)}${node("b", 90, -5)}
<edge source="a" target="b"><data key="d10"><y:PolyLineEdge><y:Path sx="0" sy="0" tx="0" ty="0">
<y:Point x="0" y="50"/><y:Point x="100" y="50"/></y:Path></y:PolyLineEdge></data></edge>
<edge source="a" target="b"><data key="d10"><y:PolyLineEdge><y:Path sx="0" sy="0" tx="0" ty="0"/></y:PolyLineEdge></data></edge>
</graph></graphml>`;

    it("reads each y:Path point relative to the node centers, and none for an edge without points", async () => {
        // centers (0, 0) and (100, 0); 50 down in the file is to the right of a left-to-right line, y up
        expect(await bends(doc, "graphml")).toEqual(["0,-0.5 1,-0.5", null]);
    });

    it("writes the bends back as y:Path points that read back as the same value", async () => {
        const r = await registry.importGraph(doc, { format: "graphml", styles: true });
        const written = await registry.exportGraphToString(r.snapshot, "graphml", { styles: r.styles ?? undefined });
        expect(written).toContain('<y:Point x="0" y="50"');
        expect(await bends(written, "graphml")).toEqual(["0,-0.5 1,-0.5", null]);
    });
});

describe("bends: yEd GML", () => {
    const doc = `Creator "yFiles"
graph [ directed 1
  node [ id 1 graphics [ x 0 y 0 w 20 h 10 ] ]
  node [ id 2 graphics [ x 100 y 0 w 20 h 10 ] ]
  edge [ source 1 target 2 graphics [ fill "#000000" Line [ point [ x 0 y 0 ] point [ x 0 y 50 ] point [ x 100 y 50 ] point [ x 100 y 0 ] ] ] ]
  edge [ source 1 target 2 graphics [ fill "#000000" Line [ point [ x 0 y 0 ] point [ x 100 y 0 ] ] ] ]
]`;

    it("reads the Line points between its two ends, and none for a line of only its ends", async () => {
        expect(await bends(doc, "gml")).toEqual(["0,-0.5 1,-0.5", null]);
    });
});

describe("flattenCubic", () => {
    it("samples each cubic segment, sharing the joins, and refuses a count that is not 3n + 1", () => {
        const flat = flattenCubic(
            [
                [0, 0],
                [0, 40],
                [100, 40],
                [100, 0],
            ],
            2,
        );
        expect(flat).toEqual([
            [0, 0],
            [50, 30],
            [100, 0],
        ]);
        expect(
            flattenCubic([
                [0, 0],
                [1, 1],
                [2, 2],
            ]),
        ).toBeNull();
    });
});

describe("bends: Graphviz", () => {
    const laid = (pos: string): string => `digraph { a [pos="0,0"]; b [pos="100,0"]; a -> b [pos="${pos}"]; }`;

    it("reads the spline Graphviz laid an edge along in its pos, flattened, relative to the node centers", async () => {
        const [value] = await bends(laid("e,100,0 0,0 0,40 100,40 100,0"), "dot");
        expect(typeof value).toBe("string");
        const pairs = String(value)
            .split(" ")
            .map((p) => p.split(",").map(Number));
        expect(pairs).toHaveLength(9);
        // the middle sample of the arc: half way along, 30 of 100 above the line (y up)
        expect(pairs[4]).toEqual([0.5, 0.3]);
    });

    it("has no bends for an edge Graphviz drew straight or without a usable pos", async () => {
        expect(await bends(laid("e,100,0 0,0 33,0 66,0 100,0"), "dot")).toEqual([null]);
        expect(await bends(laid("0,0 10,10"), "dot")).toEqual([null]);
        expect(await bends('digraph { a -> b [pos="0,0 0,40 100,40 100,0"]; }', "dot")).toEqual([null]);
    });
});

describe("canonNodeOffsets", () => {
    it("places points around a node as fractions of its half size, y up, and back", () => {
        // a 20 x 10 node at (0, 0): the middle of its right side, and 5 above its top in a y-down file
        expect(canonNodeOffsets([0, 0], [20, 10], [[10, 0]], true)).toBe("1,0");
        expect(canonNodeOffsets([0, 0], [20, 10], [[0, -10]], true)).toBe("0,2");
        expect(nodeOffsetsToPoints([0, 0], [20, 10], "1,0 0,2", true)).toEqual([
            [10, 0],
            [0, -10],
        ]);
        expect(canonNodeOffsets([0, 0], [0, 10], [[1, 1]], true)).toBeNull();
        expect(canonNodeOffsets([0, 0], [20, 10], [], true)).toBeNull();
        expect(nodeOffsetsToPoints([0, 0], [20, 10], "1", true)).toBeNull();
    });
});

describe("flattenQuadSpline", () => {
    const controls: [number, number][] = [
        [0, 0],
        [50, 100],
        [100, 0],
    ];

    it("draws one control point as one quadratic curve from end to end, which never touches it", () => {
        const flat = flattenQuadSpline(controls, 0, 2);
        expect(flat).toEqual([
            [0, 0],
            [50, 50],
            [100, 0],
        ]);
    });

    it("keeps a share of each leg straight by its straightness, the control polygon at 1", () => {
        const half = flattenQuadSpline(controls, 0.5, 2);
        // the curve starts half way up the first leg and its middle is pulled nearer the control point
        expect(half[1]).toEqual([25, 50]);
        expect(half[2][1]).toBeGreaterThan(50);
        expect(flattenQuadSpline(controls, 1, 2)).toEqual(controls);
        expect(flattenQuadSpline(controls.slice(0, 2), 0)).toEqual(controls.slice(0, 2));
    });
});

describe("routes: yEd GraphML ports, curves and self-loops", () => {
    const node = (id: string, x: number, y: number): string =>
        `<node id="${id}"><data key="d6"><y:ShapeNode><y:Geometry x="${x}" y="${y}" width="20" height="10"/></y:ShapeNode></data></node>`;
    const edge = (source: string, target: string, body: string): string =>
        `<edge source="${source}" target="${target}"><data key="d10">${body}</data></edge>`;
    const doc = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:y="http://www.yworks.com/xml/graphml">
<key for="node" id="d6" yfiles.type="nodegraphics"/><key for="edge" id="d10" yfiles.type="edgegraphics"/>
<graph edgedefault="directed" id="G">${node("a", -10, -5)}${node("b", 90, -5)}
${edge("a", "b", '<y:PolyLineEdge><y:Path sx="10" sy="-5" tx="0" ty="5"/></y:PolyLineEdge>')}
${edge("a", "b", '<y:BezierEdge><y:Path sx="0" sy="0" tx="0" ty="0"><y:Point x="0" y="-40"/><y:Point x="100" y="-40"/></y:Path></y:BezierEdge>')}
${edge("a", "b", '<y:QuadCurveEdge straightness="0"><y:Path sx="0" sy="0" tx="0" ty="0"><y:Point x="50" y="-100"/></y:Path></y:QuadCurveEdge>')}
${edge("a", "a", '<y:PolyLineEdge><y:Path sx="0" sy="0" tx="0" ty="0"><y:Point x="-5" y="-20"/><y:Point x="5" y="-20"/></y:Path></y:PolyLineEdge>')}
</graph></graphml>`;

    it("reads each port off its node's center relative to the node, and none at the center", async () => {
        expect(await bends(doc, "graphml", "sourcePort")).toEqual(["1,1", null, null, null]);
        expect(await bends(doc, "graphml", "targetPort")).toEqual(["0,-1", null, null, null]);
    });

    it("flattens a Bezier or quad curve into the points it passes through, and keeps a loop's points around its node", async () => {
        const [, bezier, quad, loop] = await bends(doc, "graphml");
        const pairs = (v: unknown): number[][] =>
            String(v)
                .split(" ")
                .map((p) => p.split(",").map(Number));
        // the cubic's middle: half way, 30 of 100 above the line (y up), not at its control points 40 above
        expect(pairs(bezier)).toContainEqual([0.5, 0.3]);
        // the quadratic's middle: half way to its control point, 50 above
        expect(pairs(quad)).toContainEqual([0.5, 0.5]);
        // 20 above the center of a node 10 high is four half heights up
        expect(loop).toBe("-0.5,4 0.5,4");
    });

    it("draws a flattened Bezier or quad curve straight through its points, and an arc as a circle through its apex", async () => {
        // the flattened points lie on the curve: rounding their corners cut inside it
        expect((await bends(doc, "graphml", "curved")).slice(1, 3)).toEqual([false, false]);
        const arc = doc.replace(
            /<edge source="a" target="b"><data key="d10"><y:PolyLineEdge>.*?<\/edge>/,
            '<edge source="a" target="b"><data key="d10"><y:ArcEdge><y:Path sx="0" sy="0" tx="0" ty="0"><y:Point x="50" y="-20"/></y:Path><y:Arc height="20" ratio="0.8" type="fixedHeight"/></y:ArcEdge></data></edge>',
        );
        expect((await bends(arc, "graphml", "bendCurve"))[0]).toBe("arc");
        expect((await bends(arc, "graphml", "curved"))[0]).toBe(true);
        // yEd saves the arc's apex, 20 above the middle of the line between the centers 100 apart
        expect((await bends(arc, "graphml"))[0]).toBe("0.5,0.2");
    });

    it("writes ports and a loop's points back so they read back as the same values", async () => {
        const r = await registry.importGraph(doc, { format: "graphml", styles: true });
        const written = await registry.exportGraphToString(r.snapshot, "graphml", { styles: r.styles ?? undefined });
        expect(await bends(written, "graphml", "sourcePort")).toEqual(["1,1", null, null, null]);
        expect((await bends(written, "graphml")).at(-1)).toBe("-0.5,4 0.5,4");
        const gml = await registry.exportGraphToString(r.snapshot, "gml", {
            styles: r.styles ?? undefined,
            sanitizeIds: "mangle",
            sanitizeKeys: "mangle",
        });
        expect(await bends(gml, "gml", "targetPort")).toEqual(["0,-1", null, null, null]);
        expect((await bends(gml, "gml")).at(-1)).toBe("-0.5,4 0.5,4");
    });
});
