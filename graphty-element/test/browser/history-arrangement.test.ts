/**
 * @file Where the nodes are under undo, on a real `Graph` with a force simulation.
 *
 * Undoing a step restores the coordinates the layout came to rest at below it, and leaves the
 * layout at rest there: nothing reheats it, not the freeze that undoing an add causes and not a
 * listener that reads the snapshot before the derivation has run. See design/undo/undo-design.md
 * sections 6.2 and 6.4.
 */

import { afterEach, assert, describe, it } from "vitest";

import { Graph } from "../../src/Graph";
import { dispatcherOf } from "../../src/session/GraphSession";

/** Per test: each builds a real Babylon scene and runs a simulation to rest twice. */
const TEST_TIMEOUT_MS = 60_000;

/** Frames advanced after the undo, in which nothing may move. */
const FRAMES = 30;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * Wait until the layout has come to rest, with the render loop running.
 * @param graph - The graph.
 */
async function atRest(graph: Graph): Promise<void> {
    await graph.waitForSettled();
    for (let wait = 0; wait < 1000 && graph.getLayoutManager().running; wait++) {
        await new Promise((resolve) => setTimeout(resolve, 10));
    }

    assert.isFalse(graph.getLayoutManager().running, "the layout came to rest");
}

/**
 * A real `Graph` holding a path of six nodes, laid out by the spring simulation and at rest.
 * @returns The graph.
 */
async function settledGraph(): Promise<Graph> {
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
    await graph.setLayout("spring");
    const ids = ["n1", "n2", "n3", "n4", "n5", "n6"];
    await graph.addNodes(ids.map((id) => ({ id })));
    await graph.addEdges(ids.slice(1).map((id, at) => ({ src: ids[at], dst: id })));
    await atRest(graph);
    return graph;
}

/**
 * Every node's coordinates in the lane, by id.
 * @param graph - The graph.
 * @returns The coordinates.
 */
function lane(graph: Graph): Record<string, number[]> {
    const session = graph.getSession();
    const snapshot = session.snapshot();
    const at = { x: 0, y: 0, z: 0 };
    const out: Record<string, number[]> = {};
    for (let row = 0; row < snapshot.nodeCount; row++) {
        session.positions.read(row, at);
        out[String(snapshot.ids.idOf(row))] = [at.x, at.y, at.z];
    }

    return out;
}

/**
 * Add a node, let the layout come to rest, undo, and advance frames: the lane stays where the
 * undo put it, and the step below keeps the capture it had.
 * @param graph - The graph, at rest.
 */
async function addSettleUndo(graph: Graph): Promise<void> {
    const session = graph.getSession();
    const before = lane(graph);
    const below = session.history.steps.at(-1);
    assert.isDefined(below, "the load recorded steps");
    const { bytes } = below;

    await graph.addNodes([{ id: "n7" }]);
    await atRest(graph);
    assert.property(lane(graph), "n7");

    await session.undo();
    const restored = lane(graph);
    assert.deepEqual(restored, before, "undo restores where the layout had come to rest before the add");

    graph.getUpdateManager().stepFrames(FRAMES);
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.isFalse(graph.getLayoutManager().running, "nothing reheated the layout");
    assert.deepEqual(lane(graph), restored, "and nothing moved");
    assert.strictEqual(
        session.history.steps.find((step) => step.id === below.id)?.bytes,
        bytes,
        "the step below keeps its capture",
    );
}

describe("the arrangement under undo, on a renderer", () => {
    it(
        "no reheat on refreeze: add, settle, undo, advance frames, and the lane is the restored capture",
        async () => {
            const graph = await settledGraph();
            await addSettleUndo(graph);
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "a listener reading the snapshot during the undo does not reheat the layout either",
        async () => {
            const graph = await settledGraph();
            const session = graph.getSession();
            let reads = 0;
            session.on("project:changed", () => {
                // The freeze this read causes happens before the derivation has run.
                if (session.snapshot().nodeCount > 0) {
                    reads++;
                }
            });

            await addSettleUndo(graph);
            assert.isAbove(reads, 0, "the listener read the snapshot");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "a placement moves the node, and undo puts it back where the layout had it",
        async () => {
            const graph = await settledGraph();
            const session = graph.getSession();
            const before = lane(graph);

            await session.positions.set([{ id: "n3", x: 50, y: -20, z: 5 }]);
            assert.deepEqual(lane(graph).n3, [50, -20, 5]);
            const node = graph.getNode("n3");
            assert.deepEqual(node?.mesh.position.asArray(), [50, -20, 5], "and its mesh is drawn there");

            await session.undo();
            assert.deepEqual(lane(graph), before);
            assert.deepEqual(node?.mesh.position.asArray(), before.n3, "and drawn back where it was");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "a pin reaches the lane and the simulation, and undo releases it",
        async () => {
            const graph = await settledGraph();
            const session = graph.getSession();
            const row = (): number => session.snapshot().ids.indexOf("n2");

            graph.getNode("n2")?.pin();
            assert.isTrue(session.positions.pinned.has("n2"), "the pin is a step of the session");
            assert.isTrue(session.positions.isPinned(row()));
            assert.isTrue(graph.getNode("n2")?.isPinned());
            assert.strictEqual(session.history.steps.at(-1)?.label, "Pinned a node");

            await session.undo();
            assert.isFalse(session.positions.pinned.has("n2"));
            assert.isFalse(session.positions.isPinned(row()), "the lane follows the pins slice");
            assert.isFalse(dispatcherOf(session).lane.restoring);
        },
        TEST_TIMEOUT_MS,
    );
});
