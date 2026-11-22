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
import type { SimulationLayoutEngine } from "../../src/layout/SimulationLayoutEngine";
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
 * @param path - The render path, or undefined for the element's default.
 * @returns The element.
 */
async function mounted(size: number, layout: string, path?: "batched"): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    if (path !== undefined) {
        element.renderPath = path;
    }
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

/** One counted call of `Edge.update`: which edge, on which counted frame, called by what. */
interface Visit {
    edge: string;
    frame: number;
    caller: string;
}

/**
 * The function that called `Edge.update`, read off the stack: the first frame that is not the spy, vitest or
 * this file (`UpdateManager.updateEdgesOf`, `UpdateManager.placedEdgesAtRows`, ...).
 * @returns The caller's name, or "unknown".
 */
function callerOfUpdate(): string {
    const lines = (new Error().stack ?? "").split("\n").slice(1);
    const outside = lines.find(
        (line) => !/drag-walks-incident-edges|vitest|tinyspy|@vitest|node_modules|Edge\.update/.test(line),
    );
    return (
        outside
            ?.trim()
            .replace(/^at /, "")
            .replace(/ \(.*$/, "") ?? "unknown"
    );
}

/**
 * Count every `Edge.update` from now on, each with its edge, the frame it was made on and its caller.
 * @param frameOf - The counted frame now.
 * @returns The visits so far, and a stop that restores `Edge.update`.
 */
function countVisits(frameOf: () => number): { visits: Visit[]; stop: () => void } {
    const visits: Visit[] = [];
    const original = Edge.prototype.update;
    const spy = vi.spyOn(Edge.prototype, "update").mockImplementation(function (this: Edge, ...rest) {
        visits.push({
            edge: `${String(this.srcId)}-${String(this.dstId)}`,
            frame: frameOf(),
            caller: callerOfUpdate(),
        });
        original.apply(this, rest);
    });
    return {
        visits,
        stop: () => {
            spy.mockRestore();
        },
    };
}

/**
 * The visits, one line each, for an assertion message: the next failure names the mechanism.
 * @param visits - The visits.
 * @returns The lines.
 */
function listed(visits: readonly Visit[]): string {
    return visits.map(({ edge, frame, caller }) => `  frame ${String(frame)} ${edge} from ${caller}`).join("\n");
}

/**
 * Drag node `t` with the real mouse, counting edge visits and frames once the drag is under way
 * (the press selects and the first move pins the node, and either repaint walks every edge once).
 * @param size - The node count.
 * @param layout - The layout it is arranged by.
 * @param during - Run before the pointer's move of this number, if given.
 * @param path - The render path, or undefined for the element's default.
 * @returns The edge visits, the frames they were made on, how far the dragged edge's middle moved, and the
 *     nodes hovered while the pointer held the node.
 */
async function dragCounted(
    size: number,
    layout: string,
    during?: { move: number; run: (element: Graphty) => void },
    path?: "batched",
): Promise<{ visits: Visit[]; frames: number; followed: number; hovered: string[]; batched: boolean }> {
    const element = await mounted(size, layout, path);
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
    const before = edge.drawnLine?.center.clone();
    assert.isDefined(before, "its line is drawn");

    let frames = 0;
    // A node hovered under the drag is built and its edges placed, on the batched path, and those visits are
    // not the drag's: the drag holds the hover, so none is (issue #9514).
    const hovered: string[] = [];
    const heard = (event: CustomEvent<{ nodeId: unknown }>): void => {
        hovered.push(String(event.detail.nodeId));
    };
    element.addEventListener("graphty-node-hover", heard);
    const counted = countVisits(() => frames);
    const frame = element.graph.scene.onBeforeRenderObservable.add(() => {
        frames++;
    });
    try {
        for (let move = 1; move <= MOVES; move++) {
            if (during?.move === move) {
                during.run(element);
            }

            await moveHeld(element, { x: x + 10 + 5 * move, y: y + 5 });
            await nextFrame();
        }

        await nextFrame();
    } finally {
        counted.stop();
        frame.remove();
        element.removeEventListener("graphty-node-hover", heard);
    }

    const { visits } = counted;

    await release(element, { x: x + 10 + 5 * MOVES, y: y + 5 });
    await element.waitForStableFrame();
    const after = edge.drawnLine?.center;
    assert.isDefined(after, "its line is still drawn");
    return {
        visits,
        frames,
        followed: after.subtract(before).length(),
        hovered,
        batched: element.renderPath === "batched",
    };
}

describe("a drag", () => {
    it.each(Object.keys(LAYOUT_OPTIONS))(
        "visits only the dragged node's edges, at any graph size, on %s",
        async (layout) => {
            for (const size of SIZES) {
                const { visits, frames, followed, hovered, batched } = await dragCounted(size, layout);
                assert.deepEqual(hovered, [], "no node is hovered while the pointer holds one");
                const message = `${String(visits.length)} edge visits on ${String(frames)} frames at ${String(size)} nodes`;
                // on the batched path an edge pulled from the row table follows its node on the card, with no visit
                if (!batched) {
                    assert.isAbove(visits.length, 0, message);
                }

                assert.isAtMost(visits.length, frames * DEGREE, `${message}:\n${listed(visits)}`);
                assert.isAbove(followed, 0, "the dragged node's edge followed it");
            }
        },
    );

    // A layout step mid-drag moves the rows of nodes with no `Node` in the same pass as the dragged node: the pass
    // places every placed edge for the rows, and used to place the dragged node's edges a second time for the drag
    // (issue #9529).
    it("places each edge once in a pass that moves the dragged node and the rows of others", async () => {
        const step = (element: Graphty): void => {
            const engine = element.graph.getLayoutManager().layoutEngine as SimulationLayoutEngine;
            engine.step();
            engine.publishPositions();
        };
        const { visits } = await dragCounted(SIZES[0], "forceatlas2", { move: 4, run: step }, "batched");
        const atT = (visit: Visit): boolean => visit.edge.startsWith("t-");
        const both = new Set(visits.filter(atT).map(({ frame }) => frame));
        const rows = new Set(visits.filter((visit) => !atT(visit)).map(({ frame }) => frame));
        assert.isTrue(
            [...both].some((frame) => rows.has(frame)),
            `some pass places the dragged node's edges and the others':\n${listed(visits)}`,
        );
        const seen = new Set<string>();
        const twice = visits.filter(({ edge, frame }) => {
            const key = `${String(frame)} ${edge}`;
            const again = seen.has(key);
            seen.add(key);
            return again;
        });
        assert.deepEqual(twice, [], "no edge is placed twice in one pass");
    });
});
