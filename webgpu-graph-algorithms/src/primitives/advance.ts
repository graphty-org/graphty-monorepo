/**
 * The `advance` primitive of design 6 row 8 (P8-T5 / P8-T12; the P8 plan's PD-1, PD-23, DEP-P8-A, DEP-P8-E): the
 * block-mapped expansion of a `Frontier`'s input queue into its edge queue by the `advance-expand` kernel, dispatched
 * INDIRECTLY from the level's `SLOT.expand`, which `frontier-finalize` role 0 wrote from `frontierCount` earlier in
 * the same pass; the host never knows the frontier's size. The kernel leaves `edgeCount` (clamped later by role 1),
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
 * A windowed core (spec 4.2: `colIdx` above `maxStorageBufferBindingSize`, bound as arc windows) is executed, not
 * refused (P8-T12 lifts DEP-P8-E for the frontier family): one indirect dispatch per window from the level's ONE
 * slot, the frontier and its count the same in every window, each dispatch binding that window's `colIdx` and
 * carrying its owned arc range in `arcBase` / `arcEnd` (`coreWindows`: the ranges partition the arcs, which P4's
 * overlapping window bounds do not). The body clips every row to the range, so a row straddling two windows emits
 * each arc exactly once, and the per-window dispatches accumulate into the same edge queue through the same
 * `edgeCount` reservation while `edgeCountUnclamped` and `frontierDegreeSum` add up across windows to the level's
 * totals. `src/primitives/**` never imports `src/context.ts`.
 */

import { FRONTIER_CANDIDATES, MAX_LEVELS_PER_SUBMIT } from "../constants.js";
import { WebGpuGraphError } from "../errors.js";
import { type Kernel } from "../kernel/kernel.js";
import { FRONTIER_PARAMS, graphBindings, graphOverrides, kernelSpec } from "../kernels.js";
import { type CoreBinding } from "../memory/residency.js";
import { type CoreWindow, coreWindows, rowCountOf } from "./core-shape.js";
import { type Frontier, type FrontierScope, SLOT } from "./frontier.js";

/** A prepared advance (design 6 row 8): records one indirect expansion of a frontier per level. */
export interface AdvancePlanner {
    /** The compiled `advance-expand` kernel (so `bfs-fused` can share its bind groups' shape). */
    readonly kernel: Kernel;
    /** The arc windows every level dispatches over: one over the whole core, or the windowed core's (P8-T12). */
    readonly windows: readonly CoreWindow[];
    /**
     * Records the expansion of `frontier.input` into `frontier.edgeQueue` as an indirect dispatch from `SLOT.expand`
     * of `level` per window: one `FrontierParams` record per window (`edgeCapacity`, `n`, `wg` and the window's
     * arc range) and the kernel bound to the window's graph arrays, the input queue, the counters block and the
     * edge queue (`Kernel.bind` reuses the bind groups of the same buffers and ranges, so the two sides of a
     * frontier cost two bind-group sets per window). A level outside `[0, MAX_LEVELS_PER_SUBMIT)` or a frontier
     * whose `n` is not the core's row count is E_INVALID_ARGUMENT before anything is recorded.
     * @param pass - the compute pass
     * @param frontier - the queue to expand (its `input` side)
     * @param level - the level inside the submit (the slot group role 0 wrote)
     */
    record(pass: GPUComputePassEncoder, frontier: Frontier, level: number): void;
}

/**
 * Compiles `advance-expand` for the core's weights pattern (no permutation: the frontier names rows directly) so
 * `record` is synchronous, and resolves the core's windows once. The planner lives exactly as long as the scope:
 * never use it after the scope's dispose().
 * @param scope - the caller's scope (pipelines, params)
 * @param core - the resident core arrays of the snapshot the frontier walks (windowed or not)
 * @returns the planner
 */
export async function prepareAdvance(scope: FrontierScope, core: CoreBinding): Promise<AdvancePlanner> {
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

/** The planner: the compiled kernel over one core's windows. */
class AdvancePlannerImpl implements AdvancePlanner {
    readonly kernel: Kernel;
    readonly windows: readonly CoreWindow[];
    private readonly scope: FrontierScope;
    private readonly n: number;

    /**
     * Wraps the resolved kernel; use prepareAdvance().
     * @param scope - the caller's scope
     * @param core - the core the kernel was compiled for
     * @param kernel - the `advance-expand` kernel
     */
    constructor(scope: FrontierScope, core: CoreBinding, kernel: Kernel) {
        this.scope = scope;
        this.kernel = kernel;
        this.windows = coreWindows(core);
        this.n = rowCountOf(core, "advance");
    }

    /**
     * Records one indirect expansion per window (see the interface).
     * @param pass - the compute pass
     * @param frontier - the queue to expand
     * @param level - the level inside the submit
     */
    record(pass: GPUComputePassEncoder, frontier: Frontier, level: number): void {
        assertInRange("level", level, 0, MAX_LEVELS_PER_SUBMIT - 1);
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
        const slot = level * FRONTIER_CANDIDATES + SLOT.expand;
        for (const w of this.windows) {
            const params = scope.params(FRONTIER_PARAMS, {
                wg: scope.workgroupSize,
                edgeCapacity: frontier.edgeCapacity,
                n: frontier.n,
                arcBase: w.arcBase,
                arcEnd: w.arcEnd,
            });
            const bound = this.kernel.bind({
                ...graphBindings(w.core, null),
                frontierIn: frontier.input,
                counters: frontier.counters,
                edgeQueue: frontier.edgeQueue,
                P: params.binding,
            });
            this.kernel.dispatchIndirect(pass, bound, frontier.args, slot, [params.offset]);
        }
    }
}
