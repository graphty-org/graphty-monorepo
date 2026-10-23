/**
 * @file The Graphviz layouts' Node-side pieces: the DOT the element writes, the json it reads back,
 * the options, the error codes, the catalogue entries, each engine on a small graph through the real
 * WebAssembly library, and every branch of the recommendation for a Graphviz file.
 */

import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { assert, describe, it, vi } from "vitest";

import { LAYOUT_DESCRIPTORS, layoutDescriptor } from "../../src/catalog/layouts";
import { graphvizAvailability } from "../../src/layout/graphviz/availability";
import { GRAPHVIZ_ENGINES, GRAPHVIZ_NODE_BUDGETS } from "../../src/layout/graphviz/engines";
import { fromJson } from "../../src/layout/graphviz/fromJson";
import { runGraphviz } from "../../src/layout/graphviz/host";
import { classify, layout } from "../../src/layout/graphviz/loader";
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
        assert.include(dot, "n0 [width=2];", "the element's node size, in inches");
        assert.include(dot, "n1 [width=1];", "an unknown size takes the default");
        assert.include(dot, "n2 [width=1];", "a zero size takes the default");
        assert.strictEqual(dot.match(/n0 -> n1;/g)?.length, 2, "the parallel edge is kept");
        assert.include(dot, "n2 -> n0;");
    });

    it("writes a node with two different sides as a box that size, and leaves out the skipped rows", () => {
        const dot = toDot(graph(true, TRIANGLE), {}, [3, 1, 1], [3, 1.5, 1, 1, 4, 2], (row) => row === 2);

        assert.include(dot, "n0 [shape=box, width=3, height=1.5];", "a wide node is a box its own size");
        assert.include(dot, "n1 [width=1];", "a node as tall as it is wide stays a circle");
        assert.notMatch(dot, /n2/, "a skipped row and its edges are not handed over");
        assert.strictEqual(dot.match(/n0 -> n1;/g)?.length, 2);
    });

    it("writes an undirected graph with undirected edges, and escapes attribute values", () => {
        const dot = toDot(graph(false, [["a", "b"]]), { label: 'say "hi"\nthere' });

        assert.match(dot, /^graph G \{/);
        assert.include(dot, "n0 -- n1;");
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
    const dotFile = { format: "dot", attributes: { rankdir: "LR", label: "not passed on" } };

    it("draws a DOT file with no coordinates with dot, passing on its layout attributes", () => {
        const advice = recommendLayout(connected, { file: dotFile, graphvizAvailable: true });

        assert.strictEqual(advice?.layout.id, "graphviz-dot");
        assert.strictEqual(advice?.fact.code, "recommend.graphviz-file");
        assert.strictEqual(advice?.fact.params.engine, "dot");
        assert.deepEqual(advice?.options, { attributes: { rankdir: "LR" } });
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

    it("keeps the coordinates a file arrived with", () => {
        const advice = recommendLayout(connected, { file: dotFile, graphvizAvailable: true, placedNodes: 30 });

        assert.strictEqual(advice?.layout.id, "fixed");
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
