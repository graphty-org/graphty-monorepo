/**
 * @file Every drawn frame read inside the frame, on WebGL and WebGPU alike, and checked against where the element
 * says each node is in that same frame.
 *
 * A frame read in a later task is not the frame that was drawn: a WebGPU canvas hands out a fresh, empty texture
 * once the frame is presented, and `engine.readPixels` reads it in the texture's own orientation, top row first,
 * where WebGL reads bottom row first. Read that way, every edge of every WebGPU picture was reported undrawn on
 * both render paths, so no WebGPU picture was checked at all; a WebGL drawing buffer read later held another
 * pass's drawing (a row of edges gray where the frame drew them magenta). Here a WebGL frame is copied into a 2D
 * canvas in the frame's own task, and a WebGPU frame is copied off the device as it is drawn, both handed over in
 * one orientation, top row first.
 *
 * {@link frameFaults} is the per-frame invariant: each node's ink is at the point `nodeScreenPosition` names for
 * that frame, each edge's ink lies on the segment between its two nodes as drawn, and no node or edge ink lies
 * anywhere else. Colors are told by hue: nodes `#2040ff`, edges `#ff00ff`, as `drawn-invariants.ts` uses.
 */

import { assert, vi } from "vitest";

import type { Graph } from "../../src/Graph";
import { drawnFrames } from "./drawn-frames";

/** One frame copied off the canvas in the task that drew it. */
export interface DrawnFrame {
    /** RGBA, four bytes a pixel, top row first. */
    readonly pixels: Uint8ClampedArray;
    /** Width in canvas pixels. */
    readonly width: number;
    /** Height in canvas pixels. */
    readonly height: number;
    /** Canvas pixels per CSS pixel. */
    readonly scale: number;
}

/** Where a node was in the frame, in CSS pixels, as `nodeScreenPosition` said in that frame's task. */
export interface FrameCenter {
    readonly x: number;
    readonly y: number;
    readonly radius: number;
    readonly visible: boolean;
}

/**
 * Copies the canvas as it stands now. Call it in the task that drew the frame.
 * @param graph - The graph.
 * @returns The frame.
 */
export function captureCanvas(graph: Graph): DrawnFrame {
    const canvas = graph.engine.getRenderingCanvas();
    if (canvas === null) {
        throw new Error("the graph has no canvas to read");
    }

    const copy = document.createElement("canvas");
    copy.width = canvas.width;
    copy.height = canvas.height;
    const context = copy.getContext("2d", { willReadFrequently: true });
    if (context === null) {
        throw new Error("no 2D context to copy the frame into");
    }

    context.drawImage(canvas, 0, 0);
    const { data } = context.getImageData(0, 0, copy.width, copy.height);
    const css = canvas.clientWidth === 0 ? canvas.width : canvas.clientWidth;
    return { pixels: data, width: copy.width, height: copy.height, scale: canvas.width / css };
}

/**
 * Starts reading the WebGPU frame being drawn: the copy is recorded in the frame, so it holds this frame whenever
 * the readback lands. A WebGPU canvas copied with `drawImage` reads blank on the full Chromium build the gpu-loss
 * project runs, and so does a page screenshot. The rows come back padded to 256 bytes and, for a `bgra8unorm` canvas,
 * blue first: both are undone here.
 * @param graph - The graph.
 * @returns The frame, once read back.
 */
function readWebGpuFrame(graph: Graph): Promise<DrawnFrame> {
    const { engine } = graph;
    const width = engine.getRenderWidth();
    const height = engine.getRenderHeight();
    const canvas = engine.getRenderingCanvas();
    const css = canvas === null || canvas.clientWidth === 0 ? width : canvas.clientWidth;
    const bgra = navigator.gpu.getPreferredCanvasFormat() === "bgra8unorm";
    return engine.readPixels(0, 0, width, height).then((view) => {
        const raw = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
        const stride = height === 0 ? 0 : raw.length / height;
        const pixels = new Uint8ClampedArray(width * height * 4);
        for (let y = 0; y < height; y++) {
            pixels.set(raw.subarray(y * stride, y * stride + width * 4), y * width * 4);
        }

        if (bgra) {
            for (let i = 0; i < pixels.length; i += 4) {
                const blue = pixels[i];
                pixels[i] = pixels[i + 2];
                pixels[i + 2] = blue;
            }
        }

        return { pixels, width, height, scale: width / css };
    });
}

