/**
 * The `advance` primitive of design 6 row 8 (P8-T5; the P8 plan's PD-1, PD-23, DEP-P8-A, DEP-P8-E): the block-mapped
 * expansion of a `Frontier`'s input queue into its edge queue by the `advance-expand` kernel, dispatched INDIRECTLY
 * from the level's `SLOT.expand`, which `frontier-finalize` role 0 wrote from `frontierCount` earlier in the same
 * pass; the host never knows the frontier's size. The kernel leaves `edgeCount` (clamped later by role 1),
 * `edgeCountUnclamped` (the overflow detector) and `frontierDegreeSum` in the counters block.
 *
 * Design 6 row 8 names three structures -- block-mapped, a WORKGROUP_PER_ROW tier for rows above 1,024 arcs, and a
 * subgroup tier. Here they are: the block-mapped body is the large-frontier kernel and already balances a hub row
 * over all `WG` lanes of its block (a 10,000-degree entry costs its block 40 strips, never one lane 10,000 reads);
 * the workgroup-per-row structure IS `bfs-fused` (P8-T7), one workgroup per frontier entry, which the selector
 * chooses for a small frontier such as a hub-only level, so `advance-expand` declares no `TIER` override and the tier
 * choice is the fused / two-phase choice; and the subgroup tier is not a second body but the same body compiled
 * against the prelude's subgroup helper block (`wg_scan_u32` becomes `subgroupExclusiveAdd` / `subgroupAdd` plus the
 * elected-lane slot carry), which `needs: ["subgroups"]` in the registry entry switches on when the device has the
 * feature. Both forms return each lane's prefix in LANE order, so the arcs land at the same queue positions; only
 * the order ACROSS workgroups (the `atomicAdd` reservation order) is schedule-dependent, which is why a test compares
 * sorted queues.
 *
 * Until P8-T12 lifts DEP-P8-E the core must be whole (`assertNotWindowed`), and the caller passes the whole arc
 * range as the window. `src/primitives/**` never imports `src/context.ts`.
 */

import { FRONTIER_CANDIDATES, MAX_LEVELS_PER_SUBMIT } from "../constants.js";
import { WebGpuGraphError } from "../errors.js";
import { type Kernel } from "../kernel/kernel.js";
import { FRONTIER_PARAMS, graphBindings, graphOverrides, kernelSpec } from "../kernels.js";
import { type CoreBinding } from "../memory/residency.js";
import { arcCountOf, assertNotWindowed, rowCountOf } from "./core-shape.js";
import { type Frontier, type FrontierScope, SLOT } from "./frontier.js";

/** A prepared advance (design 6 row 8): records one indirect expansion of a frontier per level. */
export interface AdvancePlanner {
    /** The compiled `advance-expand` kernel (so `bfs-fused` can share its bind groups' shape). */
    readonly kernel: Kernel;
    /**
     * Records the expansion of `frontier.input` into `frontier.edgeQueue` as an indirect dispatch from `SLOT.expand`
     * of `level`: one `FrontierParams` record (`edgeCapacity`, `n`, `wg` and the window) and the kernel bound to the
     * graph, the input queue, the counters block and the edge queue (`Kernel.bind` reuses the bind groups of the same
     * buffers, so the two sides of a frontier cost two bind-group sets). A level outside
     * `[0, MAX_LEVELS_PER_SUBMIT)`, a window outside `[0, arcCount]` or reversed, or a frontier whose `n` is not the
     * core's row count is E_INVALID_ARGUMENT before anything is recorded.
     * @param pass - the compute pass
     * @param frontier - the queue to expand (its `input` side)
     * @param level - the level inside the submit (the slot group role 0 wrote)
     * @param window - the bound arc window of the core's arcs (the whole range until P8-T12)
     * @param window.arcBase - the first bound arc
     * @param window.arcEnd - one past the last bound arc
     */
    record(
        pass: GPUComputePassEncoder,
        frontier: Frontier,
        level: number,
        window: { readonly arcBase: number; readonly arcEnd: number },
    ): void;
}

