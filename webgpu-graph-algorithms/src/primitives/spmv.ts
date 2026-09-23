/**
 * The pull SpMV primitive of spec 6 row 9 / 8.2 (P7; M8b plan PD-1 / PD-2): the `spmv-pull` module over the rows of
 * a REVERSE adjacency, each row folding `weight * xNorm[nbr]` over its in-arcs (a two-level f32 sum) and writing
 * `rankOut[v] = beta * pv + alpha * (sum + danglingMass * pv)`, where `pv` is `personalization[v]` under
 * HAS_PERSONALIZATION and the uniform `P.uniformP` otherwise, and `danglingMass` is `partials[0].danglingMass`
 * under USE_DANGLING. PageRank sets alpha to the damping, beta to 1 - alpha and USE_DANGLING; HITS and eigenvector
 * set alpha 1, beta 0, uniformP 0; Katz sets alpha to the attenuation, beta to its constant and uniformP 1.
 *
 * It is its own registry entry rather than a `segmentedReduce` VALUE snippet (PD-1): the snippet vocabulary is
 * `row, arc, nbr, weight, v` and cannot read `xNorm[nbr]`, and the design's binding table gives the kernel eight
 * storage bindings of its own. Without tiers it is ONE grid-stride dispatch (TIER 0, USE_PERM false: the perm slot
 * carries the rowPtr dummy of graphBindings); with the in-degree tiers of `reverseDegreeOrder()` (P4-T5, PD-6) it
 * is up to three dispatches over the permuted rows -- TIER 2 one workgroup per row over [0, hiEnd), TIER 1 32 lanes
 * per row over [hiEnd, midEnd), TIER 0 grid-stride over [midEnd, n) -- each compiled only when its range is
 * non-empty. The row and arc counts come from the core's binding sizes exactly as segmentedReduce derives them.
 */

import { WebGpuGraphError } from "../errors.js";
import { plan1d, planGridStride } from "../kernel/dispatch.js";
import { type Kernel } from "../kernel/kernel.js";
import { graphBindings, graphOverrides, kernelSpec, SPMV_PARAMS } from "../kernels.js";
import { type CoreBinding } from "../memory/residency.js";
import { type Binding } from "../types/memory.js";
import { arcCountOf, assertNotWindowed, type DegreeTiers, MID_TIER_LANES, rowCountOf } from "./core-shape.js";
import { type ReduceScope } from "./reduce.js";

/** The group-1 bindings of one pull: the pre-scaled input, the output, the personalization (null binds xNorm as the dummy) and the PrPartial block whose header carries danglingMass. */
export interface SpmvResources {
    readonly xNorm: Binding;
    readonly rankOut: Binding;
    readonly personalization: Binding | null;
    readonly partials: Binding;
}

/** The scalar coefficients of one pull (SpmvParams alpha / beta / uniformP). */
export interface SpmvCoefficients {
    readonly alpha: number;
    readonly beta: number;
    readonly uniformP: number;
}

/** Options of prepareSpmvPull: the two variant flags, the weights binding and the in-degree tiers (null: one grid-stride dispatch). */
export interface SpmvPullOptions {
    readonly personalization: boolean;
    readonly dangling: boolean;
    /** The weights binding to fold with: `undefined` takes the core's, `null` runs UNWEIGHTED on a weighted core. */
    readonly weights?: Binding | null | undefined;
    readonly tiers: DegreeTiers | null;
}

/** A prepared pull: records one grid-stride dispatch (no tiers) or up to three tier dispatches over the rows of a reverse core into a pass. */
export interface SpmvPullPlanner {
    /** Records the dispatches over rows [0, n) of `rev` writing rankOut[v] (f32) per row; nothing for n = 0. */
    record(
        pass: GPUComputePassEncoder,
        rev: CoreBinding,
        resources: SpmvResources,
        coefficients: SpmvCoefficients,
    ): void;
    /** Dispatches the last record() issued (0 for n = 0; 1 without tiers; 1 to 3 with them). */
    readonly lastDispatches: number;
}

/** One tier's compiled pipeline and the rows [start, end) of the permutation it covers per record() (a tier whose range is empty is not compiled). */
interface TierDispatch {
    readonly tier: 0 | 1 | 2;
    readonly kernel: Kernel;
    readonly start: number;
    readonly end: number;
}

/**
 * The tiered planner: without tiers ONE `spmv-pull` dispatch, grid-stride over every row; with tiers TIER 2 over
 * [0, hiEnd) (one workgroup per row), then TIER 1 over [hiEnd, midEnd) (WG / 32 rows per workgroup), then TIER 0
 * grid-stride over [midEnd, n), each with its own SpmvParams record (`n` is the range END) and the perm binding.
 */
class SpmvPullPlannerImpl implements SpmvPullPlanner {
    private readonly scope: ReduceScope;
    private readonly tiers: readonly TierDispatch[];
    private readonly perm: Binding | null;
    private readonly weights: Binding | null | undefined;
    private dispatches = 0;

