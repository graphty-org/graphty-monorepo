/**
 * @file What picking an edge costs, on both render paths, from 10,000 to a million plain edges.
 *
 * Every edge is plain (the graph is undirected), so on `"batched"` each is a row line drawn with no `Edge`. Two
 * picks are timed at points on edges' middles:
 *
 * - `elementAt`, the press path: on `"batched"` WebGL it reads the edge ID target as a hover does; on WebGPU, whose
 *   read answers only later, a press at a point no hover has read is one typed walk over every line, and a press
 *   where a hover's read has come back ("rested", as a click lands where the pointer rests) measures only the lines
 *   that read named; on `"objects"` a walk over every `Edge`;
 * - the edge hover a pointer move runs (`hoverEdgeAt`, called as the element calls it, so the CDP round trip of a
 *   mouse event is not in the time): on `"batched"` it reads the edge ID target and measures only the lines drawn
 *   near the pointer; on `"objects"` it measures every edge;
 * - the edge pick a click runs (`clickEdgeAt`) at points no hover has read: on `"batched"` WebGPU it waits for the
 *   edge ID target's read instead of walking every line, so its time holds a frame;
 * - a selection followed by the next pick: the selection draws the selected edge with an `Edge`, which takes its
 *   row line away, and the pick that follows rewrites the target's rows for it (`rowsWrittenPerSelect`).
 *
 * A WebGPU hover or click waits for a frame, so `frameMs` (one requested frame, as `waitForStableFrame` waits for it)
 * is printed beside them: on SwiftShader a frame of 100,000 lines takes seconds, on a GPU milliseconds.
 *
 * Also printed: how many picks named an edge (each point is on one, unless a node covers it), how many row lines a
 * pick measured, and the first hover, which rebuilds the edge ID target's line list. Nothing is asserted but that
 * the picks found edges: the times are printed as `[edge-pick]` and as `bench-row` lines.
 *
 * This file gates no push: it runs in the "browser-bench" project.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import { operationQueueOf, renderManagerOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";
import * as picks from "../../src/render/PickService";
import { edgePickWork, hoverEdgeAt } from "../../src/render/PickService";
import { hover } from "../helpers/real-input";

const WIDTH = 1000;
const HEIGHT = 800;
const POINTS = 60;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A seeded random number generator (mulberry32).
 * @param seed - The seed.
 * @returns Numbers in 0..1.
 */
function seeded(seed: number): () => number {
    let a = seed;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * The median of some numbers.
 * @param values - The numbers.
 * @returns Their median.
 */
function median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] ?? Number.NaN;
}

/**
 * Where the largest of some numbers is.
 * @param values - The numbers.
 * @returns Its index.
 */
function largestAt(values: number[]): number {
    return values.indexOf(Math.max(...values));
}

/**
 * Print one row.
 * @param row - The row.
 */
function record(row: Record<string, unknown>): void {
    console.log(`[edge-pick] ${JSON.stringify(row)}`);
    console.log(
        `bench-row ${JSON.stringify({ date: new Date().toISOString(), runner: "browser", agent: navigator.userAgent, ...row })}`,
    );
}

/** The adapter the project was launched with; empty when it has no WebGPU. */
const ADAPTER = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "";

const CASES: { path: "objects" | "batched"; edges: number; renderer: "webgl" | "webgpu" }[] = [
    { path: "objects", edges: 10_000, renderer: "webgl" },
    { path: "objects", edges: 100_000, renderer: "webgl" },
    { path: "batched", edges: 10_000, renderer: "webgl" },
    { path: "batched", edges: 100_000, renderer: "webgl" },
    { path: "batched", edges: 1_000_000, renderer: "webgl" },
    // WebGPU reads the edge ID target back only asynchronously: a cold press there walks every line.
    { path: "batched", edges: 100_000, renderer: "webgpu" },
    { path: "batched", edges: 1_000_000, renderer: "webgpu" },
];

