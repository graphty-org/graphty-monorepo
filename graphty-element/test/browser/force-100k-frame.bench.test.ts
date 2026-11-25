/**
 * @file Where a frame of the default force layout goes at 100,000 nodes on the accelerator (issue #10057): the
 * issue's planted partition graph (100 communities, about 990,000 edges, 80% inside), renderPath "batched", 2D,
 * boxes and plain edges, as `benchmarks/compare/matrix.sh quality-lean-m` draws it. After the layout has run a while
 * the next frames are timed and split into the layout's `step()` (submitting a batch), its publish, the wait for a
 * batch to land on the device, how long the device's queue takes to drain after a draw, main-thread long tasks,
 * `Graph.update` and the scene's draw, with the iterations each frame computed, the layout's own pass timings and a
 * timeline of the first submits, landings and draws.
 *
 * Measured on an RTX 4070 SUPER (2026-11-25): the layout's iteration is about 0.6 ms on the device and the main
 * thread is idle, but drawing the 990,000 edges keeps the device busy 60 to 700 ms a frame, and a frame waits for
 * the batch in flight to land, so iterations per second are iterations per batch times frames per second.
 *
 * Numbers go to the console as `[force-100k-frame]` lines; nothing about speed is asserted. It runs only with
 * `GRAPHTY_BROWSER_GPU` set, because the layout needs the accelerator:
 *
 *     GRAPHTY_BROWSER_GPU=nvidia npx vitest run --project=browser-bench test/browser/force-100k-frame.bench.test.ts
 */
import "../../src/graphty-element";
import "../../webgpu";

import { plantedPartitionGraph } from "@graphty/graph-samples/generators";
import { afterEach, assert, describe, it } from "vitest";

import { renderManagerOf } from "../../src/Graph";
import { SimulationLayoutEngine } from "../../src/layout/SimulationLayoutEngine";
import { nextFrame } from "../helpers/real-input";

