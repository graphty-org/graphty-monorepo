/**
 * @file The simple tier's graph view over a real rendered graph: the element's own store, the
 * attributes its records arrived with, and a finished run's published values.
 *
 * The unit tests build the view over a headless session; this proves the same view reads what a
 * graph drawn on a page holds -- a record pushed in with `src`/`dst`, a self-loop, parallel edges,
 * a node whose id is the number 0 -- and that a result path reads a run's values exactly as a
 * style layer bound to that run does.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { isGraphtyError } from "../../../src/errors";
import { Graph } from "../../../src/Graph";
import { viewSourceOf } from "../../../src/simple/source";
import type { GraphView, NodeId, NodeView } from "../../../src/simple/types";
import { createGraphView, viewWarnings } from "../../../src/simple/view";

/** Five nodes, one of them the number 0: a triangle, a self-loop on "c", and two parallel edges. */
const NODES = [
    { id: 0, tier: 1, name: "zero" },
    { id: "a", tier: 2 },
    { id: "b", tier: 2 },
    { id: "c", tier: 3 },
    { id: "lone" },
];
const EDGES = [
    { src: 0, dst: "a", confidence: 0.5 },
    { src: "a", dst: "b", confidence: 0.25 },
    { src: "a", dst: "b", confidence: 0.75 },
    { src: "b", dst: 0, confidence: "NA" },
    { src: "c", dst: "c", confidence: 1 },
];

/**
 * A node the test knows is there.
 * @param view - The view.
 * @param id - The node id.
 * @returns The node.
 */
function nodeOf(view: GraphView, id: NodeId): NodeView {
    const node = view.node(id);
    if (node === undefined) {
        return assert.fail(`node ${String(id)} is not in the view`);
    }

    return node;
}

describe("the graph view over a rendered graph", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);
        await graph.operationQueue.waitForCompletion();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * The view a run would build now.
     * @param directed - Whether the definition asks for direction.
     * @returns The view.
     */
    function view(directed = false): GraphView {
        return createGraphView(viewSourceOf(graph.getSession()), { id: "acme-test", directed });
    }

    it("holds every node and every edge with the element's own ids", () => {
        const graphView = view();
        const session = graph.getSession();

        assert.strictEqual(graphView.nodeCount, 5);
        assert.strictEqual(graphView.edgeCount, 5);
        assert.deepEqual(
            graphView.nodes().map((node) => node.id),
            [0, "a", "b", "c", "lone"],
        );
        for (const edge of graphView.edges()) {
            const record = session.data.edge(edge.id);
            assert.isDefined(record, `edge ${edge.id} is an edge the session knows`);
            assert.strictEqual(record?.source, edge.source.id);
            assert.strictEqual(record?.target, edge.target.id);
        }
    });

    it("counts a self-loop once, keeps parallel edges apart, and finds the number 0", () => {
        const graphView = view();
        const zero = nodeOf(graphView, 0);
        const a = nodeOf(graphView, "a");
        const b = nodeOf(graphView, "b");
        const c = nodeOf(graphView, "c");

        assert.strictEqual(zero.attr("name"), "zero");
        assert.isUndefined(graphView.node("0"));
        assert.strictEqual(c.degree, 1);
        assert.deepEqual(c.neighbors(), []);
        assert.strictEqual(a.edgesTo(b).length, 2);
        assert.strictEqual(a.weightTo(b, "confidence"), 1);
        assert.deepEqual(
            a.neighbors().map((node) => node.id),
            [0, "b"],
        );
        assert.strictEqual(nodeOf(graphView, "lone").degree, 0);
    });

    it("leaves a text weight out of a strength and says so", () => {
        const graphView = view();

        assert.strictEqual(nodeOf(graphView, "b").strength("confidence"), 1, "0.25 + 0.75; the NA edge is left out");
        assert.deepEqual(viewWarnings(graphView), [
            'acme-test: 1 of 5 edges has no number at "confidence" (1 holds text, e.g. "NA"); they were left out.',
        ]);
    });

    it("groups by an attribute and leaves out a node without it", () => {
        const groups = view().groupBy("tier");

        assert.deepEqual([...groups.keys()], [1, 2, 3]);
        assert.deepEqual(
            (groups.get(2) ?? []).map((node) => node.id),
            ["a", "b"],
        );
    });

    it("reads a finished run's values through its result path, as a style layer does", async () => {
        const session = graph.getSession();
        const result = await session.runs.start("degree", {}, { as: "degree" });
        const graphView = view();

        for (const node of graphView.nodes()) {
            assert.strictEqual(
                node.number("results.degree.value"),
                result.node(node.id)?.value,
                `node ${String(node.id)} reads the value the run published`,
            );
        }
        assert.isAbove(nodeOf(graphView, "a").number("results.degree.value") ?? 0, 0, "the run measured node a");
    });

    it("refuses a misspelt attribute with the names the nodes do carry", () => {
        const graphView = view();
        let caught: unknown;
        try {
            nodeOf(graphView, "a").number("teir");
        } catch (error) {
            caught = error;
        }

        assert.isTrue(isGraphtyError(caught));
        assert.match(
            (caught as Error).message,
            /^acme-test: node\.number\("teir"\) names a node attribute no node carries; nodes carry: .*tier/,
        );
    });
});
