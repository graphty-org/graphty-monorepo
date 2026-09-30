/**
 * @file The graph view the simple extension tier hands an algorithm or a layout, on toy graphs.
 *
 * An author of a simple-tier plugin reads the graph as nodes and edges with their real ids and a
 * handful of guessable methods (design/extensions/simple-tier.md section 2.3). Every rule of that
 * section is a way the numbers could silently go wrong -- a self-loop counted twice, a parallel
 * edge merged away, a node whose id is the number 0 mistaken for "no node", a missing weight read
 * as zero -- so each rule has a toy graph here small enough to count by hand.
 *
 * The view is built over a real headless session (the store, the record source and the style
 * selector's own resolver), which is exactly what a run builds it over.
 */

import { assert, describe, it } from "vitest";

import { GraphtyError, isGraphtyError } from "../../src/errors";
import { viewSourceOf } from "../../src/simple/source";
import type { GraphView, NodeId, NodeView } from "../../src/simple/types";
import { compareNodeIds, createGraphView, viewWarnings } from "../../src/simple/view";
import { type EdgeRow, type Harness, makeSession, type NodeRow } from "../session/helpers";

/**
 * A view over a fresh graph.
 * @param nodes - Node records.
 * @param edges - Edge records.
 * @param options - Whether the data is directed and whether the definition asks for direction.
 * @returns The view and the harness behind it.
 */
function viewOf(
    nodes: readonly NodeRow[],
    edges: readonly EdgeRow[] = [],
    options: { data?: boolean; definition?: boolean } = {},
): { view: GraphView; harness: Harness } {
    const harness = makeSession({ directed: options.data ?? false });
    harness.add(nodes, edges);
    const view = createGraphView(viewSourceOf(harness.session), {
        id: "acme-test",
        directed: options.definition ?? false,
    });

    return { view, harness };
}

/**
 * The ids of a list of nodes, for comparing orders.
 * @param list - The nodes.
 * @returns Their ids.
 */
function ids(list: readonly NodeView[]): NodeId[] {
    return list.map((node) => node.id);
}

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

/**
 * The error a call throws, asserted to be a GraphtyError.
 * @param call - The call.
 * @returns The error.
 */
function thrown(call: () => unknown): GraphtyError {
    try {
        call();
    } catch (error) {
        assert.isTrue(isGraphtyError(error), `a GraphtyError, not ${String(error)}`);
        return error as GraphtyError;
    }

    return assert.fail("the call did not throw");
}

describe("an empty graph", () => {
    it("has no nodes, no edges and no groups", () => {
        const { view } = viewOf([]);

        assert.strictEqual(view.nodeCount, 0);
        assert.strictEqual(view.edgeCount, 0);
        assert.deepEqual(view.nodes(), []);
        assert.deepEqual(view.edges(), []);
        assert.isUndefined(view.node("a"));
        assert.isUndefined(view.edge("0"));
        assert.strictEqual(view.groupBy("tier").size, 0);
        assert.strictEqual(view.groupBy(undefined).size, 0);
    });
});

describe("one node whose id is the number 0", () => {
    it("is found by the number and not by the string", () => {
        const { view } = viewOf([{ id: 0, name: "zero" }]);

        const zero = nodeOf(view, 0);
        assert.strictEqual(zero.id, 0);
        assert.isUndefined(view.node("0"), 'the string "0" is a different id');
        assert.strictEqual(zero.attr("name"), "zero");
    });

    it("has degree 0, no neighbours and a strength of 0", () => {
        const { view } = viewOf([{ id: 0 }]);
        const zero = nodeOf(view, 0);

        assert.strictEqual(zero.degree, 0);
        assert.deepEqual(zero.neighbors(), []);
        assert.deepEqual(zero.edges(), []);
        assert.strictEqual(zero.strength(undefined), 0);
    });
});

