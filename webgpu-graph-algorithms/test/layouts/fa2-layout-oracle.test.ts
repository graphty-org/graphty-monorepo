/**
 * The SECOND ForceAtlas2 REFERENCE (integration plan Task M5b-T3 step 2): @graphty/layout's
 * ForceAtlas2Simulation, reached through the published barrel, run from the SAME f32 seed in the same compat, one
 * step(1) at a time, against the GPU simulation's owner array.
 *
 * What this is and is NOT. layout/src/simulation/forceatlas2.ts:2-6 calls the class "a PORT of the GPU package's
 * f64 reference, webgpu-graph-algorithms/test/oracle/forceatlas2.ts (the SPEC of this class ...). The formulas, the
 * K1-K5 stage order, `estimateFactor`, `kickDir` and the settle rule are the oracle's line for line", and :13-15
 * calls the pair "the two f64 transcriptions". So this file gives NO formula independence: test/oracle/forceatlas2.ts
 * remains the independent reference R-1 and G10 rely on, and every existing oracle test is untouched. What this file
 * DOES catch is divergence between the two transcriptions and, above all, in the SHELL around them: unit conversion
 * (f64 layout units vs the owner's f32 scene array), option resolution (mass = outDegree + 1, weights), the settle
 * rule, and the published barrel's types.
 *
 * What is asserted and what is only printed (docs/decisions/G3.md finding G3-F3; the prose is quoted at
 * test/layouts/fa2-trace-parity.test.ts:13-22): the free-running trajectory is chaotic -- in compat "paper" it
 * diverges x1.1 .. x1.5 per iteration from f32 rounding (x4 .. x5 over iterations 2 .. 9 on random1k / grid10,
 * G3.md:368-369) and the f64 oracle misses BOTH spec caps against ITSELF under a one-f32-ulp start perturbation.
 * So only the SHORT horizons carry an accuracy assertion: k = 1 and k = 5 in both modes, and k = 10 in compat
 * "networkx" as well -- the mode whose free-running leg fa2-trace-parity.test.ts also asserts. At k = 50 the
 * ACCURACY comparison is printed only; run-to-run bitwise determinism and finiteness are still asserted there.
 *
 * The tolerance is toleranceOf("fa2-trace-parity.f64") (never a literal, CLAUDE.md:441): its committed value is the
 * spec cap 5e-2, the plan's number. NOTE, deliberately: that id is BORROWED. Its noise-floor basis row
 * (fa2-trace-parity.oracle-f64, factor 1.0101) is the karate networkx 50-record TRACE comparison, not this
 * positions comparison, and it carries no headroom for a second borrower. Giving this test its own
 * `fa2-layout-oracle` id needs a recording run under GRAPHTY_NOISE_FLOOR_WRITE=1; it is an open owner item.
 *
 * The metric is stageError(true, ...) of test/helpers/fa2-parity.ts, the ONE implementation of spec 11.4's floored
 * per-node position error (its FLOOR_FRACTION is module-private; never re-derive it). Every case runs at scale 1
 * with a zero centre (BASE_OPTIONS) so the owner's scene array IS the layout state on both sides -- asserted, not
 * assumed, by assertUnitStart below (fa2-parity.ts's own assertUnitStart is module-private and cannot be imported).
 * The start MUST be the seeded array (startPositions(..., false)): layout's load() never seeds NaN rows
 * (forceatlas2.ts:26 "`seed` (the caller seeds the array with seedPositions) ... accepted and unused"), while the
 * GPU's does, so an unseeded start would compare a reseeded GPU against a NaN CPU.
 */

import type { F32, GraphSnapshot } from "@graphty/graph-format";
import { ForceAtlas2Simulation } from "@graphty/layout";

import type { GpuContext } from "../../src/context.js";
import type { GpuLayoutTuning } from "../../src/types/layout.js";
import type { ForceAtlas2Options } from "../../src/types/options.js";
import {
    BASE_OPTIONS,
    NETWORKX,
    PAPER,
    type ParityGraph,
    paritySnapshot,
    stageError,
    startPositions,
    toleranceOf,
    withSim,
} from "../helpers/fa2-parity.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { assertCheckPasses, ratioOf } from "../helpers/sabotage.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

