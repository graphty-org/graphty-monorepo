/**
 * Where a program puts the nodes a file gives no position: Gephi at the origin when other nodes are placed
 * (gexf-specimen-node-sizes-opacity `position-none`, drawn at 0, 0), Pajek 6.02 round a circle when no vertex is
 * (pajek-iliad: vertex 1 on the left, 200 points from the middle of its 500-point window, the rest clockwise).
 */

import { describe, expect, it } from "vitest";

import { createRegistry } from "../../src/index.js";
import { extractPositions } from "../../src/positions/index.js";

const registry = createRegistry();

/**
 * The positions extractPositions() returns for a document.
 * @param doc - the file's text
 * @param format - its format
 * @returns the positions
 */
async function positionsOf(doc: string, format: string): Promise<ReturnType<typeof extractPositions>> {
    const { snapshot, report } = await registry.importGraph(doc, { format });
    return extractPositions(registry.importer(format), snapshot, report);
}

describe("a program's own place for nodes the file leaves unplaced", () => {
    it("puts a GEXF node with no viz:position at the origin when others are placed, as Gephi does", async () => {
        const doc = `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://gexf.net/1.3" xmlns:viz="http://gexf.net/1.3/viz" version="1.3">
  <graph defaultedgetype="undirected"><nodes>
    <node id="a"><viz:position x="100" y="200"/></node>
    <node id="b"/>
  </nodes></graph>
</gexf>`;
        const p = await positionsOf(doc, "gexf");
        expect(p?.placed).toBe(2);
        expect([...(p?.coords.subarray(3, 6) ?? [])]).toEqual([0, 0, 0]);
        expect(p?.coords[0]).toBe(100);
    });

    it("leaves a GEXF file that places no node unplaced", async () => {
        const doc = `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://gexf.net/1.3" version="1.3"><graph><nodes><node id="a"/><node id="b"/></nodes></graph></gexf>`;
        expect((await positionsOf(doc, "gexf"))?.usable ?? false).toBe(false);
    });

    it("puts the vertices of a Pajek file with no coordinates round Pajek's circle, in vertex order", async () => {
        const p = await positionsOf(`*Vertices 4\n1 "a"\n2 "b"\n3 "c"\n4 "d"\n`, "pajek");
        expect(p?.usable).toBe(true);
        // y up, in the file's unit: the first on the left, then (y down on screen) clockwise: up, right, down
        const at = (i: number): number[] =>
            [...(p?.coords.subarray(3 * i, 3 * i + 2) ?? [])].map((v) => Math.round(v * 1000) / 1000);
        expect([at(0), at(1), at(2), at(3)]).toEqual([
            [0.1, -0.5],
            [0.5, -0.1],
            [0.9, -0.5],
            [0.5, -0.9],
        ]);
    });

    it("reads a Pajek file's own coordinates where it has them", async () => {
        const p = await positionsOf(`*Vertices 2\n1 "a" 0.2 0.3 0.5\n2 "b" 0.6 0.7 0.5\n`, "pajek");
        expect(p?.coords[0]).toBeCloseTo(0.2, 6);
    });
});