/**
 * Calls `onFrame` with every frame the scene draws from now on, read in that frame's task, until it returns
 * false or `stop` is called. A tick the element skips (it draws nothing) is not a frame. Adding the observer
 * asks a graph that draws on demand for one frame, as any frame wait does. WebGL frames are copied off the
 * canvas once the frame ends; WebGPU frames are copied off the device as the scene finishes drawing, and handed
 * over, in order, when the copy lands.
 * @param graph - The graph.
 * @param onFrame - Told each frame, its index and what `inFrame` returned in that frame; returns whether to go on.
 * @param inFrame - Run in the frame's own task, for what must be read beside the picture (`centersNow`).
 * @returns `done` resolves once `onFrame` returned false and rejects with anything it threw; `stop` ends it early.
 */
export function recordDrawnFrames<T = undefined>(
    graph: Graph,
    onFrame: (frame: DrawnFrame, index: number, read: T) => boolean,
    inFrame: () => T = () => undefined as T,
): { done: Promise<void>; stop: () => void } {
    const { scene, engine } = graph;
    let drew = false;
    let index = 0;
    let stopped = false;
    let finish: (error?: unknown) => void = () => undefined;
    const done = new Promise<void>((resolve, reject) => {
        finish = (error?: unknown): void => {
            if (error === undefined) {
                resolve();
            } else {
                reject(error instanceof Error ? error : new Error(JSON.stringify(error)));
            }
        };
    });
    const hand = (frame: DrawnFrame, read: T): void => {
        if (stopped) {
            return;
        }

        try {
            if (!onFrame(frame, index++, read)) {
                stop();
                finish();
            }
        } catch (error) {
            stop();
            finish(error);
        }
    };
    // The frames read off the device land in order: each waits for the one before it.
    let landed: Promise<void> = Promise.resolve();
    const drawn = scene.onAfterRenderObservable.add(() => {
        if (!engine.isWebGPU) {
            drew = true;
            return;
        }

        const read = inFrame();
        const frame = readWebGpuFrame(graph);
        // A read still in flight when the recorder stops, or queued behind one that failed, is never awaited by the
        // chain below: a device lost meanwhile rejects it with nobody listening. The chain still sees each failure
        // it reaches.
        void frame.catch(() => undefined);
        landed = landed.then(
            async () => {
                hand(await frame, read);
            },
            () => undefined,
        );
        void landed.catch((error: unknown) => {
            stop();
            finish(error);
        });
    });
    const ended = engine.onEndFrameObservable.add(() => {
        if (!drew) {
            return;
        }

        drew = false;
        hand(captureCanvas(graph), inFrame());
    });
    const stop = (): void => {
        stopped = true;
        scene.onAfterRenderObservable.remove(drawn);
        engine.onEndFrameObservable.remove(ended);
    };
    return { done, stop };
}

/**
 * The next frame the scene draws, read in its own task.
 * @param graph - The graph.
 * @returns The frame.
 */
export async function captureNextFrame(graph: Graph): Promise<DrawnFrame> {
    let captured: DrawnFrame | undefined;
    const { done } = recordDrawnFrames(graph, (frame) => {
        captured = frame;
        return false;
    });
    await done;
    if (captured === undefined) {
        throw new Error("no frame was captured");
    }

    return captured;
}

/**
 * Every node's center as the element reports it now: call it in the frame's task, beside {@link captureCanvas}.
 * @param graph - The graph.
 * @param ids - The nodes.
 * @returns Each node's center, or undefined where the element places it nowhere.
 */
export function centersNow(graph: Graph, ids: readonly string[]): Map<string, FrameCenter | undefined> {
    return new Map(
        ids.map((id) => {
            const at = graph.nodeScreenPosition(id);
            return [id, at === undefined ? undefined : { x: at.x, y: at.y, radius: at.radius, visible: at.visible }];
        }),
    );
}

/**
 * Whether a pixel is the edges' magenta (#ff00ff), or magenta blended into its neighbors.
 * @param d - The pixels.
 * @param i - The byte offset.
 * @returns True when red and blue both lead green by about as much.
 */
export function isMagenta(d: Uint8ClampedArray, i: number): boolean {
    // By hue, not by how strong: a thin antialiased line on a light background is pale pink, red and blue alike
    // and both above green.
    return d[i] > d[i + 1] + 15 && d[i + 2] > d[i + 1] + 15 && Math.abs(d[i] - d[i + 2]) < 50;
}

/**
 * Whether a pixel is the nodes' blue (#2040ff), lit or blended.
 * @param d - The pixels.
 * @param i - The byte offset.
 * @returns True when blue leads red and green.
 */
