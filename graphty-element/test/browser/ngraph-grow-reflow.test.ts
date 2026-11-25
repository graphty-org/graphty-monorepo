/**
 * A graph that grows one node at a time under a seeded force layout (ngraph) glides its drawing to the new
 * arrangement under `layoutTransition` instead of jumping it (issue #9424).
 *
 * A seeded layout starts over from its seed when data arrives, so the same seed draws the same data however it
 * arrived (issue #650), and every node already drawn gets a new place. Before the fix that start over was drawn in
 * one frame whatever `layoutTransition` said: the nodes already drawn jumped about 6 scene units between two
 * frames. Now it travels under the transition, and the newcomer, which no frame has drawn yet, appears at its
 * place rather than gliding in from the hidden mesh template.
 *
 * Read from where each node is drawn, in scene units, on the frames after each write.
 *
 * Under a particle transition each moving node shrinks into its cloud on the way. A write arriving part way through
 * starts the next move from the picture as drawn, and that move must take each node's whole size, not the shrunk size
 * it is drawn at that frame: otherwise the node lands shrunk and stays so.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { renderPathDefault } from "../../src/meshes/NodeBatch";
import { isPlaced } from "../../src/transitions/LayoutTransitionRunner";
import { drawnFrames } from "../helpers/drawn-frames";

interface Place {
    x: number;
    y: number;
    z: number;
}

/** How many nodes the graph grows to. */
const NODES = 25;
/**
 * The furthest a node already drawn may move on the frame after an add. A transition's first frame draws every
 * node where it was; the start over drawn in one frame moved them about 6 scene units.
 */
const MAX_FRAME_MOVE = 0.05;

const elements: Graphty[] = [];
afterEach(() => {
    for (const element of elements.splice(0)) {
        element.remove();
    }
});

const idOf = (i: number): string => `n${String(i)}`;

/**
 * Where each node is drawn.
 * @param element - The element.
 * @param ids - The nodes.
 * @returns Their drawn places.
 */
function drawn(element: Graphty, ids: readonly string[]): Map<string, Place> {
    return new Map(
        ids.map((id) => {
            const node = element.graph.getNode(id);
            assert.isDefined(node, id);
            const { x, y, z } = node.drawnPosition;
            return [id, { x, y, z }] as const;
        }),
    );
}

/**
 * Where the layout puts a node.
 * @param element - The element.
 * @param id - The node.
 * @returns Its place.
 */
function laidOut(element: Graphty, id: string): Place {
    const place = { x: 0, y: 0, z: 0 };
    element.session.positions.read(element.session.snapshot().ids.requireIndex(id), place);
    return place;
}

const distance = (p: Place, q: Place): number => Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);

/**
 * The furthest any of `before`'s nodes moved to `after`.
 * @param before - Places in one frame.
 * @param after - Places in the next.
 * @returns The largest distance.
 */
function largestMove(before: ReadonlyMap<string, Place>, after: ReadonlyMap<string, Place>): number {
    let most = 0;
    for (const [id, p] of before) {
        most = Math.max(most, distance(p, after.get(id) as Place));
    }

    return most;
}

/**
 * An element with a layout transition set, showing one node under a seeded force layout, at rest.
 * @param transition - The layout transition.
 * @param seconds - How long it takes.
 * @returns The element.
 */
async function mounted(transition = "glide", seconds = 0.5): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.setAttribute("acceleration", "off");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "400px";
    document.body.appendChild(element);
    elements.push(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    await element.session.config.set({ layoutTransition: { transition, seconds } });
    await element.session.layout.set("ngraph", { options: { seed: 1 } });
    await element.session.data.addNodes([{ id: idOf(0) }]);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    if (renderPathDefault.value === "batched") {
        assert.equal(
            element.rowCounts.batchedNodes,
            1,
            `the first node is a batched row: ${JSON.stringify(element.rowCounts)}`,
        );
    }

    return element;
}

/**
 * The furthest a node already drawn moves on the next drawn frame.
 * @param element - The element.
 * @param ids - The nodes already drawn.
 * @returns The largest move between the frame drawn last and the next one.
 */
async function nextFrameMove(element: Graphty, ids: readonly string[]): Promise<number> {
    const before = drawn(element, ids);
    await drawnFrames(element.graph.getScene(), 1);
    return largestMove(before, drawn(element, ids));
}

