/**
 * The option and value helpers every force model's resolver and stats decoder share (P5 PD-7): moved verbatim
 * from src/layouts/forceatlas2.ts (P3-T2) so the Fruchterman-Reingold and spring-electrical models of P5 neither
 * copy them nor import a sibling model; and, since P4-T6, the K2 tier binding and dispatch the three models share
 * (`bindAttraction` / `recordAttraction`, P4 PD-7), so every model's bind() / recordIteration() calls one function
 * instead of holding its own copy. Layout zone.
 */

import { WebGpuGraphError } from "../errors.js";
import { type DispatchPlan, plan1d } from "../kernel/dispatch.js";
import { type BoundKernel, type Kernel } from "../kernel/kernel.js";
import { type UniformValues } from "../kernel/struct-block.js";
import { graphBindings, kernelSpec } from "../kernels.js";
import { MID_TIER_LANES } from "../primitives/core-shape.js";
import { type Binding } from "../types/memory.js";
import { type ModelResources } from "./force-simulation.js";

/** An override record as the kernel layer takes it. */
export type Overrides = Readonly<Record<string, number | boolean>>;

/** The K2 (`fa2-attraction`) dispatches of one iteration: `[kernel, bind group, plan]` in dispatch order TIER 2, TIER 1, TIER 0 (only the tiers whose row range is non-empty). */
export interface AttractionBound {
    readonly kernels: readonly (readonly [Kernel, BoundKernel, DispatchPlan])[];
}

/** The group-1 / group-2 bindings of K2 every tier dispatch shares: `pos` (vec4f, mass in w), `force` (stride-3 f32) and the Fa2Params slot of the UniformRing. @public the bindings parameter of bindAttraction */
export interface AttractionBindings {
    readonly pos: Binding;
    readonly force: Binding;
    readonly params: Binding;
}

/**
 * Compiles (through the cache) and binds the `fa2-attraction` pipelines a load needs against the graph group and
 * { pos, force, P } (P4 PD-7): TIER 0 always; TIER 1 when a row of degree 32..1023 exists (`[hiEnd, midEnd)` is
 * non-empty); TIER 2 when a row of degree >= 1024 exists (`hiEnd > 0`). The dispatch plans are one workgroup per
 * row for TIER 2, `WG / 32` rows per workgroup for TIER 1 and one row per thread for TIER 0, over each tier's row
 * count (the K2 body reads its range from `Fa2Params.hiEnd` / `midEnd` / `tierStart` / `tierEnd`). The TIER 1 / 2
 * pipelines compile on the first load that needs them (a one-time cost at that load); a model's `specs()` lists
 * the TIER 0 spec only, because it has no `n` to know which tiers a load needs. A device whose workgroup size is
 * below 32 cannot fold the mid tier: E_UNSUPPORTED { feature: "fa2-attraction.tiers" } when a permutation is bound.
 * @param resources - the load's resources (core, tiers, weights, pipelines, caps)
 * @param k2 - the K2 override record of the model (LINLOG / DISTRIBUTED / LAW plus USE_PERM / HAS_WEIGHTS; TIER is overwritten per dispatch)
 * @param bindings - the group-1 / group-2 bindings shared by every tier
 * @returns the bound dispatches in order TIER 2, 1, 0
 */
