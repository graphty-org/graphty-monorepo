import { assert, describe, it } from "vitest";

import { COMPONENT_SIZE_CAP } from "../../src/session";
import { type EdgeRow, makeSession, type NodeRow } from "./helpers";

/**
 * A graph of `count` nodes named `n0..n<count-1>`, plus whatever edges the caller names.
 * @param count - how many nodes
 * @param edges - the edges between them
 * @returns the rows to hand to the harness
 */
function graph(count: number, edges: readonly (readonly [number, number])[]): { nodes: NodeRow[]; edges: EdgeRow[] } {
    const nodes: NodeRow[] = [];
    for (let i = 0; i < count; i++) {
        nodes.push({ id: `n${i}` });
    }

    return { nodes, edges: edges.map(([src, dst]) => ({ src: `n${src}`, dst: `n${dst}` })) };
}

describe("the shape of the graph", () => {
    it("counts what is there", () => {
        const harness = makeSession();
        const { nodes, edges } = graph(4, [[0, 1], [1, 2]]);
        harness.add(nodes, edges);

        const stats = harness.session.data.statistics();
        assert.strictEqual(stats.nodeCount, 4);
        assert.strictEqual(stats.edgeCount, 2);
        harness.session.dispose();
    });

    it("reports an empty graph without dividing by zero", () => {
        const harness = makeSession();

        const stats = harness.session.data.statistics();
        assert.strictEqual(stats.density, 0);
        assert.deepEqual(stats.degreeRange, [0, 0]);
        assert.strictEqual(stats.components.count, 0);
        assert.strictEqual(stats.components.largestSize, 0);
        harness.session.dispose();
    });

    it("measures density against the pairs that could carry an edge, self-loops excluded", () => {
        const harness = makeSession({ directed: true });
        const { nodes, edges } = graph(4, [[0, 1], [1, 2], [2, 2]]);
        harness.add(nodes, edges);

        // 12 ordered pairs of distinct nodes; two of them carry an edge, and the self-loop is
        // counted in neither half.
        assert.strictEqual(harness.session.data.statistics().density, 2 / 12);
        harness.session.dispose();
    });

    it("never reports a density above 1, which counting self-loops in the numerator alone would", () => {
        const harness = makeSession({ directed: true });
        const { nodes } = graph(2, []);
        harness.add(nodes, [
            { src: "n0", dst: "n0" },
            { src: "n1", dst: "n1" },
            { src: "n0", dst: "n1" },
            { src: "n1", dst: "n0" },
        ]);

        assert.strictEqual(harness.session.data.statistics().density, 1);
        harness.session.dispose();
    });

    it("says directed or undirected as a fact about the graph rather than about one edge", () => {
        const pair = graph(2, [[0, 1]]);
        const directed = makeSession({ directed: true });
        directed.add(pair.nodes, pair.edges);
        const undirected = makeSession({ directed: false });
        undirected.add(pair.nodes, pair.edges);

        assert.strictEqual(directed.session.data.statistics().directedness, "directed");
        assert.strictEqual(undirected.session.data.statistics().directedness, "undirected");
        directed.session.dispose();
        undirected.session.dispose();
    });

    it("says unknown for an empty graph nothing has settled the direction of", () => {
        const auto = makeSession({ directed: "auto" });
        const told = makeSession({ directed: true });

        assert.strictEqual(auto.session.data.statistics().directedness, "unknown");
        assert.strictEqual(told.session.data.statistics().directedness, "directed", "being told is enough");
        auto.session.dispose();
        told.session.dispose();
    });

    it("calls a graph weighted only when a weight carries information", () => {
        const plain = makeSession();
        plain.add([{ id: "a" }, { id: "b" }], [{ src: "a", dst: "b" }]);
        const weighted = makeSession();
        weighted.add([{ id: "a" }, { id: "b" }], [{ src: "a", dst: "b", weight: 2.5 }]);

        assert.strictEqual(plain.session.data.statistics().weighted, false, "a graph of all-ones is not weighted");
        assert.strictEqual(weighted.session.data.statistics().weighted, true);
        plain.session.dispose();
        weighted.session.dispose();
    });

    it("counts self-loops and repeated edges", () => {
        const harness = makeSession({ directed: true });
        harness.add(
            [{ id: "a" }, { id: "b" }],
            [
                { src: "a", dst: "b" },
                { src: "a", dst: "b" },
                { src: "a", dst: "b" },
                { src: "a", dst: "a" },
            ],
        );

        const stats = harness.session.data.statistics();
        assert.strictEqual(stats.selfLoopCount, 1);
        assert.strictEqual(stats.repeatedEdgeCount, 2, "three parallel edges are two repeats");
        harness.session.dispose();
    });

    it("counts a repeated undirected edge once, not once from each end", () => {
        const harness = makeSession({ directed: false });
        harness.add(
            [{ id: "a" }, { id: "b" }],
            [
                { src: "a", dst: "b" },
                { src: "b", dst: "a" },
            ],
        );

        assert.strictEqual(harness.session.data.statistics().repeatedEdgeCount, 1);
        harness.session.dispose();
    });

    it("reports the degree range over the whole graph", () => {
        const harness = makeSession({ directed: true });
        const { nodes, edges } = graph(4, [[0, 1], [0, 2], [0, 3]]);
        harness.add(nodes, edges);

        assert.deepEqual(harness.session.data.statistics().degreeRange, [1, 3]);
        harness.session.dispose();
    });
});