export function isBlue(d: Uint8ClampedArray, i: number): boolean {
    return d[i + 2] > d[i] + 60 && d[i + 2] > d[i + 1] + 60;
}

/**
 * How many pixels differ from the corner pixel, the background: zero for a blank frame.
 * @param frame - The frame.
 * @returns The count.
 */
export function inkedPixels(frame: DrawnFrame): number {
    const d = frame.pixels;
    let inked = 0;
    for (let i = 0; i < d.length; i += 4) {
        if (Math.abs(d[i] - d[0]) + Math.abs(d[i + 1] - d[1]) + Math.abs(d[i + 2] - d[2]) > 60) {
            inked++;
        }
    }

    return inked;
}

/**
 * How many pixels of a PNG differ from its corner pixel: a page screenshot's ink, for a check that compares two.
 * @param base64 - The PNG, base64.
 * @returns The count.
 */
export async function pngInk(base64: string): Promise<number> {
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob());
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (context === null) {
        throw new Error("no 2D context to read the picture");
    }

    context.drawImage(bitmap, 0, 0);
    const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height);
    return inkedPixels({ pixels: data, width: bitmap.width, height: bitmap.height, scale: 1 });
}

/** How far from an expected point ink may be, in CSS pixels. */
const REACH = 2;

/** How far past a node's radius, or an edge's line, its ink may reach, in CSS pixels: antialiasing and arrowheads. */
const SLACK = 3;

/** The side of a cell of the grid ink is looked up in, in CSS pixels. */
const CELL = 24;

/** What one frame shows that it should not. */
export interface FrameFaults {
    /** Nodes the element says are visible with no node ink at their center. */
    readonly nodesOff: string[];
    /** Edges with no edge ink at the middle of the segment between their nodes, where no node covers it. */
    readonly edgesOff: string[];
    /** Node or edge ink away from every node and edge where the element says they are: up to five CSS points. */
    readonly stray: string[];
    /** Node ink pixels counted, so a blank frame cannot pass. */
    readonly nodeInk: number;
}

/** Options for {@link frameFaults}. */
export interface FaultOptions {
    /** Nodes whose own color is not the fixture blue (hovered, restyled): their center must show ink, any ink. */
    readonly ownColor?: readonly string[];
}

/**
 * Checks one frame against where the element said each node was in that frame.
 * @param frame - The frame, from {@link captureCanvas}.
 * @param centers - From {@link centersNow}, read in the same task.
 * @param pairs - Every edge, as source and target ids.
 * @param options - See {@link FaultOptions}.
 * @returns What is wrong; every list empty for a good frame.
 */
