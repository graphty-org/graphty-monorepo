/**
 * @file Auto-framing has to measure where the nodes ARE, not where they were a frame ago.
 *
 * Babylon refreshes a mesh's world position while it renders, and stamps the render it did that
 * under. The element measures the graph just BEFORE a render, so when it asks for a node's world
 * position the stamp still matches and `getAbsolutePosition()` short-circuits: it hands back the
 * value from the previous frame and never looks at the position the layout has just written. Every
 * bounding box the camera is framed on is therefore one simulation step out of date -- including
 * the box measured on the frame the layout settles, which is the last box that frames anything.
 *
 * Nothing corrects it afterwards. The element does ask to be re-framed once the layout has truly
 * settled, and a consumer can ask for the same thing by calling `zoomToFit()`, but both requests
 * were refused by the cadence gate that decides whether it is time for a periodic zoom -- and once
 * the layout stops it is never time. The visible result is a graph whose nodes all sit in the
 * right place relative to one another while the whole picture is shifted and scaled a hair, which
 * on a snapshot reads as the layout having settled somewhere else.
 *
 * Both halves are pinned here, because either one alone leaves the other broken: the box a framing
 * reports must match the graph it framed, and a request to frame the graph must be honoured after
 * the layout has stopped -- which is precisely when `zoomToFit()` is documented to be called.
 *
 * Measured against the LAYOUT ENGINE's own coordinates rather than against the meshes, because the
 * engine is the one place that cannot be a frame behind: it is where the meshes get their
 * positions from. And driven by the element's own render loop rather than by hand-pumped frames,
 * because the fault lives in the relationship between an update and the render that follows it.
 */

import { Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph } from "../../src/Graph";

/**
 * Enough nodes and edges that the force layout moves them a measurable distance per step, so a box
 * taken one step late is wrong by a visible amount rather than in the last decimal.
 */
const NODES = Array.from({ length: 30 }, (_unused, index) => ({ id: `n${String(index)}` }));

/** A path plus a few chords, so the simulation has something to pull against. */
const EDGES = [
    ...NODES.slice(1).map((node, index) => ({ src: NODES[index].id, dst: node.id })),
    { src: "n0", dst: "n10" },
    { src: "n5", dst: "n20" },
    { src: "n12", dst: "n29" },
];

/** How long to give the layout before deciding it is never going to settle. */
const SETTLE_TIMEOUT_MS = 10000;

/** How long to let the element keep drawing after settlement, standing in for a capture's tail. */
const TAIL_MS = 300;

/** Room for the settle, the tail and a cold start. */
const CASE_TIMEOUT_MS = 20000;

/**
 * How far a reported box may sit from the graph it claims to frame, in world units.
 *
 * A world position arrives through a float32 matrix while the engine's own coordinates are
 * doubles, so the two disagree in the seventh significant figure at these magnitudes. The lag this
 * test exists to catch is nearly two orders of magnitude larger even on the very last step of the
 * layout, and larger still on every step before it.
 */
const TOLERANCE = 1e-4;

/** A bounding box, as the element measures and reports one. */
interface Box {
    min: Vector3;
    max: Vector3;
}

/** A framing the element announced, beside where the layout had the nodes at that instant. */
interface Framing {
    reported: Box;
    layout: Box;
}

describe("framing the graph", () => {
    let container: HTMLElement;
    let graph: Graph;
    let framings: Framing[];

    /**
     * Where the layout engine has the nodes right now, boxed the way the element boxes them.
     * @returns The corners of that box, or undefined when nothing is placed yet.
     */
    function whereTheLayoutPutTheNodes(): Box | undefined {
        const engine = graph.getLayoutManager().layoutEngine;

        if (!engine) {
            return undefined;
        }

        let min: Vector3 | undefined;
        let max: Vector3 | undefined;

        for (const node of graph.getLayoutManager().nodes) {
            // The same exclusion the element makes: a node a filter has hidden keeps its place and
            // still must not stretch the box.
            if (node.getRenderState() !== "visible") {
                continue;
            }

            const at = engine.getNodePosition(node);
            const half = node.size / 2;
            const position = new Vector3(at.x, at.y, at.z ?? 0);

            min ??= position.clone();
            max ??= position.clone();

            min.x = Math.min(min.x, position.x - half);
            min.y = Math.min(min.y, position.y - half);
            min.z = Math.min(min.z, position.z - half);
            max.x = Math.max(max.x, position.x + half);
            max.y = Math.max(max.y, position.y + half);
            max.z = Math.max(max.z, position.z + half);
        }

        return min && max ? { min, max } : undefined;
    }

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();

        framings = [];
        graph.on("zoom-to-fit-complete", (event) => {
            if (!("boundingBoxMin" in event) || !("boundingBoxMax" in event)) {
                return;
            }

            const { boundingBoxMin, boundingBoxMax } = event;

            if (!(boundingBoxMin instanceof Vector3) || !(boundingBoxMax instanceof Vector3)) {
                return;
            }

            const layout = whereTheLayoutPutTheNodes();

            if (!layout) {
                return;
            }

            // Cloned because the element keeps measuring into the vectors it has just reported.
            framings.push({
                reported: { min: boundingBoxMin.clone(), max: boundingBoxMax.clone() },
                layout,
            });
        });

        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);
        await graph.operationQueue.waitForCompletion();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Let the element draw for a while.
     * @param ms - How long to leave it alone.
     * @returns A promise that resolves once that long has passed.
     */
    async function draw(ms: number): Promise<void> {
        return new Promise<void>((done) => {
            setTimeout(done, ms);
        });
    }

    /**
     * Wait for the layout to stop moving.
     * @returns Whether it stopped, as opposed to running out of time.
     */
    async function settle(): Promise<boolean> {
        return new Promise<boolean>((done) => {
            const timer = setTimeout(() => {
                off();
                done(false);
            }, SETTLE_TIMEOUT_MS);

            const off = graph.on("graph-settled", () => {
                clearTimeout(timer);
                off();
                done(true);
            });
        });
    }

    /**
     * The largest gap between a reported box and the graph it was measuring.
     * @param framing - The framing to score.
     * @returns That distance, in world units.
     */
    function worstError(framing: Framing): number {
        let worst = 0;

        for (const axis of ["x", "y", "z"] as const) {
            worst = Math.max(worst, Math.abs(framing.reported.min[axis] - framing.layout.min[axis]));
            worst = Math.max(worst, Math.abs(framing.reported.max[axis] - framing.layout.max[axis]));
        }

        return worst;
    }

    it(
        "frames the graph the layout has produced, not the one it produced a step earlier",
        async () => {
            assert.isTrue(await settle(), "the layout settled");
            await draw(TAIL_MS);

            assert.isNotEmpty(framings, "the element framed the graph at least once");

            const wrong = framings.filter((framing) => worstError(framing) > TOLERANCE);

            assert.deepEqual(
                wrong.map((framing) => worstError(framing).toFixed(6)),
                [],
                `${String(wrong.length)} of ${String(framings.length)} framings measured a graph the layout had already moved on from`,
            );
        },
        CASE_TIMEOUT_MS,
    );

    it(
        "honours a zoomToFit() asked for after the layout has stopped",
        async () => {
            assert.isTrue(await settle(), "the layout settled");
            await draw(TAIL_MS);

            const before = framings.length;

            graph.zoomToFit();
            await draw(TAIL_MS);

            assert.isAbove(framings.length, before, "asking to fit the graph in view fits the graph in view");
        },
        CASE_TIMEOUT_MS,
    );
});
