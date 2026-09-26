/**
 * The exact tier above llvmpipe's loop budget (issue #87): K3 sums every other node at any n on every adapter. On
 * llvmpipe (lavapipe) one shader invocation runs at most 65,535 loop iterations in total, and past that every loop
 * quietly breaks; one 256-node tile of K3 costs 258 of them, so a single-pass K3 dropped every node past j = 65,027
 * without an error. The kernel now sums at most EXACT_TILES_PER_PASS tiles per dispatch. Each model runs K3 once on an
 * edgeless 70,000-node graph (gravity 0: the force after K3 is repulsion alone) and sampled nodes on both sides of the
 * old cutoff are held to an f64 sum over ALL other nodes of the model's own pair law. Runs on every adapter; the
 * defect showed only on lavapipe (about 7 s per model there).
 */

import { type GraphSnapshot } from "@graphty/graph-format";

import { FA2_COINCIDENT_SQ, FA2_DISTANCE_FLOOR_SQ } from "../../src/constants.js";
import { type GpuContext } from "../../src/context.js";
import { BASE_OPTIONS, debugStages, PAPER, type StageIo, startPositions, withSim } from "../helpers/fa2-parity.js";
import { FR_BASE_OPTIONS, FR_TUNING, frStages, withFrSim } from "../helpers/fr-parity.js";
import { snapshotOf } from "../helpers/graphs.js";
import { SE_BASE_OPTIONS, SE_TUNING, seStages, withSeSim } from "../helpers/se-parity.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const N = 70_000;
const CASE_TIMEOUT = 300_000;
/** Correct sums measured 1e-6 to 7e-6 (NVIDIA and lavapipe below the cutoff); the truncated sum was 7e-2 at 70k. */
const TOLERANCE = 1e-4;
/** Both sides of the old lavapipe cutoff (j < 65,027) plus the ends. */
const SAMPLES: readonly number[] = [0, 1, 30_000, 65_026, 65_027, 65_028, 68_000, N - 1];
const SCALING_RATIO = 2;
const FR_K = 0.01;
const SE_GRAVITY = -12;

/** One model's pair law: the force on i from j along d = p_i - p_j, from d2 = |d|^2 and the masses. */
type PairLaw = (d2: number, mi: number, mj: number) => number;

const LAWS: Readonly<Record<"fa2" | "fr" | "se", PairLaw>> = {
    fa2: (d2, mi, mj) => (SCALING_RATIO * mi * mj) / Math.max(d2, FA2_DISTANCE_FLOOR_SQ),
    fr: (d2) => (FR_K * FR_K) / d2,
    se: (d2, mi, mj) => (-SE_GRAVITY * mi * mj) / (d2 * Math.sqrt(d2)),
};

/**
 * K3's force and the positions it read, after one K3 of a model.
 * @param ctx - the context
 * @param model - the model
 * @param s - the edgeless snapshot
 * @returns force (stride 3) and positions (stride 4, mass in w)
 */
async function runK3(
    ctx: GpuContext,
    model: keyof typeof LAWS,
    s: GraphSnapshot,
): Promise<{ readonly force: Float32Array; readonly pos: Float32Array }> {
    const body = async (io: StageIo): Promise<{ readonly force: Float32Array; readonly pos: Float32Array }> => {
        await io.run("K3");
        return {
            force: Float32Array.from(await io.read("force")),
            pos: Float32Array.from(await io.read("positions")),
        };
    };
    if (model === "fa2") {
        const options = { ...BASE_OPTIONS, gravity: 0, scalingRatio: SCALING_RATIO };
        return await withSim(ctx, options, PAPER, async (sim) => {
            sim.load(s, startPositions(s, options, false));
            return await body(debugStages(sim));
        });
    }
    if (model === "fr") {
        const options = { ...FR_BASE_OPTIONS, k: FR_K };
        return await withFrSim(ctx, options, FR_TUNING, async (sim) => {
            sim.load(s, startPositions(s, options, false));
            return await body(frStages(sim));
        });
    }
    const options = { ...SE_BASE_OPTIONS, gravity: SE_GRAVITY };
    return await withSeSim(ctx, options, SE_TUNING, async (sim) => {
        sim.load(s, startPositions(s, options, false));
        return await body(seStages(sim));
    });
}

describe("the exact tier sums every node at any n (issue #87)", () => {
    let ctx: GpuContext;

    beforeAll(async () => {
        ctx = await acquire({ label: "exact-large" });
    });

    for (const model of ["fa2", "fr", "se"] as const) {
        it(
            `${model}: K3 at n=${N} matches the f64 all-pairs sum on both sides of j = 65,027`,
            async (t) => {
                requireGpu(t);
                const s = snapshotOf([], { nodeCount: N, arena: false });
                try {
                    const { force, pos } = await runK3(ctx, model, s);
                    const law = LAWS[model];
                    let checked = 0;
                    for (const i of SAMPLES) {
                        const ref = [0, 0, 0];
                        let coincident = false;
                        for (let j = 0; j < N && !coincident; j++) {
                            if (j === i) {
                                continue;
                            }
                            const d = [0, 1, 2].map((a) => pos[4 * i + a] - pos[4 * j + a]);
                            const d2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
                            coincident = d2 < FA2_COINCIDENT_SQ; // the hashed kick is not modelled here: skip the node
                            const k = law(d2, pos[4 * i + 3], pos[4 * j + 3]);
                            for (let a = 0; a < 3; a++) {
                                ref[a] += d[a] * k;
                            }
                        }
                        if (coincident) {
                            continue;
                        }
                        const err = Math.hypot(...[0, 1, 2].map((a) => force[3 * i + a] - ref[a])) / Math.hypot(...ref);
                        expect(err, `${model}: node ${i} relative error`).toBeLessThan(TOLERANCE);
                        checked++;
                    }
                    expect(checked, "sampled nodes checked").toBeGreaterThan(SAMPLES.length / 2);
                } finally {
                    ctx.release(s);
                }
            },
            CASE_TIMEOUT,
        );
    }
});