const GPU = ((import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "") !== "";

const GROUPS = 100;
const GROUP_SIZE = 1000;
const EDGES = 990_000;
const WARM_FRAMES = 30;
const TIMED_FRAMES = 300;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/** Wraps `owner[key]` so each call's time is added to `into.ms`. */
function timeCalls(owner: Record<string, unknown>, key: string, into: { ms: number; calls: number }): void {
    const original = owner[key] as (...args: unknown[]) => unknown;
    owner[key] = function (this: unknown, ...args: unknown[]): unknown {
        const start = performance.now();
        try {
            return original.apply(this, args);
        } finally {
            into.ms += performance.now() - start;
            into.calls += 1;
        }
    };
}

describe.skipIf(!GPU)("a frame of the default force layout at 100,000 nodes", () => {
    it("on the batched path", async () => {
        (globalThis as { __GRAPHTY_STRICT_STATE__?: boolean }).__GRAPHTY_STRICT_STATE__ = false;
        const adapter = await navigator.gpu.requestAdapter();
        const card = adapter === null ? "none" : `${adapter.info.vendor} ${adapter.info.architecture}`;
        const n = GROUPS * GROUP_SIZE;
        const deg = (2 * EDGES) / n;
        const sample = plantedPartitionGraph({
            groups: GROUPS,
            groupSize: GROUP_SIZE,
            pIn: (0.8 * deg) / (GROUP_SIZE - 1),
            pOut: (0.2 * deg) / (n - GROUP_SIZE),
            seed: 42,
        });
        const element = document.createElement("graphty-element");
        element.renderer = "webgpu";
        element.renderPath = "batched";
        element.acceleration = "auto";
        element.layout = "fixed";
        element.style.display = "block";
        element.style.width = "1200px";
        element.style.height = "900px";
        document.body.appendChild(element);
        cleanups.push(() => {
            element.remove();
        });
        await element.updateComplete;
        await element.setViewMode("2d");
        await element.session.styles.add({
            name: "lean nodes",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shape": "box" },
        });
        await element.session.styles.add({
            name: "lean edges",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.arrowHead": "none" },
        });
        const { graph } = element;
        await graph.acceleration.ready();
        const span = 4 * Math.sqrt(n);
        let s = 7;
        const random = (): number => {
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 2 ** 32;
        };
        const positions = new Float32Array(3 * n);
        for (let i = 0; i < n; i++) {
            positions[3 * i] = (random() - 0.5) * span;
            positions[3 * i + 1] = (random() - 0.5) * span;
        }
        await element.session.data.importColumns({
            nodeCount: n,
            sources: sample.src,
            targets: sample.dst,
            positions,
        });
        await element.waitForStableFrame();

        await graph.setLayout("ngraph", { seed: 1 });
        const engine = graph.getLayoutManager().layoutEngine;
        assert.instanceOf(engine, SimulationLayoutEngine, "the default force layout is a simulation");
        assert.isTrue(engine.isAccelerated, "the force layout runs on the accelerator");
        for (let i = 0; i < WARM_FRAMES; i++) {
            await nextFrame();
        }

        const step = { ms: 0, calls: 0 };
        const publish = { ms: 0, calls: 0 };
        const draw = { ms: 0, calls: 0 };
        const land = { ms: 0, calls: 0 };
        timeCalls(engine as unknown as Record<string, unknown>, "step", step);
        timeCalls(engine as unknown as Record<string, unknown>, "publishPositions", publish);
        timeCalls(graph.scene as unknown as Record<string, unknown>, "render", draw);
        const simulation = engine.simulation as unknown as Record<string, unknown>;
        const simStep = simulation.step as (k: number) => Promise<void> | undefined;
        const seen = new WeakSet<Promise<void>>();
        const events: string[] = [];
        let t0 = 0;
        const mark = (what: string): void => {
            if (t0 > 0 && events.length < 40) {
                events.push(`${(performance.now() - t0).toFixed(1)} ${what}`);
            }
        };
        simulation.step = (k: number): Promise<void> | undefined => {
            const start = performance.now();
            const batch = simStep.call(simulation, k);
            if (batch === undefined || seen.has(batch)) {
                return batch;
            }
            seen.add(batch);
            mark(`submit k=${String(k)}`);
            void batch.then(() => {
                mark("landed");
                land.ms += performance.now() - start;
                land.calls += 1;
            });
            return batch;
        };

        // The device's own pace: how long after each draw the queue drains, which the CPU timings above cannot see.
        const device = (graph.engine as unknown as { _device: GPUDevice })._device;
        const drain = { ms: 0, calls: 0 };
        graph.scene.onAfterRenderObservable.add(() => {
            const at = performance.now();
            mark("drawn");
            void device.queue.onSubmittedWorkDone().then(() => {
                mark("queue drained");
                drain.ms += performance.now() - at;
                drain.calls += 1;
            });
        });
        const busy = { ms: 0, calls: 0 };
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                busy.ms += entry.duration;
                busy.calls += 1;
            }
        });
        observer.observe({ type: "longtask" });

        const stats = graph.getStatsManager();
        stats.enableProfiling();
        stats.resetMeasurements();
        const { ticks } = renderManagerOf(graph);
        const drawnFrom = ticks.drawn;
        const iterationsFrom = engine.iterationsDone;
        const start = performance.now();
        t0 = start;
        for (let i = 0; i < TIMED_FRAMES; i++) {
            await nextFrame();
        }
        const ms = performance.now() - start;
        observer.disconnect();
        console.log(`[force-100k-frame] timeline\n${events.join("\n")}`);
        const frames = ticks.drawn - drawnFrom;
        const iterations = engine.iterationsDone - iterationsFrom;
        const update = stats.getSnapshot().cpu.find((m) => m.label === "Graph.update");
        stats.disableProfiling();
        const sim = engine.simulation as unknown as {
            tier?: string;
            stats?: { msPerIteration?: number | null };
            lastPassTimings?: readonly { label: string; ms: number }[] | null;
        };
        console.log(
            `[force-100k-frame] tier=${String(sim.tier)} msPerIteration=${String(sim.stats?.msPerIteration)} ` +
                `passes=${JSON.stringify(sim.lastPassTimings ?? null)}`,
        );
        const per = (t: { ms: number; calls: number }): string =>
            `${(t.ms / Math.max(t.calls, 1)).toFixed(1)}ms x${String(t.calls)}`;
        console.log(
            `[force-100k-frame] card=${card} accelerator=${engine.accelerator} renderer=${JSON.stringify(element.rendererStatus)} nodes=${String(n)} edges=${String(sample.src.length)} rafs=${String(TIMED_FRAMES)} ` +
                `drawn=${String(frames)} frame=${(ms / Math.max(frames, 1)).toFixed(1)}ms ` +
                `iterations=${String(iterations)} it/s=${((1000 * iterations) / ms).toFixed(1)} ` +
                `drain=${per(drain)} longtasks=${per(busy)} step=${per(step)} publish=${per(publish)} land=${per(land)} draw=${per(draw)} ` +
                `Graph.update=${update === undefined ? "-" : `${(update.total / Math.max(update.count, 1)).toFixed(1)}ms x${String(update.count)}`}`,
        );
    });
});
