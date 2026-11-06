/**
 * @file What a frame costs while a narrow time window moves over 1,000,000 edges, split by where the
 * time goes: the window move itself, `UpdateManager.syncViewMasks`, the edge walk, Babylon's
 * active-mesh evaluation, the rest of the draw call, buffer uploads (bytes and calls) and the GPU,
 * bounded by a one-pixel read back that waits for the frame to finish.
 *
 * Two graphs of 1,000,000 edges with uniform instants over five years: on 100,000 nodes, and on
 * 10,000 nodes, because a frame of 100,000 node instances costs about a second on its own
 * (`session/limits.ts`) and that cost may not be edges at all. For each, five cases:
 *
 * - `all`: no window, nothing moves.
 * - `still`: a window 2% of the span wide, standing still.
 * - `step`: that window sliding a day a frame, as smooth play does (`seek` with `commit: false`).
 * - `jump`: that window jumping to a seeded place each frame, as a brush drag or a scrub does.
 * - `ghost`: the sliding window under `outside: "ghost"`.
 *
 * The render loop is stopped and each frame is pumped by hand -- the move, `styles.settled()` (the
 * repaint a Ghost move starts), `graph.update()`, `scene.render()`, then the read back -- so a frame
 * does all the work its move started, with no frame budget splitting it. A pumped frame never rests,
 * so the still cases time a frame the render loop would skip. Each line prints the median and the slowest of the timed frames, after untimed ones,
 * and the rows a move changed beside the changed-row cap, (nodes + edges) / 8: a move past the cap
 * goes back to a walk of every object, so the smooth target covers moves under it.
 *
 * Each graph has its own test file, so each loads into a page of its own: in one page the second
 * graph met the first's heap, about 2.4 GB still held after the first element was removed, and the
 * page died. `timeline-frame.bench.test.ts` runs 100,000 nodes and
 * `timeline-frame-few-nodes.bench.test.ts` 10,000.
 *
 * Numbers go to the console as `[timeline-frame]` lines; nothing about speed is asserted, only that
 * the drawn edges agree with the masks after the last frame. Run it alone, on the real GPU (the
 * software renderer's numbers mean nothing here), with the extracted libEGL tree when the machine
 * has no system one:
 *
 * GRAPHTY_BROWSER_GPU=nvidia GRAPHTY_EGL_LIB_DIR=<tree> npx vitest run --project=browser-bench
 * test/browser/timeline-frame
 */
import "../../src/graphty-element";

import { SceneInstrumentation } from "@babylonjs/core";
import { mulberry32 } from "@graphty/algorithms";
import { afterAll, assert, beforeAll, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import type { TimeStepEvent } from "../../session.js";
import { setDefaultFeatures } from "../../src/features/resolve";

const EDGES = 1_000_000;
const DAY = 86_400_000;
const START = Date.UTC(2020, 0, 1);
const SPAN = 5 * 365 * DAY;
/** The window: 2% of the span. */
const WIDTH = SPAN / 50;
const OPENING = START + SPAN / 2;
const WARM_FRAMES = 3;
const TIMED_FRAMES = 15;

/** What one frame spent, in milliseconds unless named otherwise. */
interface Frame {
    move: number;
    paint: number;
    sync: number;
    edgeWalk: number;
    update: number;
    activeMeshes: number;
    render: number;
    gpu: number;
    total: number;
    uploadBytes: number;
    uploadCalls: number;
    rows: number;
}

/** One mounted graph and what reads its frames. */
interface Mounted {
    readonly element: Graphty;
    readonly instrumentation: SceneInstrumentation;
    readonly gl: WebGL2RenderingContext;
}

/** What the wrapped functions add up during a frame. */
const tally = { sync: 0, edgeWalk: 0, uploadBytes: 0, uploadCalls: 0 };

/**
 * Add the time a method spends to a tally field, on this one object.
 * @param target - The object whose method is timed.
 * @param name - The method.
 * @param field - Where its time is added.
 */
function timeMethod(target: object, name: string, field: "sync" | "edgeWalk"): void {
    const host = target as Record<string, unknown>;
    const original = host[name] as (...args: unknown[]) => unknown;
    assert.isFunction(original, `${name} exists to time`);
    host[name] = function timed(this: unknown, ...args: unknown[]): unknown {
        const start = performance.now();
        try {
            return original.apply(this, args);
        } finally {
            tally[field] += performance.now() - start;
        }
    };
}

/**
 * Count the bytes and calls of every buffer upload the context makes.
 * @param gl - The context.
 */
function countUploads(gl: WebGL2RenderingContext): void {
    const subData = gl.bufferSubData.bind(gl) as (...args: unknown[]) => void;
    const data = gl.bufferData.bind(gl) as (...args: unknown[]) => void;
    const bytesOf = (source: unknown, offset = 0, length?: number): number => {
        if (!ArrayBuffer.isView(source)) {
            return typeof source === "number" ? source : 0;
        }

        const per = "BYTES_PER_ELEMENT" in source ? (source.BYTES_PER_ELEMENT as number) : 1;
        return length !== undefined && length > 0 ? length * per : source.byteLength - offset * per;
    };
    (gl as unknown as Record<string, unknown>).bufferSubData = (...args: unknown[]): void => {
        tally.uploadCalls++;
        tally.uploadBytes += bytesOf(args[2], args[3] as number | undefined, args[4] as number | undefined);
        subData(...args);
    };
    (gl as unknown as Record<string, unknown>).bufferData = (...args: unknown[]): void => {
        tally.uploadCalls++;
        tally.uploadBytes += bytesOf(args[1], args[3] as number | undefined, args[4] as number | undefined);
        data(...args);
    };
}

/**
 * The value at a fraction of the sorted list.
 * @param values - The values.
 * @param at - 0.5 for the median, 1 for the largest.
 * @returns The value.
 */
function quantile(values: readonly number[], at: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor(at * sorted.length))];
}