describe("a self-loop", () => {
    const graph = (): GraphView =>
        viewOf(
            [{ id: "a" }, { id: "b" }],
            [
                { source: "a", target: "a", weight: 4 },
                { source: "a", target: "b", weight: 1 },
            ],
        ).view;

    it("counts once in degree and strength, as the element's own degree does", () => {
        const a = nodeOf(graph(), "a");

        assert.strictEqual(a.degree, 2, "the loop once, the edge to b once");
        assert.strictEqual(a.strength(undefined), 2);
        assert.strictEqual(a.strength("weight"), 5);
    });

    it("is in edges() and edgesTo(itself) but never in neighbors()", () => {
        const a = nodeOf(graph(), "a");

        assert.deepEqual(ids(a.neighbors()), ["b"]);
        assert.strictEqual(a.edgesTo(a).length, 1);
        assert.strictEqual(a.edgesTo(a)[0].other(a), a, "the far end of a self-loop is the node itself");
        assert.strictEqual(a.weightTo(a, "weight"), 4);
    });
});

describe("parallel edges", () => {
    const graph = (): GraphView =>
        viewOf(
            [{ id: "a" }, { id: "b" }, { id: "c" }],
            [
                { source: "a", target: "b", weight: 2 },
                { source: "a", target: "b", weight: 3 },
                { source: "b", target: "c", weight: 7 },
            ],
        ).view;

    it("stay separate edges with their own ids", () => {
        const view = graph();
        const a = nodeOf(view, "a");
        const b = nodeOf(view, "b");

        assert.strictEqual(view.edgeCount, 3);
        assert.strictEqual(a.edges().length, 2);
        assert.strictEqual(new Set(a.edgesTo(b).map((edge) => edge.id)).size, 2);
        assert.strictEqual(a.degree, 2);
    });

    it("add together in weightTo, and a node with no edge between them is undefined, not 0", () => {
        const view = graph();
        const a = nodeOf(view, "a");

        assert.strictEqual(a.weightTo(nodeOf(view, "b"), "weight"), 5);
        assert.strictEqual(a.weightTo(nodeOf(view, "b"), undefined), 2, "an unbound weight counts each edge as 1");
        assert.isUndefined(a.weightTo(nodeOf(view, "c"), "weight"));
    });

    it("list the neighbour once", () => {
        const view = graph();

        assert.deepEqual(ids(nodeOf(view, "a").neighbors()), ["b"]);
        assert.deepEqual(ids(nodeOf(view, "b").neighbors()), ["a", "c"]);
    });

    it("are found by id, and each edge's other() walks to the far end", () => {
        const view = graph();
        const b = nodeOf(view, "b");

        for (const edge of view.edges()) {
            assert.strictEqual(view.edge(edge.id), edge);
        }

        assert.deepEqual(
            b
                .edges()
                .map((edge) => edge.other(b).id)
                .sort(),
            ["a", "a", "c"],
        );
    });
});

describe("direction", () => {
    const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const edges = [
        { source: "a", target: "b", weight: 2 },
        { source: "c", target: "a", weight: 5 },
    ];

    it("is never guessed: an undirected definition's directed accessors throw and name the fix", () => {
        const { view } = viewOf(nodes, edges, { data: true, definition: false });
        const a = nodeOf(view, "a");

        assert.isFalse(view.directed);
        for (const call of [
            (): unknown => a.outEdges(),
            (): unknown => a.inEdges(),
            (): unknown => a.outNeighbors(),
            (): unknown => a.inNeighbors(),
            (): unknown => a.strength(undefined, "out"),
        ]) {
            const error = thrown(call);
            assert.strictEqual(error.code, "E_BAD_COMMAND");
            assert.match(error.message, /^acme-test: \w+\(\) needs direction: "directed" in the definition/);
        }

        assert.deepEqual(ids(a.neighbors()), ["b", "c"], "the undirected view ignores which way edges point");
    });

    it("a directed definition over directed data reads out and in separately", () => {
        const { view } = viewOf(nodes, edges, { data: true, definition: true });
        const a = nodeOf(view, "a");
        const b = nodeOf(view, "b");

        assert.isTrue(view.directed);
        assert.deepEqual(ids(a.outNeighbors()), ["b"]);
        assert.deepEqual(ids(a.inNeighbors()), ["c"]);
        assert.strictEqual(a.outEdges().length, 1);
        assert.strictEqual(a.inEdges().length, 1);
        assert.strictEqual(a.strength("weight", "out"), 2);
        assert.strictEqual(a.strength("weight", "in"), 5);
        assert.strictEqual(a.strength("weight"), 7);
        assert.strictEqual(a.edgesTo(b).length, 1, "a to b");
        assert.strictEqual(b.edgesTo(a).length, 0, "b to a is not an edge in a directed view");
        assert.isUndefined(b.weightTo(a, "weight"));
        assert.strictEqual(view.edges()[0].source.id, "a", "source is where the edge starts");
    });

    it("a directed definition over undirected data counts every edge both ways", () => {
        const { view } = viewOf(nodes, edges, { data: false, definition: true });
        const a = nodeOf(view, "a");
        const b = nodeOf(view, "b");

        assert.isFalse(view.directed, "the graph has no directed edges");
        assert.deepEqual(ids(a.outNeighbors()), ["b", "c"]);
        assert.deepEqual(ids(a.inNeighbors()), ["b", "c"]);
        assert.strictEqual(a.outEdges().length, 2);
        assert.strictEqual(b.edgesTo(a).length, 1);
    });
});

