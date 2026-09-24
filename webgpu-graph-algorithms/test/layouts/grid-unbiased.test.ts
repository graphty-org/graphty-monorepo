/**
 * The unbiasedness item of the exact-vs-grid gate (spec 11.4 item 3; P4-T11; PD-19, PD-20), in a file of its own:
 * the mean of G7's force over UNBIASED_SEEDS seeded iterations at nearMax 8 on the one-cell fixtures is within
 * grid-unbiased of the exact tier's force in the WHOLE-FIELD norm (|mean - exact| / |exact|, fieldRelError), with
 * the ladder of every doubling from 32 seeds printed -- the whole-field ratio and the floored per-node RMS -- so
 * the 1 / sqrt(seeds) descent of an unbiased estimator is on record (G4-F2: the per-node RMS of a 32-seed mean is
 * the sampling variance of eight draws of a 20,000-entry cell, not the estimator's bias).
 *
 * Why it is not in grid-exact.test.ts with the rest of the gate's items (G4-F13): the two ladders submit
 * 2 x UNBIASED_SEEDS grid iterations, and a Dawn process does not return the memory an iteration takes --
 * measured at roughly 0.67 MB per iteration on Mesa's software rasteriser, reclaimed neither by disposing the
 * simulation nor by destroying the device, so it is the driver's to keep. Together with the rest of that suite it
 * put one worker over 6 GB, and two such workers over a 16 GB runner: the continuous integration shard lost a
 * worker three times with no test having failed. Vitest gives every FILE its own process, so this split is what
 * bounds the cost.
 */

import { type GpuContext } from "../../src/context.js";
import {
    GRID_BASE_OPTIONS,
    gridFixture,
    gridTolerance,
    NEAR_MAX_SAMPLING,
    UNBIASED_LADDER_FIRST,
    UNBIASED_SEEDS,
    UNBIASED_SEEDS_SOFTWARE,
    unbiasedLadder,
} from "../helpers/grid-parity.js";
import { assertCheckPasses, ratioOf } from "../helpers/sabotage.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

const CASE_TIMEOUT = 600_000;

describe("exact vs grid: unbiasedness (spec 11.4 item 3)", () => {
    let ctx: GpuContext;

    beforeAll(async () => {
        ctx = await acquire({ label: "grid-unbiased" });
    });

    for (const name of ["hubcell", "onecell1025"]) {
        it(
            `(3) ${name} at nearMax ${NEAR_MAX_SAMPLING}: the mean of G7's force over the seed ladder is within grid-unbiased of the exact tier's over the whole force field (the ladder from ${UNBIASED_LADDER_FIRST} seeds printed; ${UNBIASED_SEEDS} seeds asserted on hardware, ${UNBIASED_SEEDS_SOFTWARE} printed on a software rasteriser)`,
            async (t) => {
                requireGpu(t);
                const { snapshot: s, start } = gridFixture(name, gpuScale(), GRID_BASE_OPTIONS);
                try {
                    const t0 = performance.now();
                    const { software } = ctx.caps;
                    const seeds = software ? UNBIASED_SEEDS_SOFTWARE : UNBIASED_SEEDS;
                    const u = await unbiasedLadder(ctx, s, start, GRID_BASE_OPTIONS, seeds);
                    const tolerance = gridTolerance("grid-unbiased").value;
                    const top = u.rungs[u.rungs.length - 1];
                    console.warn(
                        `[grid-unbiased] unbiased/${name}/n=${s.nodeCount}: |mean - exact| / |exact| over the whole force field at ${top.seeds} seeds ${top.field.toExponential(3)} (tolerance ${tolerance.toExponential(3)}); rms of the floored per-node error of the same mean ${top.rms.toExponential(3)}, of one seed ${u.rmsOneSeed.toExponential(3)}; ${seeds} grid iterations ${(performance.now() - t0).toFixed(0)} ms`,
                    );
                    console.warn(
                        `[grid-unbiased] unbiased/${name}/n=${s.nodeCount} ladder (seeds: whole-field ratio / per-node rms): ${u.rungs.map((r) => `${r.seeds}: ${r.field.toExponential(3)} / ${r.rms.toExponential(3)}`).join("; ")}`,
                    );
                    if (software) {
                        // PRINTED, not asserted (G4-F18): five doublings short of the recorded floor, a mean of
                        // 128 seeds sits about 5.7x above it by the estimator's own 1 / sqrt(seeds) descent, so
                        // asserting the hardware tolerance here would fail on arithmetic rather than on a defect.
                        // The full ladder runs and asserts on the GPU lane, which is where the floor was measured.
                        return;
                    }
                    assertCheckPasses({
                        worst: ratioOf(top.field, tolerance),
                        worstLabel: `unbiased/${name}`,
                        samples: s.nodeCount,
                    });
                } finally {
                    ctx.release(s);
                }
            },
            CASE_TIMEOUT,
        );
    }
});