/** The three graphs of the plan's step 2: karate (34), grid10 (100) and random1k (1,000) at gpuScale(). */
const GRAPHS: readonly ParityGraph[] = ["karate", "grid10", "random1k"];
/** Both force-law modes (spec 7.2). */
const MODES: readonly GpuLayoutTuning[] = [PAPER, NETWORKX];
/** The horizons whose ACCURACY is asserted: 1 and 5 in both modes, 10 in networkx as well (G3-F3: paper diverges fastest). */
const ASSERTED: Readonly<Record<"paper" | "networkx", readonly number[]>> = Object.freeze({
    paper: [1, 5],
    networkx: [1, 5, 10],
});
/** The horizon whose accuracy is measured and PRINTED, never asserted (G3-F3); determinism and finiteness still are. */
const PRINTED = 50;
const CASE_TIMEOUT = 300_000;

/**
 * The compat mode of a tuning ("paper" when unset), the value layout's constructor takes.
 * @param tuning - the GPU tuning
 * @returns the mode
 */
function compatOf(tuning: GpuLayoutTuning): "paper" | "networkx" {
    return tuning.compat ?? "paper";
}

/**
 * The unit-identity precondition both trajectories rest on: scale 1 and a zero centre, so the owner's scene array
 * IS the layout state. fa2-parity.ts has the same check at :878 but does not export it.
 * @param options - the case options
 */
function assertUnitStart(options: ForceAtlas2Options): void {
    const center = options.center ?? [0, 0, 0];
    const zero = Array.from({ length: center.length }, (_, k) => center[k]).every((v) => v === 0);
    if ((options.scale ?? 1) !== 1 || !zero) {
        throw new Error("fa2-layout-oracle compares owner arrays directly: it needs scale 1 and a zero centre");
    }
}

/**
 * The positions recorded at `k` iterations, or a throw when the trajectory does not carry that horizon.
 * @param trajectory - the recorded checkpoints
 * @param k - the horizon
 * @returns the stride-3 scene positions
 */
function at(trajectory: ReadonlyMap<number, F32>, k: number): F32 {
    const positions = trajectory.get(k);
    if (positions === undefined) {
        throw new Error(`no positions recorded after ${k} iterations`);
    }
    return positions;
}

/**
 * The GPU's owner array copied after each of `checkpoints` iterations of step(1).
 * @param ctx - the context
 * @param s - the snapshot
 * @param start - the seeded scene start (copied)
 * @param options - the FA2 options
 * @param tuning - the GPU tuning
 * @param checkpoints - the horizons to record
 * @returns one array per checkpoint
 */
async function gpuTrajectory(
    ctx: GpuContext,
    s: GraphSnapshot,
    start: F32,
    options: ForceAtlas2Options,
    tuning: GpuLayoutTuning,
    checkpoints: readonly number[],
): Promise<Map<number, F32>> {
    assertUnitStart(options);
    const last = Math.max(...checkpoints);
    return await withSim(ctx, options, tuning, async (sim) => {
        const positions = Float32Array.from(start);
        sim.load(s, positions);
        const out = new Map<number, F32>();
        for (let t = 1; t <= last; t++) {
            await sim.step(1);
            if (checkpoints.includes(t)) {
                out.set(t, Float32Array.from(positions));
            }
        }
        return out;
    });
}

/**
 * The same trajectory on @graphty/layout's CPU simulation, from the same f32 start array. Its step() is
 * SYNCHRONOUS and writes every free row back into the array it was loaded with; `compat` is a CONSTRUCTOR option.
 * @param s - the snapshot
 * @param start - the seeded scene start (copied)
 * @param options - the FA2 options
 * @param tuning - the GPU tuning (its compat is handed to the constructor)
 * @param checkpoints - the horizons to record
 * @param label - the case label, for the settle assertion
 * @returns one array per checkpoint
 */