describe("order", () => {
    it("is numbers ascending, then strings by code unit, whatever order the records arrived in", () => {
        const { view } = viewOf([{ id: "c" }, { id: 10 }, { id: "B" }, { id: 2 }, { id: "a" }, { id: 0 }]);

        assert.deepEqual(ids(view.nodes()), [0, 2, 10, "B", "a", "c"]);
        assert.deepEqual(["c", 10, "B", 2, "a", 0].sort(compareNodeIds), [0, 2, 10, "B", "a", "c"]);
    });

    it("lists edges by edge id and neighbours in the view's order", () => {
        const { view } = viewOf(
            [{ id: "hub" }, { id: "z" }, { id: 3 }, { id: "a" }],
            [
                { source: "hub", target: "z" },
                { source: "hub", target: 3 },
                { source: "hub", target: "a" },
            ],
        );
        const edgeIds = view.edges().map((edge) => Number(edge.id));

        assert.deepEqual(
            edgeIds,
            [...edgeIds].sort((x, y) => x - y),
        );
        assert.deepEqual(ids(nodeOf(view, "hub").neighbors()), [3, "a", "z"]);
    });

    it("hands back frozen arrays, built once", () => {
        const { view } = viewOf([{ id: "a" }, { id: "b" }], [{ source: "a", target: "b" }]);
        const a = nodeOf(view, "a");

        assert.strictEqual(view.nodes(), view.nodes());
        assert.strictEqual(a.neighbors(), a.neighbors());
        assert.isTrue(Object.isFrozen(view.nodes()));
        assert.isTrue(Object.isFrozen(view.edges()));
        assert.isTrue(Object.isFrozen(a.edges()));
    });
});

describe("attributes", () => {
    it("reads a value by path, and undefined for an unbound option", () => {
        const { view } = viewOf([
            { id: "a", tier: 2, label: "first" },
            { id: "b", tier: "3" },
        ]);
        const a = nodeOf(view, "a");
        const b = nodeOf(view, "b");

        assert.strictEqual(a.attr("tier"), 2);
        assert.strictEqual(a.attr("data.tier"), 2, "the selector's data. prefix reads the same key");
        assert.strictEqual(a.number("tier"), 2);
        assert.strictEqual(b.attr("tier"), "3");
        assert.isUndefined(b.number("tier"), "a numeric string is not parsed");
        assert.isUndefined(a.attr(undefined));
        assert.isUndefined(a.number(undefined));
    });

    it("refuses a path no node carries at its first read, naming what nodes do carry", () => {
        const { view } = viewOf([
            { id: "a", confidence: 1, tier: 2 },
            { id: "b", tier: 1 },
        ]);
        const error = thrown(() => nodeOf(view, "a").attr("confidance"));

        assert.strictEqual(error.code, "E_OPTION_RANGE");
        assert.strictEqual(
            error.message,
            'acme-test: node.attr("confidance") names a node attribute no node carries; nodes carry: confidence, tier.',
        );
        assert.strictEqual(error.details.path, "confidance");
    });

    it("refuses a result path whose run has not completed, saying which run to do first", () => {
        const { view } = viewOf([{ id: "a" }]);
        const error = thrown(() => nodeOf(view, "a").number("results.strength.value"));

        assert.strictEqual(error.code, "E_OPTION_RANGE");
        assert.match(error.message, /no completed run is named "strength"; run the algorithm that produces it first/);
    });

    it("reads edge endpoints and edge attributes", () => {
        const { view } = viewOf([{ id: "a" }, { id: "b" }], [{ source: "a", target: "b", kind: "friend" }]);
        const [edge] = view.edges();

        assert.strictEqual(edge.attr("kind"), "friend");
        assert.strictEqual(edge.source.id, "a");
        assert.strictEqual(edge.target.id, "b");
    });

    it("groups nodes by value in readable order, leaving out nodes without the attribute", () => {
        const { view } = viewOf([
            { id: "n1", group: "10" },
            { id: "n2", group: "2" },
            { id: "n3", group: 10 },
            { id: "n4", group: 2 },
            { id: "n5", group: "b" },
            { id: "n6" },
            { id: "n7", group: "2" },
        ]);
        const groups = view.groupBy("group");

        assert.deepEqual([...groups.keys()], [2, 10, "2", "10", "b"]);
        assert.deepEqual(ids(groups.get("2") ?? []), ["n2", "n7"]);
        assert.strictEqual(
            [...groups.values()].reduce((sum, list) => sum + list.length, 0),
            6,
            "n6 has no group",
        );
    });
});

