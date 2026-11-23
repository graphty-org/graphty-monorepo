/**
 * @file What a reader sees in every frame while a GPU layout lands its batches: each node drawn where
 * `nodeScreenPosition` says it is in that same frame, each edge on the segment between its two nodes, and no ink
 * anywhere else -- on both render paths, drawn with WebGL and with WebGPU, at about 300 and 2,000 nodes, while the
 * layout runs steadily, after a node with no edges is added mid-run, after a restyle and a real hover between two
 * landings, and while a real mouse drags a node.
 *
 * Every other GPU-layout check waits for rest or reads bookkeeping (the row texture against the CPU copy). The
 * batched path draws from the landed batch on the GPU and skips frames between landings, so a landing drawn a frame
 * late, a frame drawn from the wrong ring slot, or edges left at an older landing show only in the frames between.
 * Frames are read in their own task (test/helpers/frame-recorder.ts), which is also what lets the WebGPU picture be
 * checked at all.
 *
 * GPU cases run only where the run asked for a GPU (`GRAPHTY_BROWSER_GPU`): the full run's batched-webgpu shard
 * (forced-batched project) picks this file up by that name. The ngraph case at the end runs everywhere: with the GPU
 * flags on, the CPU layout once never reported settled, against about 30 frames without them.
 *
 * The fixture keeps batched rows lazy: disjoint pairs and one triangle, directed and undirected edges, loaded into an
 * element already drawn. The rows that act between landings (an add, a restyle, a hover, a drag) load undirected edges
 * only, so each checks its own action: arrowed edges are the steady rows' to check.
 *
 * Run: GRAPHTY_BROWSER_GPU=swiftshader-unthrottled npx vitest run --project=forced-batched (or --project=browser)
 * test/browser/gpu-landings-drawn.test.ts; VITE_FRAME_DUMP=1 prints each recording's first faulty frame as a PNG.
 */

import "../../src/graphty-element";
import "../../webgpu";

