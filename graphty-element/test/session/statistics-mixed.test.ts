import { edgeIsDirected, GraphBuilder } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { EDGE_DIRECTED_COLUMN } from "../../src/data/GraphStore";
import { createElementSession } from "../../src/session/GraphSession";
import { computeStatistics } from "../../src/session/statistics";

const FILE = { by: "file", statedBy: 'edgedefault="directed"' } as const;

/**
 * A directed two-edge graph whose second edge says it is undirected when `mixed` is set.
 * @param mixed - whether to write the per-edge direction column
 * @returns the snapshot
 */
function graph(mixed: boolean): ReturnType<GraphBuilder["freeze"]> {
    const builder = new GraphBuilder({ directed: true });
    builder.addEdge("a", "b");
    const second = builder.addEdge("b", "c");
    if (mixed) {
        const handle = builder.declareEdgeColumn({ name: "graphty.directed", dtype: "bool", role: "directed" });
        builder.setEdgeValue(handle, second, false);
    }

    return builder.freeze();
}

describe("statistics directedness with per-edge direction (#309)", () => {
    it('reports "mixed" when edges carry differing directions', () => {
        assert.strictEqual(computeStatistics(graph(true), "auto", FILE).directedness, "mixed");
    });

    it("reports the graph's flag when no edge carries its own direction", () => {
        assert.strictEqual(computeStatistics(graph(false), "auto", FILE).directedness, "directed");
    });
});

/** A GraphML file whose graph is undirected and whose second edge says it is directed. */
const GRAPHML = [
    '<?xml version="1.0"?><graphml xmlns="http://graphml.graphdrawing.org/xmlns"><graph edgedefault="undirected">',
    '<node id="a"/><node id="b"/><node id="c"/>',
    '<edge source="a" target="b"/><edge source="b" target="c" directed="true"/>',
    "</graph></graphml>",
].join("");

/** A GEXF file whose graph is directed and whose second edge says it is undirected. */
const GEXF = [
    '<?xml version="1.0"?><gexf xmlns="http://gexf.net/1.3" version="1.3"><graph defaultedgetype="directed">',
    '<nodes><node id="a"/><node id="b"/><node id="c"/></nodes>',
    '<edges><edge id="0" source="a" target="b"/><edge id="1" source="b" target="c" type="undirected"/></edges>',
    "</graph></gexf>",
].join("");

/**
 * Each edge's direction in the session's graph, by source.
 * @param session - The session.
 * @returns Whether each edge is directed, keyed by its source node.
 */
function directions(session: ReturnType<typeof createElementSession>): Record<string, boolean> {
    const snapshot = session.data.snapshot();
    const out: Record<string, boolean> = {};
    for (let e = 0; e < snapshot.edgeCount; e++) {
        out[String(snapshot.ids.idOf(snapshot.edgeSource(e)))] = edgeIsDirected(snapshot, e);
    }

    return out;
}

describe("a loaded file keeps each edge's own direction (#309)", () => {
    for (const batched of [false, true]) {
        it(`reports "mixed" for a mixed GraphML file and keeps it through undo and redo (batched ${String(batched)})`, async () => {
            const session = createElementSession({}, { batched: () => batched });
            await session.data.import({ type: "graphml", name: "mixed.graphml", config: { data: GRAPHML } });

            assert.strictEqual(session.data.statistics().directedness, "mixed");
            assert.deepStrictEqual(directions(session), { a: false, b: true });
            await session.undo();
            await session.redo();
            assert.strictEqual(session.data.statistics().directedness, "mixed");
            session.dispose();
        });
    }

    it('reports "mixed" for a mixed GEXF file', async () => {
        const session = createElementSession();
        await session.data.import({ type: "gexf", name: "mixed.gexf", config: { data: GEXF } });

        assert.strictEqual(session.data.statistics().directedness, "mixed");
        assert.deepStrictEqual(directions(session), { a: true, b: false });
        session.dispose();
    });

    it("follows an edit of an edge's direction, and its undo", async () => {
        const session = createElementSession();
        await session.data.import({ type: "graphml", name: "mixed.graphml", config: { data: GRAPHML } });
        const directed = session.data.edges().find((edge) => edge.source === "b");
        assert.isDefined(directed);
        await session.data.updateEdges([{ id: directed.id, values: { directed: false } }]);

        assert.strictEqual(session.data.statistics().directedness, "undirected");
        await session.undo();
        assert.strictEqual(session.data.statistics().directedness, "mixed");
        session.dispose();
    });

    it("adds no direction column for a file whose edges state none", async () => {
        const session = createElementSession();
        await session.data.import({
            type: "graphml",
            name: "plain.graphml",
            config: { data: GRAPHML.replace(' directed="true"', "") },
        });

        assert.strictEqual(session.data.statistics().directedness, "undirected");
        assert.isFalse(session.data.snapshot().edges.has(EDGE_DIRECTED_COLUMN));
        session.dispose();
    });
});
