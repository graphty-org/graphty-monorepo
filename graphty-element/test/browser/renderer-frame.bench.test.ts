/**
 * @file Frames drawn per second for a 10,000-node graph while the default force layout runs, on
 * WebGL and on WebGPU (issue #6689).
 *
 * The graph is the one `design/apps/webview-probe.html` draws: 10,000 nodes, each joined to an
 * earlier one and half of them to a second, seeded. For each renderer the element is mounted, the
 * data is set, and after the first frame 300 animation frames pass while the layout runs.
 *
 * The number to compare is `draws/s`: pictures the element drew (calls of `scene.render`) per
 * second of wall time. The animation-frame interval (`rafInterval`) is printed too but does not
 * compare the renderers: on WebGL the loop skips a tick while the last frame's fence is
 * unsignaled, and each skipped tick is a short interval that draws nothing, so WebGL's median
 * interval reads about 17 ms however slowly it draws. On WebGPU under the default render path the
 * loop draws every tick, so its interval is the whole frame. Issue #6689's 17 ms against 81 ms was
 * that difference, not a slower draw. Also printed: the layout steps taken, the median time of the
 * draw and of the update before it, and of the update's parts, all on the main thread.
 *
 * Numbers go to the console as `[renderer-frame]` lines; nothing about speed is asserted. What is
 * asserted: each renderer is the one asked for, and it drew frames. Runs only when
 * `GRAPHTY_BROWSER_GPU` is set, since on the software renderer the comparison means nothing:
 *
 * GRAPHTY_BROWSER_GPU=nvidia npx vitest run --project=browser-bench test/browser/renderer-frame.bench.test.ts
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";

const GPU = ((import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "") !== "";

const NODES = 10_000;
const FRAMES = 300;

/**
 * The probe's seeded generator, so the graph is the one the issue measured.
 * @param seed - The seed.
 * @returns A function giving the next number in [0, 1).
 */
function rng(seed: number): () => number {
    let state = seed;
    return () => (state = (state * 1664525 + 1013904223) >>> 0) / 2 ** 32;
}

/**
 * The value at a fraction of the sorted list.
 * @param values - The values.
 * @param at - 0.5 for the median.
 * @returns The value.
 */
function quantile(values: readonly number[], at: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted.length === 0 ? Number.NaN : sorted[Math.min(sorted.length - 1, Math.floor(at * sorted.length))];
}

/**
 * Time every call of a method into a list.
 * @param target - The object.
 * @param name - The method.
 * @param into - Where each call's milliseconds go.
 */
function timeCalls(target: object, name: string, into: number[]): void {
    const host = target as Record<string, unknown>;
    const original = host[name] as (...args: unknown[]) => unknown;
    assert.isFunction(original, `${name} exists to time`);
    host[name] = function timed(this: unknown, ...args: unknown[]): unknown {
        const start = performance.now();
        try {
            return original.apply(this, args);
        } finally {
            into.push(performance.now() - start);
        }
    };
}

let element: Graphty | null = null;

afterEach(() => {
    element?.remove();
    element = null;
});

describe.skipIf(!GPU)("a 10,000-node graph while the force layout runs", () => {
    for (const renderer of ["webgl", "webgpu"] as const) {
        it(`on ${renderer}`, async () => {
            const created = document.createElement("graphty-element");
            created.setAttribute("renderer", renderer);
            created.style.width = "1280px";
            created.style.height = "720px";
            created.style.display = "block";
            document.body.appendChild(created);
            element = created;
            created.layoutConfig = { seed: 1655 };
            const rand = rng(1655);
            const nodes = Array.from({ length: NODES }, (_, id) => ({ id }));
            const edges: { source: number; target: number }[] = [];
            for (let i = 1; i < NODES; i++) {
                edges.push({ source: i, target: Math.floor(rand() * i) });
                if (rand() < 0.5) {
                    edges.push({ source: i, target: Math.floor(rand() * NODES) });
                }
            }

            const start = performance.now();
            const firstFrame = new Promise((resolve) => {
                created.on("graph-first-frame", resolve);
            });
            created.nodeData = nodes;
            created.edgeData = edges;
            await firstFrame;
            const firstFrameMs = performance.now() - start;
            assert.strictEqual(created.rendererStatus?.active, renderer, created.rendererStatus?.reason ?? "");

            const renders: number[] = [];
            const updates: number[] = [];
            timeCalls(created.graph.scene, "render", renders);
            timeCalls(created.graph, "update", updates);
            const parts = ["updateLayout", "updateNodes", "updateEdges", "syncStyles", "syncViewMasks"];
            const partTimes = new Map(parts.map((name) => [name, [] as number[]]));
            for (const name of parts) {
                timeCalls(created.getUpdateManager(), name, partTimes.get(name) ?? []);
            }

            const steps = (): number =>
                (created.getUpdateManager() as unknown as { layoutStepCount: number }).layoutStepCount;
            const stepsBefore = steps();
            const began = performance.now();
            const intervals: number[] = [];
            await new Promise<void>((resolve) => {
                let last = performance.now();
                const tick = (now: number): void => {
                    intervals.push(now - last);
                    last = now;
                    if (intervals.length < FRAMES) {
                        requestAnimationFrame(tick);
                    } else {
                        resolve();
                    }
                };
                requestAnimationFrame(tick);
            });
            const wallMs = performance.now() - began;
            const layoutSteps = steps() - stepsBefore;
            const timed = intervals.slice(1);
            const heap = (performance as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0;
            const cells = [
                `renderer=${renderer}`,
                `firstFrame=${firstFrameMs.toFixed(0)}`,
                `draws/s=${((renders.length * 1000) / wallMs).toFixed(1)}`,
                `drawn=${String(renders.length)}/${String(timed.length)}`,
                `wall=${wallMs.toFixed(0)}`,
                `layoutSteps=${String(layoutSteps)}`,
                `rafInterval median/p95=${quantile(timed, 0.5).toFixed(1)}/${quantile(timed, 0.95).toFixed(1)}`,
                `render median/p95=${quantile(renders, 0.5).toFixed(1)}/${quantile(renders, 0.95).toFixed(1)}`,
                `update median=${quantile(updates, 0.5).toFixed(1)}`,
                ...[...partTimes].map(([name, times]) => `${name}=${quantile(times, 0.5).toFixed(1)}`),
                `heapMB=${(heap / 2 ** 20).toFixed(0)}`,
            ];
            console.log(`[renderer-frame] ${cells.join(" ")}`);
            assert.isAbove(renders.length, 0, "the element drew frames");
        });
    }
});
