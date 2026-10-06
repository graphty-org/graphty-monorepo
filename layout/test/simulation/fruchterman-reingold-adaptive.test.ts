/**
 * `cooling: "adaptive"` on the CPU Fruchterman-Reingold simulation: Yifan Hu's step control with the GPU simulation's
 * rule and constants (webgpu-graph-algorithms/src/wgsl/fa2-stats-finalize.wgsl.ts, the STATS_MODE 1 block; its f64
 * oracle webgpu-graph-algorithms/test/oracle/fruchterman-reingold.ts fold()). The constants are pinned here as
 * literals and in webgpu-graph-algorithms/test/layouts/fr-adaptive.test.ts against that package's copies.
 */

import assert from "node:assert";

import { fromEdgeArrays } from "@graphty/graph-format";
import { describe, it } from "vitest";

import { FR_ADAPTIVE_MAX_ITERATIONS, FR_COOLING_PATIENCE, FR_COOLING_STEP } from "../../src/simulation/constants";
import { createSimulation } from "../../src/simulation/create-simulation";
import { FruchtermanReingoldSimulation } from "../../src/simulation/fruchterman-reingold";
import { seedPositions } from "../../src/simulation/seed";

function grid(w: number, h: number) {
    const src: number[] = [];
    const dst: number[] = [];
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = y * w + x;
            if (x + 1 < w) {
                src.push(i);
                dst.push(i + 1);
            }
            if (y + 1 < h) {
                src.push(i);
                dst.push(i + w);
            }
        }
    }
    return fromEdgeArrays({
        directed: false,
        nodeCount: w * h,
        src: Uint32Array.from(src),
        dst: Uint32Array.from(dst),
    });
}

function seeded(s: ReturnType<typeof grid>, seed: number) {
    const positions = new Float32Array(3 * s.nodeCount).fill(Number.NaN);
    seedPositions(s, positions, seed, 2, 1, null, "fr");
    return positions;
}

/** One edge, two nodes on the x axis `d0` apart: the force on each is `d^2 / k - k^2 / d` along the axis. */
function pair(d0: number) {
    const s = fromEdgeArrays({ directed: false, nodeCount: 2, src: Uint32Array.from([0]), dst: Uint32Array.from([1]) });
    return { s, positions: Float32Array.from([0, 0, 0, d0, 0, 0]) };
}

/**
 * An independent transcription of the pair's run: the 1D distance, the free force energy `2 F^2`, and the controller
 * (compare at the start of every iteration but the first, strict fall counts, x 1 / 0.9 at the fifth, x 0.9 otherwise).
 * @param d0 - the start distance
 * @param k - the optimal distance
 * @param count - iterations
 * @returns the temperature each iteration moved with and whether its controller update saw a fall
 */
function pairReference(d0: number, k: number, count: number): { t: number[]; fell: (boolean | null)[] } {
    let d = d0;
    let t = 0.1;
    let previous = Number.POSITIVE_INFINITY;
    let progress = 0;
    let pending: number | null = null;
    const temps: number[] = [];
    const fell: (boolean | null)[] = [];
    for (let i = 0; i < count; i++) {
        if (pending === null) {
            fell.push(null);
        } else {
            const fall = pending < previous;
            fell.push(fall);
            if (fall) {
                progress++;
                if (progress >= 5) {
                    progress = 0;
                    t /= 0.9;
                }
            } else {
                progress = 0;
                t *= 0.9;
            }
            previous = pending;
        }
        const f = (d * d) / k - (k * k) / d; // > 0 pulls the two together
        pending = 2 * f * f;
        d -= 2 * Math.sign(f) * Math.min(Math.abs(f), t);
        temps.push(t);
    }
    return { t: temps, fell };
}

