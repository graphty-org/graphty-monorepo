/**
 * @file The Graphviz layouts' Node-side pieces: the DOT the element writes, the json it reads back,
 * the options, the error codes, the catalogue entries, each engine on a small graph through the real
 * WebAssembly library, and every branch of the recommendation for a Graphviz file.
 */

import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { graphvizPosBends } from "@graphty/graph-io/dot";
import { assert, describe, it, vi } from "vitest";

import { LAYOUT_DESCRIPTORS, layoutDescriptor } from "../../src/catalog/layouts";
import { graphvizAvailability } from "../../src/layout/graphviz/availability";
import { GRAPHVIZ_ENGINES, GRAPHVIZ_NODE_BUDGETS } from "../../src/layout/graphviz/engines";
import { clusterMargins, edgeBends, fromJson } from "../../src/layout/graphviz/fromJson";
import { runGraphviz } from "../../src/layout/graphviz/host";
import { classify, layout } from "../../src/layout/graphviz/loader";
import { graphvizStructure } from "../../src/layout/graphviz/structure";
import { toDot } from "../../src/layout/graphviz/toDot";
import { graphvizAttributes, graphvizError } from "../../src/layout/GraphvizLayoutEngine";
import { recommendLayout } from "../../src/session";
import { FILE_GRAPH_VALUE } from "../../src/session/commands/data";
import { dispatcherOf } from "../../src/session/GraphSession";
import type { GraphStatistics } from "../../src/session/types";
import { makeSession } from "../session/helpers";

/**
 * A small graph.
 * @param directed - whether its edges are directed
 * @param edges - the edges, as pairs of node ids
 * @returns the snapshot
 */
function graph(directed: boolean, edges: readonly (readonly [string, string])[]): GraphSnapshot {
    const builder = new GraphBuilder({ directed, weightDtype: "f64" });
    for (const [a, b] of edges) {
        builder.addEdge(a, b);
    }

    return builder.freeze();
}

/**
 * The shape of a graph with these counts.
 * @param nodeCount - nodes
 * @param edgeCount - edges
 * @returns the statistics
 */
function sizeOnly(nodeCount: number, edgeCount: number): GraphStatistics {
    return {
        nodeCount,
        edgeCount,
        density: 0,
        directedness: "unknown",
        directednessSource: { by: "unsettled", statedBy: null },
        weighted: false,
        selfLoopCount: 0,
        repeatedEdgeCount: 0,
        degreeRange: [0, 0],
        meanDegree: 0,
        components: {
            count: 0,
            sizes: [],
            largestSize: 0,
            isolatedCount: 0,
            truncatedSizes: false,
            componentOf: () => undefined,
        },
    };
}

const TRIANGLE: readonly (readonly [string, string])[] = [
    ["a", "b"],
    ["b", "c"],
    ["c", "a"],
    ["a", "b"],
];

