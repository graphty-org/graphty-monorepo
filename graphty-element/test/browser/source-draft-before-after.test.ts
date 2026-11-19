/**
 * @file A source draft drawn on a real canvas (design 5.6): with the draft displayed, After leaves
 * undrawn the nodes and edges its commit would remove and Before draws the graph as it is, and
 * switching between them changes nothing a project saves, the history or the state digest.
 */
import { afterEach, assert, describe, test } from "vitest";

import { featuresFrom, Graph, operationQueueOf } from "../../src/Graph.js";
import { dispatcherOf } from "../../src/session/dispatchers";
import { stateDigest } from "../../src/session/project/digest";

const graphs: Graph[] = [];
const containers: HTMLElement[] = [];

afterEach(() => {
    for (const graph of graphs.splice(0)) {
        graph.dispose();
    }
    for (const container of containers.splice(0)) {
        container.remove();
    }
});

/** Saved text with its clock readings blanked, so two saves compare. */
const CLOCK = /"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z"/gu;

/**
 * Two edge files on a rendered graph with source-steps on: bank A's transfers, then bank B's,
 * which add a node pair of their own.
 * @returns The graph and bank B's source.
 */
async function twoBanks(): Promise<{ graph: Graph; b: string }> {
    const container = document.createElement("div");
    container.style.width = "320px";
    container.style.height = "240px";
    document.body.appendChild(container);
    containers.push(container);
    const graph = new Graph(container);
    graphs.push(graph);
    featuresFrom(graph, () => ["source-steps"]);
    await graph.init();
    const session = graph.getSession();
    const edges = { from: { column: "from" }, to: { column: "to" }, id: "id" } as const;
    await session.data.import(
        { type: "csv", config: { data: "id,from,to\nt1,a,b\nt2,b,c\n" }, name: "bank-a.csv" },
        { edges },
    );
    await session.data.import(
        { type: "csv", config: { data: "id,from,to\nx1,c,d\nx2,d,e\n" }, name: "bank-b.csv" },
        { edges, mode: "merge" },
    );
    await operationQueueOf(graph).waitForCompletion();
    await graph.waitForStableFrame();
    const b = session.data.sources().at(-1)?.key ?? "";
    return { graph, b };
}

/**
 * How many nodes and edges the canvas draws now.
 * @param graph - The graph.
 * @returns The drawn counts.
 */
function drawn(graph: Graph): { nodes: number; edges: number } {
    const manager = graph.getDataManager();
    return {
        nodes: [...manager.nodes.values()].filter((node) => node.getRenderState() === "visible").length,
        edges: [...manager.edges.values()].filter((edge) => edge.isRenderVisible()).length,
    };
}

/**
 * What switching sides must leave alone: the digest, the history and the saved file.
 * @param graph - The graph.
 * @returns The three, as text.
 */
async function held(graph: Graph): Promise<string> {
    const session = graph.getSession();
    const digest = stateDigest(dispatcherOf(session).state, { snapshot: session.data.store.getSnapshot() });
    const history = `${String(session.history.steps.length)}@${String(session.history.position)}`;
    const saved = (await session.project.save()).text.replaceAll(CLOCK, '"T"');
    return JSON.stringify({ digest, history, saved });
}

describe("a source draft on a real canvas", () => {
    test("After leaves undrawn what the commit removes; Before draws it again; nothing is recorded", async () => {
        const { graph, b } = await twoBanks();
        const session = graph.getSession();
        const all = drawn(graph);
        assert.strictEqual(all.edges, 4, "four transfers");
        assert.strictEqual(all.nodes, session.data.statistics().nodeCount, "every node is drawn");

        const draft = session.data.draft();
        draft.removeSource(b);
        const preview = draft.preview();
        const before = await held(graph);

        draft.display(true);
        draft.show("after");
        await graph.waitForStableFrame();
        assert.deepStrictEqual(
            drawn(graph),
            { nodes: all.nodes - preview.nodes.removed, edges: all.edges - preview.edges.removed },
            "After draws the graph without bank B's own nodes and edges",
        );
        assert.isAbove(preview.nodes.removed, 0);

        draft.show("before");
        await graph.waitForStableFrame();
        assert.deepStrictEqual(drawn(graph), all, "Before draws the graph as it is");

        draft.show("after");
        await graph.waitForStableFrame();
        assert.strictEqual(drawn(graph).nodes, all.nodes - preview.nodes.removed);
        assert.strictEqual(await held(graph), before, "switching sides records and saves nothing");
        assert.strictEqual(session.data.statistics().nodeCount, all.nodes, "statistics read the committed graph");

        draft.dispose();
        await graph.waitForStableFrame();
        assert.deepStrictEqual(drawn(graph), all, "a discarded draft leaves the graph drawn as it was");
        assert.strictEqual(await held(graph), before);
    });
});
