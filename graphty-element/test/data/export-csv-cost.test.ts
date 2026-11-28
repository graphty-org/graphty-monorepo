/**
 * @file The counted work of a CSV node table export (issue #10555).
 *
 * A node table writes no edge, yet the export built every edge record, painted every edge and
 * wrote both into the snapshot: at 10k nodes and 20k edges two thirds of the export's time went to
 * edges the file never holds. A node table now reads, paints and builds no edge at all.
 */

import { assert, describe, it } from "vitest";

import { exportSession } from "../../src/data/export";
import { type Harness, makeSession } from "../session/helpers";

const NODES = 300;

/**
 * A graph of NODES nodes and twice as many edges.
 * @returns The harness.
 */
function graph(): Harness {
    const h = makeSession({ directed: false });
    const nodes = Array.from({ length: NODES }, (_value, i) => ({ id: `n${String(i)}`, dept: "Legal", year: i }));
    const edges = Array.from({ length: 2 * NODES }, (_value, i) => ({
        src: `n${String(i % NODES)}`,
        dst: `n${String((i * 7 + 1) % NODES)}`,
    }));
    h.add(nodes, edges);
    return h;
}

/**
 * Export a CSV table, counting the edge records read and the nodes and edges painted.
 * @param table - The table written.
 * @param scope - The export scope.
 * @returns The counts and the data rows written.
 */
async function counted(
    table: "nodes" | "edges",
    scope: "all" | "shown",
): Promise<{ edgeReads: number; nodePaints: number; edgePaints: number; rows: number }> {
    const h = graph();
    const { data } = h.session;
    const edgesOf = data.edges.bind(data);
    let edgeReads = 0;
    data.edges = (...args) => {
        edgeReads++;
        return edgesOf(...args);
    };
    let nodePaints = 0;
    let edgePaints = 0;
    const result = exportSession(
        h.session,
        "csv",
        { table, scope },
        {
            nodeStyle: () => {
                nodePaints++;
                return { color: null, size: 1, shape: "sphere" };
            },
            edgeStyle: () => {
                edgePaints++;
                return { color: null, width: 1 };
            },
        },
    );
    const rows = (await result.text()).trim().split("\n").length - 1;
    h.session.dispose();
    return { edgeReads, nodePaints, edgePaints, rows };
}

describe("CSV node table export cost", () => {
    for (const scope of ["all", "shown"] as const) {
        it(`reads and paints no edge, and paints each node once (scope ${scope})`, async () => {
            const work = await counted("nodes", scope);
            assert.strictEqual(work.rows, NODES);
            assert.strictEqual(work.edgeReads, 0, "no edge record is built");
            assert.strictEqual(work.edgePaints, 0, "no edge is painted");
            assert.strictEqual(work.nodePaints, NODES);
        });
    }

    it("an edge table still paints every edge it writes", async () => {
        const work = await counted("edges", "all");
        assert.strictEqual(work.edgePaints, 2 * NODES);
        assert.isAtMost(work.edgeReads, 1, "the edge records are built once");
    });
});