import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import type { AccelerationCapabilities, AccelerationStatus } from "../../src/acceleration";
import { operationQueueOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";
import { undrawnEdges, undrawnNodes } from "../helpers/drawn-invariants";
import {
    captureNextFrame,
    checkDrawnFrames,
    describeFrames,
    faulty,
    type FrameReport,
    inkedPixels,
    recordDrawnFrames,
} from "../helpers/frame-recorder";
import { drag, hover } from "../helpers/real-input";

/** Which Chromium flag set the run asked for; empty when it asked for none. */
const ADAPTER = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "";

/** Moving frames each case checks. */
const MOVING_FRAMES = 30;

type Path = "objects" | "batched";
type Renderer = "webgl" | "webgpu";

/** The graph: pairs, then one triangle; every other edge undirected. */
interface Fixture {
    ids: string[];
    pairs: (readonly [string, string])[];
    /** Whether every other edge is directed, with an arrowhead; otherwise every edge is undirected. */
    directed: boolean;
}

/**
 * Disjoint pairs and a triangle.
 * @param n - Nodes, at least 3.
 * @param directed - Whether every other edge is directed; see {@link Fixture.directed}.
 * @returns The ids and edges.
 */
function fixture(n: number, directed = true): Fixture {
    const ids = Array.from({ length: n }, (_, i) => `n${String(i)}`);
    const pairs: (readonly [string, string])[] = [];
    for (let i = 0; i + 1 < n - 3; i += 2) {
        pairs.push([ids[i], ids[i + 1]]);
    }

    pairs.push([ids[n - 3], ids[n - 2]], [ids[n - 2], ids[n - 1]], [ids[n - 1], ids[n - 3]]);
    return { ids, pairs, directed };
}

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * An element drawn empty, then given the fixture, laid out by nothing yet.
 * @param path - The render path.
 * @param renderer - What draws it.
 * @param graph - The fixture.
 * @param acceleration - The acceleration policy.
 * @returns The element and the statuses it announces from now on.
 */
async function mount(
    path: Path,
    renderer: Renderer,
    graph: Fixture,
    acceleration: "required" | "off" = "required",
): Promise<{ element: Graphty; statuses: AccelerationStatus[] }> {
    const element = document.createElement("graphty-element");
    element.renderPath = path;
    element.renderer = renderer;
    element.setAttribute("acceleration", acceleration);
    element.style.display = "block";
    element.style.width = "480px";
    element.style.height = "360px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    const statuses: AccelerationStatus[] = [];
    element.addEventListener("graphty-capabilities-change", (event) => {
        statuses.push(
            (event as CustomEvent<{ capabilities: AccelerationCapabilities }>).detail.capabilities.acceleration,
        );
    });
    await element.updateComplete;
    await element.setViewMode("2d");
    await element.session.styles.add({
        name: "Node ink",
        target: "node",
        selector: { match: "everything" },
        // Large enough to stay a few pixels wide however far the layout spreads 300 nodes, so a hover can find one.
        set: { "node.color": "#2040ff", "node.shape": "box", "node.size": 4 },
    });
    await element.session.styles.add({
        name: "Edge ink",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.color": "#ff00ff", "edge.width": 6 },
    });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    await element.session.data.addNodes(
        // On a grid, the triangle's last node lifted off its row so no edge runs over a node's center.
        graph.ids.map((id, i) => ({
            id,
            position: {
                x: (i % 20) * 10 - 100,
                y: Math.floor(i / 20) * 10 - 100 + (i === graph.ids.length - 1 ? 5 : 0),
                z: 0,
            },
        })),
    );
    await element.session.data.addEdges(
        graph.pairs.map(([source, target], i) =>
            i % 2 === 0 || !graph.directed ? { source, target, directed: false } : { source, target },
        ),
    );
    await element.graph.setLayout("fixed", { dim: 2 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return { element, statuses };
}

/**
 * Batched rows still have no Node for most nodes, so the batched code is what is drawing.
 * @param element - The element.
 * @param path - The render path.
 * @param n - Nodes loaded.
 */
function assertLazy(element: Graphty, path: Path, n: number): void {
    if (path === "batched") {
        assert.isBelow(
            dataManagerInternals.nodesBuilt(element.graph.getDataManager()),
            n,
            "some node rows have no Node",
        );
    }
}

/**
 * Starts a GPU layout that keeps running through the test.
 * @param element - The element.
 * @param layout - The layout.
 */
async function startGpuLayout(element: Graphty, layout: string): Promise<void> {
    await element.setLayout(layout, { seed: 7, maxIter: 1_000_000, settleThreshold: 1e-12 });
}

/**
 * Every recorded frame is good and enough of them moved.
 * @param reports - The recorded frames.
 * @param what - Named in the failure.
 * @param moving - Moving frames required.
 */
function assertGoodFrames(reports: readonly FrameReport[], what: string, moving = MOVING_FRAMES): void {
    const summary = describeFrames(reports);
    console.log(`[gpu-landings] ${what}: ${summary}`);
    assert.isAtLeast(reports.filter((r) => r.moved > 0.25).length, moving, `${what}: the layout moved: ${summary}`);
    assert.isFalse(reports.some(faulty), `${what}: ${summary}`);
}

/**
 * The layout ran on the GPU: an "active" status with a backend was announced.
 * @param statuses - What the element announced.
 */
function assertAccelerated(statuses: readonly AccelerationStatus[]): void {
    assert.isDefined(
        statuses.find((s) => s.state === "active" && s.backend !== undefined),
        `the layout ran on the accelerator: ${JSON.stringify(statuses.map((s) => s.state))}`,
    );
}

const GPU_CASES = ADAPTER === "" ? describe.skip : describe;

GPU_CASES.each(["batched", "objects"] as const)("GPU layout landings drawn on %s", (path) => {
    describe.each(["webgl", "webgpu"] as const)("with %s", (renderer) => {
        // The positive control: a still graph's picture holds ink where every node and edge is, so a blank or
        // wrongly turned read cannot pass the checks below.
        it("reads the picture the way it was drawn", async () => {
            const graph = fixture(40);
            const { element } = await mount(path, renderer, graph, "off");
            const frame = await captureNextFrame(element.graph);
            assert.isAbove(inkedPixels(frame), 200, "the frame holds ink");
            const reports = await checkDrawnFrames(element.graph, graph.ids, graph.pairs, 0, { max: 1 });
            assert.isFalse(reports.some(faulty), describeFrames(reports));
            // and the at-rest helpers, which read through readFrame, see every node and edge too: they look for an
            // edge's ink a third of the way along, so the nodes are made small enough to leave it clear
            await element.session.styles.add({
                name: "Small",
                target: "node",
                selector: { match: "everything" },
                set: { "node.size": 1 },
            });
            await element.waitForStableFrame();
            assert.deepEqual(await undrawnNodes(element, graph.ids), [], "readFrame sees every node");
            const unseen = await undrawnEdges(element, graph.pairs);
            assert.deepEqual(unseen, [], `readFrame sees every edge: ${JSON.stringify(unseen)}`);
        });

        it.each(["forceatlas2", "spring", "spring-electrical"])(
            "keeps every node and edge where it is said to be in each frame of %s at 300 nodes",
            async (layout) => {
                const graph = fixture(300);
                const { element, statuses } = await mount(path, renderer, graph);
                assertLazy(element, path, 300);
                const recording = checkDrawnFrames(element.graph, graph.ids, graph.pairs, MOVING_FRAMES);
                await startGpuLayout(element, layout);
                assertGoodFrames(await recording, `${path} ${renderer} ${layout} 300`);
                assertAccelerated(statuses);
            },
        );

        it("keeps every node and edge where it is said to be at 2,000 nodes", async () => {
            const graph = fixture(2000);
            const { element, statuses } = await mount(path, renderer, graph);
            const recording = checkDrawnFrames(element.graph, graph.ids, graph.pairs, 10);
            await startGpuLayout(element, "forceatlas2");
            assertGoodFrames(await recording, `${path} ${renderer} forceatlas2 2000`, 10);
            assertAccelerated(statuses);
        });

        it("draws a node added mid-run with no edges, and keeps the rest on their nodes", async () => {
            const graph = fixture(300, false);
            const { element, statuses } = await mount(path, renderer, graph);
            await startGpuLayout(element, "forceatlas2");
            assertGoodFrames(
                await checkDrawnFrames(element.graph, graph.ids, graph.pairs, 5),
                `${path} ${renderer} before`,
                5,
            );
            await element.session.data.addNodes([{ id: "late" }]);
            const ids = [...graph.ids, "late"];
            assertGoodFrames(
                await checkDrawnFrames(element.graph, ids, graph.pairs, MOVING_FRAMES),
                `${path} ${renderer} after a node-only add`,
            );
            assert.isDefined(element.nodeScreenPosition("late"), "the added node is placed");
            assertAccelerated(statuses);
        });

        it("shows a restyle on the next drawn frame between landings", async () => {
            const graph = fixture(300, false);
            const { element } = await mount(path, renderer, graph);
            await startGpuLayout(element, "forceatlas2");
            await checkDrawnFrames(element.graph, graph.ids, graph.pairs, 3);
            const target = graph.ids[0];
            await element.session.styles.add({
                name: "One green",
                target: "node",
                selector: { match: "ids", nodes: [target] },
                set: { "node.color": "#20c040" },
            });
            const frame = await captureNextFrame(element.graph);
            const at = element.nodeScreenPosition(target);
            assert.isDefined(at);
            const i = (Math.round(at.y * frame.scale) * frame.width + Math.round(at.x * frame.scale)) * 4;
            const pixel = Array.from(frame.pixels.subarray(i, i + 3));
            assert.isTrue(
                pixel[1] > pixel[0] + 60 && pixel[1] > pixel[2] + 40,
                `the restyled node is green in the next frame, not ${JSON.stringify(pixel)}`,
            );
            assertGoodFrames(
                await checkDrawnFrames(element.graph, graph.ids, graph.pairs, 10, {
                    faults: () => ({ ownColor: [target] }),
                }),
                `${path} ${renderer} after a restyle`,
                10,
            );
        });

        it("hovers a pinned node under the pointer between landings and keeps the rest drawn", async () => {
            const graph = fixture(300, false);
            const { element } = await mount(path, renderer, graph);
            const target = graph.ids[0];
            await startGpuLayout(element, "forceatlas2");
            await checkDrawnFrames(element.graph, graph.ids, graph.pairs, 3);
            await element.session.positions.pin([target]);
            // the camera stops reframing each landing, so the pinned node stays under a still pointer
            element.autoFrame = false;
            await checkDrawnFrames(element.graph, graph.ids, graph.pairs, 3);
            const at = element.nodeScreenPosition(target);
            assert.isDefined(at);
            await hover(element, { x: at.x, y: at.y });
            const reports = await checkDrawnFrames(element.graph, graph.ids, graph.pairs, 10, {
                faults: () => ({ ownColor: [target] }),
            });
            assert.strictEqual(
                element.session.selection.hovered,
                target,
                "the pinned node under the pointer is hovered",
            );
            assertGoodFrames(reports, `${path} ${renderer} while hovering a pinned node`, 10);
        });

        it("keeps a node under a real mouse drag mid-run, with its edges on it", async () => {
            const graph = fixture(300, false);
            const { element } = await mount(path, renderer, graph);
            const [target] = graph.pairs[0];
            await startGpuLayout(element, "forceatlas2");
            await checkDrawnFrames(element.graph, graph.ids, graph.pairs, 3);
            // pinned, so the pointer presses where the node is, and the camera still, so the node stays under the
            // pointer; the drag then moves it while the rest still land
            await element.session.positions.pin([target]);
            element.autoFrame = false;
            await checkDrawnFrames(element.graph, graph.ids, graph.pairs, 3);
            const from = element.nodeScreenPosition(target);
            assert.isDefined(from);
            const to = { x: Math.min(440, Math.max(40, from.x + 60)), y: Math.min(320, Math.max(40, from.y + 40)) };
            let dragging = true;
            const reports: FrameReport[] = [];
            const recording = checkDrawnFrames(element.graph, graph.ids, graph.pairs, 1_000_000, {
                until: () => !dragging,
            });
            await drag(element, from, to, 10, async () => {
                // held at the end of the drag: the node is under the pointer while the rest still move
                const frame = await checkDrawnFrames(element.graph, graph.ids, graph.pairs, 0, { max: 3 });
                reports.push(...frame);
                const held = element.nodeScreenPosition(target);
                assert.isDefined(held);
                assert.isBelow(
                    Math.hypot(held.x - to.x, held.y - to.y),
                    Math.max(4, held.radius),
                    `the dragged node is under the pointer: ${JSON.stringify(held)} vs ${JSON.stringify(to)}`,
                );
            });
            dragging = false;
            reports.push(...(await recording));
            assertGoodFrames(reports, `${path} ${renderer} during a drag`, 5);
        });
    });
});

describe("a CPU layout with the GPU flags on", () => {
    // With the GPU test flags on, ngraph once never reported settled within 300 frames on either path, against
    // about 30 without them. Counted in drawn frames: a layout that settles does so within a few hundred.
    it.each(["batched", "objects"] as const)("ngraph settles within 400 drawn frames on %s", async (path) => {
        const graph = fixture(16);
        const { element } = await mount(path, "webgl", graph, "off");
        let settled = false;
        element.addEventListener("graph-settled", () => {
            settled = true;
        });
        let frames = 0;
        const { stop } = recordDrawnFrames(element.graph, () => {
            frames++;
            return true;
        });
        await element.setLayout("ngraph", { seed: 7 });
        // a settled graph that draws on demand draws no more frames, so this waits on either
        await vi.waitFor(() => {
            assert.isTrue(settled || frames >= 400, "settled, or 400 frames drawn");
        });
        stop();
        console.log(
            `[gpu-landings] ngraph ${path} adapter=${ADAPTER || "none"} settled=${String(settled)} after ${String(frames)} frames`,
        );
        assert.isTrue(settled, `ngraph settled within 400 drawn frames (adapter ${ADAPTER || "none"})`);
    });
});