/**
 * Print one case's frames.
 * @param nodes - The graph's node count.
 * @param name - The case.
 * @param frames - Its timed frames.
 */
function report(nodes: number, name: string, frames: readonly Frame[]): void {
    const keys: (keyof Frame)[] = [
        "total",
        "move",
        "paint",
        "sync",
        "edgeWalk",
        "update",
        "activeMeshes",
        "render",
        "gpu",
        "uploadBytes",
        "uploadCalls",
        "rows",
    ];
    const cells = keys.map((key) => {
        const all = frames.map((frame) => frame[key]);
        const digits = key.startsWith("upload") || key === "rows" ? 0 : 1;
        return `${key}=${quantile(all, 0.5).toFixed(digits)}/${quantile(all, 1).toFixed(digits)}`;
    });
    const cap = Math.floor((nodes + EDGES) / 8);
    console.log(
        `[timeline-frame] nodes=${String(nodes)} case=${name} cap=${String(cap)} median/worst ${cells.join(" ")}`,
    );
}

/**
 * The rows a move changed.
 * @param step - What the move reported.
 * @returns Nodes and edges that entered or left.
 */
function rowsOf(step: TimeStepEvent | undefined): number {
    return step === undefined ? 0 : step.entered.nodes + step.entered.edges + step.left.nodes + step.left.edges;
}

/**
 * The five cases on one graph of 1,000,000 edges.
 * @param nodes - How many nodes the edges join.
 */
