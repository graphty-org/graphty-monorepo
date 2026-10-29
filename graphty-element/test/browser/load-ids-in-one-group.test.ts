/**
 * Two imports in one group each keep their own load id and their own finished-load
 * announcement: neither clears the other's id, and neither announces the other's load before its
 * step is recorded (issue #3535).
 */
import { afterEach, assert, describe, test } from "vitest";

import { Graph } from "../../src/Graph.js";
import { dispatcherOf } from "../../src/session/GraphSession.js";

/** The graphs the running test made, disposed after it. */
const graphs: Graph[] = [];

afterEach(() => {
    for (const graph of graphs.splice(0)) {
        graph.dispose();
    }
    document.body.innerHTML = "";
});

async function emptyGraph(): Promise<Graph> {
    document.body.innerHTML = '<canvas id="test-canvas"></canvas>';
    const graph = new Graph(document.getElementById("test-canvas") as HTMLCanvasElement);
    graphs.push(graph);
    await graph.init();
    await graph.setLayout("circular", { scale: 2 });
    return graph;
}

/** What the load events said, and how many steps were recorded when each was heard. */
interface Heard {
    event: string;
    loadId: unknown;
    steps: number;
}

/**
 * Two small JSON sources, each given a load id as `loadFromFile` gives one, and a log of the load
 * events the graph emits.
 */
function twoLoads(graph: Graph): { first: { data: string }; second: { data: string }; heard: Heard[] } {
    const session = graph.getSession();
    const heard: Heard[] = [];
    for (const event of ["data-loading-progress", "data-loading-complete", "data-loaded"] as const) {
        graph.addListener(event, (detail) => {
            // `data-loaded` carries its id among its details; the other two carry it at the top.
            const { loadId, details } = detail as { loadId?: unknown; details?: { loadId?: unknown } };
            heard.push({ event, loadId: loadId ?? details?.loadId, steps: session.history.steps.length });
        });
    }

    const first = { data: JSON.stringify({ nodes: [{ id: "a" }, { id: "b" }], edges: [] }) };
    const second = { data: JSON.stringify({ nodes: [{ id: "c" }], edges: [] }) };
    const ids = (graph.getDataManager() as unknown as { loadIds: WeakMap<object, number> }).loadIds;
    ids.set(first, 7);
    ids.set(second, 8);
    return { first, second, heard };
}

function assertEachKeptItsOwn(heard: Heard[]): void {
    assert.sameMembers(
        heard.filter(({ event }) => event === "data-loading-complete").map(({ loadId }) => loadId),
        [7, 8],
        "each load announced once, with its own id",
    );
    assert.sameMembers(
        heard.filter(({ event }) => event === "data-loaded").map(({ loadId }) => loadId),
        [7, 8],
        "each load reported once, with its own id",
    );
    assert.sameMembers(
        [...new Set(heard.filter(({ event }) => event === "data-loading-progress").map(({ loadId }) => loadId))],
        [7, 8],
        "each load's progress carries its own id",
    );
    for (const { event, loadId, steps } of heard) {
        assert.oneOf(loadId, [7, 8], `${event} lost its load id`);
        if (event !== "data-loading-progress") {
            assert.strictEqual(steps, 1, `${event} was heard before the step was recorded`);
        }
    }
}

describe("two imports in one group", () => {
    test("one after the other in a transaction, each keeps its own load id and announcement", async () => {
        const graph = await emptyGraph();
        const { first, second, heard } = twoLoads(graph);

        await graph.getSession().transaction("Two loads", async (tx) => {
            await Promise.all([
                tx.execute({ op: "data.import", source: { type: "json", config: first }, mode: "merge" }),
                tx.execute({ op: "data.import", source: { type: "json", config: second }, mode: "merge" }),
            ]);
        });

        assertEachKeptItsOwn(heard);
    });

    test("started together in one batch, each keeps its own load id and announcement", async () => {
        const graph = await emptyGraph();
        const { first, second, heard } = twoLoads(graph);

        await dispatcherOf(graph.getSession()).dispatchNow({
            op: "batch",
            fact: { code: "data.import", params: { name: null, type: "json" } },
            steps: [
                { op: "data.import", source: { type: "json", config: first }, mode: "merge" },
                { op: "data.import", source: { type: "json", config: second }, mode: "merge" },
            ],
        });

        assertEachKeptItsOwn(heard);
    });
});
