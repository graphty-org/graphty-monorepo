/**
 * @file The scales: how a value in the data becomes a value on a channel, and the registry a
 * plugin adds one to.
 *
 * A scale is the difference between a picture that is readable and one bright node beside nine
 * hundred identical dark ones. It is also the one place a styling system is routinely wrong at
 * the edges, so every edge is stated here and asserted in the tests: an empty domain, a single
 * value, every value identical, a zero under a logarithm, a category nobody declared.
 *
 * A SCALE NEVER THROWS AND NEVER GUESSES. It is called once per element from a loop that has no
 * try/catch, so a value it cannot place answers `NaN` -- the miss -- and the layer leaves that
 * element unpainted. `NaN` is the whole mechanism behind `missing: "skip"`, which is the default:
 * an element an algorithm measured nothing about is not painted, not even a muted grey. Painting
 * the unmeasured is a reader's choice and has to be asked for by name.
 *
 * WHAT A SCALE RETURNS is a number in the binding's `range`, which defaults to the unit interval
 * so that a colour binding gets a position on a ramp. A registered scale may instead return a
 * string, which is a finished channel value -- a colour, a shape name -- and bypasses the
 * palette. That is the whole extension point: code stays code, layers stay data, and nothing
 * here evaluates a string as JavaScript.
 *
 * THE LOGARITHMIC SCALES NEED A POSITIVE DOMAIN, and they do not invent one. A value that is
 * zero or negative under `log` or `neglog10` misses, which the design names as the common case
 * rather than the edge case, because betweenness has zeros on every real graph. A DOMAIN
 * endpoint that is zero or negative is a different thing: there is no honest floor for the scale
 * to substitute, so every value misses and the layer paints nothing. Whoever prepares the
 * binding computes the domain over the values that can be plotted -- the positive ones -- and
 * counts the rest as departures for the legend.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { SCALE_DESCRIPTORS } from "../../catalog/scales";
import type { PaletteDescriptor, ScaleDescriptor } from "../../catalog/types";
import { GraphtyError } from "../../errors";

// ---------------------------------------------------------------------------------------------
// What a scale is handed
// ---------------------------------------------------------------------------------------------

/**
 * Everything a scale reads beside the value itself.
 *
 * `domain` and `palette` are the two a plugin's scale is documented to receive; the rest are the
 * binding's own options, present when the binding declared them. A scale that does not read one
 * ignores it -- a categorical scale has no use for a numeric domain and does not pretend to.
 */
export interface ScaleContext {
    /** The numeric extent values are read against. Ignored by the categorical scales. */
    domain: [number, number];
    /** The palette a scale may read when it produces a colour itself. */
    palette?: PaletteDescriptor;
    /** Where the output lands. Defaults to the unit interval, which is a position on a ramp. */
    range?: [number, number];
    /** Send the smallest value to the far end of the range instead of the near end. */
    reverse?: boolean;
    /** The value that lands in the middle, which is what a diverging palette centres on. */
    midpoint?: number;
    /** How many equally wide groups a binning scale cuts its domain into. */
    bins?: number;
    /** The cut points a quantile scale sorts values into, ascending. */
    thresholds?: readonly number[];
    /** The categories an ordinal scale numbers, in the order they are numbered. */
    categories?: readonly string[];
    /** How hard a power scale bends. */
    exponent?: number;
}

/**
 * A scale: one value in, one channel value out.
 *
 * `NaN` is the miss -- the value has no place on this scale -- and is the only way a scale
 * reports one. It never throws.
 */
export type ScaleFn = (value: unknown, context: ScaleContext) => string | number;

/**
 * Whether a scale answered "this value has no place on me".
 * @param result - What a scale returned.
 * @returns True when the value missed and the element is therefore not painted.
 */
export function isScaleMiss(result: string | number): boolean {
    return typeof result === "number" && Number.isNaN(result);
}

// ---------------------------------------------------------------------------------------------
// Reading a value, and placing it
// ---------------------------------------------------------------------------------------------