export function describeFrames(nodes: number): void {
    describe(`a 2% window over ${String(EDGES)} edges on ${String(nodes)} nodes`, () => {
        let mounted: Mounted | null = null;

        /**
         * What the case runs on.
         * @returns The element and what reads it.
         */
        function on(): Mounted {
            if (mounted === null) {
                throw new Error("no graph is mounted");
            }

            return mounted;
        }

        beforeAll(async () => {
            (globalThis as { __GRAPHTY_STRICT_STATE__?: boolean }).__GRAPHTY_STRICT_STATE__ = false;
            setDefaultFeatures(["timeline"]);
            const created = document.createElement("graphty-element");
            created.style.width = "1280px";
            created.style.height = "720px";
            created.style.display = "block";
            document.body.appendChild(created);
            await created.updateComplete;
            await vi.waitFor(() => {
                assert.isTrue(created.graph.initialized, "the element initialised its graph");
            });
            // The style rows a new project starts with, among them the Ghost row a Ghost move repaints by.
            await created.session.config.set({ startingRows: true });
            await created.graph.setLayout("random");
            const next = mulberry32(nodes);
            await created.graph.addNodes(Array.from({ length: nodes }, (_, at) => ({ id: `n${String(at)}` })));
            await created.graph.addEdges(
                Array.from({ length: EDGES }, () => ({
                    source: `n${String(Math.floor(next() * nodes))}`,
                    target: `n${String(Math.floor(next() * nodes))}`,
                    t: START + Math.floor(next() * SPAN),
                })),
            );
            await created.waitForSettled();
            await created.session.time.setField({ edges: { start: "t" } });
            await created.session.time.ready;
            await created.waitForSettled();
            await created.waitForStableFrame();
            created.graph.engine.stopRenderLoop();

            const engine = created.graph.engine as unknown as {
                _gl: WebGL2RenderingContext;
                getGlInfo(): { renderer: string };
            };
            const { _gl: gl } = engine;
            console.log(`[timeline-frame] renderer="${engine.getGlInfo().renderer}"`);
            countUploads(gl);
            const updates = created.getUpdateManager();
            timeMethod(updates, "syncViewMasks", "sync");
            timeMethod(updates, "updateEdges", "edgeWalk");
            const instrumentation = new SceneInstrumentation(created.graph.scene);
            instrumentation.captureActiveMeshesEvaluationTime = true;
            mounted = { element: created, instrumentation, gl };
        });

        afterAll(async () => {
            on().instrumentation.dispose();
            on().element.remove();
            mounted = null;
            const { gc } = globalThis as { gc?: (options: { type: "major"; execution: "async" }) => Promise<void> };
            await gc?.({ type: "major", execution: "async" });
        });

        /**
         * Make a move, then pump one frame and read back a pixel.
         * @param move - The move, or nothing for a still frame.
         * @returns What the frame cost.
         */
        async function frame(move?: () => Promise<TimeStepEvent | undefined>): Promise<Frame> {
            tally.sync = 0;
            tally.edgeWalk = 0;
            tally.uploadBytes = 0;
            tally.uploadCalls = 0;
            const begun = performance.now();
            const step = await move?.();
            const moved = performance.now();
            await on().element.session.styles.settled();
            const painted = performance.now();
            on().element.graph.update();
            const updated = performance.now();
            on().element.graph.scene.render();
            const rendered = performance.now();
            const { gl } = on();
            gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
            const finished = performance.now();
            return {
                move: moved - begun,
                sync: tally.sync,
                edgeWalk: tally.edgeWalk,
                paint: painted - moved,
                update: updated - painted,
                activeMeshes: on().instrumentation.activeMeshesEvaluationTimeCounter.current,
                render: rendered - updated,
                gpu: finished - rendered,
                total: finished - begun,
                uploadBytes: tally.uploadBytes,
                uploadCalls: tally.uploadCalls,
                rows: rowsOf(step),
            };
        }

        /**
         * Run a case's frames and print them.
         * @param name - The case.
         * @param move - Each frame's move, handed the frame's number.
         */
        async function run(name: string, move?: (at: number) => Promise<TimeStepEvent | undefined>): Promise<void> {
            for (let at = 0; at < WARM_FRAMES; at++) {
                await frame(move && (() => move(at)));
            }

            const frames: Frame[] = [];
            for (let at = WARM_FRAMES; at < WARM_FRAMES + TIMED_FRAMES; at++) {
                frames.push(await frame(move && (() => move(at))));
            }

            report(nodes, name, frames);
        }

        const time = (): Graphty["session"]["time"] => on().element.session.time;
        const slide = (at: number): Promise<TimeStepEvent | undefined> =>
            time().seek(OPENING + at * DAY, { commit: false });

        it("all visible", async () => {
            await run("all");
        });

        it("a 2% window standing still", async () => {
            await time().window({ from: OPENING, to: OPENING + WIDTH, step: DAY });
            await run("still");
        });

        it("a 2% window stepping", async () => {
            await run("step", slide);
        });

        it("a 2% window jumping", async () => {
            const place = mulberry32(7);
            await run("jump", () => time().seek(START + Math.floor(place() * (SPAN - WIDTH)), { commit: false }));
        });

        it("a 2% window stepping under Outside: Ghost", async () => {
            await time().setSettings({ outside: "ghost" });
            await run("ghost", slide);
            await time().setSettings({ outside: "hide" });
            await run("step-after-ghost", slide);

            let drawn = 0;
            for (const edge of on().element.graph.getDataManager().edges.values()) {
                drawn += edge.isRenderVisible() ? 1 : 0;
            }

            assert.strictEqual(
                drawn,
                on().element.session.visibility.summary.visibleEdges,
                "drawn edges agree with the masks",
            );
        });
    });
}
