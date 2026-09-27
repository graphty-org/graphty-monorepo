/**
 * @file Undo restores the picture, not only the state: for each kind of change a reader makes, the
 * canvas after the action and its undo is the canvas before the action, pixel for pixel.
 *
 * Rendering is derived from project state, so a state that round-trips should draw the same
 * frame. A derivation that forgot to repaint on undo -- a layer's colour left on the meshes, a
 * skybox dome left in the scene, a node left where the drag dropped it -- keeps every state digest
 * equal and changes the frame, which is what is measured here. The act-then-undo stories in
 * `stories/Undo.stories.ts` are the same cases as Chromatic snapshots; Chromatic compares a story
 * only with its own last snapshot, so equality with the untouched picture is asserted here.
 *
 * Two things on screen are the reader's rather than the project's, and are put back by hand before
 * the picture after the undo is taken: the camera, which an import or a layout switch frames and an
 * undo deliberately leaves where it is, and the selection, which an undo sets to what it changed.
 * Everything else must come back from state alone.
 *
 * The layout is circular, which places every node from the node set alone, so the picture before
 * the action is reproducible without a seed.
 */

import { Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import type { GraphSession } from "../../src/session";
import { SKYBOX_PNG } from "../session/history/fixtures";

/** Per-test budget: each builds a real Babylon scene and waits for two finished pictures. */
const TEST_TIMEOUT_MS = 60_000;

/** How far a channel may move before a pixel counts as changed: rounding, not a repaint. */
const CHANNEL_TOLERANCE = 2;

/** How far the drag moves its node. */
const DRAG = new Vector3(40, 30, 0);

/** The graph: a five-node ring. */
const NODES = ["n1", "n2", "n3", "n4", "n5"];

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A real `Graph` holding a five-node ring with one chord, laid out in a circle, with an empty
 * history.
 * @param dimension - The dimension it draws in.
 * @returns The graph.
 */
async function loadedGraph(dimension: "2d" | "3d"): Promise<Graph> {
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
    await graph.setLayout("circular");
    if (dimension === "2d") {
        await graph.getSession().layout.setDimension("2d");
    }

    await graph.addNodes(NODES.map((id) => ({ id })));
    await graph.addEdges([
        ...NODES.map((id, at) => ({ src: id, dst: NODES[(at + 1) % NODES.length] })),
        { src: "n1", dst: "n3" },
    ]);
    await operationQueueOf(graph).waitForCompletion();
    graph.getSession().history.clear();
    return graph;
}

/**
 * The finished picture on the canvas.
 * @param graph - The graph.
 * @returns Its pixels, four bytes each.
 */
async function picture(graph: Graph): Promise<Uint8Array> {
    await graph.getSession().styles.settled();
    await graph.waitForStableFrame({ timeoutMs: 20_000 });
    graph.getUpdateManager().renderFrames(1);
    const { engine } = graph;
    return (await engine.readPixels(0, 0, engine.getRenderWidth(), engine.getRenderHeight())) as unknown as Uint8Array;
}

/**
 * How many pixels differ between two pictures by more than rounding.
 * @param one - One picture.
 * @param other - The other.
 * @returns The changed pixels.
 */
function changed(one: Uint8Array, other: Uint8Array): number {
    assert.strictEqual(one.length, other.length, "the two pictures are the same size");
    let count = 0;
    for (let at = 0; at < one.length; at += 4) {
        for (let channel = 0; channel < 3; channel++) {
            if (Math.abs(one[at + channel] - other[at + channel]) > CHANNEL_TOLERANCE) {
                count++;
                break;
            }
        }
    }

    return count;
}

/** One kind of change a reader makes. */
interface PictureCase {
    readonly name: string;
    /** The dimension the graph starts in. */
    readonly dimension?: "2d" | "3d";
    /** False when the change is state the canvas does not show, such as a saved camera view. */
    readonly shows?: false;
    /** Make the change, as one undoable step. */
    readonly act: (session: GraphSession, graph: Graph) => Promise<void>;
}

/**
 * Drag node n3 by the handler the pointer drives, and drop it: one step that places and pins it.
 * @param graph - The graph.
 */
async function drag(graph: Graph): Promise<void> {
    const node = graph.getNode("n3");
    assert.isDefined(node);
    const handler = node.dragHandler;
    assert.isDefined(handler);
    const session = graph.getSession();
    const steps = session.history.steps.length;
    const start = node.mesh.position.clone();
    handler.onDragStart(start);
    handler.onDragUpdate(start.add(DRAG));
    handler.onDragEnd();
    for (let wait = 0; wait < 500 && session.history.steps.length === steps; wait++) {
        await new Promise((resolve) => setTimeout(resolve, 10));
    }

    assert.strictEqual(session.history.steps.length, steps + 1, "the drop recorded its step");
}

const CASES: readonly PictureCase[] = [
    {
        name: "an import merged into the graph",
        act: async (session) => {
            await session.execute({
                op: "data.import",
                source: {
                    type: "json",
                    config: { data: JSON.stringify({ nodes: [{ id: "x1" }, { id: "x2" }], edges: [{ src: "x1", dst: "n1" }] }) },
                },
                mode: "merge",
            });
        },
    },
    {
        name: "a run with auto-applied styling",
        act: async (session) => {
            await session.runs.start("degree", {}, { style: { size: true } });
        },
    },
    {
        name: "a style edit",
        act: async (session) => {
            await session.styles.add({
                name: "Red nodes",
                target: "node",
                selector: { match: "everything" },
                set: { "node.color": "#ff0000" },
            });
        },
    },
    {
        name: "a filter",
        act: async (session) => {
            await session.visibility.set({ kind: "degree", min: 3 });
        },
    },
    {
        name: "a pin",
        shows: false,
        act: async (session) => {
            await session.positions.pin(["n2"]);
        },
    },
    {
        name: "a drag",
        act: async (_session, graph) => {
            await drag(graph);
        },
    },
    {
        name: "a layout switch",
        act: async (session) => {
            await session.execute({ op: "layout.set", id: "spiral" });
        },
    },
    {
        name: "2D to 3D",
        dimension: "2d",
        act: async (session) => {
            await session.layout.setDimension("3d");
        },
    },
    {
        name: "3D to 2D",
        act: async (session) => {
            await session.layout.setDimension("2d");
        },
    },
    {
        name: "a colour background to a skybox",
        act: async (session) => {
            await session.config.set({ background: { backgroundType: "skybox", data: SKYBOX_PNG } });
        },
    },
    {
        name: "a saved view",
        shows: false,
        act: async (session) => {
            await session.views.save([{ name: "Close up", camera: { zoom: 2, pan: { x: 1, y: 2 } } }]);
        },
    },
];

describe("undo restores the picture", () => {
    for (const each of CASES) {
        it(
            `${each.name}, then undo, draws the picture from before`,
            async () => {
                const graph = await loadedGraph(each.dimension ?? "3d");
                const session = graph.getSession();
                const before = await picture(graph);
                const camera = graph.getCameraState();

                await each.act(session, graph);
                assert.strictEqual(session.history.steps.length, 1, "the action is one step");
                const acted = await picture(graph);

                const outcome = await session.undo();
                assert.strictEqual(outcome.kind, "undone");
                await graph.setCameraState(camera);
                session.selection.clear();
                const after = await picture(graph);

                if (each.shows !== false) {
                    assert.isAbove(changed(before, acted), 0, "the action changed the picture");
                }

                assert.strictEqual(changed(before, after), 0, "after the undo the picture is the one from before");
            },
            TEST_TIMEOUT_MS,
        );
    }
});
