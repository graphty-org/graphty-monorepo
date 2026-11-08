/**
 * @file What a frame costs while a narrow time window moves over 1,000,000 edges, split by where the
 * time goes: the window move itself, `UpdateManager.syncViewMasks`, the edge walk, Babylon's
 * active-mesh evaluation, the rest of the draw call, buffer uploads (bytes and calls) and the GPU,
 * bounded by a one-pixel read back that waits for the frame to finish.
 *
 * Two graphs of 1,000,000 edges with uniform instants over five years: on 100,000 nodes, and on
 * 10,000 nodes, because a frame of 100,000 node instances costs about a second on its own
 * (`session/limits.ts`) and that cost may not be edges at all. For each, these cases:
 *
 * - `all`: no window, nothing moves.
 * - `still`: a window 2% of the span wide, standing still.
 * - `step`: that window sliding a day a frame, as smooth play does (`seek` with `commit: false`).
 * - `jump`: that window jumping to a seeded place each frame, as a brush drag or a scrub does.
 * - `ghost`: the sliding window under `outside: "ghost"`.
 * - `step-edges-only`: the step with `nodes: "all"`, so only edges are shown and hidden.
 *
 * The render loop is stopped and each frame is pumped by hand -- the move, `styles.settled()` (the
 * repaint a Ghost move starts), `graph.update()`, `scene.render()`, then the read back -- so a frame
 * does all the work its move started, with no frame budget splitting it. A pumped frame never rests,
 * so the still cases time a frame the render loop would skip. Each line prints the median and the slowest of the timed frames, after untimed ones,
 * and the rows a move changed beside the changed-row cap, (nodes + edges) / 8: a move past the cap
 * goes back to a walk of every object, so the smooth target covers moves under it. A line whose
 * move stayed under the cap but still uploaded a whole buffer ends with `UNDER-CAP-FULL-UPLOAD`.
 *
 * Known costs over a 16 ms frame, tracked as issues: a jump under the cap spends tens of
 * milliseconds per 10,000 changed rows showing and hiding edges, and its scattered rows still send
 * about two thirds of each buffer in 4,096 runs (#6025); a Ghost step costs about twice a Hide step,
 * because every edge that crosses the window is restyled into another batch (#6026); a move that
 * shows or hides nodes re-evaluates every active mesh, about 50 ms on 100,000 nodes against 17 ms on
 * 10,000, because each node is a mesh instance of its own (#6027). The `step-edges-only` case draws
 * every node, so its moves show and hide only edges and evaluate nothing.
 *
 * Numbers go to the console as `[timeline-frame]` lines; nothing about speed is asserted. What is
 * asserted, at the end of the jumps, of a Hide slide and of a Ghost slide: every edge, one by one, is drawn or not
 * (and ghosted or not) as a brute-force test of its `t` against the window says, and the slots read
 * back from the GPU buffers draw nothing (empty, or flagged hidden) exactly for the edges that are not drawn. The suites run only
 * when `GRAPHTY_BROWSER_GPU` is set: on the software renderer the numbers mean nothing and one frame
 * of 100,000 nodes takes about a second. Run it with the extracted libEGL tree when the machine has
 * no system one:
 *
 * GRAPHTY_BROWSER_GPU=nvidia GRAPHTY_EGL_LIB_DIR=<tree> npx vitest run --project=browser-bench
 * test/browser/timeline-frame.bench.test.ts
 */
import "../../src/graphty-element";

