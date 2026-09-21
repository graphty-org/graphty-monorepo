/**
 * @file Turning one declarative binding into one value per element: the thing that replaces a
 * string of evaluated JavaScript.
 *
 * A BINDING IS DATA. It names a path to read, a scale to read it through, a palette, a domain, a
 * clamp, a range, a handful of per-value overrides and what to do with a value that has no place
 * on the scale. There is no expression, so there is nothing to evaluate: the element reads the
 * binding, works out everything knowable once, and what runs per element is a scale call, an
 * array index and a table lookup. That is what the deleted `calculatedStyle.expr` cost -- a
 * `Function` constructor per layer, a JavaScript call per element, no try/catch around either,
 * and nothing at all under a Content Security Policy without `unsafe-eval`.
 *
 * EVERYTHING KNOWABLE IS WORKED OUT ONCE, WHICH IS WHY PREPARING A BINDING READS THE COLUMN. A
 * domain of "auto", a clamp written in percentiles, the cut points of a grouping by equal counts
 * and the list of categories an ordinal scale numbers are all properties of the WHOLE column, not
 * of one element. So {@link prepareBinding} walks the column once, settles all of them, and hands
 * back a closure that never reads the column again. One pass at the edit, none per frame.
 *
 * MEASURED, on this machine, at fifty thousand values: preparing a continuous binding costs
 * 3.3-4.6 ms, nearly all of it sorting the column so the percentiles and the cut points can be
 * read off it, and preparing a categorical one costs 0.9 ms. Painting fifty thousand elements
 * through what comes back costs 0.59 ms, about 12 ns each. A single-layer edit has 16 ms in
 * total, so the encoding half of one is a third of a frame at worst, and the per-element half of
 * it is not measurable beside the selector it runs behind.
 *
 * NOTHING HERE THROWS PER ELEMENT. {@link PreparedBinding.paint} is total: a value it cannot
 * place answers `undefined`, which means "this element is not painted by this layer" and the
 * element keeps whatever the layers below it gave it. Every refusal happens at prepare time, in
 * front of whoever authored the layer, and carries a code the layer can be disabled with.
 *
 * TWO BEHAVIOURS THE DESIGN FIXES RATHER THAN LEAVING TO THIS FILE:
 *
 * - A value that is zero or negative under a logarithmic scale takes the `missing` branch, which
 *   by default is "skip", so it is NOT PAINTED. It is never NaN, never clamped to the domain
 *   floor and never quietly reassigned, and it is COUNTED -- {@link BindingCounts.notPlottable}
 *   and a departure a legend prints. Betweenness has zeros on every real graph, so this is the
 *   common case and not the edge case.
 * - An element a run never measured carries no value, and no value is painted for it. Not a muted
 *   grey, not a default. That is the rule that stops an algorithm colouring elements it has
 *   nothing to say about, and asking for the opposite is `missing: { value }`, which is written
 *   down in the layer so an export explains itself.
 *
 * THE ESCAPE HATCH, AND ITS EDGE. Anything outside this closed grammar is a REGISTERED SCALE:
 * code a plugin ships, which maps a value onto a channel that already exists. It cannot invent a
 * channel -- {@link requireChannel} is the one door a channel name comes through, and a name the
 * element has no channel for is `E_UNKNOWN_CHANNEL` rather than a silent no-op. A registered
 * scale that returns a string returns a FINISHED channel value, and it is checked against the
 * channel like any other: a shape name the element cannot build misses, and a miss is not
 * painted. That boundary is the whole reason the expression evaluator does not have to come back.
 *
 * WHAT THIS FILE DOES NOT KNOW ABOUT ANY PARTICULAR SCALE. It never names one. Whether a scale
 * reads a numeric domain comes from its catalogue entry; whether it reads the column's categories
 * or its cut points is discovered by asking {@link groupCount} the same question twice; and
 * whether a domain can be placed at all is discovered by asking the scale about its own
 * endpoints. A list of logarithmic scale names kept here would be a second copy of something
 * `scales.ts` already states, and it would go stale the first time a plugin adds one.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { Binding, Channel, ChannelValue, PaletteDescriptor, Path, Rgba } from "../../catalog/types";
import { GraphtyError } from "../../errors";
import {
    type ChannelDescriptor,
    channelDescriptor,
    CHANNELS,
    type ChannelValueKind,
    type ChannelValues,
    type ColorValue,
    toColorValue,
} from "./channels";
import { type PreparedRamp, prepareRamp, type RampSpec } from "./palettes";
import {
    BUILT_IN_SCALES,
    groupCount,
    isScaleMiss,
    quantileThresholds,
    type ScaleContext,
    type ScaleFn,
    type ScaleRegistry,
} from "./scales";

// ---------------------------------------------------------------------------------------------
// What a binding is, and what preparing one produces
// ---------------------------------------------------------------------------------------------

/** The arm of a binding that reads a value out of the data and maps it onto a channel. */
export type RuleBinding = Extract<Binding, { by: Path }>;

/**
 * The arm of a binding that writes one value to every element the layer selects.
 *
 * Not exported: a caller tells the two arms apart with `"value" in binding`, which needs no name
 * from here, and an exported name nothing imports is a name that outlives its use.
 */
type LiteralBinding = Extract<Binding, { value: ChannelValue }>;

/**
 * What a prepared binding produces for one element.
 *
 * It is the union of every channel's value type, because a binding is prepared for one channel
 * and its caller already knows which. `node.marker` contributes `never`, which is how a channel
 * the element cannot draw stays unwritable.
 */
export type EncodedValue = ChannelValues[Channel];

/**
 * What the column held, in the numbers a legend prints and a reader has to be told.
 *
 * Every figure here is exact and costs nothing extra: all of them fall out of the single pass
 * {@link prepareBinding} already makes to settle the domain. There is deliberately no "painted"
 * count, because counting exactly what the channel accepts would mean running the whole pipeline
 * over the column a second time, and an approximate count is worse than none at all.
 */
