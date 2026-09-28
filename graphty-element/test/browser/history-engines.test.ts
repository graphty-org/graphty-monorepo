/**
 * @file Undo and redo on a real `Graph` under the layout engines that keep a copy of the graph of
 * their own (ngraph, d3), where the random-sequence model (`history-random.test.ts`) found the
 * element and the engine disagreeing. Each case is one of its shrunk counterexamples.
 */

import { afterEach, assert, describe, it } from "vitest";

import { Graph } from "../../src/Graph";
import type { GraphSession } from "../../src/session/types";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A graph holding `n1 -> n2 -> n3` under one engine, at rest, its render loop stopped and its
 * history cleared.
 * @param engine - The layout engine.
 * @returns The graph and its session.
 */
async function begin(engine: string): Promise<{ graph: Graph; session: GraphSession }> {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    cleanups.push(() => {
        graph.dispose();
        container.remove();
    });
    await graph.init();
    graph.engine.stopRenderLoop();
    await graph.setLayout(engine);
    const session = graph.getSession();
    await session.data.addNodes([{ id: "n1" }, { id: "n2" }, { id: "n3" }]);
    await session.data.addEdges([
        { src: "n1", dst: "n2" },
        { src: "n2", dst: "n3" },
    ]);
    settle(graph);
    session.history.clear();
    return { graph, session };
}

/**
 * Step frames until the layout stops, then stop it: a rest point.
 * @param graph - The graph.
 */
function settle(graph: Graph): void {
    const manager = graph.getLayoutManager();
    for (let frame = 0; frame < 300 && manager.running; frame++) {
        graph.getUpdateManager().stepFrames(1);
    }

    manager.running = false;
}

/**
 * Every node's published coordinates, by id.
 * @param session - The session.
 * @returns The coordinates, as strings.
 */
function lane(session: GraphSession): Map<string, string> {
    const snapshot = session.snapshot();
    const at = { x: 0, y: 0, z: 0 };
    const out = new Map<string, string>();
    for (let row = 0; row < snapshot.nodeCount; row++) {
        session.positions.read(row, at);
        out.set(String(snapshot.ids.idOf(row)), `${String(at.x)},${String(at.y)},${String(at.z)}`);
    }

    return out;
}

describe("undo and redo under the engines with a graph of their own", () => {
    for (const engine of ["ngraph", "d3", "spring"]) {
        it(`${engine}: an edge that waited for its endpoint is drawn again when a redo brings it back`, async () => {
            const { graph, session } = await begin(engine);
            await session.data.addEdges([{ src: "n4", dst: "n1" }]);
            await session.data.addNodes([{ id: "n4" }]);
            assert.strictEqual(graph.getDataManager().edges.size, 3, "drawn once its endpoint arrived");

            await session.undo();
            assert.strictEqual(graph.getDataManager().edges.size, 2, "waiting again once it has gone");
            await session.redo();
            assert.strictEqual(graph.getDataManager().edges.size, 3, "drawn again once it is back");
        });
    }

    it("d3: a rolled-back replacing import puts the nodes it brings back where they were", async () => {
        const { graph, session } = await begin("d3");
        const before = lane(session);
        const imported = JSON.stringify({ nodes: [{ id: "n1" }, { id: "n6" }], edges: [{ src: "n1", dst: "n6" }] });
        await session
            .transaction("Loaded a project", async (tx) => {
                await tx.execute({ op: "data.import", source: { type: "json", config: { data: imported } }, mode: "replace" });
                graph.getLayoutManager().running = true;
                settle(graph);
                throw new Error("The load failed on purpose.");
            })
            .catch(() => undefined);

        assert.deepEqual([...lane(session)], [...before]);
    });
});
