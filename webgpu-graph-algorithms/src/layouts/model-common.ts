/**
 * The option and value helpers every force model's resolver and stats decoder share (PD-7): moved verbatim from
 * src/layouts/forceatlas2.ts (P3-T2) so the Fruchterman-Reingold and spring-electrical models of P5 neither copy
 * them nor import a sibling model. Layout zone; imports errors.ts only.
 */

import { WebGpuGraphError } from "../errors.js";
import { type UniformValues } from "../kernel/struct-block.js";

/** An override record as the kernel layer takes it. */
export type Overrides = Readonly<Record<string, number | boolean>>;

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
