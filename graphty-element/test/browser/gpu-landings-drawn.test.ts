/**
 * @file What a reader sees in every frame while a GPU layout lands its batches: each node drawn where
 * `nodeScreenPosition` says it is in that same frame, each edge on the segment between its two nodes, and no ink
 * anywhere else -- on both render paths, drawn with WebGL and with WebGPU, at about 300 and 2,000 nodes, while the
 * layout runs steadily, after a node with no edges is added mid-run, after a node or an edge is removed mid-run (the
 * removal renumbers the rows while batches for the old rows are in flight) and after that removal is undone and
 * redone, after a restyle and a real hover between two landings, and while a real mouse drags a node.
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
 * test/browser/gpu-landings-drawn.test.ts; each recording's first faulty frame is logged as a PNG; VITE_FRAME_DUMP=all logs every frame.
 */

import "../../src/graphty-element";
import "../../webgpu";

import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import type { AccelerationCapabilities, AccelerationStatus } from "../../src/acceleration";
import { operationQueueOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";
import { keptEdgeStretch, layoutPlaces, undrawnEdges, undrawnNodes } from "../helpers/drawn-invariants";
import {
    captureNextFrame,
    checkDrawnFrames,
    describeFrames,
    faulty,
    type FrameReport,
    inkedPixels,
    isBlue,
    recordDrawnFrames,
    STILL_CHECKED,
    stillFrames,
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
    const rest = { settles: 0 };
    resting.set(element, rest);
    element.addEventListener("graph-settled", () => {
        rest.settles++;
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

/** How many times each element's layout has reported settled. */
const resting = new WeakMap<Graphty, { settles: number }>();

/**
 * {@link checkDrawnFrames} on an element, ended early once its layout settles after the recording starts: a graph at rest draws no more
 * frames, and the moving-frame count then says the layout stopped too soon.
 * @param element - The element.
 * @param ids - Every node.
 * @param pairs - Every edge.
 * @param want - Moving frames to check.
 * @param options - As for {@link checkDrawnFrames}.
 * @returns The frames.
 */
function framesOf(
    element: Graphty,
    ids: readonly string[],
    pairs: readonly (readonly [string, string])[],
    want: number,
    options: Parameters<typeof checkDrawnFrames>[4] = {},
): Promise<FrameReport[]> {
    const { until } = options;
    const settles = resting.get(element)?.settles ?? 0;
    return checkDrawnFrames(element.graph, ids, pairs, want, {
        ...options,
        until: () => (resting.get(element)?.settles ?? 0) > settles || until?.() === true,
    });
}

/**
 * Starts a GPU layout that keeps running through the test.
 * @param element - The element.
 * @param layout - The layout.
 */
async function startGpuLayout(element: Graphty, layout: string): Promise<void> {
    // forceatlas2 counts its run in maxIter, the spring layouts in iterations
    const run = layout === "forceatlas2" ? { maxIter: 1_000_000 } : { iterations: 1_000_000 };
    await element.setLayout(layout, { seed: 7, settleThreshold: 1e-12, ...run });
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

/** Frames a hover may take to be answered before the check gives up on it. */
const HOVER_FRAMES = 60;

/** What one drawn frame shows at the pointer. */
interface PointerFrame {
    /** The frame's place among the frames drawn since the recording started. */
    readonly seq: number;
    /** Whose ink is on top at the pointer: the green target, another (blue) node, or neither (an edge, nothing). */
    readonly onTop: "target" | "other" | "neither";
    /** The nodes the element placed under the pointer in that frame. */
    readonly under: string[];
}

/**
 * Points a real mouse at a still point while a layout moves the other nodes, and checks the answer against the
 * frames drawn from just before the move until just after the answer: the hovered node must be under the pointer
 * in one of them and, where the picture says whose ink is on top there, be that node. A moving node passing over
 * the pinned one is rightly hovered when it is drawn in front; a hover answered from a frame that was never drawn,
 * or naming a node drawn behind another, fails. The target must be drawn green and every other node blue.
 *
 * Where two nodes overlap at the same depth (all of them in 2D), the objects path's ray pick names the earlier
 * mesh while the picture shows the later one on top; batched names the one drawn last. That is the objects path's
 * behavior from before the row renderer, so with `tiesToFirst` a hovered node that overlaps another under the
 * pointer passes whichever of them is drawn on top; it must still be under the pointer in a drawn frame.
 * @param element - The element.
 * @param ids - Every node.
 * @param target - The green node.
 * @param point - Where the pointer goes, in CSS pixels.
 * @param tiesToFirst - An overlap at the same depth is hovered as the earlier node, not the one drawn on top.
 * @returns The hovered node.
 */
async function hoverAgainstFrames(
    element: Graphty,
    ids: readonly string[],
    target: string,
    point: { x: number; y: number },
    tiesToFirst: boolean,
): Promise<string> {
    let drawn = 0;
    let moveSeq = -1;
    let answer: { id: string; seq: number } | undefined;
    const frames: PointerFrame[] = [];
    let firstFrame: () => void = () => undefined;
    const started = new Promise<void>((resolve) => {
        firstFrame = resolve;
    });
    const stopHover = element.session.on("selection:hover-changed", ({ after }) => {
        if (answer === undefined && after !== null && moveSeq >= 0) {
            answer = { id: String(after), seq: drawn };
        }
    });
    const { done } = recordDrawnFrames(
        element.graph,
        (frame, _index, read) => {
            const d = frame.pixels;
            const i = (Math.round(point.y * frame.scale) * frame.width + Math.round(point.x * frame.scale)) * 4;
            let onTop: PointerFrame["onTop"] = isBlue(d, i) ? "other" : "neither";
            if (d[i + 1] > d[i] + 60 && d[i + 1] > d[i + 2] + 40) {
                onTop = "target";
            }

            frames.push({ seq: read.seq, onTop, under: read.under });
            firstFrame();
            // on until a frame after the answer is in, or the answer is long overdue
            return answer === undefined ? moveSeq < 0 || read.seq - moveSeq < HOVER_FRAMES : read.seq <= answer.seq;
        },
        () => ({
            seq: drawn++,
            under: ids.filter((id) => {
                const at = element.nodeScreenPosition(id);
                return at !== undefined && at.visible && Math.hypot(at.x - point.x, at.y - point.y) <= at.radius + 1;
            }),
        }),
    );
    await started;
    moveSeq = drawn;
    await hover(element, point);
    await done;
    stopHover();
    assert.isDefined(answer, `hover answered within ${String(HOVER_FRAMES)} frames drawn`);
    const { id, seq } = answer;
    const window = frames.filter((f) => f.seq >= moveSeq - 1 && f.seq <= seq + 1);
    const shown = window.map((f) => `${String(f.seq)}:${f.onTop}[${f.under.join(",")}]`).join(" ");
    console.log(`[gpu-landings] hover ${id}, moved at ${String(moveSeq)}, answered at ${String(seq)}: ${shown}`);
    assert.isTrue(
        window.some(
            (f) =>
                f.under.includes(id) &&
                (f.onTop === "neither" ||
                    (f.onTop === "target") === (id === target) ||
                    (tiesToFirst && f.under.length > 1)),
        ),
        `the hovered node ${id} is drawn on top at the pointer in a frame from the move to the answer: ${shown}`,
    );
    return id;
}

const GPU_CASES = ADAPTER === "" ? describe.skip : describe;

/**
 * A stopped layout's next frames: every node and edge where it is said to be, ink present, and no node moved on
 * screen (a batch still in flight when the layout stopped must not land).
 * @param element - The element.
 * @param ids - Every node shown.
 * @param pairs - Every edge shown.
 * @param what - Named in the failure.
 */
async function assertStillFrames(
    element: Graphty,
    ids: readonly string[],
    pairs: readonly (readonly [string, string])[],
    what: string,
): Promise<void> {
    const before = ids.map((id) => element.nodeScreenPosition(id));
    const reports = await stillFrames(element.graph, ids, pairs);
    const moved = Math.max(
        ...ids.map((id, i) => {
            const a = before[i];
            const b = element.nodeScreenPosition(id);
            return a === undefined || b === undefined ? Infinity : Math.hypot(b.x - a.x, b.y - a.y);
        }),
    );
    console.log(`[gpu-landings] ${what}: ${describeFrames(reports)}, worst move ${String(moved)} px`);
    assert.strictEqual(reports.length, STILL_CHECKED, `${what}: every frame was read, none moved`);
    assert.isFalse(reports.some(faulty), `${what}: ${describeFrames(reports)}`);
    assert.isBelow(moved, 1, `${what}: no node moved once the layout stopped`);
}

/** One removal, or undo of one, taken while a GPU layout lands, and what is drawn after it. */
interface Removal {
    name: string;
    step: (element: Graphty, graph: Fixture) => Promise<void>;
    after: (graph: Fixture) => { ids: string[]; pairs: (readonly [string, string])[] };
    /**
     * Undo and redo stop a running layout and put back the arrangement the history holds
     * (design/undo/undo-design.md section 6.2), on both paths and as before the renderer optimizations: what is
     * checked after them is that no batch still in flight lands and moves a node, and that the still frames are right.
     */
    stopsLayout?: boolean;
    /**
     * Every edge the step keeps joins two nodes about as far apart in layout space after it as before
     * ({@link keptEdgeStretch}): renumbered rows must not hand nodes other rows' places. Not asked of a step that
     * adds a node: forceatlas2 starts again from new places on an add, on both paths and in the build from before
     * the renderer optimizations.
     */
    keepsPlaces?: boolean;
}

/**
 * The fixture less some nodes (and every edge touching one) and some edges, plus some nodes added.
 * @param graph - The fixture.
 * @param gone - Nodes removed.
 * @param goneEdges - Edges removed, by their place in `graph.pairs`.
 * @param added - Nodes added, with no edges.
 * @returns What is drawn.
 */
function without(
    graph: Fixture,
    gone: readonly string[],
    goneEdges: readonly number[] = [],
    added: readonly string[] = [],
): { ids: string[]; pairs: (readonly [string, string])[] } {
    return {
        ids: [...graph.ids.filter((id) => !gone.includes(id)), ...added],
        pairs: graph.pairs.filter((pair, i) => !goneEdges.includes(i) && !pair.some((id) => gone.includes(id))),
    };
}

/**
 * Removing the first node renumbers every row after it while batches computed for the old rows are still in flight
 * and landings are copied by row; undo brings the rows back through the records. The element numbers edges in the
 * order they were added, so the second pair's edge is "1".
 */
const REMOVALS: readonly Removal[] = [
    {
        name: "the first node removed",
        step: async (element) => {
            await element.session.data.removeNodes(["n0"]);
        },
        after: (graph) => without(graph, ["n0"]),
        keepsPlaces: true,
    },
    {
        name: "an edge removed",
        step: async (element) => {
            await element.session.data.removeEdges(["1"]);
        },
        after: (graph) => without(graph, [], [1]),
        keepsPlaces: true,
    },
    {
        name: "the first node removed and another added",
        step: async (element) => {
            await element.session.data.removeNodes(["n0"]);
            await element.session.data.addNodes([{ id: "late" }]);
        },
        after: (graph) => without(graph, ["n0"], [], ["late"]),
    },
    {
        name: "the first node's removal undone",
        step: async (element) => {
            await element.session.data.removeNodes(["n0"]);
            await element.session.undo();
        },
        after: (graph) => without(graph, []),
        stopsLayout: true,
    },
    {
        name: "the first node's removal undone and redone",
        step: async (element) => {
            await element.session.data.removeNodes(["n0"]);
            await element.session.undo();
            await element.session.redo();
        },
        after: (graph) => without(graph, ["n0"]),
        stopsLayout: true,
    },
];

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
            assert.lengthOf(reports, 1, "one frame was read");
            assert.isFalse(reports.some(faulty), describeFrames(reports));
            // and the at-rest helpers, which read through readFrame, see every node and edge too: they look for an
            // edge's ink a third of the way along, so the nodes are made small enough to leave it clear,
            await element.session.styles.add({
                name: "Small",
                target: "node",
                selector: { match: "everything" },
                set: { "node.size": 1 },
            });
            // and its edges wide enough to read full magenta, which it asks for
            await element.session.styles.add({
                name: "Wide",
                target: "edge",
                selector: { match: "everything" },
                set: { "edge.width": 20 },
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
                const recording = framesOf(element, graph.ids, graph.pairs, MOVING_FRAMES);
                await startGpuLayout(element, layout);
                assertGoodFrames(await recording, `${path} ${renderer} ${layout} 300`);
                assertAccelerated(statuses);
            },
        );

        it("keeps every node and edge where it is said to be at 2,000 nodes", async () => {
            const graph = fixture(2000);
            const { element, statuses } = await mount(path, renderer, graph);
            const recording = framesOf(element, graph.ids, graph.pairs, 10);
            await startGpuLayout(element, "forceatlas2");
            assertGoodFrames(await recording, `${path} ${renderer} forceatlas2 2000`, 10);
            assertAccelerated(statuses);
        });

        it("draws a node added mid-run with no edges, and keeps the rest on their nodes", async () => {
            const graph = fixture(300, false);
            const { element, statuses } = await mount(path, renderer, graph);
            await startGpuLayout(element, "forceatlas2");
            assertGoodFrames(await framesOf(element, graph.ids, graph.pairs, 5), `${path} ${renderer} before`, 5);
            await element.session.data.addNodes([{ id: "late" }]);
            const ids = [...graph.ids, "late"];
            assertGoodFrames(
                await framesOf(element, ids, graph.pairs, MOVING_FRAMES),
                `${path} ${renderer} after a node-only add`,
            );
            assert.isDefined(element.nodeScreenPosition("late"), "the added node is placed");
            assertAccelerated(statuses);
        });

        it.each(REMOVALS)(
            "keeps every node and edge where it is said to be after $name mid-run",
            async ({ name, step, after, stopsLayout = false, keepsPlaces = false }) => {
                const graph = fixture(300, false);
                const { element, statuses } = await mount(path, renderer, graph);
                assertLazy(element, path, 300);
                await startGpuLayout(element, "forceatlas2");
                assertGoodFrames(await framesOf(element, graph.ids, graph.pairs, 5), `${path} ${renderer} before`, 5);
                const { ids, pairs } = after(graph);
                const kept = ids.filter((id) => graph.ids.includes(id));
                const before = layoutPlaces(element, kept);
                await step(element, graph);
                if (keepsPlaces) {
                    const stretch = keptEdgeStretch(before, layoutPlaces(element, kept), pairs);
                    assert.strictEqual(stretch, "", `${path} ${renderer}: the edges kept by ${name} kept their length`);
                }

                assert.strictEqual(element.session.data.snapshot().edgeCount, pairs.length, "the edges left");
                if (stopsLayout) {
                    assert.isFalse(element.isRunning(), "undo and redo stop the layout");
                    await element.waitForStableFrame();
                    await assertStillFrames(element, ids, pairs, `${path} ${renderer} after ${name}`);
                    assertAccelerated(statuses);
                    return;
                }

                assertGoodFrames(
                    await framesOf(element, ids, pairs, MOVING_FRAMES),
                    `${path} ${renderer} after ${name}`,
                );
                assertAccelerated(statuses);
            },
        );

        it("shows a restyle on the next drawn frame between landings", async () => {
            const graph = fixture(300, false);
            const { element } = await mount(path, renderer, graph);
            await startGpuLayout(element, "forceatlas2");
            await framesOf(element, graph.ids, graph.pairs, 3);
            const target = graph.ids[0];
            await element.session.styles.add({
                name: "One green",
                target: "node",
                selector: { match: "ids", nodes: [target] },
                set: { "node.color": "#20c040" },
            });
            // the next frame, with where the node is in that frame: green anywhere inside its radius (an edge may
            // be drawn across its center)
            let green = 0;
            let seen = "";
            const { done } = recordDrawnFrames(
                element.graph,
                (frame, _index, at) => {
                    assert.isDefined(at, "the restyled node is placed");
                    const r = Math.max(1, at.radius * 0.8);
                    for (let dy = -r; dy <= r; dy++) {
                        for (let dx = -r; dx <= r; dx++) {
                            const px = Math.round((at.x + dx) * frame.scale);
                            const py = Math.round((at.y + dy) * frame.scale);
                            const i = (py * frame.width + px) * 4;
                            const [red, gr, blue] = [frame.pixels[i], frame.pixels[i + 1], frame.pixels[i + 2]];
                            seen = JSON.stringify([red, gr, blue]);
                            if (gr > red + 60 && gr > blue + 40) {
                                green++;
                            }
                        }
                    }

                    return false;
                },
                () => element.nodeScreenPosition(target),
            );
            await done;
            assert.isAbove(green, 0, `the restyled node is green in the next frame (last pixel read ${seen})`);
            assertGoodFrames(
                await framesOf(element, graph.ids, graph.pairs, 10, {
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
            await framesOf(element, graph.ids, graph.pairs, 3);
            await element.session.positions.pin([target]);
            // the camera stops reframing each landing, so the pinned node stays under a still pointer
            element.autoFrame = false;
            await framesOf(element, graph.ids, graph.pairs, 3);
            // green, so a frame says whether the pinned node or another one is drawn on top at the pointer
            await element.session.styles.add({
                name: "Pinned green",
                target: "node",
                selector: { match: "ids", nodes: [target] },
                set: { "node.color": "#20c040" },
            });
            await framesOf(element, graph.ids, graph.pairs, 1, { faults: () => ({ ownColor: [target] }) });
            const at = element.nodeScreenPosition(target);
            assert.isDefined(at);
            const answer = await hoverAgainstFrames(
                element,
                graph.ids,
                target,
                { x: at.x, y: at.y },
                path === "objects",
            );
            const reports = await framesOf(element, graph.ids, graph.pairs, 10, {
                faults: () => ({ ownColor: [target] }),
            });
            assert.strictEqual(element.session.selection.hovered, answer, "the hover holds while the pointer is still");
            assertGoodFrames(reports, `${path} ${renderer} while hovering a pinned node`, 10);
        });

        it("keeps a node under a real mouse drag mid-run, with its edges on it", async () => {
            const graph = fixture(300, false);
            const { element } = await mount(path, renderer, graph);
            const [target] = graph.pairs[0];
            await startGpuLayout(element, "forceatlas2");
            await framesOf(element, graph.ids, graph.pairs, 3);
            // pinned, so the pointer presses where the node is, and the camera still, so the node stays under the
            // pointer; the drag then moves it while the rest still land
            await element.session.positions.pin([target]);
            element.autoFrame = false;
            await framesOf(element, graph.ids, graph.pairs, 3);
            const from = element.nodeScreenPosition(target);
            assert.isDefined(from);
            const to = { x: Math.min(440, Math.max(40, from.x + 60)), y: Math.min(320, Math.max(40, from.y + 40)) };
            let dragging = true;
            const reports: FrameReport[] = [];
            const recording = framesOf(element, graph.ids, graph.pairs, 1_000_000, {
                until: () => !dragging,
            });
            await drag(element, from, to, 10, async () => {
                // held at the end of the drag: the node is under the pointer while the rest still move
                const frame = await framesOf(element, graph.ids, graph.pairs, 0, { max: 3 });
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
