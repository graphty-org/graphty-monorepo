/**
 * An edge's `bends`: the points its route passes through, relative to the line between its two node centers, so a
 * drawing that moves the nodes keeps the route's shape. yEd GraphML keeps them in `y:Path`, yEd GML between the
 * ends of `graphics Line`.
 */

import { describe, expect, it } from "vitest";

import { createRegistry } from "../../src/registry.js";
import { bendsToPoints, canonBends, resolveStyles } from "../../src/styles/internal.js";

const registry = createRegistry();

/**
 * Each edge's `bends` value, by edge index.
 * @param doc - the file
 * @param format - its format
 * @returns the values
 */
async function bends(doc: string, format: string): Promise<unknown[]> {
    const r = await registry.importGraph(doc, { format, styles: true, errorLimit: Infinity });
    if (!r.styles) {
        throw new Error("no styles");
    }
    return [...resolveStyles(r.styles, "edge", "bends", r.snapshot)];
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