export interface BindingCounts {
    /** How many values the column carried. */
    readonly seen: number;
    /** How many of those the scale's domain cannot read -- absent, null, or the wrong kind. */
    readonly unreadable: number;
    /**
     * How many numbers the settled domain excludes, which on a logarithmic scale is exactly the
     * values at or below zero.
     */
    readonly notPlottable: number;
    /** How many numbers fell outside a domain a percentile clamp narrowed. */
    readonly clamped: number;
    /** How many values were lumped into the "other" bucket. */
    readonly other: number;
    /** How many elements in scope the run measured nothing for, as the caller reported it. */
    readonly unmeasured: number;
}

/** A binding with everything knowable worked out, ready to be asked once per element. */
export interface PreparedBinding {
    /** The channel it paints. */
    readonly channel: Channel;
    /** The path it reads, or null when it is a literal that reads nothing. */
    readonly path: Path | null;
    /** The scale's name, or null when it is a literal. */
    readonly scale: string | null;
    /** The palette, when the channel carries a colour and the binding is a rule. */
    readonly palette: PaletteDescriptor | null;
    /** The extent values were read against, or null when the scale reads no numeric domain. */
    readonly domain: readonly [number, number] | null;
    /** The categories an ordinal scale numbers, largest group first. Empty when there are none. */
    readonly categories: readonly string[];
    /** How many distinct values the encoding paints, or 0 when it is a continuous ramp. */
    readonly groups: number;
    /** What the column held. */
    readonly counts: BindingCounts;
    /**
     * What a reader has to be told about this encoding, in sentences a legend prints unedited.
     *
     * Empty when the encoding has nothing to confess.
     */
    readonly departures: readonly string[];
    /**
     * The channel value for one element.
     * @param value - What the element carries for the bound path, including the absent value of
     *   an element the run never measured.
     * @returns The value to paint, or undefined when the element is not painted at all.
     */
    paint(value: unknown): EncodedValue | undefined;
}

/** Everything {@link prepareBinding} is given. */
export interface PrepareBindingOptions {
    /** The channel the binding paints. */
    readonly channel: Channel;
    /** The binding, as it was authored or imported. */
    readonly binding: Binding;
    /**
     * Every value the bound path carries, walked once.
     *
     * A run-bound layer passes the run's measured column, which is what makes the domain, the
     * clamp, the cut points and the category list properties of what the run actually measured.
     * Absent, a binding that needs any of those is refused rather than given an invented domain.
     */
    readonly column?: Iterable<unknown>;
    /** The session's scales, so a plugin's scale is reachable here exactly like a built-in. */
    readonly scales: ScaleRegistry;
    /** How many elements in scope the run measured nothing for, for the legend's departures. */
    readonly unmeasured?: number;
}

// ---------------------------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------------------------

/** How many groups a grouping by equal counts cuts when the binding does not say. */
const QUANTILE_GROUPS = 4;

/** The counts of a binding that read nothing. */
const NO_COUNTS: BindingCounts = Object.freeze({
    seen: 0,
    unreadable: 0,
    notPlottable: 0,
    clamped: 0,
    other: 0,
    unmeasured: 0,
});

// ---------------------------------------------------------------------------------------------
// Refusals
// ---------------------------------------------------------------------------------------------

/**
 * The refusal a binding that cannot be prepared gets.
 * @param message - What is wrong, in a sentence.
 * @param details - The offending values, for an editor that points at them.
 * @returns The error to throw.
 */
function badBinding(message: string, details: Readonly<Record<string, unknown>>): GraphtyError {
    return new GraphtyError({ code: "E_BAD_LAYER", message, source: "style", details });
}

/**
 * The one door a channel name comes through.
 *
 * The channel set is closed, so this is also the edge of the escape hatch: a registered scale
 * maps a value onto a channel that is already in the table, and a name that is not in the table
 * is refused here rather than accepted and then drawn by nothing.
 * @param name - The channel name, from a caller, a document or a plugin.
 * @returns What the element does with that channel.
 * @throws A `GraphtyError` with code `E_UNKNOWN_CHANNEL`, listing every channel there is.
 */
export function requireChannel(name: string): ChannelDescriptor {
    const found = channelDescriptor(name);
    if (found === undefined) {
        throw new GraphtyError({
            code: "E_UNKNOWN_CHANNEL",
            message: `There is no channel named "${name}".`,
            source: "style",
            details: { channel: name, available: CHANNELS },
        });
    }

    return found;
}

/**
 * Whether a scale is one the element ships rather than one a plugin registered.
 *
 * The distinction is load-bearing in one place: a built-in scale whose domain is numeric answers
 * a POSITION, and a position is not a label, so those are refused on the channels that carry
 * words. A registered scale is code, and code may turn a number into a label, which is precisely
 * what the escape hatch is for.
 * @param name - The scale name.
 * @returns True when the element ships a scale by that name.
 */
export function isBuiltInScale(name: string): boolean {
    return Object.hasOwn(BUILT_IN_SCALES, name);
}

// ---------------------------------------------------------------------------------------------
// Reading a value
// ---------------------------------------------------------------------------------------------

/**
 * Read a value as a number, the way the scales read one.
 *
 * It agrees with the reading inside `scales.ts` deliberately, and the tests assert that it does:
 * a domain worked out over values this function accepts, handed to a scale that accepts a
 * different set, is a domain that does not describe what is painted. A numeric string counts,
 * because an imported column of numbers often arrives as text; a boolean does not, because "true"
 * is a category rather than the number one.
 * @param value - Anything at all, including the absent value of an unmeasured element.
 * @returns The number, or NaN when the value is not one.
 */