export function frameFaults(
    frame: DrawnFrame,
    centers: ReadonlyMap<string, FrameCenter | undefined>,
    pairs: readonly (readonly [string, string])[],
    options: FaultOptions = {},
): FrameFaults {
    const d = frame.pixels;
    const s = frame.scale;
    const offset = (x: number, y: number): number => {
        const px = Math.round(x * s);
        const py = Math.round(y * s);
        return px < 0 || py < 0 || px >= frame.width || py >= frame.height ? -1 : (py * frame.width + px) * 4;
    };
    const near = (x: number, y: number, test: (i: number) => boolean): boolean => {
        for (let dy = -REACH; dy <= REACH; dy++) {
            for (let dx = -REACH; dx <= REACH; dx++) {
                const i = offset(x + dx, y + dy);
                if (i >= 0 && test(i)) {
                    return true;
                }
            }
        }

        return false;
    };
    const bg = [d[0], d[1], d[2]];
    const anyInk = (i: number): boolean =>
        Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) > 60;
    const own = new Set(options.ownColor ?? []);
    const placed = [...centers.entries()].filter((e): e is [string, FrameCenter] => e[1] !== undefined);
    const shown = placed.filter(([, c]) => c.visible);

    const nodesOff = shown
        .filter(([id, c]) => !near(c.x, c.y, own.has(id) ? anyInk : (i) => isBlue(d, i) || isMagenta(d, i)))
        .map(([id]) => id);
    // A center may show edge ink: an edge drawn over a node it passes. The stray check below still needs node ink
    // there, so a node drawn elsewhere fails one of the two.

    const covered = (x: number, y: number): boolean =>
        placed.some(([, c]) => Math.hypot(x - c.x, y - c.y) <= c.radius + SLACK + REACH);
    const segments: [FrameCenter, FrameCenter, string][] = [];
    const edgesOff: string[] = [];
    for (const [src, dst] of pairs) {
        const a = centers.get(src);
        const b = centers.get(dst);
        if (a === undefined || b === undefined) {
            continue;
        }

        segments.push([a, b, `${src}-${dst}`]);
        if (!a.visible || !b.visible) {
            continue;
        }

        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        if (!covered(mx, my) && !near(mx, my, (i) => isMagenta(d, i))) {
            edgesOff.push(`${src}-${dst}`);
        }
    }

    // Each node and segment, put in every grid cell its band reaches, so a pixel is checked against its neighbors.
    const grid = new Map<number, (() => (x: number, y: number) => boolean)[]>();
    const key = (cx: number, cy: number): number => cx * 100_000 + cy;
    const put = (x0: number, y0: number, x1: number, y1: number, test: (x: number, y: number) => boolean): void => {
        for (let cx = Math.floor(x0 / CELL); cx <= Math.floor(x1 / CELL); cx++) {
            for (let cy = Math.floor(y0 / CELL); cy <= Math.floor(y1 / CELL); cy++) {
                const k = key(cx, cy);
                const list = grid.get(k) ?? [];
                list.push(() => test);
                grid.set(k, list);
            }
        }
    };
    const maxRadius = Math.max(0, ...placed.map(([, c]) => c.radius));
    for (const [, c] of placed) {
        // A box's corners reach past its radius (its largest half-extent) by up to a factor of the square root of 2.
        const band = c.radius * Math.SQRT2 + SLACK;
        put(c.x - band, c.y - band, c.x + band, c.y + band, (x, y) => Math.hypot(x - c.x, y - c.y) <= band);
    }
    // An arrowhead's wing reaches about its target's radius from the line.
    const edgeBand = maxRadius + SLACK;
    for (const [a, b] of segments) {
        put(
            Math.min(a.x, b.x) - edgeBand,
            Math.min(a.y, b.y) - edgeBand,
            Math.max(a.x, b.x) + edgeBand,
            Math.max(a.y, b.y) + edgeBand,
            (x, y) => toSegment(x, y, a, b) <= edgeBand,
        );
    }

    const stray: string[] = [];
    let nodeInk = 0;
    for (let py = 0; py < frame.height && stray.length < 5; py++) {
        for (let px = 0; px < frame.width; px++) {
            const i = (py * frame.width + px) * 4;
            const blue = isBlue(d, i);
            if (blue) {
                nodeInk++;
            }

            if (!blue && !isMagenta(d, i)) {
                continue;
            }

            const x = px / s;
            const y = py / s;
            const here = grid.get(key(Math.floor(x / CELL), Math.floor(y / CELL))) ?? [];
            if (!here.some((test) => test()(x, y))) {
                stray.push(`${String(Math.round(x))},${String(Math.round(y))}`);
                if (stray.length >= 5) {
                    break;
                }
            }
        }
    }

    return { nodesOff, edgesOff, stray, nodeInk };
}

/**
 * The distance from a point to a segment.
 * @param x - The point's x.
 * @param y - The point's y.
 * @param a - The segment's start.
 * @param b - The segment's end.
 * @returns The distance.
 */
function toSegment(x: number, y: number, a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length2 = dx * dx + dy * dy;
    const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / length2));
    return Math.hypot(x - a.x - t * dx, y - a.y - t * dy);
}

/** `VITE_FRAME_DUMP=1` prints the first faulty frame (`all`: every frame) of each recording as a PNG data URL, with the centers. */
const DUMP_MODE = (import.meta.env as Record<string, string | undefined>).VITE_FRAME_DUMP ?? "";
const DUMP = DUMP_MODE !== "";

/**
 * A frame as a PNG data URL, for a failure to be looked at.
 * @param frame - The frame.
 * @returns The data URL.
 */
export function pictureUrl(frame: DrawnFrame): string {
    const canvas = document.createElement("canvas");
    canvas.width = frame.width;
    canvas.height = frame.height;
    canvas
        .getContext("2d")
        ?.putImageData(new ImageData(new Uint8ClampedArray(frame.pixels), frame.width, frame.height), 0, 0);
    return canvas.toDataURL("image/png");
}

/** One frame's faults, with the frame's index, for a failure message. */
export interface FrameReport extends FrameFaults {
    readonly index: number;
    /** The largest move of any node since the previous recorded frame, in CSS pixels. */
    readonly moved: number;
}

/**
 * Whether a report has any fault.
 * @param r - The report.
 * @returns True when something is wrong.
 */