/**
 * Add node `i` and then an edge joining it to an earlier node, as two writes, and let the drawing come to rest.
 * @param element - The element.
 * @param i - The newcomer's number.
 * @returns What a reader saw: the furthest a node already drawn moved on the first frame after each write, how far
 *   from its layout place the newcomer was first drawn, and the nodes not drawn at their layout place at rest.
 */
async function grow(
    element: Graphty,
    i: number,
): Promise<{ firstFrameMove: number; firstDrawnOff: number; offAtRest: string[] }> {
    const scene = element.graph.getScene();
    const earlier = Array.from({ length: i }, (_, k) => idOf(k));
    const newcomer = idOf(i);
    let firstDrawnOff: number | undefined;
    const observer = scene.onAfterRenderObservable.add(() => {
        const node = element.graph.getNode(newcomer);
        if (firstDrawnOff === undefined && node !== undefined && isPlaced(node)) {
            firstDrawnOff = distance(node.drawnPosition, laidOut(element, newcomer));
        }
    });
    let firstFrameMove = 0;
    try {
        await element.session.data.addNodes([{ id: newcomer }]);
        firstFrameMove = await nextFrameMove(element, earlier);
        await element.session.data.addEdges([{ source: newcomer, target: idOf((i * 7) % i), directed: false }]);
        firstFrameMove = Math.max(firstFrameMove, await nextFrameMove(element, earlier));
        while (element.isRunning() || firstDrawnOff === undefined) {
            await drawnFrames(scene, 1);
        }
    } finally {
        scene.onAfterRenderObservable.remove(observer);
    }

    await element.waitForStableFrame();
    const all = [...earlier, newcomer];
    const atRest = drawn(element, all);
    const offAtRest = all.filter((id) => distance(atRest.get(id) as Place, laidOut(element, id)) > 1e-3);
    return { firstFrameMove, firstDrawnOff, offAtRest };
}

describe("ngraph growing one node at a time under a layout transition", () => {
    it("starts the nodes already drawn from where they were, and draws each newcomer at its place", async () => {
        const element = await mounted();
        const jumps: string[] = [];
        const glidedIn: string[] = [];
        const unfinished: string[] = [];
        for (let i = 1; i < NODES; i++) {
            const { firstFrameMove, firstDrawnOff, offAtRest } = await grow(element, i);
            if (firstFrameMove > MAX_FRAME_MOVE) {
                jumps.push(`${idOf(i)}: ${firstFrameMove.toFixed(2)}`);
            }

            if (firstDrawnOff > 1e-3) {
                glidedIn.push(`${idOf(i)}: ${firstDrawnOff.toFixed(2)}`);
            }

            unfinished.push(...offAtRest.map((id) => `${idOf(i)}: ${id}`));
        }

        assert.deepEqual(jumps, [], "no node already drawn jumped on the frame after an add");
        assert.deepEqual(glidedIn, [], "each newcomer was first drawn where the layout put it");
        assert.deepEqual(unfinished, [], "at rest every node is drawn where the layout put it");
    });
});

/**
 * The scale each node is drawn at.
 * @param element - The element.
 * @param ids - The nodes.
 * @returns Their drawn scales.
 */
function scales(element: Graphty, ids: readonly string[]): number[] {
    return ids.map((id) => {
        const node = element.graph.getNode(id);
        assert.isDefined(node, id);
        return node.drawnScale;
    });
}

describe.each(["particle-morph", "fade-through"])("data arriving part way through a %s move", (transition) => {
    it("leaves every node drawn at its whole size once the moves end", async () => {
        const element = await mounted(transition, 0.8);
        const scene = element.graph.getScene();
        const first = Array.from({ length: 6 }, (_, i) => idOf(i));
        await element.session.data.addNodes(first.slice(1).map((id) => ({ id })));
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        const [whole] = scales(element, [idOf(0)]);

        const all = Array.from({ length: 12 }, (_, i) => idOf(i));
        await element.session.data.addNodes(all.slice(6).map((id) => ({ id })));
        // Part way: a node already drawn has given way to its cloud.
        while (!scales(element, first).some((scale) => scale < whole / 2)) {
            await drawnFrames(scene, 1);
        }

        await element.session.data.addEdges(all.slice(1).map((id, i) => ({ source: all[i], target: id })));
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();

        const drawnAt = scales(element, all);
        const shrunk = all.filter((_, i) => Math.abs(drawnAt[i] - whole) > whole * 1e-3);
        assert.deepEqual(shrunk, [], `every node is drawn at its whole size (${String(whole)})`);
    });
});