import { SceneInstrumentation } from "@babylonjs/core";
import { mulberry32 } from "@graphty/algorithms";
import { afterAll, assert, beforeAll, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import type { TimeStepEvent } from "../../session.js";
import { setDefaultFeatures } from "../../src/features/resolve";
import { DirtyRuns } from "../../src/meshes/DirtyRuns";
import type { EdgeLineBatch } from "../../src/meshes/EdgeLineBatch";
import type { SessionVisibilityApi } from "../../src/session/visibility/VisibilityApi";

/** Whether the run asked for the real GPU; the suites are skipped without it. */
const GPU = ((import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "") !== "";

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
    /** Buffers uploaded whole rather than in runs. */
    fullUploads: number;
    rows: number;
}

/** One mounted graph and what reads its frames. */
interface Mounted {
    readonly element: Graphty;
    readonly instrumentation: SceneInstrumentation;
    readonly gl: WebGL2RenderingContext;
}

/** What the wrapped functions add up during a frame. */
const tally = { sync: 0, edgeWalk: 0, uploadBytes: 0, uploadCalls: 0, fullUploads: 0 };

/**
 * Count the buffers uploaded whole: an upload asks its dirty slots for runs only when something was
 * written, so a null answer means the whole buffer goes.
 */
function countFullUploads(): void {
    const { take } = DirtyRuns.prototype;
    DirtyRuns.prototype.take = function counted(this: DirtyRuns, ranged: boolean): readonly number[] | null {
        const runs = take.call(this, ranged);
        tally.fullUploads += runs === null ? 1 : 0;
        return runs;
    };
}

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
        "fullUploads",
        "rows",
    ];
    const cells = keys.map((key) => {
        const all = frames.map((frame) => frame[key]);
        const digits = key.startsWith("upload") || key === "fullUploads" || key === "rows" ? 0 : 1;
        return `${key}=${quantile(all, 0.5).toFixed(digits)}/${quantile(all, 1).toFixed(digits)}`;
    });
    const cap = Math.floor((nodes + EDGES) / 8);
    const fellBack = frames.some((frame) => frame.rows > 0 && frame.rows < cap && frame.fullUploads > 0);
    console.log(
        `[timeline-frame] nodes=${String(nodes)} case=${name} cap=${String(cap)} median/worst ${cells.join(" ")}${
            fellBack ? " UNDER-CAP-FULL-UPLOAD" : ""
        }`,
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

/** The private fields of an edge and a batch the GPU read back needs. */
interface EdgeSlots {
    lineBatch: EdgeLineBatch | null;
    lineSlots: number[];
}
interface GpuBuffer {
    getBuffer(): { underlyingResource: unknown } | null;
}
interface BatchStore {
    buffer: GpuBuffer | null;
    hiddenBuffer: GpuBuffer | null;
    stride: number;
    highWater: number;
}

/** A batch's slots and hidden flags read back from the GPU. */
interface ReadBack {
    floats: Float32Array;
    hidden: Float32Array;
    stride: number;
}

/**
 * Read one GPU buffer's first floats.
 * @param gl - The context.
 * @param buffer - The buffer.
 * @param count - How many floats.
 * @returns The floats.
 */
function readFloats(gl: WebGL2RenderingContext, buffer: GpuBuffer | null, count: number): Float32Array {
    const resource = buffer?.getBuffer()?.underlyingResource;
    assert.instanceOf(resource, WebGLBuffer, "the batch has a GPU buffer");
    const floats = new Float32Array(count);
    gl.bindBuffer(gl.ARRAY_BUFFER, resource);
    gl.getBufferSubData(gl.ARRAY_BUFFER, 0, floats);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return floats;
}

/**
 * Read a batch's slots and hidden flags back from the GPU, as the draw call reads them.
 * @param gl - The context.
 * @param batch - The batch.
 * @returns The slots, stride floats each, and a hidden flag per slot.
 */
function readBack(gl: WebGL2RenderingContext, batch: EdgeLineBatch): ReadBack {
    const store = batch as unknown as BatchStore;
    return {
        floats: readFloats(gl, store.buffer, store.highWater * store.stride),
        hidden: readFloats(gl, store.hiddenBuffer, store.highWater),
        stride: store.stride,
    };
}

/**
 * Whether a slot read back draws a line: one that holds a placement and is not flagged hidden.
 * @param read - The batch read back.
 * @param slot - The slot.
 * @returns True when the GPU would draw it.
 */
function slotDrawn(read: ReadBack, slot: number): boolean {
    const from = slot * read.stride;
    return read.hidden[slot] === 0 && read.floats.subarray(from, from + read.stride).some((value) => value !== 0);
}

/**
 * Check every edge against a brute-force test of its `t` against the window: drawn (by the edge's
 * state and by its slots read back from the GPU) and ghosted exactly as the window says.
 * @param element - The element.
 * @param gl - Its context.
 * @param window - The window the last move reported.
 * @param ghosting - Whether `outside` is `"ghost"`: every edge drawn, the outside ones ghosted.
 */
function assertEdgesMatchWindow(
    element: Graphty,
    gl: WebGL2RenderingContext,
    window: TimeStepEvent,
    ghosting: boolean,
): void {
    const { visibility } = element.session;
    // The element's session is the full one; its public type leaves out the ghost read.
    const ghosts = (visibility as SessionVisibilityApi).ghosts()?.edge ?? null;
    assert.strictEqual(ghosts !== null, ghosting, "ghosts exist exactly while ghosting");
    const reads = new Map<EdgeLineBatch, ReadBack>();
    const wrong: string[] = [];
    let inside = 0;
    let checkedSlots = 0;
    for (const edge of element.graph.getDataManager().edges.values()) {
        const t = edge.data.t as number;
        const isInside = t >= window.from && t < window.to;
        inside += isInside ? 1 : 0;
        const drawn = ghosting || isInside;
        const problems: string[] = [];
        if (edge.isRenderVisible() !== drawn) {
            problems.push(`isRenderVisible=${String(!drawn)}`);
        }

        if (ghosts !== null && (ghosts[edge.index] === 1) === isInside) {
            problems.push(`ghosted=${String(isInside)}`);
        }

        const { lineBatch, lineSlots } = edge as unknown as EdgeSlots;
        if (lineBatch !== null) {
            let read = reads.get(lineBatch);
            if (read === undefined) {
                read = readBack(gl, lineBatch);
                reads.set(lineBatch, read);
            }

            for (const slot of lineSlots) {
                checkedSlots++;
                if (slotDrawn(read, slot) !== drawn) {
                    problems.push(`gpuSlot${String(slot)}=${String(!drawn)}`);
                }
            }
        }

        if (problems.length > 0) {
            wrong.push(`${edge.id} t=${String(t)} ${problems.join(",")}`);
        }
    }

    // The read back bound buffers behind Babylon's back; let it rebind from scratch.
    element.graph.engine.wipeCaches(true);
    assert.isAbove(checkedSlots, 0, "edges were read back from the GPU");
    assert.deepEqual(wrong.slice(0, 10), [], `${String(wrong.length)} edges disagree with the window`);
    assert.strictEqual(visibility.summary.visibleEdges, inside, "the visible count is the brute-force count");
}

/**
 * The cases on one graph of 1,000,000 edges.
 * @param nodes - How many nodes the edges join.
 */
export function describeFrames(nodes: number): void {
    describe.skipIf(!GPU)(`a 2% window over ${String(EDGES)} edges on ${String(nodes)} nodes`, () => {
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
            countFullUploads();
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
            tally.fullUploads = 0;
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
                fullUploads: tally.fullUploads,
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

        /**
         * Make one more move, pump the frame, and check every edge against the window.
         * @param move - The move.
         * @param ghosting - Whether `outside` is `"ghost"`.
         */
        async function check(move: () => Promise<TimeStepEvent | undefined>, ghosting: boolean): Promise<void> {
            const step = await move();
            assert.isDefined(step, "the move reported its window");
            await frame();
            assertEdgesMatchWindow(on().element, on().gl, step, ghosting);
        }

        it("a 2% window jumping", async () => {
            const place = mulberry32(7);
            const jump = (): Promise<TimeStepEvent | undefined> =>
                time().seek(START + Math.floor(place() * (SPAN - WIDTH)), { commit: false });
            await run("jump", jump);
            await check(jump, false);
        });

        const slideOnce = (): Promise<TimeStepEvent | undefined> => slide(WARM_FRAMES + TIMED_FRAMES);

        it("a 2% window stepping under Outside: Ghost", async () => {
            await time().setSettings({ outside: "ghost" });
            await run("ghost", slide);
            await check(slideOnce, true);
            await time().setSettings({ outside: "hide" });
            await run("step-after-ghost", slide);
            await check(slideOnce, false);
        });

        it("a 2% window stepping with every node drawn", async () => {
            // Nodes follow their edges by default; with every node drawn a step shows and hides
            // only edges, which write batch slots and leave the frozen list of what is drawn alone.
            await time().window({ from: OPENING, to: OPENING + WIDTH, step: DAY, nodes: "all" });
            await run("step-edges-only", slide);
            await check(slideOnce, false);
        });
    });
}
