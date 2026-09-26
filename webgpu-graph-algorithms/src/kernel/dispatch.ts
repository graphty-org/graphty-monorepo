/**
 * Dispatch planning (spec 5.2; contract 3.9): the 16,776,960 rule. `ceil(items / wg)` workgroups as a 1D dispatch
 * while the count fits one dimension (65,535 groups x 256 = 16,776,960 items, NOT 2^24), else a 2D grid whose
 * kernels linearise their id with the prelude's `linear_id()` and guard `id >= items`. Pure functions with no
 * device: every branch is unit-tested against faked capability tables.
 */

import { MAX_WORKGROUPS_PER_DIM } from "../constants.js";
import { WebGpuGraphError } from "../errors.js";
import { type PlanCaps } from "../types/context.js";

/** A dispatch shape (spec 5.2). `stride` is the grid-stride step (null for plain 1D / 2D plans). `z` is 1 from every planner; only K3's pass split sets it (issue #87). */
export interface DispatchPlan {
    readonly x: number;
    readonly y: number;
    readonly z: number;
    readonly items: number;
    readonly stride: number | null;
}

/**
 * The per-dimension workgroup limit a plan honours. PLAN DECISION: the minimum of the spec constant and the table's
 * `maxComputeWorkgroupsPerDimension`; the two are asserted equal on a real device at create() (spec 2.2), so every
 * capability table of the tests yields the same plans and a faked table below the constant is still honoured.
 * @param caps - the capability table
 * @returns the limit
 */
function perDimension(caps: PlanCaps): number {
    return Math.min(MAX_WORKGROUPS_PER_DIM, caps.limits.maxComputeWorkgroupsPerDimension);
}

/**
 * Validates a non-negative integer argument.
 * @param argument - the argument name
 * @param value - the value
 */
function assertCount(argument: string, value: number): void {
    if (!Number.isInteger(value) || value < 0) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", `${argument} must be a non-negative integer, got ${value}`, {
            argument,
            value,
            expected: "a non-negative integer",
        });
    }
}

/**
 * Validates a workgroup size: a power of two >= 1 (the reduction trees of 4.3 need it). Arithmetic, no bit tricks.
 * @param wg - the workgroup size
 */
function assertWorkgroupSize(wg: number): void {
    let rest = wg;
    while (Number.isInteger(rest) && rest > 1 && rest % 2 === 0) {
        rest /= 2;
    }
    if (rest !== 1) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", `wg must be a power of two, got ${wg}`, {
            argument: "wg",
            value: wg,
            expected: "a power of two >= 1",
        });
    }
}

/**
 * The grid of `groups` workgroups: 1D up to the per-dimension limit, else `x = limit`, `y = ceil(groups / limit)`.
 * @param groups - the workgroup count
 * @param items - the item count the plan covers (recorded in the plan)
 * @param caps - the capability table
 * @returns the plan
 */
function grid(groups: number, items: number, caps: PlanCaps): DispatchPlan {
    const limit = perDimension(caps);
    if (groups === 0) {
        return { x: 0, y: 1, z: 1, items, stride: null };
    }
    if (groups <= limit) {
        return { x: groups, y: 1, z: 1, items, stride: null };
    }
    const y = Math.ceil(groups / limit);
    if (y > limit) {
        throw new WebGpuGraphError(
            "E_TOO_LARGE",
            `${groups} workgroups exceed the 2D dispatch limit of ${limit * limit}`,
            {
                needed: groups,
                limit: limit * limit,
                path: "dispatch",
                algorithm: null,
                items,
            },
        );
    }
    return { x: limit, y, z: 1, items, stride: null };
}

/**
 * ceil(items / wg) groups as 1D up to MAX_WORKGROUPS_PER_DIM, else a 2D grid; items 0 -> { x: 0, y: 1 }; y above the limit -> E_TOO_LARGE.
 * @param items - the item count
 * @param wg - the workgroup size (a power of two)
 * @param caps - the capability table
 * @returns the plan
 */