export async function bindAttraction(
    resources: ModelResources,
    k2: Overrides,
    bindings: AttractionBindings,
): Promise<AttractionBound> {
    const { n, core, perm, tiers, weights, pipelines, caps } = resources;
    const so = tiers?.segmentOffsets;
    const hiEnd = so?.[1] ?? 0;
    const midEnd = so?.[2] ?? 0;
    const ranges: readonly { readonly tier: 0 | 1 | 2; readonly rows: number }[] = [
        { tier: 2, rows: hiEnd },
        { tier: 1, rows: midEnd - hiEnd },
        { tier: 0, rows: n - midEnd },
    ];
    const group = {
        ...graphBindings(core, perm, weights),
        pos: bindings.pos,
        force: bindings.force,
        P: bindings.params,
    };
    const kernels: (readonly [Kernel, BoundKernel, DispatchPlan])[] = [];
    for (const { tier, rows } of ranges) {
        if (tier !== 0 && rows <= 0) {
            continue;
        }
        // sequential on purpose: PipelineCache.get compiles inside a validation scope, one stack per device
        const kernel = await pipelines.kernel(kernelSpec("fa2-attraction", { ...k2, TIER: tier }));
        const wg = kernel.workgroupSize;
        if (tier !== 0 && wg < MID_TIER_LANES) {
            throw new WebGpuGraphError(
                "E_UNSUPPORTED",
                `fa2-attraction: the mid tier folds ${MID_TIER_LANES} lanes per row, more than the workgroup size ${wg}`,
                { feature: "fa2-attraction.tiers" },
            );
        }
        if (rows <= 0) {
            continue;
        }
        let rowsPerGroup = wg;
        if (tier === 2) {
            rowsPerGroup = 1;
        } else if (tier === 1) {
            rowsPerGroup = wg / MID_TIER_LANES;
        }
        kernels.push([kernel, kernel.bind(group), plan1d(rows, rowsPerGroup, caps)]);
    }
    return { kernels };
}

/**
 * Records the K2 dispatches of one iteration in order TIER 2, TIER 1, TIER 0 with the iteration's params offset.
 * @param pass - the open compute pass
 * @param bound - what bindAttraction produced
 * @param paramsOffset - the UniformRing byte offset of this iteration's Fa2Params
 */
export function recordAttraction(pass: GPUComputePassEncoder, bound: AttractionBound, paramsOffset: number): void {
    for (const [kernel, group, plan] of bound.kernels) {
        kernel.dispatch(pass, group, plan, [paramsOffset]);
    }
}

/** Bytes of the stride-3 f32 force arrays per node. */
export const FORCE_BYTES_PER_NODE = 12;

/** The name of the model-owned FillParams buffer (a BufferSpec, reached through ModelResources.buffer). */
export const FILL_PARAMS_BUFFER = "fillParams";

/** 2^32, the modulus of the u32 seed word (computed with `%`, never a bitwise operator). */
const U32_MODULUS = 4294967296;

/**
 * A short, safe rendering of an argument value for error messages (never String() on an object).
 * @param value - the value
 * @returns the rendering
 */
export function describeValue(value: unknown): string {
    if (value === null) {
        return "null";
    }
    if (typeof value === "number" || typeof value === "boolean" || typeof value === "string") {
        return String(value);
    }
    if (typeof value === "undefined") {
        return "undefined";
    }
    if (typeof value === "object" && "length" in value && typeof value.length === "number") {
        return `[${value.length} values]`;
    }
    return typeof value;
}

/**
 * The E_INVALID_ARGUMENT error of an option check (contract 3.1: { argument, value, expected }).
 * @param argument - the option name
 * @param value - the value given
 * @param expected - what was expected
 * @returns the error (not thrown here)
 */
export function invalid(argument: string, value: unknown, expected: string): WebGpuGraphError {
    return new WebGpuGraphError("E_INVALID_ARGUMENT", `${argument} must be ${expected}; got ${describeValue(value)}`, {
        argument,
        value,
        expected,
    });
}

/**
 * A numeric option: the given value when defined, else the fallback; validated by `check` (the value is checked as
 * `unknown` so a JS caller's string or object is E_INVALID_ARGUMENT too).
 * @param name - the option name
 * @param given - the value given (undefined = absent)
 * @param fallback - the previous record's value or the default
 * @param check - the range predicate over a finite number
 * @param expected - the range in words (the error message)
 * @returns the value
 */
export function pickNumber(
    name: string,
    given: number | undefined,
    fallback: number,
    check: (value: number) => boolean,
    expected: string,
): number {
    const value: unknown = given === undefined ? fallback : given;
    if (typeof value !== "number" || !Number.isFinite(value) || !check(value)) {
        throw invalid(name, value, expected);
    }
    return value;
}

/**
 * A boolean option: the given value when defined, else the fallback; a non-boolean is E_INVALID_ARGUMENT.
 * @param name - the option name
 * @param given - the value given (undefined = absent)
 * @param fallback - the previous record's value or the default
 * @returns the value
 */