function readNumber(value: unknown): number {
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
 * Read a value as a category name, the way the ordinal scale reads one.
 *
 * This is the name a `map` override is keyed by and the name that goes into the category list, so
 * it has to be the name the scale looks up. The tests assert that it is.
 * @param value - Anything at all.
 * @returns The name, or null when the value is not one a category list could hold.
 */
function readCategory(value: unknown): string | null {
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
function hold(value: number, low: number, high: number): number {
    return Math.max(low, Math.min(high, value));
}

/**
 * Whether a value carries red, green and blue components.
 * @param value - The value to test.
 * @returns True when it is a colour written as components rather than as a string.
 */
function isRgba(value: unknown): value is Rgba {
    return typeof value === "object" && value !== null && "r" in value && "g" in value && "b" in value;
}

// ---------------------------------------------------------------------------------------------
// What a scale reads that only the column can supply
// ---------------------------------------------------------------------------------------------

/** What a scale needs worked out from the whole column before it can place one value. */
interface ColumnDerivedInputs {
    /** Whether the number of groups grows with the category list, as an ordinal scale's does. */
    readonly categories: boolean;
    /** Whether the number of groups grows with the cut points, as a grouping by counts does. */
    readonly thresholds: boolean;
}

/**
 * Discover what a scale reads out of the column, by asking it rather than by naming it.
 *
 * {@link groupCount} is the one function that says how many groups a scale cuts, and it says so
 * from the context it is handed. Asking it the same question twice with one more category, and
 * again with one more cut point, says which of the two the scale actually reads -- for the
 * built-ins and for a plugin's scale alike, with no list of names here to go stale.
 * @param scale - The scale's name.
 * @returns Which column-derived inputs it reads.
 */
function columnDerivedInputs(scale: string): ColumnDerivedInputs {
    const probe = (extra: Partial<ScaleContext>): number => groupCount(scale, { domain: [0, 1], ...extra });

    return {
        categories: probe({ categories: ["a"] }) !== probe({ categories: ["a", "b"] }),
        thresholds: probe({ thresholds: [1] }) !== probe({ thresholds: [1, 2] }),
    };
}

// ---------------------------------------------------------------------------------------------
// The column, walked once
// ---------------------------------------------------------------------------------------------

/** What one pass over the column found. */
interface ColumnFacts {
    /** How many values the column carried. */
    readonly seen: number;
    /** How many of them the scale's domain cannot read at all. */
    readonly unreadable: number;
    /** Every finite number, ascending, for the percentiles and the cut points. */
    readonly sorted: readonly number[];
    /** How many numbers are at or below zero, which is what a logarithm has no place for. */
    readonly nonPositive: number;
    /** How often each category appeared. */
    readonly categoryCounts: ReadonlyMap<string, number>;
}

/**
 * Walk the column once and collect everything the rest of the preparation needs.
 *
 * Which half of the work happens is decided by the scale's declared domain: a numeric scale needs
 * the values sorted, and a categorical one needs the distinct names and how often each occurred.
 * Doing both would double the cost of an edit to produce a figure nothing reads.
 * @param column - Every value the bound path carries, or undefined when nothing supplied one.
 * @param numeric - Whether the scale reads a numeric domain.
 * @returns What the column held.
 */
function walkColumn(column: Iterable<unknown> | undefined, numeric: boolean): ColumnFacts {
    const numbers: number[] = [];
    const categoryCounts = new Map<string, number>();
    let seen = 0;
    let unreadable = 0;
    let nonPositive = 0;

    for (const value of column ?? []) {
        seen++;

        if (numeric) {
            const asNumber = readNumber(value);
            if (Number.isNaN(asNumber)) {
                unreadable++;
                continue;
            }

            numbers.push(asNumber);
            if (asNumber <= 0) {
                nonPositive++;
            }

            continue;
        }

        const name = readCategory(value);
        if (name === null) {
            unreadable++;
            continue;
        }

        categoryCounts.set(name, (categoryCounts.get(name) ?? 0) + 1);
    }

    numbers.sort((left, right) => left - right);

    return { seen, unreadable, sorted: numbers, nonPositive, categoryCounts };
}

/**
 * The value at a percentile of a sorted column.
 * @param sorted - The finite values, ascending.
 * @param percentile - Where to cut, from 0 to 100.
 * @returns The value there, interpolated between its neighbours, or NaN for an empty column.
 */
function percentileValue(sorted: readonly number[], percentile: number): number {
    if (sorted.length === 0) {
        return Number.NaN;
    }

    const at = ((sorted.length - 1) * hold(percentile, 0, 100)) / 100;
    const below = Math.floor(at);
    const above = Math.min(below + 1, sorted.length - 1);

    return sorted[below] + (sorted[above] - sorted[below]) * (at - below);
}

/**
 * The smallest value above zero in a sorted column.
 * @param sorted - The finite values, ascending.
 * @returns That value, or null when every value is at or below zero.
 */
function smallestPositive(sorted: readonly number[]): number | null {
    for (const value of sorted) {
        if (value > 0) {
            return value;
        }
    }

    return null;
}

// ---------------------------------------------------------------------------------------------
// Settling the domain
// ---------------------------------------------------------------------------------------------

/** A domain, and what settling it had to leave out. */
interface SettledDomain {
    /** The extent values are read against. */
    readonly domain: [number, number];
    /** How many numbers the domain excludes entirely, and therefore does not paint. */
    readonly notPlottable: number;
    /** How many numbers fell outside a domain a percentile clamp narrowed. */
    readonly clamped: number;
    /** What a reader has to be told about how the extent was chosen. */
    readonly departures: readonly string[];
}

/** The scale's options while a domain is being settled, minus the domain itself. */
type DomainlessContext = Omit<ScaleContext, "domain">;

/**
 * Whether a scale can place both ends of a domain.
 *
 * A scale reports "no place for this" by answering NaN, and a continuous scale answers NaN for
 * EVERY value when an endpoint's transform does not exist -- a zero under a logarithm being the
 * case that matters. So asking the scale about its own endpoints is how this file finds out that
 * a domain paints nothing, without knowing which scales are logarithmic.
 * @param map - The scale.
 * @param base - The scale's other options.
 * @param domain - The extent to test.
 * @returns True when both endpoints have a place on the scale.
 */
function placesDomain(map: ScaleFn, base: DomainlessContext, domain: [number, number]): boolean {
    const context: ScaleContext = { ...base, domain };

    return !isScaleMiss(map(domain[0], context)) && !isScaleMiss(map(domain[1], context));
}

/**
 * Check a clamp is a pair of percentiles.
 * @param clamp - The clamp as it was authored.
 * @throws A `GraphtyError` with code `E_BAD_LAYER` when it is not two percentiles in order.
 */
function assertClamp(clamp: readonly [number, number]): void {
    const [low, high] = clamp;
    const readable = Number.isFinite(low) && Number.isFinite(high);

    if (!readable || low < 0 || high > 100 || low >= high) {
        throw badBinding(
            "A clamp is two percentiles between 0 and 100, the lower one first -- [2, 98], for instance.",
            {
                clamp,
            },
        );
    }
}

/**
 * Work out the extent a numeric scale reads values against.
 *
 * An explicit domain is used as written, including one the scale cannot place: the author asked
 * for it, and reporting that it paints nothing is more use than silently substituting another.
 * An automatic domain is the extent of the values, narrowed to the ones that can be plotted when
 * the scale cannot place that extent -- which is what "compute the domain over the positive
 * values and count the rest" means for a logarithmic scale, said without naming one.
 * @param binding - The binding, read for `domain` and `clamp`.
 * @param facts - What the column held.
 * @param map - The scale.
 * @param base - The scale's other options.
 * @param scale - The scale's name, for the sentences a legend prints.
 * @returns The domain, the counts it excluded, and what to tell a reader.
 * @throws A `GraphtyError` with code `E_BAD_LAYER` when a domain and a clamp both claim to set
 *   the extent, or when a clamp is not a pair of percentiles.
 */
function settleDomain(
    binding: RuleBinding,
    facts: ColumnFacts,
    map: ScaleFn,
    base: DomainlessContext,
    scale: string,
): SettledDomain {
    const { clamp, domain } = binding;
    const explicit = Array.isArray(domain) ? ([domain[0], domain[1]] as [number, number]) : null;

    if (explicit !== null && clamp !== undefined) {
        throw badBinding(
            "A binding's domain and its clamp both set the extent values are read against, so only one of them is given.",
            { domain, clamp },
        );
    }

    if (explicit !== null) {
        const places = placesDomain(map, base, explicit);

        return {
            domain: explicit,
            notPlottable: places ? 0 : facts.sorted.length,
            clamped: 0,
            departures: places
                ? []
                : [`no value has a place between ${String(explicit[0])} and ${String(explicit[1])}`],
        };
    }

    return settleAutomaticDomain(clamp, facts, map, base, scale);
}

/**
 * Work out an extent from the column itself.
 * @param clamp - The percentiles to cut the extent at, when the binding declared them.
 * @param facts - What the column held.
 * @param map - The scale.
 * @param base - The scale's other options.
 * @param scale - The scale's name, for the sentences a legend prints.
 * @returns The domain, the counts it excluded, and what to tell a reader.
 * @throws A `GraphtyError` with code `E_BAD_LAYER` when the clamp is not a pair of percentiles.
 */
function settleAutomaticDomain(
    clamp: RuleBinding["clamp"],
    facts: ColumnFacts,
    map: ScaleFn,
    base: DomainlessContext,
    scale: string,
): SettledDomain {
    const { sorted } = facts;
    const departures: string[] = [];

    if (sorted.length === 0) {
        return { domain: [0, 1], notPlottable: 0, clamped: 0, departures: ["nothing measured"] };
    }

    let low = sorted[0];
    let high = sorted[sorted.length - 1];
    let clamped = 0;

    if (clamp !== undefined) {
        assertClamp(clamp);
        low = percentileValue(sorted, clamp[0]);
        high = percentileValue(sorted, clamp[1]);
        clamped = sorted.filter((value) => value < low || value > high).length;
        departures.push(`clamped at p${String(clamp[0])}/p${String(clamp[1])}`);
    }

    if (placesDomain(map, base, [low, high])) {
        return { domain: [low, high], notPlottable: 0, clamped, departures };
    }

    const floor = smallestPositive(sorted);
    if (floor !== null && floor <= high && placesDomain(map, base, [floor, high])) {
        departures.push(`${String(facts.nonPositive)} not plottable on a ${scale} scale`);

        return { domain: [floor, high], notPlottable: facts.nonPositive, clamped, departures };
    }

    departures.push(`no value is plottable on a ${scale} scale`);

    return { domain: [low, high], notPlottable: sorted.length, clamped, departures };
}

// ---------------------------------------------------------------------------------------------
// Categories, and the "other" bucket
// ---------------------------------------------------------------------------------------------

/** The categories an encoding numbers, and the ones it lumped together instead. */
interface SettledCategories {
    /** The categories that get a slot of their own, largest group first. */
    readonly categories: readonly string[];
    /** The categories that were lumped into the "other" bucket. */
    readonly lumped: readonly string[];
    /** How many elements fell into the "other" bucket. */
    readonly other: number;
}

/**
 * Decide which categories get a slot of their own.
 *
 * The order is by size, largest group first, so a legend reads the way a reader expects it to and
 * the rare groups -- the ones an "other" bucket exists to absorb -- sit at the end. Ties are
 * broken by name, so preparing the same column twice gives the same order twice.
 *
 * `other.threshold` is a COUNT: a category carried by fewer elements than that is lumped. It is
 * also what rescues an encoding with more groups than the palette has colours, because the
 * palette never wraps.
 * @param facts - What the column held.
 * @param other - The "other" bucket, when the binding declared one.
 * @returns The categories, the ones lumped together, and how many elements that covers.
 */
function settleCategories(facts: ColumnFacts, other: RuleBinding["other"]): SettledCategories {
    const bySize = [...facts.categoryCounts.entries()].sort(
        (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    );

    if (other === undefined) {
        return { categories: bySize.map(([name]) => name), lumped: [], other: 0 };
    }

    const categories: string[] = [];
    const lumped: string[] = [];
    let lumpedCount = 0;

    for (const [name, count] of bySize) {
        if (count < other.threshold) {
            lumped.push(name);
            lumpedCount += count;
            continue;
        }

        categories.push(name);
    }

    return { categories, lumped, other: lumpedCount };
}

// ---------------------------------------------------------------------------------------------
// Turning what a scale answered into what a channel carries
// ---------------------------------------------------------------------------------------------

/** What a scale, a per-value override or an "other" bucket answered for one element. */
type ScaledValue = string | number;

/** Turns what a scale answered into what the channel carries, or undefined when it cannot. */
type ChannelConverter = (scaled: ScaledValue) => EncodedValue | undefined;

/**
 * Build the converter for a channel that carries one of a fixed list of values.
 *
 * A NUMBER OUT OF RANGE MISSES RATHER THAN CLAMPING. Substituting the nearest value the element
 * can draw is how a picker that offered a shape nobody had a mesh for ended up drawing a box
 * while saying "plane", which the node shape enum's own comment records. A value the channel does
 * not have is not painted at all.
 * @param descriptor - The channel, read for the values it accepts.
 * @returns The converter.
 */
function enumConverter(descriptor: ChannelDescriptor): ChannelConverter {
    const values = descriptor.values ?? [];

    return (scaled): EncodedValue | undefined => {
        if (typeof scaled === "string") {
            return values.includes(scaled) ? scaled : undefined;
        }

        const slot = Math.round(scaled);

        return slot >= 0 && slot < values.length ? values[slot] : undefined;
    };
}

/**
 * Build the converter for one channel.
 *
 * The number a scale answers means different things on different channels, and each meaning is
 * written out here rather than guessed at the call site: a position in the binding's range on a
 * channel that carries numbers, and a slot on a channel that carries one of a fixed list. A
 * string is always a finished value and is checked against the channel, which is what keeps a
 * registered scale from writing a shape the element cannot build.
 * @param descriptor - The channel.
 * @returns The converter.
 */
function converterFor(descriptor: ChannelDescriptor): ChannelConverter {
    switch (descriptor.accepts) {
        case "number": {
            const low = descriptor.min ?? Number.NEGATIVE_INFINITY;
            const high = descriptor.max ?? Number.POSITIVE_INFINITY;

            return (scaled): EncodedValue | undefined => {
                const value = typeof scaled === "number" ? scaled : readNumber(scaled);

                return Number.isFinite(value) ? hold(value, low, high) : undefined;
            };
        }
        case "enum":
            return enumConverter(descriptor);
        case "text":
            return (scaled): EncodedValue => (typeof scaled === "string" ? scaled : String(scaled));
        case "boolean":
            return (scaled): EncodedValue | undefined => {
                if (scaled === "true" || scaled === 1) {
                    return true;
                }

                return scaled === "false" || scaled === 0 ? false : undefined;
            };
        default:
            // "color" is the prepared ramp's job, and "labelStyle" and "nothing" are refused
            // before a rule binding reaches a converter. Answering undefined keeps the function
            // total rather than putting an unreachable throw in the per-element path.
            return (): undefined => undefined;
    }
}

/**
 * Read a colour a layer wrote.
 * @param value - A colour as a string, or as components.
 * @param what - What the value was for, so a refusal can name it.
 * @returns The colour with its numbers worked out once.
 * @throws A `GraphtyError` with code `E_BAD_LAYER` when the value is not a colour.
 */
function requireColor(value: unknown, what: string): ColorValue {
    const parsed = typeof value === "string" || isRgba(value) ? toColorValue(value) : null;
    if (parsed === null) {
        throw badBinding(`${what} is not a colour.`, { value });
    }

    return parsed;
}

/**
 * The refusal a channel the element draws nothing for gets.
 *
 * It is `E_UNSUPPORTED` rather than `E_BAD_LAYER` because the layer is not malformed: it asked
 * for something this build cannot do, and the same code is what a layer's validation reports for
 * the same channel, so a consumer switching on the code sees one answer and not two.
 * @param descriptor - The channel.
 * @returns The error to throw.
 */
function unsupportedChannel(descriptor: ChannelDescriptor): GraphtyError {
    return new GraphtyError({
        code: "E_UNSUPPORTED",
        message: `${descriptor.plainName} accepts no value: ${descriptor.caveat ?? "the element draws nothing for it."}`,
        source: "style",
        details: { channel: descriptor.channel },
    });
}

/**
 * The refusal a value outside the list or the range its channel draws gets.
 * @param descriptor - The channel.
 * @param value - The offending value.
 * @param what - What the value was for, so the message can name it.
 * @returns The error to throw.
 */
function outOfRange(descriptor: ChannelDescriptor, value: unknown, what: string): GraphtyError {
    const { max, min, values } = descriptor;
    const allowed =
        values === undefined
            ? `is drawn from ${min === undefined ? "any" : String(min)} to ${max === undefined ? "any" : String(max)}`
            : `takes one of ${values.join(", ")}`;

    return new GraphtyError({
        code: "E_OPTION_RANGE",
        message: `${what} ${allowed}.`,
        source: "style",
        details: { channel: descriptor.channel, value, values, min, max },
    });
}

// ---------------------------------------------------------------------------------------------
// A value a layer wrote
// ---------------------------------------------------------------------------------------------

/**
 * Check one value a LAYER wrote against the channel it is written to.
 *
 * A literal, a per-value override and what a missing value paints are all authored, so all three
 * come through here and all three are refused with the codes a layer's own validation uses --
 * `E_OPTION_RANGE` for a value outside the list or the range the renderer draws, `E_UNSUPPORTED`
 * for a channel that draws nothing, and `E_BAD_LAYER` for a value of the wrong kind entirely. A
 * value a SCALE answered is a different thing and is never refused: it misses, and a miss is not
 * painted.
 *
 * A boolean channel reads "true" and 1 as well as `true`, because `map` and `missing` are typed
 * to carry a string or a number and have no other way to say it.
 * @param descriptor - The channel.
 * @param value - The value as it was authored.
 * @param what - What the value was for, so a refusal can name it.
 * @returns The value in the form a repaint reads, which for a colour means its components.
 * @throws A `GraphtyError` with code `E_BAD_LAYER`, `E_OPTION_RANGE` or `E_UNSUPPORTED`.
 */
function authoredValue(descriptor: ChannelDescriptor, value: ChannelValue, what: string): EncodedValue {
    const { accepts, values } = descriptor;
    const wrongKind = (expected: string): GraphtyError =>
        badBinding(`${what} is ${expected}.`, { channel: descriptor.channel, value });

    switch (accepts) {
        case "color":
            return requireColor(value, what);
        case "number": {
            if (typeof value !== "number" || !Number.isFinite(value)) {
                throw wrongKind("a number");
            }

            const { max, min } = descriptor;
            if ((min !== undefined && value < min) || (max !== undefined && value > max)) {
                throw outOfRange(descriptor, value, what);
            }

            return value;
        }
        case "text":
            if (typeof value !== "string") {
                throw wrongKind("text");
            }

            return value;
        case "boolean": {
            const read = value === true || value === "true" || value === 1;
            if (!read && value !== false && value !== "false" && value !== 0) {
                throw wrongKind("on or off");
            }

            return read;
        }
        case "enum":
            if (typeof value !== "string" || !(values ?? []).includes(value)) {
                throw outOfRange(descriptor, value, what);
            }

            return value;
        case "labelStyle":
            if (typeof value !== "object" || isRgba(value)) {
                throw wrongKind('a label style, such as { sizePx: 14, weight: "bold" }');
            }

            return value;
        default:
            throw unsupportedChannel(descriptor);
    }
}

/**
 * Prepare a binding that writes one value to every element the layer selects.
 * @param descriptor - The channel.
 * @param binding - The literal binding.
 * @returns The prepared binding, whose answer does not depend on the element.
 * @throws A `GraphtyError` with code `E_BAD_LAYER` when the value is not one the channel carries.
 */
function prepareLiteral(descriptor: ChannelDescriptor, binding: LiteralBinding): PreparedBinding {
    const value = authoredValue(descriptor, binding.value, `The value written to ${descriptor.channel}`);

    return {
        channel: descriptor.channel,
        path: null,
        scale: null,
        palette: null,
        domain: null,
        categories: [],
        groups: 0,
        counts: NO_COUNTS,
        departures: [],
        paint: (): EncodedValue => value,
    };
}

// ---------------------------------------------------------------------------------------------
// The rule arm
// ---------------------------------------------------------------------------------------------

/**
 * The scale a channel reads when the binding does not name one.
 *
 * A channel that carries a measurement reads one; a channel that carries a name, a word or a
 * switch takes the value as it is, because there is nothing between "gene" and a shape to
 * interpolate.
 * @param kind - The kind of value the channel accepts.
 * @returns The scale's name.
 */
function defaultScaleFor(kind: ChannelValueKind): string {
    return kind === "color" || kind === "number" ? "linear" : "passthrough";
}

/**
 * Refuse the combinations of channel and scale that cannot mean anything.
 * @param descriptor - The channel.
 * @param scale - The scale's name.
 * @param numeric - Whether the scale reads a numeric domain.
 * @throws A `GraphtyError` with code `E_BAD_LAYER` when the channel cannot be driven by a rule at
 *   all, or when a built-in numeric scale is pointed at a channel that carries words.
 */
function assertChannelTakesScale(descriptor: ChannelDescriptor, scale: string, numeric: boolean): void {
    const { accepts, channel } = descriptor;

    if (accepts === "nothing") {
        throw unsupportedChannel(descriptor);
    }

    if (accepts === "labelStyle") {
        throw badBinding(
            `${channel} carries a whole label style, which no scale produces, so it is written as a value rather than bound to a path.`,
            { channel },
        );
    }

    if ((accepts === "text" || accepts === "boolean") && numeric && isBuiltInScale(scale)) {
        throw badBinding(
            `The "${scale}" scale answers a position, and a position is not a value ${channel} carries. Read the value as it is with "passthrough", or name individual values with "map".`,
            { channel, scale },
        );
    }
}

/**
 * Refuse a binding that is worked out from the column when there is no column to work it out
 * from.
 *
 * An invented domain, an empty category list or an absent set of cut points all paint a confident
 * picture of nothing, which reads exactly like a correct answer of zero.
 * @param binding - The rule binding.
 * @param scale - The scale's name.
 * @param numeric - Whether the scale reads a numeric domain.
 * @param hasColumn - Whether a column was supplied.
 * @throws A `GraphtyError` with code `E_BAD_LAYER` naming what the column was needed for.
 */
function assertColumnPresent(binding: RuleBinding, scale: string, numeric: boolean, hasColumn: boolean): void {
    if (hasColumn) {
        return;
    }

    const derived = columnDerivedInputs(scale);
    const needs: string[] = [];

    if (numeric && (!Array.isArray(binding.domain) || binding.clamp !== undefined)) {
        needs.push("the extent its values span");
    }

    if (derived.categories) {
        needs.push("the categories it numbers");
    }

    if (derived.thresholds) {
        needs.push("the cut points it groups at");
    }

    if (needs.length > 0) {
        throw badBinding(
            `This binding is worked out from the values of "${binding.by}" -- ${needs.join(", ")} -- and none were supplied.`,
            { path: binding.by, scale, needs },
        );
    }
}

/** Everything {@link assemble} needs that preparing the binding already worked out. */
interface AssemblyParts {
    /** The scale's name. */
    readonly scale: string;
    /** The scale. */
    readonly map: ScaleFn;
    /** The session's scales, for the palette's own lookup of the same scale. */
    readonly scales: ScaleRegistry;
    /** What the column held. */
    readonly facts: ColumnFacts;
    /** The settled extent and what it left out. */
    readonly settled: SettledDomain;
    /** The categories and the "other" bucket. */
    readonly categories: SettledCategories;
    /** The scale's options, complete but for the range one channel or another asks for. */
    readonly context: ScaleContext;
    /** Whether the scale reads a numeric domain. */
    readonly numeric: boolean;
    /** How many elements in scope the run measured nothing for. */
    readonly unmeasured: number;
}

/** What either painter hands back. */
interface Painter {
    /** The palette, when there is one. */
    readonly palette: PaletteDescriptor | null;
    /** How many distinct values it paints, or 0 when it is a continuous ramp. */
    readonly groups: number;
    /**
     * The channel value for one element: what the element carries in, the value to paint out, and
     * undefined when the element is not painted at all.
     */
    readonly paint: (value: unknown) => EncodedValue | undefined;
}

/**
 * Read the missing policy a colour ramp takes.
 * @param missing - The binding's missing policy.
 * @param descriptor - The channel, named in a refusal.
 * @returns The policy in the form a ramp reads.
 * @throws A `GraphtyError` with code `E_BAD_LAYER` when a number was offered as a colour.
 */
function colorMissing(missing: RuleBinding["missing"], descriptor: ChannelDescriptor): RampSpec["missing"] {
    if (missing === undefined || missing === "skip") {
        return missing;
    }

    if (typeof missing.value !== "string") {
        throw badBinding(`What a missing value paints on ${descriptor.channel} is a colour, not a number.`, {
            channel: descriptor.channel,
            missing: missing.value,
        });
    }

    return { value: missing.value };
}

/**
 * Build the per-value colour overrides a binding declared.
 * @param binding - The rule binding, read for `map` and `other`.
 * @param lumped - The categories the "other" bucket absorbed.
 * @param descriptor - The channel, named in a refusal.
 * @returns The overrides, or null when the binding declared none.
 * @throws A `GraphtyError` with code `E_BAD_LAYER` when an override is not a colour.
 */
function colorOverrides(
    binding: RuleBinding,
    lumped: readonly string[],
    descriptor: ChannelDescriptor,
): Map<string, ColorValue> | null {
    const overrides = new Map<string, ColorValue>();
    const { other } = binding;

    if (other !== undefined) {
        const color = requireColor(other.value, `The colour the "other" bucket paints on ${descriptor.channel}`);
        for (const name of lumped) {
            overrides.set(name, color);
        }
    }

    for (const [name, value] of Object.entries(binding.map ?? {})) {
        overrides.set(name, requireColor(value, `The colour "${name}" is mapped to on ${descriptor.channel}`));
    }

    return overrides.size === 0 ? null : overrides;
}

/**
 * Build the painter for a channel that carries a colour.
 *
 * The ramp owns the scale call and the palette lookup, because it is the one place that turns a
 * position into a colour without building a string per element.
 * @param descriptor - The channel.
 * @param binding - The rule binding.
 * @param parts - What preparing it worked out.
 * @returns The painter.
 * @throws A `GraphtyError` with code `E_BAD_LAYER` for a palette or a missing colour that is not
 *   one, and `E_CAP_EXCEEDED` when there are more groups than the palette has colours.
 */
function colorPainter(descriptor: ChannelDescriptor, binding: RuleBinding, parts: AssemblyParts): Painter {
    const { bins, categories, domain, exponent, midpoint, reverse, thresholds } = parts.context;
    const spec: RampSpec = {
        bins,
        categories,
        domain,
        exponent,
        midpoint,
        reverse,
        thresholds,
        scale: parts.scale,
        palette: binding.palette,
        missing: colorMissing(binding.missing, descriptor),
    };
    const ramp: PreparedRamp = prepareRamp(spec, parts.scales);
    const overrides = colorOverrides(binding, parts.categories.lumped, descriptor);

    return {
        palette: ramp.palette,
        groups: ramp.groups,
        paint:
            overrides === null
                ? (value): EncodedValue | undefined => ramp.color(value)
                : (value): EncodedValue | undefined => {
                      const name = readCategory(value);
                      const override = name === null ? undefined : overrides.get(name);

                      return override ?? ramp.color(value);
                  },
    };
}

/**
 * Work out the range a scale answers in for one channel.
 *
 * A channel that carries one of a fixed list reads a SLOT, so its range is the slot numbers
 * themselves and the scale's own group count decides how many there are. Everything else reads
 * the binding's range, which defaults to the unit interval.
 * @param descriptor - The channel.
 * @param binding - The rule binding, read for `range`.
 * @param parts - What preparing the binding worked out.
 * @param groups - How many groups the scale cuts, or 0 when it is continuous.
 * @returns The scale's options with the range settled.
 * @throws A `GraphtyError` with code `E_CAP_EXCEEDED` when there are more groups than the channel
 *   has values, because a list of values never wraps.
 */
function rangeFor(
    descriptor: ChannelDescriptor,
    binding: RuleBinding,
    parts: AssemblyParts,
    groups: number,
): ScaleContext {
    if (descriptor.accepts !== "enum") {
        const { range } = binding;

        return range === undefined ? parts.context : { ...parts.context, range: [range[0], range[1]] };
    }

    const values = descriptor.values ?? [];
    const slots = groups > 0 ? groups : values.length;

    if (slots > values.length) {
        throw new GraphtyError({
            code: "E_CAP_EXCEEDED",
            message: `${descriptor.channel} has ${String(values.length)} values and this encoding has ${String(slots)} groups.`,
            source: "style",
            details: { channel: descriptor.channel, capacity: values.length, groups: slots, scale: parts.scale },
        });
    }

    return { ...parts.context, range: [0, Math.max(0, slots - 1)] };
}

/**
 * Work out what a value with no place on the scale paints.
 * @param descriptor - The channel, named in a refusal.
 * @param binding - The rule binding, read for `missing`.
 * @returns The value, or undefined when a missing value is not painted at all.
 * @throws A `GraphtyError` with code `E_BAD_LAYER` or `E_OPTION_RANGE` when the value is not one
 *   the channel carries.
 */
function missingValue(descriptor: ChannelDescriptor, binding: RuleBinding): EncodedValue | undefined {
    const { missing } = binding;
    if (missing === undefined || missing === "skip") {
        return undefined;
    }

    return authoredValue(descriptor, missing.value, `What a missing value paints on ${descriptor.channel}`);
}

/**
 * Build the per-value overrides a binding declared, for a channel that does not carry a colour.
 * @param binding - The rule binding, read for `map` and `other`.
 * @param lumped - The categories the "other" bucket absorbed.
 * @param descriptor - The channel, named in a refusal.
 * @returns The overrides, or null when the binding declared none.
 * @throws A `GraphtyError` with code `E_BAD_LAYER` or `E_OPTION_RANGE` when an override is not
 *   one the channel carries.
 */
function valueOverrides(
    binding: RuleBinding,
    lumped: readonly string[],
    descriptor: ChannelDescriptor,
): Map<string, EncodedValue> | null {
    const overrides = new Map<string, EncodedValue>();
    const { other } = binding;

    if (other !== undefined) {
        const what = `The value the "other" bucket paints on ${descriptor.channel}`;
        const value = authoredValue(descriptor, other.value, what);
        for (const name of lumped) {
            overrides.set(name, value);
        }
    }

    for (const [name, value] of Object.entries(binding.map ?? {})) {
        const what = `The value "${name}" is mapped to on ${descriptor.channel}`;
        overrides.set(name, authoredValue(descriptor, value, what));
    }

    return overrides.size === 0 ? null : overrides;
}

/**
 * Build the painter for every channel that does not carry a colour.
 * @param descriptor - The channel.
 * @param binding - The rule binding.
 * @param parts - What preparing it worked out.
 * @returns The painter.
 * @throws A `GraphtyError` with code `E_BAD_LAYER` when a missing value or an override is not one
 *   the channel carries, and `E_CAP_EXCEEDED` when the encoding has more groups than the channel
 *   has values.
 */
function valuePainter(descriptor: ChannelDescriptor, binding: RuleBinding, parts: AssemblyParts): Painter {
    const convert = converterFor(descriptor);
    const groups = groupCount(parts.scale, parts.context);
    const context = rangeFor(descriptor, binding, parts, groups);
    const absent = missingValue(descriptor, binding);
    const overrides = valueOverrides(binding, parts.categories.lumped, descriptor);
    const { map } = parts;

    return {
        palette: null,
        groups,
        paint: (value): EncodedValue | undefined => {
            if (overrides !== null) {
                const name = readCategory(value);
                const override = name === null ? undefined : overrides.get(name);
                if (override !== undefined) {
                    return override;
                }
            }

            const placed = map(value, context);

            return isScaleMiss(placed) ? absent : (convert(placed) ?? absent);
        },
    };
}

/**
 * The departures that come from the counts rather than from settling the domain.
 * @param counts - What the column held.
 * @returns The sentences, in the order a legend reads them.
 */
function countDepartures(counts: BindingCounts): readonly string[] {
    const departures: string[] = [];

    if (counts.unreadable > 0) {
        departures.push(`${String(counts.unreadable)} carry no value the scale can read`);
    }

    if (counts.other > 0) {
        departures.push(`${String(counts.other)} lumped into "other"`);
    }

    if (counts.unmeasured > 0) {
        departures.push(`not measured (${String(counts.unmeasured)})`);
    }

    return departures;
}

/**
 * Put the prepared binding together, once everything it depends on is settled.
 * @param descriptor - The channel.
 * @param binding - The rule binding.
 * @param parts - What preparing it worked out.
 * @returns The prepared binding.
 * @throws A `GraphtyError` with code `E_BAD_LAYER` or `E_CAP_EXCEEDED` when the palette, the
 *   channel or the missing value cannot carry what the binding asks of it.
 */
function assemble(descriptor: ChannelDescriptor, binding: RuleBinding, parts: AssemblyParts): PreparedBinding {
    const painter =
        descriptor.accepts === "color"
            ? colorPainter(descriptor, binding, parts)
            : valuePainter(descriptor, binding, parts);
    const counts: BindingCounts = {
        seen: parts.facts.seen,
        unreadable: parts.facts.unreadable,
        notPlottable: parts.settled.notPlottable,
        clamped: parts.settled.clamped,
        other: parts.categories.other,
        unmeasured: parts.unmeasured,
    };

    return {
        channel: descriptor.channel,
        path: binding.by,
        scale: parts.scale,
        palette: painter.palette,
        domain: parts.numeric ? parts.settled.domain : null,
        categories: parts.categories.categories,
        groups: painter.groups,
        counts,
        departures: Object.freeze([...parts.settled.departures, ...countDepartures(counts)]),
        paint: painter.paint,
    };
}

/**
 * Prepare a binding that reads a value out of the data.
 * @param descriptor - The channel.
 * @param binding - The rule binding.
 * @param options - Everything preparing it was given.
 * @returns The prepared binding.
 * @throws A `GraphtyError`: `E_UNKNOWN_SCALE` for a scale nobody registered, `E_BAD_LAYER` for a
 *   binding the channel cannot take, and `E_CAP_EXCEEDED` when there are more groups than the
 *   palette or the channel has values for.
 */
function prepareRule(
    descriptor: ChannelDescriptor,
    binding: RuleBinding,
    options: PrepareBindingOptions,
): PreparedBinding {
    const scale = binding.scale ?? defaultScaleFor(descriptor.accepts);
    const map = options.scales.require(scale);
    const described = options.scales.describe(scale);
    if (described === undefined) {
        throw new GraphtyError({
            code: "E_INTERNAL",
            message: `The scale "${scale}" is registered with no catalogue entry, so nothing can say what domain it reads.`,
            source: "style",
            details: { scale },
        });
    }

    const numeric = described.domainKind === "numeric";
    assertChannelTakesScale(descriptor, scale, numeric);
    assertColumnPresent(binding, scale, numeric, options.column !== undefined);

    if (numeric && binding.other !== undefined) {
        throw badBinding(
            `An "other" bucket lumps the rarest categories together, and the "${scale}" scale reads numbers rather than categories.`,
            { scale, other: binding.other },
        );
    }

    const facts = walkColumn(options.column, numeric);
    const categories = settleCategories(facts, binding.other);
    const base: DomainlessContext = {
        reverse: binding.reverse,
        midpoint: binding.midpoint,
        bins: binding.bins,
        exponent: binding.exponent,
        categories: categories.categories,
        thresholds: columnDerivedInputs(scale).thresholds
            ? quantileThresholds(facts.sorted, binding.bins ?? QUANTILE_GROUPS)
            : undefined,
    };
    const settled = numeric
        ? settleDomain(binding, facts, map, base, scale)
        : { domain: [0, 1] as [number, number], notPlottable: 0, clamped: 0, departures: [] };

    return assemble(descriptor, binding, {
        scale,
        map,
        scales: options.scales,
        facts,
        settled,
        categories,
        context: { ...base, domain: settled.domain },
        numeric,
        unmeasured: options.unmeasured ?? 0,
    });
}

// ---------------------------------------------------------------------------------------------
// The door
// ---------------------------------------------------------------------------------------------

/**
 * Work out everything a binding can know before it sees an element.
 *
 * Call it once, when a layer is added or updated, and hold what comes back on the layer. What
 * comes back never reads the column again, so calling this per element would reintroduce exactly
 * the cost it exists to remove.
 * @param options - The channel, the binding, the column and the session's scales.
 * @returns The prepared binding.
 * @throws A `GraphtyError`: `E_UNKNOWN_CHANNEL` for a channel the element does not have,
 *   `E_UNKNOWN_SCALE` for a scale nobody registered, `E_BAD_LAYER` for a binding the channel
 *   cannot take, and `E_CAP_EXCEEDED` when the encoding has more groups than the palette or the
 *   channel has values for. All of them are edit-time failures, so a layer is refused, or
 *   disabled with a reason, rather than painting something wrong.
 */
export function prepareBinding(options: PrepareBindingOptions): PreparedBinding {
    const descriptor = requireChannel(options.channel);
    const { binding } = options;

    return "value" in binding ? prepareLiteral(descriptor, binding) : prepareRule(descriptor, binding, options);
}