export function plan1d(items: number, wg: number, caps: PlanCaps): DispatchPlan {
    assertCount("items", items);
    assertWorkgroupSize(wg);
    return grid(Math.ceil(items / wg), items, caps);
}

/**
 * The 2D form for a group count (x = MAX_WORKGROUPS_PER_DIM, y = ceil(groups / x)); exported for the indirect finalize kernel's host twin (P4).
 * PLAN DECISION: plan1d's rule applied to a group count (spec 5.4: the finalize kernel uses "the same rule as
 * plan1d") -- 1D `{ x: groups, y: 1 }` up to the per-dimension limit and the `x = limit` split only above it, through
 * the same `grid()` as plan1d so the two cannot drift; P4's finalize WGSL mirrors exactly this rule. `items` of the
 * returned plan is `groups` (the caller knows its own wg); groups 0 -> { x: 0, y: 1 }.
 * @param groups - the workgroup count
 * @param caps - the capability table
 * @returns the plan
 */
export function plan2d(groups: number, caps: PlanCaps): DispatchPlan {
    assertCount("groups", groups);
    return grid(groups, groups, caps);
}

/**
 * P7 (spec 5.2): groups = min(ceil(items / wg), maxGroups ?? (caps.software ? 64 : 4096), the per-dimension limit) with the kernel looping by `stride = groups * wg`; items 0 -> { x: 0, stride: null }.
 * The cap is the ONE performance default in src/ that may read `caps.software` (spec 2.4, 5.2): a grid-stride map is
 * order-independent, so the result never depends on it and the same body serves both adapters.
 * PLAN DECISION: `maxGroups?` is spelled `?: number` rather than the contract's `?: number | undefined` because the
 * root ESLint rule no-duplicate-type-constituents rejects the explicit undefined on an optional parameter (the call
 * signature is identical).
 * @param items - the item count
 * @param wg - the workgroup size
 * @param caps - the capability table
 * @param maxGroups - the group cap
 * @returns the plan
 */
export function planGridStride(items: number, wg: number, caps: PlanCaps, maxGroups?: number): DispatchPlan {
    assertCount("items", items);
    assertWorkgroupSize(wg);
    if (items === 0) {
        return { x: 0, y: 1, z: 1, items, stride: null };
    }
    const cap = Math.min(maxGroups ?? (caps.software ? 64 : 4096), perDimension(caps));
    const groups = Math.min(Math.ceil(items / wg), cap);
    return { x: groups, y: 1, z: 1, items, stride: groups * wg };
}

/**
 * P4 (spec 5.4): the (x, y, 1) args the device-side finalize kernel writes for a count -- plan1d's rule applied to a
 * u32 count through the same grid() as plan1d and plan2d, so the host twin and the kernel cannot drift; the kernel
 * (src/wgsl/indirect-finalize.wgsl.ts) mirrors exactly this arithmetic. `items` of the plan is the count. A count
 * outside [0, 2^32) is E_INVALID_ARGUMENT (the device holds it as a u32); for any u32 count y <= 1,025, so
 * E_TOO_LARGE is unreachable here.
 * @param count - the device-side count (a u32)
 * @param wg - the workgroup size (a power of two)
 * @param caps - the capability table
 * @returns the plan
 */
export function planIndirect(count: number, wg: number, caps: PlanCaps): DispatchPlan {
    assertCount("count", count);
    if (count > 0xffffffff) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", `count must fit a u32, got ${count}`, {
            argument: "count",
            value: count,
            expected: "an integer in [0, 2^32)",
        });
    }
    assertWorkgroupSize(wg);
    return grid(Math.ceil(count / wg), count, caps);
}

/**
 * The workgroup count of a plan (x * y).
 * @param plan - the plan
 * @returns the count
 */
export function groupsOf(plan: DispatchPlan): number {
    return plan.x * plan.y;
}