export function pickBoolean(name: string, given: boolean | undefined, fallback: boolean): boolean {
    const value: unknown = given === undefined ? fallback : given;
    if (typeof value !== "boolean") {
        throw invalid(name, value, "a boolean");
    }
    return value;
}

/**
 * The layout dimension: 2 or 3.
 * @param given - the value given (undefined = absent)
 * @param fallback - the previous record's value or the default
 * @returns 2 or 3
 */
export function pickDim(given: 2 | 3 | undefined, fallback: 2 | 3): 2 | 3 {
    const value: unknown = given === undefined ? fallback : given;
    if (value !== 2 && value !== 3) {
        throw invalid("dim", value, "2 or 3");
    }
    return value;
}

/**
 * The scene-unit center: an array-like of 2 (z = 0) or 3 finite numbers.
 * @param given - the value given (undefined = absent)
 * @param fallback - the previous record's value or the default
 * @returns the three components
 */
export function pickCenter(
    given: ArrayLike<number> | undefined,
    fallback: readonly [number, number, number],
): readonly [number, number, number] {
    if (given === undefined) {
        return fallback;
    }
    const expected = "an array of 2 or 3 finite numbers";
    const value: unknown = given;
    if (typeof value !== "object" || value === null || !("length" in value)) {
        throw invalid("center", given, expected);
    }
    const { length } = value;
    if (length !== 2 && length !== 3) {
        throw invalid("center", given, expected);
    }
    const x: unknown = given[0];
    const y: unknown = given[1];
    const z: unknown = length === 3 ? given[2] : 0;
    if (
        typeof x !== "number" ||
        typeof y !== "number" ||
        typeof z !== "number" ||
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        !Number.isFinite(z)
    ) {
        throw invalid("center", given, expected);
    }
    return [x, y, z];
}

/**
 * The seed: a finite number, or null (unseeded; 0 keeps the port's "0 = unseeded" quirk through the Lcg).
 * @param given - the value given (undefined = absent)
 * @param fallback - the previous record's value or the default
 * @returns the seed or null
 */
export function pickSeed(given: number | null | undefined, fallback: number | null): number | null {
    if (given === undefined) {
        return fallback;
    }
    const value: unknown = given;
    if (value !== null && (typeof value !== "number" || !Number.isFinite(value))) {
        throw invalid("seed", given, "a finite number or null");
    }
    return value;
}

/**
 * Integer >= 1.
 * @param value - a finite number
 * @returns whether it is a positive integer
 */
export function isPositiveInteger(value: number): boolean {
    return Number.isInteger(value) && value >= 1;
}

/**
 * The u32 word written into Fa2Params.seed: 0 for null, else floor(|seed|) mod 2^32.
 * @param seed - the resolved seed
 * @returns the u32 value
 */
export function seedWord(seed: number | null): number {
    if (seed === null) {
        return 0;
    }
    return Math.floor(Math.abs(seed)) % U32_MODULUS;
}

/**
 * A scalar field of a block's read() result.
 * @param values - the values read
 * @param name - the field name
 * @returns the number
 */
export function scalar(values: UniformValues, name: string): number {
    const value = values[name];
    if (typeof value !== "number") {
        throw invalid(name, value, "a scalar field");
    }
    return value;
}

/**
 * A vector field of a block's read() result.
 * @param values - the values read
 * @param name - the field name
 * @returns the components
 */
export function vector(values: UniformValues, name: string): readonly number[] {
    const value = values[name];
    if (typeof value === "number") {
        throw invalid(name, value, "a vector field");
    }
    return value;
}

/**
 * The override record a kernel gets: its defaults overlaid with the values present in the merged set (contract 3.9:
 * a name a spec does not declare is rejected at compose time, so nothing else is passed through).
 * @param merged - the merged override set of the model (plus USE_PERM / HAS_WEIGHTS from the simulation)
 * @param defaults - the kernel's accepted names with their defaults
 * @returns the kernel's override record, every accepted name explicit
 */
export function subset(merged: Overrides, defaults: Overrides): Overrides {
    const out: Record<string, number | boolean> = {};
    for (const name of Object.keys(defaults)) {
        out[name] = name in merged ? merged[name] : defaults[name];
    }
    return out;
}