/**
 * Compiles `advance-expand` for the core's weights pattern (no permutation: the frontier names rows directly) so
 * `record` is synchronous. A windowed core is E_UNSUPPORTED { feature: "advance.windowed" } until P8-T12. The planner
 * lives exactly as long as the scope: never use it after the scope's dispose().
 * @param scope - the caller's scope (pipelines, params)
 * @param core - the resident core arrays of the snapshot the frontier walks
 * @returns the planner
 */
export async function prepareAdvance(scope: FrontierScope, core: CoreBinding): Promise<AdvancePlanner> {
    assertNotWindowed(core, "advance");
    const kernel = await scope.pipelines.kernel(kernelSpec("advance-expand", graphOverrides(core, null)));
    return new AdvancePlannerImpl(scope, core, kernel);
}

/**
 * The E_INVALID_ARGUMENT of a value that is not an integer inside `[lo, hi]`.
 * @param argument - the argument name
 * @param value - the value
 * @param lo - the smallest legal value
 * @param hi - the largest legal value
 */
function assertInRange(argument: string, value: number, lo: number, hi: number): void {
    if (!Number.isInteger(value) || value < lo || value > hi) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", `advance: ${argument} ${value} is outside [${lo}, ${hi}]`, {
            argument,
            value,
            expected: `an integer in [${lo}, ${hi}]`,
        });
    }
}

/** The planner: the compiled kernel over one core. */
class AdvancePlannerImpl implements AdvancePlanner {
    readonly kernel: Kernel;
    private readonly scope: FrontierScope;
    private readonly core: CoreBinding;
    private readonly n: number;
    private readonly arcCount: number;

    /**
     * Wraps the resolved kernel; use prepareAdvance().
     * @param scope - the caller's scope
     * @param core - the core the kernel was compiled for
     * @param kernel - the `advance-expand` kernel
     */
    constructor(scope: FrontierScope, core: CoreBinding, kernel: Kernel) {
        this.scope = scope;
        this.core = core;
        this.kernel = kernel;
        this.n = rowCountOf(core, "advance");
        this.arcCount = arcCountOf(core);
    }

    /**
     * Records one indirect expansion (see the interface).
     * @param pass - the compute pass
     * @param frontier - the queue to expand
     * @param level - the level inside the submit
     * @param window - the bound arc window
     * @param window.arcBase - the first bound arc
     * @param window.arcEnd - one past the last bound arc
     */
    record(
        pass: GPUComputePassEncoder,
        frontier: Frontier,
        level: number,
        window: { readonly arcBase: number; readonly arcEnd: number },
    ): void {
        assertInRange("level", level, 0, MAX_LEVELS_PER_SUBMIT - 1);
        assertInRange("arcBase", window.arcBase, 0, this.arcCount);
        assertInRange("arcEnd", window.arcEnd, window.arcBase, this.arcCount);
        if (frontier.n !== this.n) {
            throw new WebGpuGraphError(
                "E_INVALID_ARGUMENT",
                `advance: the frontier holds ${frontier.n} vertices, the core ${this.n} rows`,
                {
                    argument: "frontier",
                    value: frontier.n,
                    expected: this.n,
                },
            );
        }
        const { scope } = this;
        const params = scope.params(FRONTIER_PARAMS, {
            wg: scope.workgroupSize,
            edgeCapacity: frontier.edgeCapacity,
            n: frontier.n,
            arcBase: window.arcBase,
            arcEnd: window.arcEnd,
        });
        const bound = this.kernel.bind({
            ...graphBindings(this.core, null),
            frontierIn: frontier.input,
            counters: frontier.counters,
            edgeQueue: frontier.edgeQueue,
            P: params.binding,
        });
        this.kernel.dispatchIndirect(pass, bound, frontier.args, level * FRONTIER_CANDIDATES + SLOT.expand, [
            params.offset,
        ]);
    }
}
