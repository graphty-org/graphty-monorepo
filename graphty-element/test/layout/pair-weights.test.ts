/**
 * The deprecated `pairWeights` helper a third-party `SimpleLayoutEngine` subclass may still call.
 *
 * graphty-element 3.x keeps the class-based layout contract whole, and this protected helper is
 * part of it: it answers, per ordered pair of nodes, the SUM of the weights of every edge between
 * them, read from the element's graph store, or null when every weight is 1. The element's own
 * engines no longer use it -- a new layout reads the snapshot's weights through
 * `registerSnapshotLayout` -- so this file is what keeps it working.
 *
 * The engine below is written the way a plugin is: against `@graphty/graphty-element/extend`.
 */
import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { type Edge, type NodeIdType, SimpleLayoutEngine } from "../../extend";

/** A plugin engine that reports what the helper told it. */
class WeightReadingLayout extends SimpleLayoutEngine {
    static type = "test-weight-reading";
    static maxDimensions = 2;

    doLayout(): void {
        this.positions = {};
    }

    /**
     * The summed weight of the ordered pair, as a plugin reads it.
     * @param edges - the edges to read
     * @param source - the source node id
     * @param target - the target node id
     * @returns the weight, or null when the graph carries none
     */
    weightOf(edges: readonly Edge[], source: NodeIdType, target: NodeIdType): number | null {
        const weights = this.pairWeights(edges);
        return weights === null ? null : (weights.get(this.pairWeightKey(source, target)) ?? null);
    }
}

/**
 * Freeze a weighted graph and hand back the edges a layout engine is given, each reaching the
 * store through its parent graph the way a real edge does.
 * @param list - source, target and weight of each edge
 * @returns the edges
 */
function edgesOf(list: readonly (readonly [string, string, number])[]): Edge[] {
    const builder = new GraphBuilder({ directed: true, addMissingNodes: true });
    for (const [source, target, weight] of list) {
        builder.addEdge(source, target, weight);
    }

    const snapshot: GraphSnapshot = builder.freeze({ label: "pair-weights-test" });
    const parentGraph = { getDataManager: () => ({ getSnapshot: () => snapshot }) };
    const stored = snapshot.edgeList();
    const edges: Edge[] = [];
    for (let index = 0; index < snapshot.edgeCount; index++) {
        edges.push({
            srcId: String(snapshot.ids.idOf(stored.src[index])),
            dstId: String(snapshot.ids.idOf(stored.dst[index])),
            index,
            parentGraph,
        } as unknown as Edge);
    }

    return edges;
}

describe("the deprecated pairWeights helper of a SimpleLayoutEngine subclass", () => {
    it("sums the weights of parallel edges between two nodes", () => {
        const engine = new WeightReadingLayout({});
        const edges = edgesOf([
            ["a", "b", 2],
            ["a", "b", 3],
            ["b", "c", 1],
        ]);

        assert.strictEqual(engine.weightOf(edges, "a", "b"), 5);
        assert.strictEqual(engine.weightOf(edges, "b", "c"), 1);
        assert.isNull(engine.weightOf(edges, "c", "b"), "a pair is ordered, as it always was");
    });

    it("answers null when every weight is 1", () => {
        const engine = new WeightReadingLayout({});
        const edges = edgesOf([
            ["a", "b", 1],
            ["b", "c", 1],
        ]);

        assert.isNull(engine.weightOf(edges, "a", "b"));
    });

    it("answers null for edges that reach no graph store", () => {
        const engine = new WeightReadingLayout({});
        const edges = [{ srcId: "a", dstId: "b", index: 0 } as unknown as Edge];

        assert.isNull(engine.weightOf(edges, "a", "b"));
        assert.isNull(engine.weightOf([], "a", "b"));
    });
});