/** The range a scale maps into when the binding did not say. */
const UNIT_RANGE: [number, number] = [0, 1];

/** How many equally wide groups a binning scale cuts into when the binding did not say. */
const DEFAULT_BIN_COUNT = 5;

/**
 * Read a value as a number.
 * @param value - Anything at all, including the absent value of an unmeasured element.
 * @returns The number, or NaN when the value is not one. A numeric string counts, because an
 *   imported column of numbers often arrives as text; a boolean does not, because "true" is a
 *   category rather than the number one.
 */
function asNumber(value: unknown): number {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : Number.NaN;
    }

    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);

        return Number.isFinite(parsed) ? parsed : Number.NaN;
    }

    return Number.NaN;
}

/**
 * Read a value as a category name.
 * @param value - Anything at all.
 * @returns The name, or null when the value is not one a category list could hold.
 */
function asCategory(value: unknown): string | null {
    if (typeof value === "string") {
        return value;
    }

    if (typeof value === "boolean") {
        return value ? "true" : "false";
    }

    if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
    }

    return null;
}

/**
 * Hold a number inside an interval.
 * @param value - The number.
 * @param low - The lower bound.
 * @param high - The upper bound.
 * @returns The number, moved to the nearest bound when it was outside.
 */
function clamp(value: number, low: number, high: number): number {
    return Math.max(low, Math.min(high, value));
}

/**
 * Turn a position on the unit interval into the value the binding asked for.
 *
 * Reversal happens here rather than in each scale, so "big is dark" becomes "big is light" once,
 * the same way, for every scale including the ones a plugin registers through the same context.
 * @param position - Where the value sits, 0 to 1, or NaN for a miss.
 * @param context - The binding's options, read for `range` and `reverse`.
 * @returns The value for the channel, or NaN when the position was a miss.
 */
function mapToRange(position: number, context: ScaleContext): number {
    if (Number.isNaN(position)) {
        return Number.NaN;
    }

    const placed = context.reverse === true ? 1 - position : position;
    const [low, high] = context.range ?? UNIT_RANGE;

    return low + placed * (high - low);
}

/**
 * Where one transformed value sits between two transformed domain endpoints.
 *
 * A DEGENERATE DOMAIN ANSWERS 0. When every value in the data is the same, or the domain is a
 * single point, there is no spread to place anything in: the value is simultaneously the
 * smallest and the largest, and the scale reports the smallest. It is not a miss -- the value
 * exists and is painted -- and it is not the midpoint, which would be a second arbitrary choice
 * dressed up as a neutral one.
 * @param value - The transformed value.
 * @param low - The transformed lower endpoint.
 * @param high - The transformed upper endpoint.
 * @param middle - The transformed midpoint, when the binding declared one.
 * @returns A position from 0 to 1.
 */
function positionBetween(value: number, low: number, high: number, middle: number | undefined): number {
    if (low === high) {
        return 0;
    }

    if (middle !== undefined && Number.isFinite(middle) && middle !== low && middle !== high) {
        const belowMiddle = high > low ? value <= middle : value >= middle;

        return belowMiddle
            ? clamp((0.5 * (value - low)) / (middle - low), 0, 0.5)
            : clamp(0.5 + (0.5 * (value - middle)) / (high - middle), 0.5, 1);
    }

    return clamp((value - low) / (high - low), 0, 1);
}

// ---------------------------------------------------------------------------------------------
// The continuous scales
// ---------------------------------------------------------------------------------------------

/** What a continuous scale does to a value before it is placed in the domain. */
type Transform = (value: number, context: ScaleContext) => number;

/**
 * Read the exponent a power scale bends by.
 * @param context - The binding's options.
 * @returns The exponent, defaulting to 1, which makes `pow` a linear scale.
 */
function exponentOf(context: ScaleContext): number {
    const { exponent } = context;

    return exponent === undefined || !Number.isFinite(exponent) ? 1 : exponent;
}

/**
 * Raise a value to a power without losing its sign.
 * @param value - The value.
 * @param power - The exponent.
 * @returns The signed power, so a negative value stays on the negative side instead of becoming
 *   NaN the way a bare exponentiation would.
 */