describe("the connected components", () => {
    it("finds the pieces and orders their sizes largest first", () => {
        const harness = makeSession();
        const { nodes, edges } = graph(6, [[0, 1], [1, 2], [3, 4]]);
        harness.add(nodes, edges);

        const { components } = harness.session.data.statistics();
        assert.strictEqual(components.count, 3);
        assert.deepEqual(components.sizes, [3, 2, 1]);
        assert.strictEqual(components.largestSize, 3);
        assert.strictEqual(components.isolatedCount, 1);
        assert.strictEqual(components.truncatedSizes, false);
        harness.session.dispose();
    });

    it("ignores arc direction, because a reader looking at the picture sees one piece", () => {
        const harness = makeSession({ directed: true });
        const { nodes, edges } = graph(3, [[0, 1], [2, 1]]);
        harness.add(nodes, edges);

        assert.strictEqual(harness.session.data.statistics().components.count, 1);
        harness.session.dispose();
    });

    it("says which component a node is in, and nothing at all for a node it does not have", () => {
        const harness = makeSession();
        const { nodes, edges } = graph(4, [[0, 1], [2, 3]]);
        harness.add(nodes, edges);

        const { components } = harness.session.data.statistics();
        assert.strictEqual(components.componentOf("n0"), components.componentOf("n1"));
        assert.notStrictEqual(components.componentOf("n0"), components.componentOf("n2"));
        assert.isUndefined(components.componentOf("nobody"));
        harness.session.dispose();
    });

    it("walks a long chain without running out of stack", () => {
        // A path of 50,000 nodes is exactly the graph somebody asks "how many pieces is this in?"
        // about, and it is the graph a recursive walk dies on.
        const harness = makeSession();
        const count = 50_000;
        const nodes: NodeRow[] = [];
        const edges: EdgeRow[] = [];
        for (let i = 0; i < count; i++) {
            nodes.push({ id: i });
            if (i > 0) {
                edges.push({ src: i - 1, dst: i });
            }
        }

        harness.add(nodes, edges);

        const { components } = harness.session.data.statistics();
        assert.strictEqual(components.count, 1);
        assert.strictEqual(components.largestSize, count);
        harness.session.dispose();
    });

    it("caps the size list and says that it did", () => {
        const harness = makeSession();
        const nodes: NodeRow[] = [];
        for (let i = 0; i < COMPONENT_SIZE_CAP + 10; i++) {
            nodes.push({ id: i });
        }

        harness.add(nodes);

        const { components } = harness.session.data.statistics();
        assert.strictEqual(components.count, COMPONENT_SIZE_CAP + 10);
        assert.strictEqual(components.sizes.length, COMPONENT_SIZE_CAP);
        assert.strictEqual(components.truncatedSizes, true);
        harness.session.dispose();
    });
});
