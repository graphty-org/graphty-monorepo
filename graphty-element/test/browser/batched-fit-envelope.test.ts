/**
 * @file Under renderPath "batched", the zoom-to-fit a running layout takes every step frames the
 * box the layout published (`LayoutEngine.publishedBounds`) instead of walking every row: no row's
 * world matrix or bounding box is computed for it. Under "objects" the walk is unchanged.
 */

import "../../src/graphty-element";

import { Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { Node } from "../../src/Node";
import { RowTable } from "../../src/render/RowTable";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

const NODES = Array.from({ length: 200 }, (_, id) => ({ id }));
const EDGES = NODES.slice(1).map(({ id }) => ({ source: id - 1, target: id }));

/**
 * A graph of 200 nodes on a chain, on one render path, not yet laid out.
 * @param path - The render path.
 * @returns The element.
 */
async function mounted(path: "objects" | "batched"): Promise<Graphty> {
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
    element.graph.setRenderPath(path);
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Run ngraph and count, for each of the next framings taken while it moves, the rows the framing
 * visited: each `Node.framingBounds` and each batched row's `RowTable.isHidden`, which only a
 * framing's walk asks.
 * @param element - The element.
 * @param framings - How many moving framings to count.
 * @returns The rows visited per framing, and the boxes framed.
 */
async function countMovingFramings(
    element: Graphty,
    framings: number,
): Promise<{ visits: number[]; boxes: { min: Vector3; max: Vector3 }[] }> {
    const nodeWalk = vi.spyOn(Node.prototype, "framingBounds");
    const rowWalk = vi.spyOn(RowTable.prototype, "isHidden");
    cleanups.push(() => {
        nodeWalk.mockRestore();
        rowWalk.mockRestore();
    });
    const { graph } = element;
    const visits: number[] = [];
    const boxes: { min: Vector3; max: Vector3 }[] = [];
    let seen = 0;
    let first = true;
    const done = new Promise<void>((resolve) => {
        graph.on("zoom-to-fit-complete", (event) => {
            const calls = nodeWalk.mock.calls.length + rowWalk.mock.calls.length;
            const delta = calls - seen;
            seen = calls;
            const engine = graph.getLayoutManager().layoutEngine;
            // The first framing of a new layout is asked for and walks; the settling one walks too.
            if (first || engine?.isSettled !== false || !graph.getLayoutManager().running) {
                first = false;
                return;
            }

            visits.push(delta);
            boxes.push({
                min: (event.boundingBoxMin as Vector3).clone(),
                max: (event.boundingBoxMax as Vector3).clone(),
            });
            if (visits.length === framings) {
                resolve();
            }
        });
    });
    await graph.setLayout("ngraph", { dim: 3 });
    await done;
    nodeWalk.mockRestore();
    rowWalk.mockRestore();
    return { visits, boxes };
}

describe("zoom-to-fit while a layout runs", () => {
    it("visits no row per framing under batched, and frames every node", async () => {
        const element = await mounted("batched");
        const { visits, boxes } = await countMovingFramings(element, 3);
        assert.deepEqual(visits, [0, 0, 0], "no row walked by a moving framing");

        // The box the last framing took holds every row the layout published then, so the graph
        // as it stands now (one step on at most) sits inside it, give or take that step.
        element.setRunning(false);
        const last = boxes[boxes.length - 1];
        assert.isDefined(last);
        const size = Vector3.Distance(last.min, last.max);
        assert.isAbove(size, 0, "a box with room in it");
        for (const node of element.graph.getLayoutManager().nodes) {
            const at = node.getPosition();
            for (const axis of ["x", "y", "z"] as const) {
                assert.isAtLeast(at[axis], last.min[axis] - size * 0.1, `node ${node.id} ${axis}`);
                assert.isAtMost(at[axis], last.max[axis] + size * 0.1, `node ${node.id} ${axis}`);
            }
        }
    });

    it("still walks every row under objects", async () => {
        const element = await mounted("objects");
        const { visits } = await countMovingFramings(element, 2);
        for (const count of visits) {
            assert.isAtLeast(count, NODES.length, "the objects path measures every node");
        }
    });
});
