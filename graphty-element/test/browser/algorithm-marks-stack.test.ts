/**
 * @file What an algorithm that chooses a subset paints, run for real: a route, a spanning tree, a
 * cut. Each run's suggested style is an ordinary layer per half that sets explicit channels (a
 * colour on a node; a colour and a width on an edge) on exactly the elements the run chose, and
 * never a highlight -- so two algorithms' pictures stack instead of the second sweeping the first
 * away, and changing the element's highlight colour leaves both alone.
 */

import "../../src/algorithms";

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { EDGE_CONSTANTS } from "../../src/constants/meshConstants";
import { Graph, operationQueueOf } from "../../src/Graph";
import type { RunResult } from "../../src/session/results/types";
import type { Layer } from "../../src/session/styles/Layer";
import { DEFAULT_HIGHLIGHT } from "../../src/session/styles/StylesApi";
import { contextOf, released } from "../helpers/webgl-context";

/** Six nodes, connected, with a triangle at each end and a costly edge between them. */
const NODES = [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }, { id: "E" }, { id: "F" }];

/** The edges between them, weighted so a route and a tree have something to prefer. */
const EDGES = [
    { src: "A", dst: "B", weight: 1 },
    { src: "B", dst: "C", weight: 1 },
    { src: "A", dst: "C", weight: 1 },
    { src: "C", dst: "D", weight: 5 },
    { src: "D", dst: "E", weight: 1 },
    { src: "E", dst: "F", weight: 1 },
    { src: "D", dst: "F", weight: 1 },
];

/** What a chosen element is painted, on master's look: vermilion, and an edge three times as wide. */
const NODE_SET = { "node.color": "#D55E00" };
const EDGE_SET = { "edge.color": "#D55E00", "edge.width": EDGE_CONSTANTS.DEFAULT_LINE_WIDTH * 3 };

/** One algorithm of each family that chooses a subset, with the field that says what it chose. */
const FAMILIES = [
    { family: "route", key: "shortest-path", params: { source: "A", target: "F" }, field: "onPath" },
    { family: "route", key: "astar", params: { source: "A", target: "F" }, field: "onPath" },
    { family: "tree", key: "kruskal", params: {}, field: "in" },
    { family: "tree", key: "prim", params: {}, field: "in" },
    { family: "cut", key: "min-cut", params: {}, field: "in" },
] as const;

describe("an algorithm that chooses a subset marks it with explicit channels", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "800px";
        container.style.height = "600px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();

        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);
        await operationQueueOf(graph).waitForCompletion();
    });

    afterEach(async () => {
        const release = released(contextOf(graph));
        graph.dispose();
        container.remove();
        await release;
    });

    /**
     * The layers a run put in the stack.
     * @param runId - The run.
     * @returns Its layers, bottom first.
     */
    const layersOf = (runId: string): Layer[] =>
        graph
            .getSession()
            .styles.list()
            .filter((layer) => layer.source.by === "run" && layer.source.runId === runId)
            .filter((layer) => layer.set !== undefined);

    /**
     * Assert a run's mark layers reach exactly the elements it chose, and nothing else.
     * @param result - The run's result.
     * @param field - The field that says what it chose.
     * @param marks - Its mark layers.
     */
    const assertOnlyChosen = async (result: RunResult, field: string, marks: readonly Layer[]): Promise<void> => {
        const session = graph.getSession();
        const scope = await session.scope.resolve("graph");
        const ids = new Set(marks.map((layer) => layer.id));
        let chosen = 0;

        for (const node of scope.nodes) {
            const reached = session.styles.explain({ node }).contributions.some((entry) => ids.has(entry.layerId));
            const isChosen = result.node(node)?.[field] === true;
            chosen += isChosen ? 1 : 0;
            assert.strictEqual(reached, isChosen, `node ${node}: painted only when the run chose it`);
        }

        for (const edge of scope.edges) {
            const reached = session.styles.explain({ edge }).contributions.some((entry) => ids.has(entry.layerId));
            const isChosen = result.edge(edge)?.[field] === true;
            chosen += isChosen ? 1 : 0;
            assert.strictEqual(reached, isChosen, `edge ${edge}: painted only when the run chose it`);
        }

        assert.isAbove(chosen, 0, "the run chose something, so the check above checked something");
    };

    for (const { family, key, params, field } of FAMILIES) {
        it(`${key} (${family}) paints an ordinary layer per half with explicit channels, on its result only`, async () => {
            const run = graph.run(key, params);
            const result = await run;
            await operationQueueOf(graph).waitForCompletion();

            const marks = layersOf(run.id);

            assert.isNotEmpty(marks, `${key} painted its result`);
            for (const layer of marks) {
                assert.notStrictEqual(layer.kind, "highlight", `${key} does not paint through a highlight`);
                assert.deepStrictEqual(layer.set, layer.target === "node" ? NODE_SET : EDGE_SET);
                assert.deepStrictEqual(layer.selector, {
                    match: "expression",
                    where: `results.${run.id}.${field} == \`true\``,
                });
            }

            await assertOnlyChosen(result, field, marks);
        });
    }

    it("keeps both algorithms' pictures when a second one runs", async () => {
        const route = graph.run("shortest-path", { source: "A", target: "F" });
        await route;
        const tree = graph.run("kruskal", {});
        await tree;
        await operationQueueOf(graph).waitForCompletion();

        const routeMarks = layersOf(route.id);
        const treeMarks = layersOf(tree.id);

        assert.lengthOf(routeMarks, 2, "the route's node and edge layers are still in the stack");
        assert.lengthOf(treeMarks, 1, "beside the tree's edge layer");

        const stack = graph.getSession().styles.list();
        assert.isAbove(
            stack.findIndex((layer) => layer.id === treeMarks[0].id),
            stack.findIndex((layer) => layer.id === routeMarks[1].id),
            "the later run sits on top, so it wins only where both chose an edge",
        );
    });

    it("applySuggestedStyles for two algorithms keeps both", async () => {
        await graph.run("shortest-path", { source: "A", target: "F" }, { style: false });
        await graph.run("prim", {}, { style: false });
        await operationQueueOf(graph).waitForCompletion();

        assert.isTrue(graph.applySuggestedStyles(["shortest-path", "prim"]));
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();

        const algorithms = graph
            .getSession()
            .styles.list()
            .flatMap((layer) => (layer.source.by === "run" && layer.set !== undefined ? [layer.source.algorithm] : []));

        assert.deepStrictEqual(algorithms, ["shortest-path", "shortest-path", "prim"]);
    });

    it("does not follow the element's highlight colour", async () => {
        const mutable = DEFAULT_HIGHLIGHT as { color: string };
        const was = mutable.color;
        mutable.color = "#332288";
        try {
            const run = graph.run("kruskal", {});
            await run;
            await operationQueueOf(graph).waitForCompletion();

            assert.deepStrictEqual(
                layersOf(run.id).map((layer) => layer.set),
                [EDGE_SET],
            );
        } finally {
            mutable.color = was;
        }
    });
});