describe("edge pick cost", () => {
    for (const { path, edges, renderer } of CASES) {
        it.skipIf(renderer === "webgpu" && ADAPTER === "")(
            `${path}, ${renderer}, ${String(edges)} plain edges`,
            async () => {
                (globalThis as { __GRAPHTY_STRICT_STATE__?: boolean }).__GRAPHTY_STRICT_STATE__ = false;
                const nodes = edges / 10;
                const element = document.createElement("graphty-element");
                element.renderer = renderer;
                element.renderPath = path;
                element.directed = false;
                element.limits = { renderCeiling: Math.max(nodes, 100_000) };
                element.style.display = "block";
                element.style.width = `${String(WIDTH)}px`;
                element.style.height = `${String(HEIGHT)}px`;
                document.body.appendChild(element);
                cleanups.push(() => {
                    element.remove();
                });
                await element.updateComplete;
                await element.setViewMode("2d");
                await operationQueueOf(element.graph).waitForCompletion();
                // Spread so a node is about a pixel across: most of an edge's middle is not under a node.
                const span = Math.sqrt(nodes) * 3;
                const random = seeded(5);
                await element.session.data.addNodes(
                    Array.from({ length: nodes }, (_, i) => ({
                        id: `n${String(i)}`,
                        position: { x: random() * span, y: random() * span * 0.8, z: 0 },
                    })),
                );
                const pairs = Array.from({ length: edges }, () => [
                    Math.floor(random() * nodes),
                    Math.floor(random() * nodes),
                ]);
                await element.session.data.addEdges(
                    pairs.map(([a, b]) => ({ src: `n${String(a)}`, dst: `n${String(b === a ? (a + 1) % nodes : b)}` })),
                );
                await element.graph.setLayout("fixed", { dim: 2 });
                await operationQueueOf(element.graph).waitForCompletion();
                await element.waitForStableFrame();
                const manager = element.graph.getDataManager();
                const built = dataManagerInternals.edgesLive(manager);

                const points = pairs.slice(0, POINTS).map(([a, b]) => {
                    const p = element.nodeScreenPosition(`n${String(a)}`);
                    const q = element.nodeScreenPosition(`n${String(b === a ? (a + 1) % nodes : b)}`);
                    return { x: ((p?.x ?? 0) + (q?.x ?? 0)) / 2, y: ((p?.y ?? 0) + (q?.y ?? 0)) / 2 };
                });

                // The first move rebuilds the edge ID target's list on "batched".
                const firstStart = performance.now();
                await hover(element, { x: 1, y: 1 });
                const firstHover = performance.now() - firstStart;
                await element.waitForStableFrame();

                const pressTimes: number[] = [];
                let pressEdges = 0;
                const lines0 = (edgePickWork as { rowLines?: number }).rowLines ?? 0;
                for (const point of points) {
                    const start = performance.now();
                    const got = element.elementAt(point);
                    pressTimes.push(performance.now() - start);
                    pressEdges += got?.kind === "edge" ? 1 : 0;
                }
                const pressLines = ((edgePickWork as { rowLines?: number }).rowLines ?? 0) - lines0;

                const { graph } = element;
                const rowLines = graph.getEdgeRowLines();
                const lines =
                    rowLines === null
                        ? null
                        : {
                              forEachShown: (
                                  visit: (row: number, source: number, target: number) => void,
                                  only?: readonly number[],
                              ) => {
                                  rowLines.forEachShown(visit, only);
                              },
                              idOf: (row: number) => dataManagerInternals.unbuiltEdgeId(manager, row),
                          };
                const builtEdges = (): Iterable<never> =>
                    dataManagerInternals.builtEdges(manager).values() as Iterable<never>;
                const hoverTimes: number[] = [];
                const hoverFrames: number[] = [];
                let hoverEdges = 0;
                const lines1 = (edgePickWork as { rowLines?: number }).rowLines ?? 0;
                const measured1 = edgePickWork.measured + edgePickWork.fromRows;
                for (const point of points) {
                    const start = performance.now();
                    const frame = graph.scene.getFrameId();
                    // Six arguments; the code before the row lines took five and ignores the last.
                    const got = await (hoverEdgeAt as (...args: unknown[]) => unknown)(
                        graph.scene,
                        builtEdges,
                        point.x,
                        point.y,
                        (p: { x: number; y: number; z: number }) => graph.worldToScreen(p),
                        lines,
                    );
                    hoverTimes.push(performance.now() - start);
                    hoverFrames.push(graph.scene.getFrameId() - frame);
                    hoverEdges += got === undefined ? 0 : 1;
                }
                const hoverLines = ((edgePickWork as { rowLines?: number }).rowLines ?? 0) - lines1;
                const hoverEdgesMeasured = edgePickWork.measured + edgePickWork.fromRows - measured1;

                // One requested frame: what a WebGPU read waits for.
                const frameStart = performance.now();
                await new Promise<void>((resolve) => {
                    graph.scene.onAfterRenderObservable.addOnce(() => {
                        resolve();
                    });
                    renderManagerOf(graph).requestFrame();
                });
                const frameMs = performance.now() - frameStart;

                // A click at points no hover has read: on WebGPU it waits for the edge ID target's read. The code
                // before this bench's fix has no `clickEdgeAt`; there a click ran `elementAt`'s pick.
                const { clickEdgeAt } = picks as { clickEdgeAt?: (...args: unknown[]) => unknown };
                const clickTimes: number[] = [];
                let clickEdges = 0;
                const lines2 = (edgePickWork as { rowLines?: number }).rowLines ?? 0;
                for (const point of points.map((p) => ({ x: p.x + 0.5, y: p.y + 0.5 }))) {
                    const start = performance.now();
                    const got =
                        clickEdgeAt === undefined
                            ? element.elementAt(point)?.id
                            : await clickEdgeAt(
                                  graph.scene,
                                  builtEdges,
                                  point.x,
                                  point.y,
                                  (p: { x: number; y: number; z: number }) => graph.worldToScreen(p),
                                  lines,
                              );
                    clickTimes.push(performance.now() - start);
                    clickEdges += got === undefined ? 0 : 1;
                }
                const clickLines = ((edgePickWork as { rowLines?: number }).rowLines ?? 0) - lines2;

                // A press where a hover's read has come back, as a click follows the pointer's move.
                const restedTimes: number[] = [];
                let restedLines = 0;
                for (const point of points) {
                    await (hoverEdgeAt as (...args: unknown[]) => unknown)(
                        graph.scene,
                        builtEdges,
                        point.x,
                        point.y,
                        (p: { x: number; y: number; z: number }) => graph.worldToScreen(p),
                        lines,
                    );
                    const before = (edgePickWork as { rowLines?: number }).rowLines ?? 0;
                    const start = performance.now();
                    element.elementAt(point);
                    restedTimes.push(performance.now() - start);
                    restedLines += ((edgePickWork as { rowLines?: number }).rowLines ?? 0) - before;
                }

                // A selection, then the next pick: what the edge ID target writes again for it.
                const target = graph.getEdgeIdTarget() as { counts: { rowsWritten?: number } } | null;
                const selectPoint = points.find((point) => element.elementAt(point)?.kind === "edge") ?? points[0];
                const selected = element.elementAt(selectPoint)?.id;
                const writtenBefore = target?.counts.rowsWritten ?? Number.NaN;
                if (selected !== undefined) {
                    await element.session.selection.apply({ edges: [selected as never] }, "replace", { cause: "user" });
                }
                await operationQueueOf(graph).waitForCompletion();
                const selectStart = performance.now();
                await (hoverEdgeAt as (...args: unknown[]) => unknown)(
                    graph.scene,
                    builtEdges,
                    selectPoint.x,
                    selectPoint.y,
                    (p: { x: number; y: number; z: number }) => graph.worldToScreen(p),
                    lines,
                );
                const afterSelectHoverMs = performance.now() - selectStart;
                const rowsWrittenPerSelect = (target?.counts.rowsWritten ?? Number.NaN) - writtenBefore;

                record({
                    bench: "edge-pick",
                    path,
                    renderer,
                    edges,
                    nodes,
                    edgeObjectsBuilt: built,
                    firstHoverMs: Number(firstHover.toFixed(2)),
                    elementAtMedianMs: Number(median(pressTimes).toFixed(3)),
                    elementAtMaxMs: Number(Math.max(...pressTimes).toFixed(3)),
                    elementAtEdgesFound: pressEdges,
                    elementAtRowLinesPerPick: pressLines / POINTS,
                    restedPressMedianMs: Number(median(restedTimes).toFixed(3)),
                    restedPressMaxMs: Number(Math.max(...restedTimes).toFixed(3)),
                    restedPressRowLinesPerPick: restedLines / POINTS,
                    hoverMedianMs: Number(median(hoverTimes).toFixed(3)),
                    hoverEdgesFound: hoverEdges,
                    hoverMaxMs: Number(Math.max(...hoverTimes).toFixed(3)),
                    hoverMaxAt: largestAt(hoverTimes),
                    hoverFramesAtMax: hoverFrames[largestAt(hoverTimes)],
                    frameMs: Number(frameMs.toFixed(2)),
                    clickMedianMs: Number(median(clickTimes).toFixed(3)),
                    clickMaxMs: Number(Math.max(...clickTimes).toFixed(3)),
                    clickEdgesFound: clickEdges,
                    clickRowLinesPerPick: clickLines / POINTS,
                    afterSelectHoverMs: Number(afterSelectHoverMs.toFixed(3)),
                    rowsWrittenPerSelect,
                    hoverRowLinesPerMove: hoverLines / POINTS,
                    hoverEdgeObjectsPerMove: hoverEdgesMeasured / POINTS,
                    edgeObjectsAfter: dataManagerInternals.edgesLive(manager),
                });
                assert.strictEqual(element.getEdgeCount(), edges);
            },
        );
    }
});
