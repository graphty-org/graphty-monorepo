/**
 * The force-sum invariant of the spring-electrical preset (CLAUDE.md "Adding a Layout Model" step 6; P5-T4 Step 2,
 * fr-force-sum.test.ts applied to the preset): both laws are antisymmetric -- the Coulomb repulsion -g m_i m_j / d^2
 * is odd in d and symmetric in the pair (the mass product commutes), the Hooke spring k_s (d - L) acts once per arc
 * and the two arcs of an undirected edge are opposite, the coincident kick is antisymmetric by construction -- so
 * after ONE iteration the `force` stage (what K3 leaves in `force`; the drag is applied by K5 and is not a pair
 * force) obeys |sum_i F_i| <= tol x sum_i |F_i| on every fixture including the coincident one, with
 * tol = se-force-sum, traced to the force-parity basis row. Run twice, bitwise first.
 */

import type { F32, GraphSnapshot } from "@graphty/graph-format";

import type { GpuContext } from "../../src/context.js";
import { asF32, type ParityGraph, paritySnapshot, startPositions } from "../helpers/fa2-parity.js";
import { fixture } from "../helpers/graphs.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { assertCheckPasses, type CheckReport, mergeReports, ratioOf } from "../helpers/sabotage.js";
import { SE_BASE_OPTIONS, SE_TUNING, seStages, seTolerance, withSeSim } from "../helpers/se-parity.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

const CASE_TIMEOUT = 300_000;

interface SumCase {
    readonly name: string;
    readonly snapshot: () => GraphSnapshot;
    readonly positions: () => F32 | null;
}

function parity(graph: ParityGraph): SumCase {
    return {
        name: graph,
        snapshot: () => paritySnapshot(graph, gpuScale(), false),
        positions: () => null,
    };
}

const CASES: readonly SumCase[] = [
    parity("karate"),
    parity("grid10"),
    parity("star200"),
    parity("path10"),
    parity("random1k"),
    {
        name: "fixture:coincident",
        snapshot: () => fixture("coincident", gpuScale()).snapshot,
        positions: () => fixture("coincident", gpuScale()).positions,
    },
];

function netForceRatio(force: F32, n: number): { readonly ratio: number; readonly total: number } {
    let sx = 0;
    let sy = 0;
    let sz = 0;
    let total = 0;
    for (let i = 0; i < n; i++) {
        sx += force[3 * i];
        sy += force[3 * i + 1];
        sz += force[3 * i + 2];
        total += Math.hypot(force[3 * i], force[3 * i + 1], force[3 * i + 2]);
    }
    return { ratio: total === 0 ? Number.POSITIVE_INFINITY : Math.hypot(sx, sy, sz) / total, total };
}

describe("spring-electrical force-sum invariant: one iteration, |sum F| <= tol x sum |F| (spec 11.4; step 6)", () => {
    let ctx: GpuContext;
    const reports: CheckReport[] = [];

    beforeAll(async () => {
        ctx = await acquire({ label: "se-force-sum" });
    });

    for (const c of CASES) {
        it(
            `${c.name}: the net force vanishes within the traced tolerance, twice bitwise`,
            async (t) => {
                requireGpu(t);
                const s = c.snapshot();
                try {
                    const start = c.positions() ?? startPositions(s, SE_BASE_OPTIONS, false);
                    const runOnce = (): Promise<F32> =>
                        withSeSim(ctx, SE_BASE_OPTIONS, SE_TUNING, async (sim) => {
                            sim.load(s, Float32Array.from(start));
                            const st = seStages(sim);
                            await st.run("K3");
                            return asF32(await st.read("force"));
                        });
                    const a = await runOnce();
                    const b = await runOnce();
                    expectBitwiseEqual(a, b, `${c.name}: run 1 vs run 2`);
                    const { ratio, total } = netForceRatio(a, s.nodeCount);
                    expect(total, `${c.name}: some force exists`).toBeGreaterThan(0);
                    const report: CheckReport = {
                        worst: ratioOf(ratio, seTolerance("se-force-sum").value),
                        worstLabel: c.name,
                        samples: s.nodeCount,
                    };
                    reports.push(report);
                    console.warn(
                        `[se-force-sum] ${c.name}: |sum F| / sum |F| = ${ratio.toExponential(3)} (ratio ${report.worst.toExponential(3)})`,
                    );
                    assertCheckPasses(report);
                } finally {
                    ctx.release(s);
                }
            },
            CASE_TIMEOUT,
        );
    }

    it("prints the worst ratio of the fixture set", () => {
        const worst = mergeReports(reports);
        console.warn(`[se-force-sum] worst ${worst.worst.toExponential(3)} at ${worst.worstLabel}`);
    });
});
