/**
 * HITS and Katz centrality through `accelerated()` from @graphty/algorithms, on the real device, against the CPU
 * ports: the dispatcher gives the device's answer the port's scale and the port's weighting, so a caller sees the
 * same numbers above an accelerator's node floor as below it, to f32 precision.
 *
 * run-twice exempt: the kernels' repeatability is spectral.test.ts's; this file checks the dispatcher's rescaling
 * of their answers against the CPU ports.
 */

import { accelerated, indexed } from "@graphty/algorithms";
import { type GraphSnapshot } from "@graphty/graph-format";
import { onTestFinished, type TestContext } from "vitest";

import { createAccelerator } from "../../src/accelerator.js";
import { type GpuContext } from "../../src/context.js";
import { KARATE_EDGES, randomEdges, randomEdgesLoose, snapshotOf } from "../helpers/graphs.js";
import { acquire, requireGpu } from "../setup/gpu.js";

/** Absolute agreement per node: f32 iterates against f64 ones, on vectors of unit scale. */
const CLOSE = 1e-4;

function expectClose(actual: ArrayLike<number>, expected: ArrayLike<number>, label: string): void {
    expect(actual.length, `${label}: length`).toBe(expected.length);
    let worst = 0;
    for (let i = 0; i < expected.length; i++) {
        worst = Math.max(worst, Math.abs(actual[i] - expected[i]));
    }
    expect(worst, `${label}: largest difference`).toBeLessThan(CLOSE);
}

describe("HITS and Katz through the dispatcher match the CPU ports", () => {
    let shared: GpuContext | null = null;

    async function context(t: TestContext): Promise<GpuContext> {
        requireGpu(t);
        const ctx = shared ?? (await acquire({ label: "spectral-dispatch" }));
        shared = ctx;
        return ctx;
    }

    const graphs: readonly [string, () => GraphSnapshot][] = [
        ["karate, undirected", () => snapshotOf(KARATE_EDGES)],
        ["random, directed", () => snapshotOf(randomEdges(80, 240, 7), { directed: true })],
        ["random, directed, weighted", () => snapshotOf(randomEdgesLoose(80, 240, 11), { directed: true, weighted: true })],
    ];

    for (const [name, make] of graphs) {
        it(`${name}: Katz and HITS at their defaults and with normalized: false`, async (t) => {
            const acc = createAccelerator(await context(t));
            const dispatch = accelerated(acc);
            const s = make();
            onTestFinished(() => {
                acc.release(s);
            });
            const katz = { alpha: 0.05, maxIterations: 300, tolerance: 1e-7 };
            expectClose((await dispatch.katzCentrality(s, katz)).scores, indexed.katzCentrality(s, katz).scores, `${name} katz`);
            const iter = { maxIterations: 300, tolerance: 1e-8 };
            for (const normalized of [true, false]) {
                const device = await dispatch.hits(s, { ...iter, normalized });
                const port = indexed.hits(s, { ...iter, normalized });
                expectClose(device.hubs, port.hubs, `${name} hubs, normalized ${String(normalized)}`);
                expectClose(device.authorities, port.authorities, `${name} authorities, normalized ${String(normalized)}`);
            }
        });
    }

    it("a weighted snapshot under weighted: true reads the weights on both paths", async (t) => {
        const acc = createAccelerator(await context(t));
        const dispatch = accelerated(acc);
        const s = snapshotOf(randomEdgesLoose(80, 240, 11), { directed: true, weighted: true });
        onTestFinished(() => {
            acc.release(s);
        });
        const katz = { alpha: 0.005, maxIterations: 300, tolerance: 1e-7, weighted: true };
        expectClose((await dispatch.katzCentrality(s, katz)).scores, indexed.katzCentrality(s, katz).scores, "katz");
        const iter = { maxIterations: 300, tolerance: 1e-8, weighted: true };
        const device = await dispatch.hits(s, iter);
        const port = indexed.hits(s, iter);
        expectClose(device.hubs, port.hubs, "hubs");
        expectClose(device.authorities, port.authorities, "authorities");
    });
});