function layoutTrajectory(
    s: GraphSnapshot,
    start: F32,
    options: ForceAtlas2Options,
    tuning: GpuLayoutTuning,
    checkpoints: readonly number[],
    label: string,
): Map<number, F32> {
    assertUnitStart(options);
    const last = Math.max(...checkpoints);
    const sim = new ForceAtlas2Simulation({ ...options, compat: compatOf(tuning) });
    try {
        const positions = Float32Array.from(start);
        sim.load(s, positions);
        const out = new Map<number, F32>();
        for (let t = 1; t <= last; t++) {
            sim.step(1);
            if (checkpoints.includes(t)) {
                out.set(t, Float32Array.from(positions));
            }
        }
        // step() is a silent no-op once settled (forceatlas2.ts:600-602): a stalled CPU array would be reported
        // as a GPU divergence. At settleThreshold 0 / maxIter 1000 it cannot settle inside 50.
        expect(sim.settled, `${label}: the layout simulation never settles at settleThreshold 0`).toBe(false);
        expect(sim.iterationsDone, `${label}: the layout simulation ran every iteration`).toBe(last);
        return out;
    } finally {
        sim.dispose();
    }
}

describe("FA2 vs @graphty/layout's ForceAtlas2Simulation: the second reference (W1b, Task M5b-T3)", () => {
    let ctx: GpuContext;

    beforeAll(async () => {
        ctx = await acquire({ label: "fa2-layout-oracle" });
    });

    it("the borrowed tolerance is traced to the noise-floor file and sits at the spec cap of the free-running f64 leg", () => {
        expect(toleranceOf("fa2-trace-parity.f64")).toBeLessThanOrEqual(5e-2);
    });

    for (const graph of GRAPHS) {
        for (const tuning of MODES) {
            const compat = compatOf(tuning);
            const label = `${graph}/${compat}`;
            const asserted = ASSERTED[compat];
            it(
                `${label}: twice bitwise; within the traced tolerance of the layout simulation after ${asserted.join(", ")} iterations; ${PRINTED} printed (chaotic, G3-F3)`,
                async (t) => {
                    requireGpu(t);
                    const s = paritySnapshot(graph, gpuScale(), false);
                    try {
                        // the SEEDED start is mandatory: layout's load() never seeds NaN rows (forceatlas2.ts:26)
                        const start = startPositions(s, BASE_OPTIONS, false);
                        const checkpoints = [...asserted, PRINTED];
                        // spec 11.9 item 4: the same inputs twice, bitwise, before anything is compared
                        const a = await gpuTrajectory(ctx, s, start, BASE_OPTIONS, tuning, checkpoints);
                        const b = await gpuTrajectory(ctx, s, start, BASE_OPTIONS, tuning, checkpoints);
                        for (const k of checkpoints) {
                            expectBitwiseEqual(at(a, k), at(b, k), `${label}: iteration ${k}, run 1 vs run 2`);
                        }
                        const cpu = layoutTrajectory(s, start, BASE_OPTIONS, tuning, checkpoints, label);
                        const tolerance = toleranceOf("fa2-trace-parity.f64");
                        const measured = checkpoints.map((k) => {
                            const err = stageError(true, at(a, k), at(cpu, k));
                            return { k, rel: err.rel, abs: err.abs };
                        });
                        console.warn(
                            `[fa2-layout-oracle] ${label} (tolerance ${tolerance.toExponential(3)}): ${measured
                                .map(
                                    (m) =>
                                        `k=${m.k} rel ${m.rel.toExponential(3)} (ratio ${ratioOf(
                                            m.rel,
                                            tolerance,
                                        ).toExponential(3)}, max abs ${m.abs.toExponential(3)})`,
                                )
                                .join("; ")}; k=${PRINTED} accuracy is informational, never asserted (G3-F3)`,
                        );
                        for (const k of asserted) {
                            const err = stageError(true, at(a, k), at(cpu, k));
                            assertCheckPasses({
                                worst: ratioOf(err.rel, tolerance),
                                worstLabel: `${label}: positions after ${k} iterations vs @graphty/layout`,
                                samples: s.nodeCount,
                            });
                        }
                        // a non-finite coordinate is a defect at any horizon, whatever the tolerance says
                        for (const k of checkpoints) {
                            expect(
                                Array.from(at(a, k)).every((v) => Number.isFinite(v)),
                                `${label}: the GPU positions are finite after ${k} iterations`,
                            ).toBe(true);
                            expect(
                                Array.from(at(cpu, k)).every((v) => Number.isFinite(v)),
                                `${label}: the layout positions are finite after ${k} iterations`,
                            ).toBe(true);
                        }
                    } finally {
                        ctx.release(s);
                    }
                },
                CASE_TIMEOUT,
            );
        }
    }
});