describe("the weight rule", () => {
    const graph = (): GraphView =>
        viewOf(
            [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
            [
                { source: "a", target: "b", confidence: 0.5 },
                { source: "a", target: "c", confidence: "NA" },
                { source: "a", target: "d" },
            ],
        ).view;

    it("counts every edge as 1 when the weight is unbound", () => {
        const view = graph();

        for (const edge of view.edges()) {
            assert.strictEqual(edge.weight(undefined), 1);
        }
        assert.strictEqual(nodeOf(view, "a").strength(undefined), 3);
    });

    it("leaves out an edge with no number, never reading it as 0, and says so once", () => {
        const view = graph();
        const a = nodeOf(view, "a");

        assert.strictEqual(a.strength("confidence"), 0.5);
        assert.strictEqual(a.strength("confidence"), 0.5, "a second read is cached");
        assert.deepEqual(
            view.edges().map((edge) => edge.weight("confidence")),
            [0.5, undefined, undefined],
        );
        assert.deepEqual(viewWarnings(view), [
            'acme-test: 2 of 3 edges have no number at "confidence" (1 holds text, e.g. "NA"); they were left out.',
        ]);
    });

    it("says a column stayed text when no element has a number at the path", () => {
        const { view } = viewOf([
            { id: "a", size: "big" },
            { id: "b", size: "small" },
        ]);

        for (const node of view.nodes()) {
            assert.isUndefined(node.number("size"));
        }
        assert.deepEqual(viewWarnings(view), [
            'acme-test: no node has a number at "size": its values are text (e.g. "big"), so every read of it was left out.',
        ]);
    });

    it("warns about nothing when every read found a number", () => {
        const { view } = viewOf([{ id: "a" }, { id: "b" }], [{ source: "a", target: "b", confidence: 1 }]);

        nodeOf(view, "a").strength("confidence");
        assert.deepEqual(viewWarnings(view), []);
    });
});

describe("walking with other()", () => {
    it("refuses a node that is not an end of the edge", () => {
        const { view } = viewOf([{ id: "a" }, { id: "b" }, { id: "c" }], [{ source: "a", target: "b" }]);
        const [edge] = view.edges();
        const error = thrown(() => edge.other(nodeOf(view, "c")));

        assert.strictEqual(error.code, "E_BAD_COMMAND");
        assert.match(
            error.message,
            /^acme-test: edge\.other\(\) was given node "c", which is not an end of edge "\d+"/,
        );
    });
});

describe("an error from the view", () => {
    it("is a GraphtyError the element can report", () => {
        const { view } = viewOf([{ id: "a" }]);

        assert.instanceOf(
            thrown(() => nodeOf(view, "a").outEdges()),
            GraphtyError,
        );
    });
});