function signedPower(value: number, power: number): number {
    return Math.sign(value) * Math.abs(value) ** power;
}

/**
 * The identity, which is what makes a linear scale linear.
 * @param value - The value or domain endpoint.
 * @returns The same number.
 */
const linearTransform: Transform = (value) => value;

/**
 * Base-ten logarithm, undefined at and below zero.
 * @param value - The value or domain endpoint.
 * @returns Its logarithm, or NaN where a logarithm does not exist.
 */
const logTransform: Transform = (value) => (value > 0 ? Math.log10(value) : Number.NaN);

/**
 * The negative base-ten logarithm, which is how a p-value becomes a significance.
 * @param value - The value or domain endpoint.
 * @returns Its negated logarithm, or NaN where a logarithm does not exist.
 */
const negLogTransform: Transform = (value) => (value > 0 ? -Math.log10(value) : Number.NaN);

/**
 * The signed square root, which is how an area reads as a magnitude.
 * @param value - The value or domain endpoint.
 * @returns Its square root, with a negative value kept on the negative side.
 */
const sqrtTransform: Transform = (value) => signedPower(value, 0.5);

/**
 * The signed power the binding asked for.
 * @param value - The value or domain endpoint.
 * @param context - The binding's options, read for the exponent.
 * @returns The value raised to that power, with its sign kept.
 */
const powTransform: Transform = (value, context) => signedPower(value, exponentOf(context));

/**
 * Build a scale that places a transformed value inside a transformed domain.
 * @param transform - What the scale does to a value and to each domain endpoint.
 * @returns The scale.
 */
function continuous(transform: Transform): ScaleFn {
    return (value, context) => {
        const raw = asNumber(value);
        if (Number.isNaN(raw)) {
            return Number.NaN;
        }

        const placed = transform(raw, context);
        if (!Number.isFinite(placed)) {
            return Number.NaN;
        }

        const low = transform(context.domain[0], context);
        const high = transform(context.domain[1], context);
        if (!Number.isFinite(low) || !Number.isFinite(high)) {
            // A domain the transform cannot read -- a zero under a logarithm, an empty extent
            // that arrived as NaN -- has no positions in it, so nothing is painted through it.
            return Number.NaN;
        }

        const middle = context.midpoint === undefined ? undefined : transform(context.midpoint, context);

        return mapToRange(positionBetween(placed, low, high, middle), context);
    };
}

// ---------------------------------------------------------------------------------------------
// The grouping scales
// ---------------------------------------------------------------------------------------------

/**
 * How many discrete groups a scale cuts its values into.
 *
 * A continuous scale answers 0, which is how a palette decides between picking one colour per
 * group and interpolating a ramp.
 * @param name - The scale's name.
 * @param context - The binding's options.
 * @returns The number of groups, or 0 when the scale is continuous.
 */
export function groupCount(name: string, context: ScaleContext): number {
    if (name === "bins") {
        const { bins } = context;

        return bins === undefined || !Number.isFinite(bins) ? DEFAULT_BIN_COUNT : Math.max(1, Math.floor(bins));
    }

    if (name === "quantile") {
        return (context.thresholds?.length ?? 0) + 1;
    }

    if (name === "ordinal") {
        return context.categories?.length ?? 0;
    }

    return 0;
}

/**
 * Turn a group number into the value the binding asked for.
 * @param slot - The group, counting from zero, or -1 when the value belongs to none.
 * @param groups - How many groups there are.
 * @param context - The binding's options.
 * @returns The value for the channel, or NaN when the value belongs to no group. A single group
 *   sits at the near end of the range, for the same reason a degenerate domain does.
 */
function fromSlot(slot: number, groups: number, context: ScaleContext): number {
    if (slot < 0 || groups < 1) {
        return Number.NaN;
    }

    return mapToRange(groups > 1 ? slot / (groups - 1) : 0, context);
}

