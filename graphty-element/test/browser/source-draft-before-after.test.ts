/**
 * @file A source draft drawn on a real canvas (design 5.3, 5.6): with the draft displayed, After
 * draws the graph its commit would leave -- what it removes undrawn, what it adds drawn -- and
 * Before draws the graph as it is; statistics count the side drawn; and switching between them
 * records and saves nothing, and leaves the state digest as it was once the draft comes off.
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

/** The edge columns both banks' files are read with. */
const EDGES = { from: { column: "from" }, to: { column: "to" }, id: "id" } as const;

/** Bank B's transfers: c is bank A's node, d and e are its own. */
const BANK_B = { type: "csv", config: { data: "id,from,to\nx1,c,d\nx2,d,e\n" }, name: "bank-b.csv" } as const;

/**
 * Bank A's transfers on a rendered graph with source-steps on, and with `both` bank B's too, which
 * add a node pair of their own.
 * @param both - Whether bank B is loaded as well.
 * @returns The graph and bank B's source, empty when it is not loaded.
 */
async function banks(both: boolean): Promise<{ graph: Graph; b: string }> {
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
    await session.data.import(
        { type: "csv", config: { data: "id,from,to\nt1,a,b\nt2,b,c\n" }, name: "bank-a.csv" },
        { edges: EDGES },
    );
    if (both) {
        await session.data.import(BANK_B, { edges: EDGES, mode: "merge" });
    }
    await operationQueueOf(graph).waitForCompletion();
    await graph.waitForStableFrame();
    const b = both ? (session.data.sources().at(-1)?.key ?? "") : "";
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
 * What switching sides must leave alone: the history and the saved file, and with `digest` the
 * state digest, which reads the graph drawn and so is compared once After is off it.
 * @param graph - The graph.
 * @param digest - Whether to include the digest.
 * @returns Them, as text.
 */
async function held(graph: Graph, digest: boolean): Promise<string> {
    const session = graph.getSession();
    const state = digest
        ? stateDigest(dispatcherOf(session).state, { snapshot: session.data.store.getSnapshot() })
        : null;
    const history = `${String(session.history.steps.length)}@${String(session.history.position)}`;
    const saved = (await session.project.save()).text.replaceAll(CLOCK, '"T"');
    return JSON.stringify({ state, history, saved });
}

describe("a source draft on a real canvas", () => {
    test("After leaves undrawn what the commit removes; Before draws it again; nothing is recorded", async () => {
        const { graph, b } = await banks(true);
        const session = graph.getSession();
        const all = drawn(graph);
        assert.strictEqual(all.edges, 4, "four transfers");
        assert.strictEqual(all.nodes, session.data.statistics().nodeCount, "every node is drawn");

        const draft = session.data.draft();
        draft.removeSource(b);
        const preview = draft.preview();
        const before = await held(graph, true);
        const kept = await held(graph, false);

        await draft.display(true);
        await draft.show("after");
        await graph.waitForStableFrame();
        assert.deepStrictEqual(
            drawn(graph),
            { nodes: all.nodes - preview.nodes.removed, edges: all.edges - preview.edges.removed },
            "After draws the graph without bank B's own nodes and edges",
        );
        assert.isAbove(preview.nodes.removed, 0);
        assert.strictEqual(
            session.data.statistics().nodeCount,
            all.nodes - preview.nodes.removed,
            "statistics count After",
        );

        await draft.show("before");
        await graph.waitForStableFrame();
        assert.deepStrictEqual(drawn(graph), all, "Before draws the graph as it is");

        await draft.show("after");
        await graph.waitForStableFrame();
        assert.strictEqual(drawn(graph).nodes, all.nodes - preview.nodes.removed);
        assert.strictEqual(await held(graph, false), kept, "switching sides records and saves nothing");

        draft.dispose();
        await graph.waitForStableFrame();
        assert.deepStrictEqual(drawn(graph), all, "a discarded draft leaves the graph drawn as it was");
        assert.strictEqual(await held(graph, true), before);
    });

    test("After draws the nodes and edges the commit adds; Before does not", async () => {
        const { graph } = await banks(false);
        const session = graph.getSession();
        const all = drawn(graph);
        const before = await held(graph, true);
        const steps = session.history.steps.length;

        const draft = session.data.draft();
        const b = await draft.stage(BANK_B, { edges: EDGES });
        draft.add(b);
        const preview = draft.preview();
        assert.strictEqual(preview.edges.added, 2, "bank B's two transfers");
        assert.isAbove(preview.nodes.added, 0, "and their ends bank A does not hold");

        await draft.display(true);
        await graph.waitForStableFrame();
        assert.deepStrictEqual(
            drawn(graph),
            { nodes: all.nodes + preview.nodes.added, edges: all.edges + preview.edges.added },
            "After draws bank B's transfers and their new ends",
        );
        assert.strictEqual(
            session.data.statistics().edgeCount,
            all.edges + preview.edges.added,
            "statistics count After",
        );

        await draft.show("before");
        await graph.waitForStableFrame();
        assert.deepStrictEqual(drawn(graph), all, "Before draws the graph as it is");
        assert.strictEqual(session.data.statistics().edgeCount, all.edges);
        assert.strictEqual(await held(graph, true), before, "nothing recorded, saved or left behind");

        await draft.show("after");
        await draft.commit();
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
        assert.deepStrictEqual(
            drawn(graph),
            { nodes: all.nodes + preview.nodes.added, edges: all.edges + preview.edges.added },
            "a commit made while After shows draws the same graph",
        );
        assert.strictEqual(session.history.steps.length, steps + 1, "one step for the commit");
    });
});
