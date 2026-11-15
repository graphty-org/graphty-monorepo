/**
 * @file Counted-work scaling of a drag: while a real mouse drags one node, a frame visits that
 * node's edges and no others, on a graph of n and of 4n nodes. Every frame of a drag used to walk
 * every edge of the graph to find the few that moved: at a million edges that walk is the frame
 * (design/rendering/row-renderer.md, stage 2). Counted, never timed (issue #1643).
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { Edge } from "../../src/Edge";
import { operationQueueOf } from "../../src/Graph";
import { moveHeld, nextFrame, press, release } from "../helpers/real-input";

/** The two graph sizes: big enough that a walk of every edge is 4x. */
const SIZES = [100, 400] as const;

/** The edges at the dragged node. */
const DEGREE = 3;

/** How many moves of the pointer are counted. */
const MOVES = 8;

/**
 * One layout of each way an engine hands over its edges: `fixed` an array of its own, `d3` too,
 * `ngraph` (the default) an iterator over a map, `forceatlas2` the store's own iterator.
 */
const LAYOUT_OPTIONS: Record<string, Record<string, unknown>> = {
    fixed: { dim: 3 },
    d3: {},
    ngraph: { seed: 7 },
    forceatlas2: { seed: 7 },
};

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted element with node `t` at the origin joined to three of `size - 1` nodes that make a
 * path around a ring far from it, drawn.
 * @param size - The node count.
 * @param layout - The layout it is arranged by, run until it settles.
 * @returns The element.
 */
async function mounted(size: number, layout: string): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    const ring = Array.from({ length: size - 1 }, (_, at) => {
        const angle = (2 * Math.PI * at) / (size - 1);
        return { id: `n${String(at)}`, position: { x: 20 * Math.cos(angle), y: 20 * Math.sin(angle), z: 0 } };
    });
    await element.session.data.addNodes([{ id: "t", position: { x: 0, y: 0, z: 0 } }, ...ring]);
    await element.session.data.addEdges([
        ...ring.slice(0, DEGREE).map(({ id }) => ({ src: "t", dst: id })),
        ...ring.slice(1).map(({ id }, at) => ({ src: ring[at].id, dst: id })),
    ]);
    await element.graph.setLayout(layout, LAYOUT_OPTIONS[layout]);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Drag node `t` with the real mouse, counting edge visits and frames once the drag is under way
 * (the press selects and the first move pins the node, and either repaint walks every edge once).
 * @param size - The node count.
 * @param layout - The layout it is arranged by.
 * @returns The edge visits, the frames they were made on, and how far the dragged edge's middle moved.
 */
async function dragCounted(
    size: number,
    layout: string,
): Promise<{ visits: number; frames: number; followed: number }> {
    const element = await mounted(size, layout);
    const position = element.nodeScreenPosition("t");
    assert.isDefined(position, "node t is drawn");
    const { x, y } = position;

    await press(element, { x, y });
    await moveHeld(element, { x: x + 10, y: y + 5 });
    await element.waitForStableFrame();

    // One edge of t, not a walk of every edge: on the batched path that walk would build an `Edge` for each
    // edge stored with none, and their first placements would be counted as the drag's.
    const edge = element.graph.getDataManager().getEdgesBetween("t", "n0")[0];
    assert.isDefined(edge, "t has an edge");
    await element.waitForStableFrame();
    const before = edge.drawnLine?.centre.clone();
    assert.isDefined(before, "its line is drawn");

    let frames = 0;
    const update = vi.spyOn(Edge.prototype, "update");
    const frame = element.graph.scene.onBeforeRenderObservable.add(() => {
        frames++;
    });
    try {
        for (let move = 1; move <= MOVES; move++) {
            await moveHeld(element, { x: x + 10 + 5 * move, y: y + 5 });
            await nextFrame();
        }

        await nextFrame();
    } finally {
        frame.remove();
    }

    const visits = update.mock.calls.length;
    update.mockRestore();

    await release(element, { x: x + 10 + 5 * MOVES, y: y + 5 });
    await element.waitForStableFrame();
    const after = edge.drawnLine?.centre;
    assert.isDefined(after, "its line is still drawn");
    return { visits, frames, followed: after.subtract(before).length() };
}

describe("a drag", () => {
    it.each(Object.keys(LAYOUT_OPTIONS))(
        "visits only the dragged node's edges, at any graph size, on %s",
        async (layout) => {
            for (const size of SIZES) {
                const { visits, frames, followed } = await dragCounted(size, layout);
                const message = `${String(visits)} edge visits on ${String(frames)} frames at ${String(size)} nodes`;
                assert.isAbove(visits, 0, message);
                assert.isAtMost(visits, frames * DEGREE, message);
                assert.isAbove(followed, 0, "the dragged node's edge followed it");
            }
        },
    );
});
