/**
 * @file A node drag is one undoable step, on a real `Graph` with a force simulation.
 *
 * The drag opens a transaction at drag start, which takes where every node is as its
 * before-arrangement, and records at the drop. Undoing the drag puts every node back where it was
 * when the drag began, whatever the layout did meanwhile; an undo during the drag ends it instead.
 * See design/undo/undo-design.md sections 5.3 and 6.4.
 */

import { Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import { Graph } from "../../src/Graph";
import type { Node } from "../../src/Node";
import type { NodeDragHandler } from "../../src/NodeBehavior";

/** Per test: each builds a real Babylon scene and runs a simulation. */
const TEST_TIMEOUT_MS = 60_000;

/** How far the pointer moves the dragged node. */
const DELTA = new Vector3(40, 30, 0);

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * Wait until a condition holds, with the render loop running.
 * @param condition - The condition.
 * @param what - What is waited for, for the failure message.
 */
async function until(condition: () => boolean, what: string): Promise<void> {
    for (let wait = 0; wait < 1000 && !condition(); wait++) {
        await new Promise((resolve) => setTimeout(resolve, 10));
    }

    assert.isTrue(condition(), what);
}

/**
 * Wait until the layout has come to rest.
 * @param graph - The graph.
 */
async function atRest(graph: Graph): Promise<void> {
    await graph.waitForSettled();
    await until(() => !graph.getLayoutManager().running, "the layout came to rest");
}

/**
 * A real `Graph` holding a path of six nodes under the spring simulation.
 * @param settle - Wait for the layout to come to rest.
 * @returns The graph.
 */
async function springGraph(settle: boolean): Promise<Graph> {
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
    if (settle) {
        await atRest(graph);
    }

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
 * The node the tests drag.
 * @param graph - The graph.
 * @returns Node n3.
 */
function dragged(graph: Graph): Node {
    const node = graph.getNode("n3");
    assert.isDefined(node);
    return node;
}

/**
 * A node's drag handler.
 * @param node - The node.
 * @returns Its handler.
 */
function handler(node: Node): NodeDragHandler {
    const { dragHandler } = node;
    assert.isDefined(dragHandler);
    return dragHandler;
}

/**
 * Start a drag of node n3 and move it by {@link DELTA}.
 * @param graph - The graph.
 * @returns The node.
 */
function dragStart(graph: Graph): Node {
    const node = dragged(graph);
    const start = node.mesh.position.clone();
    handler(node).onDragStart(start);
    handler(node).onDragUpdate(start.add(DELTA));
    return node;
}

/**
 * Drop the node and wait until the drag's step is recorded.
 * @param graph - The graph.
 * @param node - The node being dragged.
 */
async function drop(graph: Graph, node: Node): Promise<void> {
    const session = graph.getSession();
    const before = session.history.steps.length;
    handler(node).onDragEnd();
    await until(() => session.history.steps.length === before + 1, "the drop recorded one step");
}

describe("a node drag under undo", () => {
    it(
        "with the layout running at drag start, undo puts every node back where it was at drag start",
        async () => {
            const graph = await springGraph(false);
            const session = graph.getSession();
            graph.getUpdateManager().stepFrames(3);
            assert.isTrue(graph.getLayoutManager().running, "the layout is running when the drag starts");
            const start = lane(graph);

            const node = dragStart(graph);
            graph.getUpdateManager().stepFrames(10);
            await drop(graph, node);
            assert.isTrue(node.isPinned(), "the drop pinned the node");
            const step = session.history.steps.at(-1);
            assert.deepEqual(step?.ops, ["positions.set", "positions.pin"], "the drop placed and pinned it");
            graph.getUpdateManager().stepFrames(10);

            const outcome = await session.undo();
            assert.strictEqual(outcome.kind, "undone");
            assert.deepEqual(lane(graph), start, "every node is back where it was at drag start");
            assert.isFalse(node.isPinned(), "and the pin is undone with it");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "an undo during the drag ends it: the lane is the drag-start capture, no step, and the drop does nothing",
        async () => {
            const graph = await springGraph(true);
            const session = graph.getSession();
            const start = lane(graph);
            const steps = session.history.steps.length;

            const node = dragStart(graph);
            graph.getUpdateManager().stepFrames(5);
            assert.notDeepEqual(lane(graph), start, "the drag moved the lane");
            assert.strictEqual(session.history.nextUndo?.kind, "cancel", "the open drag is what undo acts on");

            const outcome = await session.undo();
            assert.strictEqual(outcome.kind, "cancelled");
            assert.deepEqual(lane(graph), start, "the lane is where it was at drag start");
            assert.isFalse(graph.getLayoutManager().running, "the layout is stopped");

            const held = node.mesh.position.clone();
            handler(node).onDragUpdate(held.add(DELTA));
            assert.isTrue(node.mesh.position.equals(held), "the rest of the gesture moves nothing");
            handler(node).onDragEnd();
            await new Promise((resolve) => setTimeout(resolve, 100));
            assert.lengthOf(session.history.steps, steps, "no step was recorded");
            assert.isFalse(node.isPinned(), "the drop did not pin");
            assert.deepEqual(lane(graph), start, "and nothing moved");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "a drag held until the layout settles is sealed into the drag, never into the step below",
        async () => {
            const graph = await springGraph(true);
            const session = graph.getSession();
            const start = lane(graph);
            const below = session.history.steps.at(-1);
            assert.isDefined(below);

            const node = dragStart(graph);
            graph.getLayoutManager().running = true;
            await atRest(graph);
            assert.strictEqual(
                session.history.steps.find((step) => step.id === below.id)?.bytes,
                below.bytes,
                "the rest point while the drag was held went to the drag",
            );

            await drop(graph, node);
            await atRest(graph);
            await session.undo();
            assert.deepEqual(lane(graph), start, "undo puts every node back where it was at drag start");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "a reheat after undo starts from the restored coordinates",
        async () => {
            const graph = await springGraph(true);
            const session = graph.getSession();
            const start = lane(graph);

            const node = dragStart(graph);
            const dropped = node.mesh.position.asArray();
            await drop(graph, node);
            await atRest(graph);
            await session.undo();
            assert.deepEqual(lane(graph), start);

            graph.getLayoutManager().running = true;
            graph.getUpdateManager().stepFrames(1);
            const [x, y, z] = lane(graph).n3;
            const [sx, sy, sz] = start.n3;
            const fromStart = Math.hypot(x - sx, y - sy, z - sz);
            const fromDrop = Math.hypot(x - dropped[0], y - dropped[1], z - dropped[2]);
            assert.isBelow(fromStart, fromDrop, "the layout resumed from where undo put the node");
        },
        TEST_TIMEOUT_MS,
    );
});
