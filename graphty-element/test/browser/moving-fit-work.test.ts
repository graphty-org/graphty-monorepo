/**
 * @file A 3D zoom-to-fit taken while a layout moves does the same work whatever the node count (issue #10154).
 *
 * While a layout runs, the camera is framed again on every few steps. Centering the drawing over every node walked
 * every node several times on each of those frames; the moving fits now center on the box alone, and only the fit the
 * layout settles on centers over the nodes, so the picture it ends on is unchanged.
 */

import "../../src/graphty-element";

import { afterEach, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { centeringWork } from "../../src/cameras/OrbitCameraController";
import { operationQueueOf } from "../../src/Graph";
import { assertScalesLinearly } from "../helpers/cost";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/** The centering work counted since the counters were last cleared, and clears them. */
function takeWork(): number {
    const work = centeringWork.walked + centeringWork.outlined + centeringWork.corners;
    centeringWork.walked = 0;
    centeringWork.outlined = 0;
    centeringWork.corners = 0;
    return work;
}

/**
 * A chain of `count` nodes on one render path, placed at random.
 * @param path - The render path.
 * @param count - How many nodes.
 * @returns The element.
 */
async function mounted(path: "objects" | "batched", count: number): Promise<Graphty> {
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
    await element.session.data.addNodes(Array.from({ length: count }, (_, id) => ({ id })));
    await element.session.data.addEdges(Array.from({ length: count - 1 }, (_, id) => ({ src: id, dst: id + 1 })));
    await element.graph.setLayout("random", { dim: 3, seed: 7 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Run a layout and count the centering work of each of the next fits taken while it moves.
 * @param element - The element.
 * @param fits - How many moving fits.
 * @returns The work of each.
 */
async function workWhileMoving(element: Graphty, fits: number): Promise<number[]> {
    const { graph } = element;
    const layout = graph.getLayoutManager();
    const work: number[] = [];
    takeWork();
    await new Promise<void>((resolve) => {
        const off = graph.on("zoom-to-fit-complete", () => {
            // Every fit while the layout moves, the first one the new layout asks for included.
            const counted = takeWork();
            if (layout.layoutEngine?.isSettled !== false || !layout.running) {
                return;
            }

            work.push(counted);
            if (work.length === fits) {
                off();
                resolve();
            }
        });
        void graph.setLayout("ngraph", { dim: 3, seed: 7 });
    });
    return work;
}

for (const path of ["objects", "batched"] as const) {
    describe(`a 3D fit while the layout moves, on "${path}"`, () => {
        it("does the same work at four times the nodes", async () => {
            await assertScalesLinearly(
                async (count) => {
                    const element = await mounted(path, count);
                    const work = await workWhileMoving(element, 3);
                    // The counters are shared: a graph left running would add its fits to the next size's.
                    element.remove();
                    return Math.max(...work);
                },
                {
                    sizes: [150, 600],
                    growth: "constant",
                    maxRatio: 1.25,
                    counter: "nodes and corners walked by one moving fit",
                },
            );
        });
    });
}