/**
 * Equal-width groups cut out of the domain.
 * @param value - The element's value.
 * @param context - The binding's options.
 * @returns The group's position in the range, or NaN when the value has no group.
 */
const binsScale: ScaleFn = (value, context) => {
    const raw = asNumber(value);
    const [low, high] = context.domain;
    if (Number.isNaN(raw) || !Number.isFinite(low) || !Number.isFinite(high)) {
        return Number.NaN;
    }

    const groups = groupCount("bins", context);
    if (low === high) {
        return fromSlot(0, groups, context);
    }

    const position = clamp((raw - low) / (high - low), 0, 1);

    return fromSlot(Math.min(groups - 1, Math.floor(position * groups)), groups, context);
};

/**
 * Groups of equal count, cut at the thresholds the binding was prepared with.
 * @param value - The element's value.
 * @param context - The binding's options, read for the cut points.
 * @returns The group's position in the range, or NaN when the value has no group.
 */
const quantileScale: ScaleFn = (value, context) => {
    const raw = asNumber(value);
    if (Number.isNaN(raw)) {
        return Number.NaN;
    }

    const thresholds = context.thresholds ?? [];
    const groups = thresholds.length + 1;
    let slot = 0;
    for (const threshold of thresholds) {
        if (raw < threshold) {
            break;
        }

        slot += 1;
    }

    return fromSlot(Math.min(slot, groups - 1), groups, context);
};

/**
 * One group per declared category, and no group at all for a value nobody declared.
 * @param value - The element's value.
 * @param context - The binding's options, read for the category list.
 * @returns The category's position in the range, or NaN when it names no category.
 */
const ordinalScale: ScaleFn = (value, context) => {
    const categories = context.categories ?? [];
    const name = asCategory(value);
    if (name === null) {
        return Number.NaN;
    }

    return fromSlot(categories.indexOf(name), categories.length, context);
};

/**
 * The value as it is.
 *
 * It reads neither the domain nor the range: a column that already holds channel values -- a
 * colour per node, a shape per node -- is passed through untouched, which is the only way to
 * style from data the element did not compute.
 * @param value - The element's value.
 * @returns The value itself when it is one a channel can carry, and NaN otherwise.
 */
const passthroughScale: ScaleFn = (value) => {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : Number.NaN;
    }

    if (typeof value === "string") {
        return value;
    }

    if (typeof value === "boolean") {
        return value ? "true" : "false";
    }

    return Number.NaN;
};

/**
 * The cut points that sort a column of values into groups of equal count.
 *
 * A quantile scale cannot work them out per element: they are a property of the whole column, so
 * they are computed once, when the binding is prepared, and handed to the scale in its context.
 *
 * A CUT POINT THAT SEPARATES NOTHING IS DROPPED -- one equal to another, and one at or below the
 * smallest value in the column, which no value can fall beneath. A column where most values are
 * identical produces exactly those, and keeping them would make groups no value can land in and
 * legend swatches counted against nothing. Dropping them means a column of one repeated value
 * yields no cut points at all, so there is one group, which is the truth about that column: a
 * grouping by equal counts cannot separate values that are equal.
 * @param values - The column, in any order. Values that are not finite numbers are ignored.
 * @param groups - How many groups of equal count to cut, at least two for a cut to exist.
 * @returns The cut points, ascending and distinct. Fewer than `groups - 1` of them when the
 *   column cannot be cut that many ways.
 */
export function quantileThresholds(values: Iterable<number>, groups: number): number[] {
    const sorted = [...values].filter((value) => Number.isFinite(value)).sort((left, right) => left - right);
    const wanted = Math.floor(groups);
    if (sorted.length === 0 || wanted < 2) {
        return [];
    }

    const cuts: number[] = [];
    for (let index = 1; index < wanted; index++) {
        const at = ((sorted.length - 1) * index) / wanted;
        const below = Math.floor(at);
        const above = Math.min(below + 1, sorted.length - 1);
        const cut = sorted[below] + (sorted[above] - sorted[below]) * (at - below);
        const separates = cut > sorted[0] && (cuts.length === 0 || cuts[cuts.length - 1] !== cut);
        if (separates) {
            cuts.push(cut);
        }
    }

    return cuts;
}