    /**
     * Wraps the compiled tier pipelines with the choices they were compiled for.
     * @param scope - the scope the pipelines were prepared in
     * @param tiers - the compiled tiers in dispatch order (TIER 2, 1, 0; only the non-empty ones)
     * @param perm - the reverseDegreeOrder permutation binding (null: USE_PERM false, rows are node indices)
     * @param weights - the weights option the pipelines' HAS_WEIGHTS was derived from; record() binds the same way
     */
    constructor(
        scope: ReduceScope,
        tiers: readonly TierDispatch[],
        perm: Binding | null,
        weights: Binding | null | undefined,
    ) {
        this.scope = scope;
        this.tiers = tiers;
        this.perm = perm;
        this.weights = weights;
    }

    /**
     * Dispatches the last record() issued.
     * @returns 0 when the last record covered no rows, else the number of non-empty tier ranges
     */
    get lastDispatches(): number {
        return this.dispatches;
    }

    /**
     * Records the dispatches: every tier's rows over the arcs [0, arcCount), each with its own params record (TIER 0
     * grid-stride through planGridStride, the tiers through plan1d); nothing for n = 0 (no zero-length binding is
     * ever created). `personalization ?? xNorm` follows the group-0 dummy rule: both slots are storage-ro, so the
     * aliasing check of Kernel.bind does not fire, and HAS_PERSONALIZATION false never reads it.
     * @param pass - the pass to record into
     * @param rev - the reverse core (any snapshot with the weights pattern the planner was prepared for; with tiers,
     * the one the tiers were built from)
     * @param resources - xNorm, rankOut, personalization, partials
     * @param coefficients - alpha, beta, uniformP
     */
    record(
        pass: GPUComputePassEncoder,
        rev: CoreBinding,
        resources: SpmvResources,
        coefficients: SpmvCoefficients,
    ): void {
        const n = rowCountOf(rev, "spmvPull");
        const wg = this.scope.workgroupSize;
        this.dispatches = 0;
        for (const { tier, kernel, start, end } of this.tiers) {
            const last = tier === 0 ? n : end;
            const rows = last - start;
            if (rows <= 0) {
                continue;
            }
            const plan =
                tier === 0
                    ? planGridStride(rows, wg, this.scope.caps)
                    : plan1d(rows, tier === 2 ? 1 : wg / MID_TIER_LANES, this.scope.caps);
            if (plan.x === 0) {
                continue;
            }
            const params = this.scope.params(SPMV_PARAMS, {
                n: last,
                arcBase: 0,
                arcEnd: arcCountOf(rev),
                stride: plan.stride ?? rows,
                alpha: coefficients.alpha,
                beta: coefficients.beta,
                uniformP: coefficients.uniformP,
                start,
            });
            const bound = kernel.bind({
                ...graphBindings(rev, this.perm, this.weights),
                xNorm: resources.xNorm,
                rankOut: resources.rankOut,
                personalization: resources.personalization ?? resources.xNorm,
                partials: resources.partials,
                P: params.binding,
            });
            kernel.dispatch(pass, bound, plan, [params.offset]);
            this.dispatches++;
        }
    }
}

/**
 * Prepares the pull pipelines for a reverse core's weights pattern and the two variant flags: TIER 0 always
 * (USE_PERM = tiers !== null); TIER 1 iff a row of in-degree 32..1023 exists (segmentOffsets[2] >
 * segmentOffsets[1]); TIER 2 iff a row of in-degree >= 1024 exists (segmentOffsets[1] > 0). The mid tier folds 32
 * lanes per row, so a device whose workgroup size is below 32 is E_UNSUPPORTED { feature: "spmvPull.tiers" }.
 * @param scope - the reduce scope (pipelines, params writer)
 * @param rev - the reverse core whose weights pattern selects HAS_WEIGHTS
 * @param options - personalization, dangling, weights, tiers (null: the single grid-stride dispatch)
 * @returns the planner
 */
export async function prepareSpmvPull(
    scope: ReduceScope,
    rev: CoreBinding,
    options: SpmvPullOptions,
): Promise<SpmvPullPlanner> {
    assertNotWindowed(rev, "spmvPull");
    const { tiers } = options;
    const perm = tiers?.perm ?? null;
    if (tiers !== null && scope.workgroupSize < MID_TIER_LANES) {
        throw new WebGpuGraphError(
            "E_UNSUPPORTED",
            `spmvPull: the mid tier folds ${MID_TIER_LANES} lanes per row, more than the workgroup size ${scope.workgroupSize}`,
            { feature: "spmvPull.tiers" },
        );
    }
    const ranges: readonly { readonly tier: 0 | 1 | 2; readonly start: number; readonly end: number }[] =
        tiers === null
            ? [{ tier: 0, start: 0, end: rowCountOf(rev, "spmvPull") }]
            : [
                  { tier: 2, start: 0, end: tiers.segmentOffsets[1] },
                  { tier: 1, start: tiers.segmentOffsets[1], end: tiers.segmentOffsets[2] },
                  { tier: 0, start: tiers.segmentOffsets[2], end: tiers.segmentOffsets[4] },
              ];
    const compiled: TierDispatch[] = [];
    for (const range of ranges) {
        if (range.tier !== 0 && range.end <= range.start) {
            continue;
        }
        const spec = kernelSpec("spmv-pull", {
            ...graphOverrides(rev, perm, options.weights),
            HAS_PERSONALIZATION: options.personalization,
            USE_DANGLING: options.dangling,
            TIER: range.tier,
        });
        compiled.push({ ...range, kernel: await scope.pipelines.kernel(spec) });
    }
    return new SpmvPullPlannerImpl(scope, compiled, perm, options.weights);
}