describe("FruchtermanReingoldSimulation: cooling", () => {
    it("pins the constants the GPU simulation uses (webgpu-graph-algorithms/src/constants.ts)", () => {
        assert.strictEqual(FR_COOLING_STEP, 0.9);
        assert.strictEqual(FR_COOLING_PATIENCE, 5);
        assert.strictEqual(FR_ADAPTIVE_MAX_ITERATIONS, 10_000);
    });

    it("the temperature grows after five falls of the energy and shrinks after a rise", () => {
        const k = 0.5;
        const count = 40;
        const { s, positions } = pair(3);
        const sim = new FruchtermanReingoldSimulation({ cooling: "adaptive", k, settleThreshold: 0 });
        sim.load(s, positions);
        const temps: number[] = [];
        for (let i = 0; i < count; i++) {
            sim.step(1);
            temps.push(sim.temperature);
        }
        const ref = pairReference(3, k, count);
        for (let i = 0; i < count; i++) {
            assert.ok(Math.abs(temps[i] - ref.t[i]) <= 1e-12, `iteration ${i}: ${temps[i]} against ${ref.t[i]}`);
        }
        // the first five iterations move at 0.1 (the first never compares; the next four are falls 1-4), the sixth
        // compares the fifth fall and grows the temperature
        for (let i = 0; i < 5; i++) {
            assert.strictEqual(temps[i], 0.1, `iteration ${i}`);
        }
        assert.deepStrictEqual(ref.fell.slice(0, 6), [null, true, true, true, true, true]);
        assert.ok(Math.abs(temps[5] - 0.1 / 0.9) <= 1e-15, `iteration 5: ${temps[5]}`);
        // a rise shrinks it at once
        const rise = ref.fell.indexOf(false);
        assert.ok(rise > 5, "the pair overshoots its rest length within the run, so the energy rises");
        assert.ok(Math.abs(temps[rise] - temps[rise - 1] * 0.9) <= 1e-15, `iteration ${rise}`);
    });

    it("an adaptive run settles before its cap on a small grid", () => {
        const s = grid(6, 6);
        const adaptive = seeded(s, 7);
        const sim = createSimulation("fruchtermanReingold", {
            cooling: "adaptive",
            settleThreshold: 1e-3,
            settleWindow: 10,
        }) as FruchtermanReingoldSimulation;
        sim.load(s, adaptive);
        while (!sim.settled) {
            sim.step(50);
        }
        assert.ok(sim.settledCount >= 10, "settled by the movement window, not by the cap");
        assert.ok(sim.iterationsDone < FR_ADAPTIVE_MAX_ITERATIONS, `settled at ${sim.iterationsDone}`);
        for (const v of adaptive) {
            assert.ok(Number.isFinite(v));
        }
    });

    it('"adaptive" and "linear" produce different runs from the same start', () => {
        const s = grid(6, 6);
        const run = (cooling: "linear" | "adaptive") => {
            const positions = seeded(s, 7);
            const sim = new FruchtermanReingoldSimulation({ cooling, settleThreshold: 0 });
            sim.load(s, positions);
            sim.step(50);
            return { positions, sim };
        };
        const linear = run("linear");
        const adaptive = run("adaptive");
        // linear: the 50-iteration budget is spent; adaptive: 50 is far inside the 10,000 cap
        assert.ok(linear.sim.settled);
        assert.strictEqual(adaptive.sim.settled, false);
        assert.ok(adaptive.sim.temperature > 0, "the adaptive temperature never falls to 0 on a schedule");
        let differ = 0;
        for (let i = 0; i < linear.positions.length; i++) {
            if (linear.positions[i] !== adaptive.positions[i]) {
                differ++;
            }
        }
        assert.ok(differ > 0, "the two schedules move the nodes differently");
    });

    it("iterations is the cap of an adaptive run", () => {
        const s = grid(4, 4);
        const sim = new FruchtermanReingoldSimulation({ cooling: "adaptive", iterations: 30, settleThreshold: 0 });
        sim.load(s, seeded(s, 3));
        sim.step(100);
        assert.strictEqual(sim.iterationsDone, 30);
        assert.ok(sim.settled);
    });

    it("reheat() restarts the controller at 0.1 and the budget at 0, and compares the pending energy with +infinity", () => {
        // far enough apart that the energy is still falling through the reheat and the five iterations after it
        const { s, positions } = pair(6);
        const sim = new FruchtermanReingoldSimulation({ cooling: "adaptive", k: 0.5, settleThreshold: 0 });
        sim.load(s, positions);
        sim.step(8);
        assert.notStrictEqual(sim.temperature, 0.1);
        sim.reheat();
        assert.strictEqual(sim.temperature, 0.1);
        assert.strictEqual(sim.iterationsDone, 0);
        // the pending energy is a fall against +infinity (progress 1), so the next four iterations keep 0.1 and the
        // fifth after the reheat grows it -- one earlier than after load(), whose first iteration compares nothing
        const temps: number[] = [];
        for (let i = 0; i < 5; i++) {
            sim.step(1);
            temps.push(sim.temperature);
        }
        assert.deepStrictEqual(temps.slice(0, 4), [0.1, 0.1, 0.1, 0.1]);
        assert.ok(Math.abs(temps[4] - 0.1 / 0.9) <= 1e-15, `fifth iteration after reheat: ${temps[4]}`);
    });

    it("rejects an unknown cooling value", () => {
        assert.throws(
            () => new FruchtermanReingoldSimulation({ cooling: "fast" as unknown as "linear" }),
            (e: unknown) => e instanceof RangeError && /cooling/.test(e.message),
        );
    });
});