// ---------------------------------------------------------------------------------------------
// The built-ins, and the registry
// ---------------------------------------------------------------------------------------------

/**
 * Every scale the element ships, by name.
 *
 * The names are the catalogue's names: `SCALE_DESCRIPTORS` describes these nine and a registry
 * refuses to seed itself if a described scale has no implementation here.
 */
export const BUILT_IN_SCALES = {
    linear: continuous(linearTransform),
    log: continuous(logTransform),
    neglog10: continuous(negLogTransform),
    sqrt: continuous(sqrtTransform),
    pow: continuous(powTransform),
    bins: binsScale,
    quantile: quantileScale,
    ordinal: ordinalScale,
    passthrough: passthroughScale,
} as const satisfies Record<string, ScaleFn>;

/** The name of a scale the element ships. */
export type BuiltInScaleName = keyof typeof BUILT_IN_SCALES;

/** A scale as a plugin hands it over: the catalogue entry a form renders, and the code. */
export type ScalePlugin = ScaleDescriptor & { map: ScaleFn };

/**
 * The scales one session can read a binding through.
 *
 * It is created rather than global. A registry per session is what lets one page hold two
 * sessions with different plugins, and what stops a test's scale from leaking into the next
 * test.
 */
export interface ScaleRegistry {
    /** Add a scale. Throws `E_DUPLICATE_PLUGIN` when the name is already taken. */
    register(scale: ScalePlugin): void;
    /** The scale by that name, or undefined when nothing is registered under it. */
    get(name: string): ScaleFn | undefined;
    /** The scale by that name. Throws `E_UNKNOWN_SCALE`, listing what is registered. */
    require(name: string): ScaleFn;
    /** The catalogue entry for that name, or undefined when nothing is registered under it. */
    describe(name: string): ScaleDescriptor | undefined;
    /** Every registered name, built-ins first and in catalogue order. */
    names(): readonly string[];
}

/**
 * Build a registry holding every scale the element ships.
 * @returns The registry, seeded with the built-ins.
 * @throws When the catalogue describes a scale this module has no implementation for, which
 *   would mean offering a consumer a scale that paints nothing.
 */
export function createScaleRegistry(): ScaleRegistry {
    const registered = new Map<string, { descriptor: ScaleDescriptor; map: ScaleFn }>();
    const implementations: Readonly<Record<string, ScaleFn | undefined>> = BUILT_IN_SCALES;

    for (const descriptor of SCALE_DESCRIPTORS) {
        const map = implementations[descriptor.name];
        if (map === undefined) {
            throw new GraphtyError({
                code: "E_INTERNAL",
                message: `The scale catalogue describes "${descriptor.name}", which has no implementation.`,
                source: "style",
                details: { scale: descriptor.name, implemented: Object.keys(BUILT_IN_SCALES) },
            });
        }

        registered.set(descriptor.name, { descriptor, map });
    }

    return {
        register({ map, ...descriptor }: ScalePlugin): void {
            if (registered.has(descriptor.name)) {
                throw new GraphtyError({
                    code: "E_DUPLICATE_PLUGIN",
                    message: `A scale named "${descriptor.name}" is already registered.`,
                    source: "registry",
                    details: { scale: descriptor.name },
                });
            }

            registered.set(descriptor.name, { descriptor, map });
        },
        get(name: string): ScaleFn | undefined {
            return registered.get(name)?.map;
        },
        require(name: string): ScaleFn {
            const found = registered.get(name);
            if (found === undefined) {
                throw new GraphtyError({
                    code: "E_UNKNOWN_SCALE",
                    message: `There is no scale named "${name}".`,
                    source: "style",
                    details: { scale: name, available: [...registered.keys()] },
                });
            }

            return found.map;
        },
        describe(name: string): ScaleDescriptor | undefined {
            return registered.get(name)?.descriptor;
        },
        names(): readonly string[] {
            return [...registered.keys()];
        },
    };
}
