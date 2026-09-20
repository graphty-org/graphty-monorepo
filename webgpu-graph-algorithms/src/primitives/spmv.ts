/**
 * The pull SpMV primitive of spec 6 row 9 / 8.2 in its thread-per-row tier (P7; M8b plan PD-1 / PD-2): one
 * grid-stride dispatch of the `spmv-pull` module over the rows of a REVERSE adjacency, each invocation folding
 * `weight * xNorm[nbr]` over its row's in-arcs (Kahan-compensated, f32) and writing
 * `rankOut[v] = beta * pv + alpha * (sum + danglingMass * pv)`, where `pv` is `personalization[v]` under
 * HAS_PERSONALIZATION and the uniform `P.uniformP` otherwise, and `danglingMass` is `partials[0].danglingMass`
 * under USE_DANGLING. PageRank sets alpha to the damping, beta to 1 - alpha and USE_DANGLING; HITS and eigenvector
 * set alpha 1, beta 0, uniformP 0; Katz sets alpha to the attenuation, beta to its constant and uniformP 1.
 *
 * It is its own registry entry rather than a `segmentedReduce` VALUE snippet (PD-1): the snippet vocabulary is
 * `row, arc, nbr, weight, v` and cannot read `xNorm[nbr]`, and the design's binding table gives the kernel eight
 * storage bindings of its own. The in-degree tiers of `reverseDegreeOrder()` land at P4 (PD-2): `tiers !== null` is
 * E_UNSUPPORTED and USE_PERM is always false (the perm slot carries the rowPtr dummy of graphBindings). The row and
 * arc counts come from the core's binding sizes exactly as segmentedReduce derives them.
 */

import { WebGpuGraphError } from "../errors.js";
import { planGridStride } from "../kernel/dispatch.js";
import { type Kernel } from "../kernel/kernel.js";
import { graphBindings, graphOverrides, kernelSpec, SPMV_PARAMS } from "../kernels.js";
import { type CoreBinding } from "../memory/residency.js";
import { type Binding } from "../types/memory.js";
import { arcCountOf, assertNotWindowed, rowCountOf } from "./core-shape.js";
import { type ReduceScope } from "./reduce.js";
import { type DegreeTiers } from "./segmented-reduce.js";

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

/** Options of prepareSpmvPull: the two variant flags, the weights binding and the tiers (must be null at P7). */
export interface SpmvPullOptions {
    readonly personalization: boolean;
    readonly dangling: boolean;
    /** The weights binding to fold with: `undefined` takes the core's, `null` runs UNWEIGHTED on a weighted core. */
    readonly weights?: Binding | null | undefined;
    readonly tiers: DegreeTiers | null;
}

/** A prepared pull: records ONE grid-stride dispatch over the rows of a reverse core into a pass. */
export interface SpmvPullPlanner {
    /** Records the dispatch over rows [0, n) of `rev` writing rankOut[v] (f32) per row; nothing for n = 0. */
    record(pass: GPUComputePassEncoder, rev: CoreBinding, resources: SpmvResources, coefficients: SpmvCoefficients): void;
    /** Dispatches the last record() issued (1, or 0 for n = 0). */
    readonly lastDispatches: number;
}

/** The thread-per-row planner: ONE `spmv-pull` dispatch, grid-stride over every row. */
class SpmvPullPlannerImpl implements SpmvPullPlanner {
    private readonly scope: ReduceScope;
    private readonly kernel: Kernel;
    private readonly weights: Binding | null | undefined;
    private dispatches = 0;

    /**
     * Wraps a compiled pipeline with the weights choice it was compiled for.
     * @param scope - the scope the pipeline was prepared in
     * @param kernel - the compiled kernel
     * @param weights - the weights option the pipeline's HAS_WEIGHTS was derived from; record() binds the same way
     */
    constructor(scope: ReduceScope, kernel: Kernel, weights: Binding | null | undefined) {
        this.scope = scope;
        this.kernel = kernel;
        this.weights = weights;
    }

    /**
     * Dispatches the last record() issued.
     * @returns 1, or 0 when the last record covered no rows
     */
    get lastDispatches(): number {
        return this.dispatches;
    }

    /**
     * Records the dispatch: rows [0, n), arcs [0, arcCount), planGridStride(n); nothing for n = 0 (no zero-length
     * binding is ever created). `personalization ?? xNorm` follows the group-0 dummy rule: both slots are
     * storage-ro, so the aliasing check of Kernel.bind does not fire, and HAS_PERSONALIZATION false never reads it.
     * @param pass - the pass to record into
     * @param rev - the reverse core (any snapshot with the weights pattern the planner was prepared for)
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
        const plan = planGridStride(n, this.scope.workgroupSize, this.scope.caps);
        if (plan.x === 0) {
            this.dispatches = 0;
            return;
        }
        const params = this.scope.params(SPMV_PARAMS, {
            n,
            arcBase: 0,
            arcEnd: arcCountOf(rev),
            stride: plan.stride ?? n,
            alpha: coefficients.alpha,
            beta: coefficients.beta,
            uniformP: coefficients.uniformP,
            pad0: 0,
        });
        const bound = this.kernel.bind({
            ...graphBindings(rev, null, this.weights),
            xNorm: resources.xNorm,
            rankOut: resources.rankOut,
            personalization: resources.personalization ?? resources.xNorm,
            partials: resources.partials,
            P: params.binding,
        });
        this.kernel.dispatch(pass, bound, plan, [params.offset]);
        this.dispatches = 1;
    }
}

/**
 * Prepares the thread-per-row pull pipeline for a reverse core's weights pattern and the two variant flags.
 * @param scope - the reduce scope (pipelines, params writer)
 * @param rev - the reverse core whose weights pattern selects HAS_WEIGHTS (USE_PERM is false: no tiers at P7)
 * @param options - personalization, dangling, weights, tiers (must be null)
 * @returns the planner
 */
export async function prepareSpmvPull(
    scope: ReduceScope,
    rev: CoreBinding,
    options: SpmvPullOptions,
): Promise<SpmvPullPlanner> {
    if (options.tiers !== null) {
        throw new WebGpuGraphError("E_UNSUPPORTED", "spmvPull: the in-degree tiers land at P4; pass tiers: null", {
            feature: "spmvPull.tiers",
        });
    }
    assertNotWindowed(rev, "spmvPull");
    const spec = kernelSpec("spmv-pull", {
        ...graphOverrides(rev, null, options.weights),
        HAS_PERSONALIZATION: options.personalization,
        USE_DANGLING: options.dangling,
    });
    const kernel = await scope.pipelines.kernel(spec);
    return new SpmvPullPlannerImpl(scope, kernel, options.weights);
}