describe("the DOT the element hands Graphviz", () => {
    it("names nodes by row, keeps the direction and every parallel edge, and sizes each node", () => {
        const dot = toDot(graph(true, TRIANGLE), { rankdir: "LR", 'bad"name': "x" }, [2, Number.NaN, 0]);

        assert.match(dot, /^digraph G \{/);
        assert.include(dot, 'graph [rankdir="LR"];', "a plain attribute is written quoted; an unsafe name is dropped");
        assert.notInclude(dot, "bad");
        assert.include(dot, "n0 [width=2, height=2];", "the element's node size, in inches");
        assert.include(dot, "n1 [width=1, height=1];", "an unknown size takes the default");
        assert.include(dot, "n2 [width=1, height=1];", "a zero size takes the default");
        assert.strictEqual(dot.match(/n0 -> n1 \[id="e\d+"\];/g)?.length, 2, "the parallel edge is kept");
        assert.match(dot, /n2 -> n0 \[id="e\d+"\];/, "each edge named by its place in the list");
    });

    it("writes a node with two different sides as a box that size, and leaves a group's row out as a node", () => {
        const dot = toDot(graph(true, TRIANGLE), {}, [3, 1, 1], [3, 1.5, 1, 1, 4, 2], new Map([[2, []]]));

        assert.include(dot, "n0 [shape=box, width=3, height=1.5];", "a wide node is a box its own size");
        assert.include(dot, "n1 [width=1, height=1];", "a node as tall as it is wide stays a circle");
        assert.notMatch(dot, /\bn2\b/, "a group's row and its edges are not handed over as a node");
        assert.strictEqual(dot.match(/n0 -> n1 \[id="e\d+"\];/g)?.length, 2);
    });

    it("pins each node at its place and hands over its outline, for a run that routes only the edges", () => {
        const dot = toDot(graph(true, [["a", "b"]]), {}, [1, 1], undefined, new Map(), {
            positions: [10, 20, Number.NaN, 5],
            nodeAttributes: new Map([[0, { shape: "record", label: "{<p1> a|<p2> b}" }]]),
        });

        assert.include(dot, 'n0 [width=1, height=1, shape="record", label="{<p1> a|<p2> b}", pos="10,20!"];');
        assert.include(dot, "n1 [width=1, height=1];", "a row with no place is left free");
    });

    it("hands Graphviz the ports, arrows and outlines an edge's route follows", () => {
        const structure = graphvizStructure(
            (id) => ["s", "t"].indexOf(String(id)),
            [{ srcId: "s", dstId: "t", data: { headport: "p2:w", dir: "none", color: "red" } }],
            new Map(),
            [],
            new Map([
                [0, { shape: "plain", label: "words", color: "red" }],
                [1, { shape: "record", label: "{<p1> a|<p2> b}" }],
            ]),
        );

        assert.deepEqual(structure.edges?.[0].attributes, { headport: "p2:w", dir: "none" });
        // a `plain` node is as big as its label, which Graphviz is not handed the room of
        assert.deepEqual(structure.nodeAttributes?.get(0), { shape: "plaintext", label: "words" });
        assert.deepEqual(structure.nodeAttributes?.get(1), { shape: "record", label: "{<p1> a|<p2> b}" });
    });

    it("routes the edges between pinned nodes round the node in their way, and moves no node (neato -n2)", async () => {
        const snapshot = graph(true, [
            ["a", "c"],
            ["b", "b"],
        ]);
        const [a, b, c] = ["a", "b", "c"].map((id) => snapshot.ids.requireIndex(id));
        const positions = new Float32Array(6);
        positions.set([0, 0], 2 * a);
        positions.set([100, 0], 2 * b);
        positions.set([200, 0], 2 * c);
        const sizes = new Float32Array(3).fill(0.2);
        sizes[b] = 1;
        const dot = toDot(snapshot, { splines: "true" }, sizes, undefined, new Map(), { positions });

        const reply = await layout(dot, "neato", true);
        assert.isTrue(reply.ok, JSON.stringify(reply));
        const json = reply.ok ? reply.json : "{}";
        const placed = fromJson(json, snapshot.nodeCount);
        assert.closeTo(placed[2 * c] - placed[2 * a], 200 / 72, 1e-3, "the nodes stay where they were pinned");
        assert.closeTo(placed[2 * b] - placed[2 * a], 100 / 72, 1e-3);
        const bends = edgeBends(json, [{ src: a, dst: c }], graphvizPosBends);
        assert.isTrue(bends.has(0), "the edge goes round b, not through it");
    });

    it("writes each group as a cluster of its members, a group inside a group nested in it", () => {
        // rows: a0 b1 c2 d3 outer4 inner5; outer holds a and inner, inner holds b and c.
        const snapshot = graph(true, [
            ["a", "b"],
            ["c", "d"],
            ["outer", "inner"],
        ]);
        const groups = new Map([
            [4, [0, 5]],
            [5, [1, 2]],
        ]);

        const dot = toDot(snapshot, {}, undefined, undefined, groups);

        assert.include(dot, "subgraph cluster_n4 {\nn0;\nsubgraph cluster_n5 {\nn1;\nn2;\n}\n}");
        assert.strictEqual(dot.match(/cluster_n5/g)?.length, 1, "the nested group is written once, inside its parent");
        assert.notMatch(dot, /n4 ->|-> n5/, "an edge between groups is not handed over");
    });

    it("has Graphviz keep a group's members together and every other node out of its box", async () => {
        // Without the cluster, dot puts x between a and b in their rank, in edge order.
        const snapshot = graph(true, [
            ["r", "a"],
            ["r", "x"],
            ["r", "b"],
            ["g", "g"],
        ]);
        const g = snapshot.ids.requireIndex("g");
        const [a, x, b] = ["a", "x", "b"].map((id) => snapshot.ids.requireIndex(id));

        const between = async (members: number[]): Promise<boolean> => {
            const reply = await layout(toDot(snapshot, {}, undefined, undefined, new Map([[g, members]])), "dot");
            assert.isTrue(reply.ok, JSON.stringify(reply));
            const positions = reply.ok ? fromJson(reply.json, snapshot.nodeCount) : new Float32Array(0);
            assert.isTrue(Number.isNaN(positions[2 * g]), "the group is not placed by Graphviz");
            const [ax, xx, bx] = [a, x, b].map((row) => positions[2 * row]);
            return Math.min(ax, bx) < xx && xx < Math.max(ax, bx);
        };

        assert.isTrue(await between([]), "the case this guards: with no cluster, x lands between a and b");
        assert.isFalse(await between([a, b]), "with the cluster, x stays out of the group's box");
    });

    it("writes the edges in the order given with their attributes, each cluster's own attributes and the rank subgraphs", () => {
        // rows: a0 b1 c2 g3
        const snapshot = graph(true, [
            ["a", "b"],
            ["b", "c"],
            ["g", "g"],
        ]);
        const dot = toDot(snapshot, {}, undefined, undefined, new Map([[3, [0, 1]]]), {
            edges: [
                { src: 1, dst: 2, attributes: { minlen: "2", weight: "5", 'x"y': "dropped" } },
                { src: 0, dst: 1 },
                { src: 3, dst: 2, attributes: { minlen: "9" } },
            ],
            groupAttributes: new Map([[3, { label: "the group", fontsize: "20" }]]),
            ranks: [
                { rank: "same", rows: [0, 2, 3] },
                { rank: "bad rank", rows: [1] },
            ],
        });

        // after the members, so a cluster inside it does not take them as the attributes set round it
        assert.include(dot, 'subgraph cluster_n3 {\nn0;\nn1;\ngraph [label="the group", fontsize="20"];\n}');
        assert.include(dot, "{ rank=same; n0; n2; }", "a group's row is no node to rank");
        assert.notInclude(dot, "bad rank");
        assert.include(dot, 'n1 -> n2 [minlen="2", weight="5", id="e0"];\nn0 -> n1 [id="e1"];', "in the order given");
        assert.notInclude(dot, "n3 ->", "an edge of a group is not handed over");
        assert.notInclude(dot, "dropped");
    });

    it("has dot put a rank subgraph's nodes on one rank and stretch an edge over its minlen", async () => {
        // rows: r0 a1 b2 c3 x4 y5 z6
        const snapshot = graph(true, [
            ["r", "a"],
            ["r", "b"],
            ["b", "c"],
            ["x", "y"],
            ["x", "z"],
        ]);
        const plain = await layout(toDot(snapshot, {}), "dot");
        const ranked = await layout(
            toDot(snapshot, {}, undefined, undefined, undefined, {
                edges: [
                    { src: 0, dst: 1 },
                    { src: 0, dst: 2 },
                    { src: 2, dst: 3 },
                    { src: 4, dst: 5, attributes: { minlen: "3" } },
                    { src: 4, dst: 6 },
                ],
                ranks: [{ rank: "same", rows: [1, 3] }],
            }),
            "dot",
        );

        assert.isTrue(plain.ok && ranked.ok);
        const [before, after] = [plain, ranked].map((reply) =>
            reply.ok ? fromJson(reply.json, 7) : new Float32Array(14),
        );
        const y = (positions: Float32Array, row: number): number => positions[2 * row + 1];
        assert.notStrictEqual(y(before, 1), y(before, 3), "the case this guards: c is a rank below a");
        assert.strictEqual(y(after, 1), y(after, 3), "a and c on one rank");
        assert.closeTo((y(after, 4) - y(after, 5)) / (y(after, 4) - y(after, 6)), 3, 1e-6, "y three ranks below x");
    });

    it("writes an undirected graph with undirected edges, and escapes attribute values", () => {
        const dot = toDot(graph(false, [["a", "b"]]), { label: 'say "hi"\nthere' });

        assert.match(dot, /^graph G \{/);
        assert.match(dot, /n0 -- n1 \[id="e\d+"\];/);
        assert.include(dot, 'label="say \\"hi\\"\\nthere"');
    });
});

describe("Graphviz's json read back", () => {
    it("centers the drawing on the bounding box and converts points to scene units", () => {
        const json = JSON.stringify({
            bb: "0,0,144,72",
            objects: [
                { name: "cluster_x" },
                { name: "n1", pos: "144,72" },
                { name: "n0", pos: "0,0" },
                { name: "other", pos: "1,1" },
            ],
        });

        const positions = fromJson(json, 3);

        assert.deepEqual(Array.from(positions.subarray(0, 4)), [-1, -0.5, 1, 0.5]);
        assert.isTrue(Number.isNaN(positions[4]) && Number.isNaN(positions[5]), "a row Graphviz did not place");
    });

    it("round-trips a real layout: every row placed, the same positions on a second run", async () => {
        const snapshot = graph(true, TRIANGLE);
        const dot = toDot(snapshot, {});

        const first = await layout(dot, "dot");
        const second = await layout(dot, "dot");

        assert.isTrue(first.ok && second.ok);
        if (first.ok && second.ok) {
            const a = fromJson(first.json, snapshot.nodeCount);
            assert.isTrue(a.every((v) => Number.isFinite(v)));
            assert.deepEqual(Array.from(a), Array.from(fromJson(second.json, snapshot.nodeCount)));
        }
    });
});

describe("the room Graphviz gives each cluster read back", () => {
    it("reads how far each cluster reaches past its members on each side: its margin, and its label's room on top", async () => {
        // rows: a0 b1 c2 outer3 inner4; a box one inch by half an inch is 72 by 36 points
        const snapshot = graph(true, [
            ["a", "b"],
            ["b", "c"],
            ["outer", "inner"],
        ]);
        const groups = new Map([
            [3, [0, 4]],
            [4, [1, 2]],
        ]);
        const extents = Array.from({ length: 10 }, (_unused, i) => (i % 2 === 0 ? 1 : 0.5));
        const dot = toDot(snapshot, {}, undefined, extents, groups, {
            groupAttributes: new Map([[3, { label: "outer words" }]]),
        });
        const reply = await layout(dot, "dot");
        assert.isTrue(reply.ok, JSON.stringify(reply));
        const margins = reply.ok ? clusterMargins(reply.json) : new Map();

        assert.deepEqual([...margins.keys()].sort(), [3, 4]);
        // the inner cluster: Graphviz's 8-point margin on every side, no label
        assert.deepEqual(margins.get(4), { left: 8, right: 8, bottom: 8, top: 8 });
        // the outer one: 8 points past its members (the inner cluster's box among them), and its label above
        const outer = margins.get(3);
        assert.strictEqual(outer?.bottom, 8);
        assert.strictEqual(outer?.left, 8);
        assert.isAbove(outer?.top ?? 0, 8 + 14, "a 14-point label's room on top");
    });

    it("reads nothing for a cluster that is no group's, or a graph with none", () => {
        const json = JSON.stringify({
            objects: [
                { name: "cluster_other", bb: "0,0,10,10", nodes: [1] },
                { name: "n0", pos: "5,5", width: "0.1", height: "0.1" },
                { name: "cluster_n0", bb: "0,0,10,10", nodes: [] },
            ],
        });
        assert.strictEqual(clusterMargins(json).size, 0);
        assert.strictEqual(clusterMargins("{}").size, 0);
    });
});

describe("the routes Graphviz lays read back", () => {
    it("reads each edge's spline as bends between its nodes, and none for an edge dot draws straight", async () => {
        // a -> c has to go round b, which dot puts on the rank between them
        const snapshot = graph(true, [
            ["a", "b"],
            ["b", "c"],
            ["a", "c"],
        ]);
        const edges = [
            { src: 0, dst: 1 },
            { src: 1, dst: 2 },
            { src: 0, dst: 2 },
        ];
        const reply = await layout(toDot(snapshot, {}, undefined, undefined, new Map(), { edges }), "dot");

        assert.isTrue(reply.ok);
        const bends = reply.ok ? edgeBends(reply.json, edges, graphvizPosBends) : new Map<number, string>();
        assert.deepEqual([...bends.keys()], [2], "only the edge round b is routed");
        const pairs = (bends.get(2) ?? "").split(" ").map((pair) => pair.split(",").map(Number));
        assert.isAbove(Math.max(...pairs.map(([, across]) => Math.abs(across))), 0.05, "it bows off the line");
    });

    it("reads no route when the graph asks for straight lines (splines=false)", async () => {
        const snapshot = graph(true, [
            ["a", "b"],
            ["b", "c"],
            ["a", "c"],
        ]);
        const edges = [
            { src: 0, dst: 1 },
            { src: 1, dst: 2 },
            { src: 0, dst: 2 },
        ];
        const dot = toDot(snapshot, { splines: "false" }, undefined, undefined, new Map(), { edges });
        const reply = await layout(dot, "dot");

        assert.isTrue(reply.ok);
        assert.deepEqual([...(reply.ok ? edgeBends(reply.json, edges, graphvizPosBends) : [])], []);
    });

    it("maps a route back by the edge's name, never by Graphviz's own order", () => {
        const json = JSON.stringify({
            objects: [
                { name: "n0", pos: "0,0" },
                { name: "n1", pos: "100,0" },
            ],
            edges: [
                { id: "e1", pos: "e,100,0 0,0 30,40 70,40 100,0" },
                { id: "e7", pos: "0,0 30,40 70,40 100,0" },
                { pos: "0,0 30,40 70,40 100,0" },
            ],
        });
        const seen: string[] = [];
        const bends = edgeBends(
            json,
            [
                { src: 1, dst: 0 },
                { src: 0, dst: 1 },
            ],
            (source, target, pos) => {
                seen.push(`${String(source)}|${String(target)}|${pos}`);
                return "0.5,0.3";
            },
        );

        assert.deepEqual([...bends], [[1, "0.5,0.3"]]);
        assert.deepEqual(seen, ["0,0|100,0|e,100,0 0,0 30,40 70,40 100,0"]);
    });
});

describe("each engine on a small graph", () => {
    const snapshot = graph(false, [
        ["a", "b"],
        ["b", "c"],
        ["c", "d"],
        ["d", "a"],
        ["a", "c"],
        ["e", "a"],
    ]);

    for (const engine of GRAPHVIZ_ENGINES) {
        it(`${engine} places every node at a distinct finite point`, async () => {
            const reply = await layout(toDot(snapshot, {}), engine);

            assert.isTrue(reply.ok, JSON.stringify(reply));
            if (reply.ok) {
                const positions = fromJson(reply.json, snapshot.nodeCount);
                assert.isTrue(positions.every((v) => Number.isFinite(v)));
                const points = new Set<string>();
                for (let row = 0; row < snapshot.nodeCount; row++) {
                    points.add(`${positions[2 * row]},${positions[2 * row + 1]}`);
                }

                assert.strictEqual(points.size, snapshot.nodeCount);
            }
        });
    }

    it("dot honors rankdir: LR runs the ranks along x", async () => {
        const chain = graph(true, [
            ["a", "b"],
            ["b", "c"],
        ]);
        const tb = await layout(toDot(chain, {}), "dot");
        const lr = await layout(toDot(chain, { rankdir: "LR" }), "dot");

        assert.isTrue(tb.ok && lr.ok);
        if (tb.ok && lr.ok) {
            const down = fromJson(tb.json, 3);
            const across = fromJson(lr.json, 3);
            assert.strictEqual(down[0], down[4], "top to bottom: one column");
            assert.isAbove(down[1], down[5], "the first rank on top, as Graphviz draws it");
            assert.strictEqual(across[1], across[5], "left to right: one row");
            assert.isBelow(across[0], across[4]);
        }
    });

    it("neato with the same seed gives the same drawing", async () => {
        const dot = toDot(snapshot, graphvizAttributes("neato", { seed: 7, attributes: {} }));
        const a = await layout(dot, "neato");
        const b = await layout(dot, "neato");

        assert.isTrue(a.ok && b.ok);
        assert.strictEqual(a.ok && a.json, b.ok && b.json);
    });
});

describe("options and failures", () => {
    it("lays the typed options over the raw attributes and names the seed as Graphviz's start", () => {
        const attrs = graphvizAttributes("neato", {
            attributes: { overlap: "true", splines: "true", layout: "dot" },
            overlap: "scale",
            seed: 3,
        });

        assert.deepEqual(attrs, { overlap: "scale", splines: "true", start: "3" }, "and the engine is not overridden");
        assert.deepEqual(graphvizAttributes("dot", { rankdir: "LR", nodesep: 0.5, attributes: {} }), {
            rankdir: "LR",
            nodesep: "0.5",
        });
        assert.deepEqual(
            graphvizAttributes("dot", { nodesep: 2, ranksep: 4, scale: 4, attributes: {} }),
            { nodesep: "0.5", ranksep: "1" },
            "separations in scene units are handed over in inches at the layout's scale",
        );
    });

    it("classifies a syntax error, a crash and any other refusal", () => {
        assert.deepEqual(classify("dot", new Error("syntax error in line 3 near '@'\n")), {
            ok: false,
            code: "graphviz.syntax",
            params: { engine: "dot", line: 3, near: "@" },
        });
        assert.strictEqual(classify("circo", new RangeError("Maximum call stack size exceeded")).ok, false);
        assert.strictEqual(
            (classify("circo", new Error("Maximum call stack size exceeded")) as { code: string }).code,
            "graphviz.crashed",
        );
        assert.deepEqual(classify("dot", new Error("Layout was not done\n")), {
            ok: false,
            code: "graphviz.error",
            params: { engine: "dot", messages: ["Layout was not done"] },
        });
    });

    it("reports a real syntax error from Graphviz as graphviz.syntax", async () => {
        const reply = await layout("digraph { a -> ; }", "dot");

        assert.deepEqual(reply, { ok: false, code: "graphviz.syntax", params: { engine: "dot", line: 1, near: ";" } });
    });

    it("rejects with the house code and keeps the Graphviz reason in details", () => {
        const cases = [
            ["graphviz.unavailable", "E_MISSING_PACKAGE"],
            ["graphviz.syntax", "E_PARSE_FAILED"],
            ["graphviz.error", "E_UNSUPPORTED"],
            ["graphviz.crashed", "E_EXTENSION_FAILED"],
            ["graphviz.timeout", "E_CAP_EXCEEDED"],
            ["graphviz.too-large", "E_CAP_EXCEEDED"],
        ] as const;
        for (const [reason, code] of cases) {
            const error = graphvizError(reason, { engine: "dot" });
            assert.strictEqual(error.code, code);
            assert.strictEqual(error.details.reason, reason);
            assert.strictEqual(error.details.engine, "dot");
        }

        assert.strictEqual(graphvizError("graphviz.unavailable", {}).details.package, "@hpcc-js/wasm-graphviz");
    });

    it("has no Worker in Node, so the layouts are unavailable here and say so", async () => {
        const reply = await runGraphviz({ kind: "layout", dot: "digraph { a }", engine: "dot" });

        assert.deepEqual(reply, {
            ok: false,
            code: "graphviz.unavailable",
            params: { package: "@hpcc-js/wasm-graphviz", feature: "graphviz" },
        });
        assert.deepEqual(await graphvizAvailability(), { available: false });
    });
});

/** The plain name each Graphviz engine's catalogue entry carries. */
const GRAPHVIZ_NAMES: Readonly<Record<(typeof GRAPHVIZ_ENGINES)[number], string>> = {
    dot: "Layered",
    neato: "Stress",
    fdp: "Spring embedder",
    sfdp: "Multilevel spring",
    circo: "Circles",
    twopi: "Rings",
    osage: "Clusters",
    patchwork: "Treemap",
};

describe("the catalogue", () => {
    it("always lists the eight engines, two-dimensional, each naming the package it needs", () => {
        for (const engine of GRAPHVIZ_ENGINES) {
            const descriptor = layoutDescriptor(`graphviz-${engine}`);

            assert.isDefined(descriptor, engine);
            assert.strictEqual(descriptor?.engine, `graphviz-${engine}`);
            assert.strictEqual(descriptor?.plainName, GRAPHVIZ_NAMES[engine]);
            assert.strictEqual(descriptor?.maxDimensions, 2);
            assert.deepEqual(descriptor?.requires, { package: "@hpcc-js/wasm-graphviz" });
            const names = descriptor?.options.map((option) => option.name) ?? [];
            assert.includeMembers(names, ["maxNodes", "timeoutMs", "attributes"]);
            const budget = descriptor?.options.find((option) => option.name === "maxNodes");
            assert.strictEqual(budget?.default, GRAPHVIZ_NODE_BUDGETS[engine]);
        }

        const dot = layoutDescriptor("graphviz-dot");
        assert.includeMembers(dot?.options.map((option) => option.name) ?? [], ["rankdir", "nodesep", "ranksep"]);
        const neato = layoutDescriptor("graphviz-neato");
        assert.strictEqual(neato?.options.find((option) => option.name === "seed")?.type, "seed");
        assert.strictEqual(LAYOUT_DESCRIPTORS.filter((d) => d.id.startsWith("graphviz-")).length, 8);
    });
});

describe("the recommendation for a Graphviz file", () => {
    const connected = sizeOnly(30, 40);
    const dotFile = { format: "dot", attributes: { rankdir: "LR", clusterrank: "none", label: "not passed on" } };

    it("draws a DOT file with no coordinates with dot, passing on its layout attributes", () => {
        const advice = recommendLayout(connected, { file: dotFile, graphvizAvailable: true });

        assert.strictEqual(advice?.layout.id, "graphviz-dot");
        assert.strictEqual(advice?.fact.code, "recommend.graphviz-file");
        assert.strictEqual(advice?.fact.params.engine, "dot");
        assert.deepEqual(advice?.options, { attributes: { rankdir: "LR", clusterrank: "none" } });
    });

    it("draws the engine the file names", () => {
        const advice = recommendLayout(connected, {
            file: { format: "dot", attributes: { layout: "neato" } },
            graphvizAvailable: true,
        });

        assert.strictEqual(advice?.layout.id, "graphviz-neato");
        assert.strictEqual(advice?.fact.params.engine, "neato");
        assert.isUndefined(advice?.options, "nothing to pass on");
    });

    it("names the engine a file of another format asks for in its layout value", () => {
        const advice = recommendLayout(connected, {
            file: { format: "gv", attributes: { layout: "twopi" } },
            graphvizAvailable: true,
        });

        assert.strictEqual(advice?.layout.id, "graphviz-twopi");
    });

    it("says the package is missing and takes the next rule's arrangement", () => {
        const advice = recommendLayout(connected, { file: dotFile });

        assert.strictEqual(advice?.layout.id, "force");
        assert.strictEqual(advice?.fact.code, "recommend.graphviz-unavailable");
        assert.strictEqual(advice?.fact.params.engine, "dot");
    });

    it("passes a graph over the engine's node budget to the ordinary rules", () => {
        const advice = recommendLayout(sizeOnly(GRAPHVIZ_NODE_BUDGETS.circo + 1, 600), {
            file: { format: "dot", attributes: { layout: "circo" } },
            graphvizAvailable: true,
        });

        assert.strictEqual(advice?.layout.id, "force");
        assert.strictEqual(advice?.fact.code, "recommend.force");
    });

    it("keeps the coordinates a file arrived with, and has Graphviz route its edges round them", () => {
        const advice = recommendLayout(connected, {
            file: { format: "dot", attributes: { splines: "curved", rankdir: "LR" } },
            graphvizAvailable: true,
            placedNodes: 30,
        });

        assert.strictEqual(advice?.layout.id, "fixed");
        assert.strictEqual(advice?.fact.code, "recommend.fixed");
        assert.deepEqual(advice?.options, { edgeRoutes: "graphviz", graphvizAttributes: { splines: "curved" } });
    });

    it("keeps a placed file's coordinates with no routes when the package is missing, or the file is not DOT", () => {
        const missing = recommendLayout(connected, { file: dotFile, placedNodes: 30 });
        const gml = recommendLayout(connected, {
            file: { format: "gml", attributes: { layout: "neato" } },
            graphvizAvailable: true,
            placedNodes: 30,
        });

        assert.strictEqual(missing?.layout.id, "fixed");
        assert.isUndefined(missing?.options);
        assert.strictEqual(gml?.layout.id, "fixed");
        assert.isUndefined(gml?.options);
    });

    it("ignores files that are not Graphviz files, and never recommends a Graphviz layout on its own", () => {
        const advice = recommendLayout(connected, {
            file: { format: "gexf", attributes: {} },
            graphvizAvailable: true,
        });

        assert.strictEqual(advice?.layout.id, "force");
        assert.strictEqual(recommendLayout(sizeOnly(0, 0))?.layout.requires, undefined);
    });
});

describe("a DOT file loaded with layout recommended", () => {
    it("keeps the file's graph attributes with the graph, and without the package here uses the next rule", async () => {
        const { session } = makeSession();

        await session.data.import(
            { type: "dot", config: { data: "digraph { layout=neato; rankdir=LR; a -> b; b -> c; c -> a }" } },
            { layout: "recommended" },
        );
        await vi.waitFor(() => {
            assert.lengthOf(session.history.pending, 0);
        });

        const { values } = dispatcherOf(session).state.graph;
        assert.deepEqual(values.get(FILE_GRAPH_VALUE), {
            format: "dot",
            attributes: { layout: "neato", rankdir: "LR" },
        });
        assert.strictEqual(session.layout.id, "force", "Node has no Worker, so Graphviz is unavailable");
        session.dispose();
    });
});