export function faulty(r: FrameFaults): boolean {
    return r.nodesOff.length > 0 || r.edgesOff.length > 0 || r.stray.length > 0 || r.nodeInk === 0;
}

/**
 * Records drawn frames, checking each with {@link frameFaults}, until `want` frames in which some node moved
 * were checked, or `until` says to stop. Every recorded frame is checked, moving or not.
 * @param graph - The graph.
 * @param ids - Every node.
 * @param pairs - Every edge.
 * @param want - Moving frames to check.
 * @param options - `until` ends the recording early when it returns true, read each frame and between frames; `faults` the per-frame check options,
 *     read each frame; `max` caps the frames recorded (default 400), counted work and not time.
 * @returns Every frame's report.
 */
export async function checkDrawnFrames(
    graph: Graph,
    ids: readonly string[],
    pairs: readonly (readonly [string, string])[],
    want: number,
    options: { until?: () => boolean; faults?: () => FaultOptions; max?: number } = {},
): Promise<FrameReport[]> {
    const reports: FrameReport[] = [];
    let last: Map<string, FrameCenter | undefined> | undefined;
    let moving = 0;
    const max = options.max ?? 400;
    const { done, stop } = recordDrawnFrames(
        graph,
        (frame, index, centers) => {
            let moved = 0;
            if (last !== undefined) {
                for (const [id, c] of centers) {
                    const before = last.get(id);
                    if (c !== undefined && before !== undefined) {
                        moved = Math.max(moved, Math.hypot(c.x - before.x, c.y - before.y));
                    }
                }
            }

            last = centers;
            if (moved > 0.25) {
                moving++;
            }

            const report = { index, moved, ...frameFaults(frame, centers, pairs, options.faults?.()) };
            reports.push(report);
            if (DUMP && (DUMP_MODE === "all" || (faulty(report) && !reports.slice(0, -1).some(faulty)))) {
                console.log(
                    `[frame-dump] #${String(index)} ${pictureUrl(frame)} centers ${JSON.stringify([...centers])}`,
                );
            }

            return moving < want && reports.length < max && options.until?.() !== true;
        },
        () => centersNow(graph, ids),
    );
    const { until } = options;
    if (until === undefined) {
        await done;
        return reports;
    }

    // A graph that comes to rest draws no more frames on demand, so `until` is also watched between frames.
    const outcome: { finished: boolean; failure?: unknown } = { finished: false };
    done.then(
        () => {
            outcome.finished = true;
        },
        (error: unknown) => {
            outcome.finished = true;
            outcome.failure = error;
        },
    );
    await vi.waitFor(() => {
        assert.isTrue(outcome.finished || until(), "the frames were recorded, or the recording was ended");
    });
    stop();
    if (outcome.failure !== undefined) {
        throw outcome.failure instanceof Error ? outcome.failure : new Error(JSON.stringify(outcome.failure));
    }

    return reports;
}

/**
 * A one-line account of the recorded frames: how many, how many moved, and the first faulty one.
 * @param reports - The reports.
 * @returns The summary.
 */
export function describeFrames(reports: readonly FrameReport[]): string {
    const bad = reports.filter(faulty);
    const first = bad[0];
    return `${String(reports.length)} frames, ${String(reports.filter((r) => r.moved > 0.25).length)} moving, ${String(bad.length)} faulty${
        first === undefined
            ? ""
            : `; first faulty frame #${String(first.index)}: nodes off ${JSON.stringify(first.nodesOff.slice(0, 8))}, edges off ${JSON.stringify(first.edgesOff.slice(0, 8))}, stray ink at ${JSON.stringify(first.stray)}, node ink ${String(first.nodeInk)} px`
    }`;
}

/** Frames read after a layout stops. */
export const STILL_CHECKED = 10;

/**
 * Reads {@link STILL_CHECKED} frames of a graph at rest, or fewer when one shows a node moved. A graph at rest draws
 * on demand, so each frame is asked for, as any frame wait asks.
 * @param graph - The graph.
 * @param ids - Every node shown.
 * @param pairs - Every edge shown.
 * @returns The frames.
 */
export async function stillFrames(
    graph: Graph,
    ids: readonly string[],
    pairs: readonly (readonly [string, string])[],
): Promise<FrameReport[]> {
    let finished = false;
    const recording = checkDrawnFrames(graph, ids, pairs, 1, { max: STILL_CHECKED }).finally(() => {
        finished = true;
    });
    while (!finished) {
        await drawnFrames(graph.scene, 1);
    }

    return recording;
}
