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

import { shaderDescriptor } from "../../catalog/shaderRegistry";
import type {
    Binding,
    BindingNumberFormat,
    Channel,
    ChannelValue,
    PaletteDescriptor,
    PaletteId,
    Path,
    Rgba,
    ShaderParamAddress,
} from "../../catalog/types";
import { OTHER_GROUP_COLOR } from "../../config/palettes/categorical";
import { GraphtyError } from "../../errors";
import { clamp } from "../../utils/clamp";
import { compareGroupKeys } from "../results/types";
import {
    type ChannelDescriptor,
    channelDescriptor,
    CHANNELS,
    type ChannelValueKind,
    type ChannelValues,
    type ColorValue,
    type EdgeLineValue,
    isEnumCount,
    type NodeShapeValue,
    OFF_COLOR,
    parseShaderParamAddress,
    prototypeFreeMap,
    type ShaderParamTarget,
    toColorValue,
} from "./channels";
import { parseTemplate, prepareTemplate, TEMPLATE_CHANNELS } from "./labelTemplate";
import type { LegendFact } from "./legend";
import { overflowCapacity, type PreparedRamp, prepareRamp, type RampSpec } from "./palettes";
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
    /**
     * The categories folded into the "other" bucket -- by `other.threshold` or by an overflow
     * policy -- largest first. Empty when nothing folded.
     */
    readonly lumped: readonly string[];
    /**
     * Each category as the data spells it -- the number `0`, not the name `"0"` -- so a legend
     * hands back the value a result or a column published. Empty when there are no categories.
     */
    readonly categoryValues: ReadonlyMap<string, unknown>;
    /** How many elements carry each category, by name. Empty when there are no categories. */
    readonly categoryCounts: ReadonlyMap<string, number>;
    /** The values the binding was told not to paint, as category names. Empty when none are. */
    readonly hidden: ReadonlySet<string>;
    /** How many distinct values the encoding paints, or 0 when it is a continuous ramp. */
    readonly groups: number;
    /**
     * Where a stepped numeric scale changes step, ascending, in the data's units: the cut points
     * of an equal-counts scale, the edges between equal-width bins. Absent for anything else.
     */
    readonly steps?: readonly number[];
    /**
     * The two ends of the range the binding maps values onto, in the channel's own units and
     * clamped to what the channel draws, in the order the range was authored: `reverse` does not
     * swap them, and only an authored range such as `[3, 1]` reads high to low. Present only for a
     * channel that carries a number, such as a node's size or an edge's width, through a scale
     * that maps onto a range, and absent when a `map` or an `other` value paints values of its own.
     */
    readonly range?: readonly [number, number];
    /** What the column held. */
    readonly counts: BindingCounts;
    /**
     * What a reader has to be told about this encoding, as coded facts the legend hands over.
     *
     * Empty when the encoding has nothing to confess.
     */
    readonly facts: readonly LegendFact[];
    /**
     * The channel value for one element.
     * @param value - What the element carries for the bound path, including the absent value of
     *   an element the run never measured.
     * @returns The value to paint, or undefined when the element is not painted at all.
     */
    paint(value: unknown): EncodedValue | undefined;
    /**
     * What the encoding would paint a value if it were not hidden: what a legend shows beside a
     * hidden row, so the reader sees which colour comes back when it is shown again.
     * @param value - The value.
     * @returns The value to paint, or undefined when the encoding paints nothing for it.
     */
    paintIgnoringHidden(value: unknown): EncodedValue | undefined;
    /**
     * What the element does to the value it paints for one element, when what is drawn differs
     * from what the layer worked out.
     * @param value - What the element carries for the bound path.
     * @returns The code, or undefined when the value is drawn as worked out or not painted at all.
     */
    adjustment(value: unknown): StyleAdjustmentCode | undefined;
}

/**
 * What the element did to a value a layer worked out, because the channel cannot draw it as it is.
 * Nothing is refused for either; the value is drawn as described.
 *
 * - `style.out-of-range` -- a number outside what the channel draws (a negative node size, an
 *   opacity above 1), drawn at the nearest end the channel does draw.
 * - `style.alpha-not-drawn` -- a color with transparency on a channel that draws it opaque (a
 *   node's color; a node's transparency is its `node.opacity`).
 *
 * New codes may be added in a minor release: word an unknown one generically.
 */
export type StyleAdjustmentCode = "style.out-of-range" | "style.alpha-not-drawn";

/** The channels that draw a color's red, green and blue but not its alpha. */
const ALPHA_NOT_DRAWN: ReadonlySet<Channel> = new Set<Channel>(["node.color"]);

/**
 * Whether a painted value is a transparent color on a channel that draws it opaque.
 * @param channel - The channel.
 * @param painted - What was painted.
 * @returns True when the alpha is dropped.
 */
function dropsAlpha(channel: Channel, painted: EncodedValue | undefined): boolean {
    return ALPHA_NOT_DRAWN.has(channel) && isRgba(painted) && painted.a < 1;
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
    /**
     * Every value one path holds over the layer's elements, for a template's `|count` and
     * `|rank`. Absent, those read an empty column.
     */
    readonly columnOf?: (path: Path) => Iterable<unknown>;
    /**
     * The order an `"index"` scale numbers values in, kept by the caller for the life of the layer
     * so new data never renumbers a value already seen. Absent, the binding numbers its own column
     * afresh.
     */
    readonly order?: Map<string, number>;
}

// ---------------------------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------------------------

/** How many groups a grouping by equal counts cuts when the binding does not say. */
const QUANTILE_GROUPS = 4;

/**
 * The node shapes `overflow: "shape"` steps through, one per full cycle of the palette.
 *
 * The first is the element's default node shape, so the groups that fit in the palette look the
 * way they would have without the policy. The rest are chosen for silhouettes that stay apart at
 * a node's size from any angle: a cube, a double pyramid, an upright column, a point and a ring.
 * The Platonic solids with many faces (dodecahedron, icosahedron) are left out because at node
 * size they read as the sphere. A list meant to keep its shapes apart, such as one shape per
 * layer, can start with these.
 * @since 3.30.0
 */
export const OVERFLOW_SHAPES: readonly NodeShapeValue[] = Object.freeze([
    "icosphere",
    "box",
    "octahedron",
    "cylinder",
    "cone",
    "torus",
]);

/**
 * The edge line patterns `overflow: "pattern"` steps through, one per full cycle of the palette:
 * the edge counterpart of {@link OVERFLOW_SHAPES}. The first is the element's default, a solid
 * line; the rest are chosen to stay apart at an edge's width.
 * @since 3.27.0
 */
export const OVERFLOW_PATTERNS: readonly EdgeLineValue[] = Object.freeze([
    "solid",
    "dash",
    "dot",
    "dash-dot",
    "sinewave",
    "diamond",
]);

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
    /** The first value each category was read from, as the data spells it. */
    readonly categoryValues: ReadonlyMap<string, unknown>;
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
    const categoryValues = new Map<string, unknown>();
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

        const count = categoryCounts.get(name);
        if (count === undefined) {
            categoryValues.set(name, value);
        }

        categoryCounts.set(name, (count ?? 0) + 1);
    }

    numbers.sort((left, right) => left - right);

    return { seen, unreadable, sorted: numbers, nonPositive, categoryCounts, categoryValues };
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

    const at = ((sorted.length - 1) * clamp(percentile, 0, 100)) / 100;
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
    readonly facts: readonly LegendFact[];
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
 * @param scale - The scale's name, for the facts a legend reports.
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
            facts: places
                ? []
                : [{ code: "legend.no-value-in-domain", params: { min: explicit[0], max: explicit[1] } }],
        };
    }

    return settleAutomaticDomain(clamp, facts, map, base, scale);
}

/**
 * Work out an extent from the column itself.
 * @param clamp - The percentiles to cut the extent at, when the binding declared them.
 * @param column - What the column held.
 * @param map - The scale.
 * @param base - The scale's other options.
 * @param scale - The scale's name, for the facts a legend reports.
 * @returns The domain, the counts it excluded, and what to tell a reader.
 * @throws A `GraphtyError` with code `E_BAD_LAYER` when the clamp is not a pair of percentiles.
 */
function settleAutomaticDomain(
    clamp: RuleBinding["clamp"],
    column: ColumnFacts,
    map: ScaleFn,
    base: DomainlessContext,
    scale: string,
): SettledDomain {
    const { sorted } = column;
    const facts: LegendFact[] = [];

    if (sorted.length === 0) {
        return {
            domain: [0, 1],
            notPlottable: 0,
            clamped: 0,
            facts: [{ code: "legend.nothing-measured", params: {} }],
        };
    }

    let low = sorted[0];
    let high = sorted[sorted.length - 1];
    let clamped = 0;

    if (clamp !== undefined) {
        assertClamp(clamp);
        low = percentileValue(sorted, clamp[0]);
        high = percentileValue(sorted, clamp[1]);
        clamped = sorted.filter((value) => value < low || value > high).length;
        facts.push({ code: "legend.clamped", params: { from: clamp[0], to: clamp[1] } });
    }

    if (placesDomain(map, base, [low, high])) {
        return { domain: [low, high], notPlottable: 0, clamped, facts };
    }

    const floor = smallestPositive(sorted);
    if (floor !== null && floor <= high && placesDomain(map, base, [floor, high])) {
        facts.push({ code: "legend.not-plottable", params: { count: column.nonPositive, scale } });

        return { domain: [floor, high], notPlottable: column.nonPositive, clamped, facts };
    }

    facts.push({ code: "legend.none-plottable", params: { scale } });

    return { domain: [low, high], notPlottable: sorted.length, clamped, facts };
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
 * palette never wraps. `keep` is the other rescue, an overflow policy's: past that many groups,
 * the smallest are lumped whatever their size.
 * @param facts - What the column held.
 * @param other - The "other" bucket, when the binding declared one.
 * @param keep - How many categories keep a slot of their own at most.
 * @returns The categories, the ones lumped together, and how many elements that covers.
 */
function settleCategories(facts: ColumnFacts, other: RuleBinding["other"], keep: number): SettledCategories {
    const bySize = [...facts.categoryCounts.entries()].sort(
        (left, right) => right[1] - left[1] || compareGroupKeys(left[0], right[0]),
    );

    if (other === undefined && bySize.length <= keep) {
        return { categories: bySize.map(([name]) => name), lumped: [], other: 0 };
    }

    const categories: string[] = [];
    const lumped: string[] = [];
    let lumpedCount = 0;

    for (const [name, count] of bySize) {
        if ((other !== undefined && count < other.threshold) || categories.length >= keep) {
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

        // A channel that takes a count beside its words (a segment count) reads the number as that count.
        if (descriptor.min !== undefined) {
            return Number.isFinite(scaled) ? Math.max(descriptor.min, Math.round(scaled)) : undefined;
        }

        const slot = Math.round(scaled);

        return slot >= 0 && slot < values.length ? values[slot] : undefined;
    };
}

/**
 * Build the writer a binding's number format names.
 * @param descriptor - The channel, named in a refusal.
 * @param format - The binding's format, if any.
 * @returns A function writing a number as text, or null when the binding names no format.
 * @throws A `GraphtyError` with code `E_BAD_LAYER` when `Intl.NumberFormat` refuses the format.
 */
function numberWriter(
    descriptor: ChannelDescriptor,
    format: BindingNumberFormat | undefined,
): ((value: number) => string) | null {
    if (format === undefined) {
        return null;
    }

    const { locale, ...options } = format;
    try {
        const formatter = new Intl.NumberFormat(locale, options);

        return (value) => formatter.format(value);
    } catch (error) {
        throw badBinding(
            `The number format on ${descriptor.channel} is not one Intl.NumberFormat accepts: ${error instanceof Error ? error.message : String(error)}`,
            { channel: descriptor.channel, format },
        );
    }
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
 * @param format - The binding's number format, read by a channel that carries text.
 * @returns The converter.
 */
function converterFor(descriptor: ChannelDescriptor, format?: BindingNumberFormat): ChannelConverter {
    switch (descriptor.accepts) {
        case "number": {
            const low = descriptor.min ?? Number.NEGATIVE_INFINITY;
            const high = descriptor.max ?? Number.POSITIVE_INFINITY;

            return (scaled): EncodedValue | undefined => {
                const value = typeof scaled === "number" ? scaled : readNumber(scaled);

                return Number.isFinite(value) ? clamp(value, low, high) : undefined;
            };
        }
        case "enum":
            return enumConverter(descriptor);
        case "text": {
            const writeNumber = numberWriter(descriptor, format);

            return (scaled): EncodedValue => {
                if (typeof scaled === "string") {
                    return scaled;
                }

                return writeNumber === null ? String(scaled) : writeNumber(scaled);
            };
        }
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
    const bound = (limit: number | undefined): string => (limit === undefined ? "any" : String(limit));
    const allowed =
        values === undefined ? `is drawn from ${bound(min)} to ${bound(max)}` : `takes one of ${values.join(", ")}`;

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
 * Check a number a layer wrote against the channel's range; see {@link authoredValue}.
 * @param descriptor - The channel, which accepts a number.
 * @param value - The value as it was authored.
 * @param what - What the value was for, so a refusal can name it.
 * @param wrongKind - Builds the refusal for a value that is not a number.
 * @returns The number.
 * @throws A `GraphtyError` with code `E_BAD_LAYER` or `E_OPTION_RANGE`.
 */
function authoredNumber(
    descriptor: ChannelDescriptor,
    value: ChannelValue,
    what: string,
    wrongKind: (expected: string) => GraphtyError,
): number {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw wrongKind("a number");
    }

    const { max, min } = descriptor;
    if ((min !== undefined && value < min) || (max !== undefined && value > max)) {
        throw outOfRange(descriptor, value, what);
    }

    return value;
}

/**
 * Check a choice a layer wrote against the channel's values; see {@link authoredValue}.
 * @param descriptor - The channel, which accepts one of a list of values.
 * @param value - The value as it was authored.
 * @param what - What the value was for, so a refusal can name it.
 * @returns The value.
 * @throws A `GraphtyError` with code `E_OPTION_RANGE`.
 */
function authoredEnum(descriptor: ChannelDescriptor, value: ChannelValue, what: string): EncodedValue {
    if (isEnumCount(descriptor, value)) {
        return value;
    }

    const values = descriptor.values ?? [];
    // A boolean is read by its name (`node.modelTint` takes true, false or "replace").
    if (typeof value === "boolean" && values.includes(String(value))) {
        return value;
    }

    if (typeof value !== "string" || !values.includes(value)) {
        throw outOfRange(descriptor, value, what);
    }

    return value;
}

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
    const { accepts } = descriptor;
    const wrongKind = (expected: string): GraphtyError =>
        badBinding(`${what} is ${expected}.`, { channel: descriptor.channel, value });

    switch (accepts) {
        case "color":
            // An effect written off carries the one off colour, which the painter draws as nothing.
            return descriptor.off !== undefined && value === descriptor.off ? OFF_COLOR : requireColor(value, what);
        case "number":
            return authoredNumber(descriptor, value, what, wrongKind);
        case "text":
            if (typeof value !== "string") {
                throw wrongKind("text");
            }

            return value;
        case "boolean":
            return authoredBoolean(value, wrongKind);
        case "enum":
            return authoredEnum(descriptor, value, what);
        case "labelStyle":
            if (typeof value !== "object" || isRgba(value)) {
                throw wrongKind('a label style, such as { sizePx: 14, weight: "bold" }');
            }

            return value;
        case "shaderUses":
            if (!Array.isArray(value)) {
                throw wrongKind('a list of shader uses, such as [{ shader: "lock-on-reticle" }]');
            }

            return prototypeFreeMap(value);
        default:
            throw unsupportedChannel(descriptor);
    }
}

/**
 * A boolean channel's authored value: `true`, "true" and 1 read as on; `false`, "false" and 0 as off.
 * @param value - The value as it was authored.
 * @param wrongKind - Builds the refusal for a value of the wrong kind.
 * @returns The boolean.
 * @throws A `GraphtyError` with code `E_BAD_LAYER` for anything else.
 */
function authoredBoolean(value: ChannelValue, wrongKind: (expected: string) => GraphtyError): boolean {
    const read = value === true || value === "true" || value === 1;
    if (!read && value !== false && value !== "false" && value !== 0) {
        throw wrongKind("on or off");
    }

    return read;
}

/**
 * Prepare a binding that writes one value to every element the layer selects.
 * @param descriptor - The channel.
 * @param binding - The literal binding.
 * @returns The prepared binding, whose answer does not depend on the element.
 * @throws A `GraphtyError` with code `E_BAD_LAYER` when the value is not one the channel carries.
 */
function prepareLiteral(descriptor: ChannelDescriptor, binding: LiteralBinding): PreparedBinding {
    const what = `The value written to ${descriptor.channel}`;
    const value = isCombineFactor(descriptor, binding)
        ? combineFactor(binding.value, what)
        : authoredValue(descriptor, binding.value, what);

    return {
        channel: descriptor.channel,
        path: null,
        scale: null,
        palette: null,
        domain: null,
        categories: [],
        lumped: [],
        categoryValues: new Map(),
        categoryCounts: new Map(),
        hidden: new Set(),
        groups: 0,
        counts: NO_COUNTS,
        facts: [],
        paint: (): EncodedValue => value,
        paintIgnoringHidden: (): EncodedValue => value,
        adjustment: dropsAlpha(descriptor.channel, value)
            ? (): StyleAdjustmentCode => "style.alpha-not-drawn"
            : (): undefined => undefined,
    };
}

/**
 * Prepare a binding that builds text from several values.
 *
 * What it paints is read through a function rather than one value: {@link PreparedBinding.paint}
 * is handed `(path) => value` for the element, because a template reads several paths.
 * @param descriptor - The channel.
 * @param template - The lines, as authored.
 * @param options - Everything preparing it was given, for the columns `|count` and `|rank` read.
 * @returns The prepared binding.
 * @throws A `GraphtyError` with code `E_BAD_LAYER` for a channel that is not a text channel, or
 *   a template that does not parse.
 */
function prepareTemplateBinding(
    descriptor: ChannelDescriptor,
    template: unknown,
    options: PrepareBindingOptions,
): PreparedBinding {
    if (!TEMPLATE_CHANNELS.includes(descriptor.channel)) {
        throw badBinding(`${descriptor.plainName} is not text, so it cannot be built from a template.`, {
            channel: descriptor.channel,
            candidates: TEMPLATE_CHANNELS,
        });
    }

    const text = prepareTemplate(parseTemplate(template), (path) => options.columnOf?.(path) ?? []);
    const paint = (read: unknown): EncodedValue | undefined =>
        typeof read === "function" ? text(read as (path: Path) => unknown) : undefined;

    return {
        channel: descriptor.channel,
        path: null,
        scale: null,
        palette: null,
        domain: null,
        categories: [],
        lumped: [],
        categoryValues: new Map(),
        categoryCounts: new Map(),
        hidden: new Set(),
        groups: 0,
        counts: NO_COUNTS,
        facts: [],
        paint,
        paintIgnoringHidden: paint,
        // Text is drawn as built: nothing is adjusted.
        adjustment: (): undefined => undefined,
    };
}

/**
 * Whether a binding's value is a factor or an offset rather than a value of its channel: a number
 * channel written with combine "multiply" or "add".
 * @param descriptor - The channel.
 * @param binding - The binding.
 * @returns True when the value is combined with what lies beneath rather than written.
 */
function isCombineFactor(descriptor: ChannelDescriptor, binding: Binding): boolean {
    const combine = "combine" in binding ? binding.combine : undefined;
    return descriptor.accepts === "number" && (combine === "multiply" || combine === "add");
}

/**
 * Check a factor or an offset: any finite number, since the channel's bounds apply to the result.
 * @param value - What the binding carried.
 * @param what - What the value was for, so a refusal can name it.
 * @returns The number.
 */
function combineFactor(value: ChannelValue, what: string): number {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw badBinding(`${what} is a number to multiply or add by.`, { value });
    }

    return value;
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

    if (accepts === "shaderUses") {
        throw badBinding(
            `${channel} carries a list, which no scale produces; bind one parameter with "${channel}.<shader>.<parameter>".`,
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
    /** The ends of the range it maps onto, for a channel that carries a number. */
    readonly range?: readonly [number, number];
    /**
     * The channel value for one element: what the element carries in, the value to paint out, and
     * undefined when the element is not painted at all.
     */
    readonly paint: (value: unknown) => EncodedValue | undefined;
    /**
     * Whether the number worked out for a value lies outside what the channel draws, so that
     * `paint` drew it clamped. Absent on a painter that never clamps.
     */
    readonly outOfRange?: (value: unknown) => boolean;
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

    if (lumped.length > 0) {
        // Folded by an overflow policy with no bucket declared, the lumped groups get the grey.
        const color = requireColor(
            other?.value ?? OTHER_GROUP_COLOR,
            `The colour the "other" bucket paints on ${descriptor.channel}`,
        );
        for (const name of lumped) {
            overrides.set(name, color);
        }
    }

    for (const [name, value] of Object.entries(binding.map ?? {})) {
        overrides.set(
            name,
            descriptor.off !== undefined && value === descriptor.off
                ? OFF_COLOR
                : requireColor(value, `The colour "${name}" is mapped to on ${descriptor.channel}`),
        );
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
        ...(binding.colors === undefined ? {} : { stops: binding.colors }),
        missing: colorMissing(binding.missing, descriptor),
        overflow: binding.overflow,
    };
    const ramp: PreparedRamp = prepareRamp(spec, parts.scales);
    const overrides = colorOverrides(binding, parts.categories.lumped, descriptor);
    const otherwise =
        binding.otherwise === undefined
            ? undefined
            : requireColor(binding.otherwise, `What a value with no entry paints on ${descriptor.channel}`);
    const skipUnmapped = binding.unmapped === "skip";

    return {
        palette: ramp.palette,
        groups: ramp.groups,
        paint:
            overrides === null && otherwise === undefined && !skipUnmapped
                ? (value): EncodedValue | undefined => ramp.color(value)
                : (value): EncodedValue | undefined => {
                      const name = readCategory(value);
                      const override = name === null ? undefined : (overrides?.get(name) ?? otherwise);
                      if (override !== undefined) {
                          return override;
                      }

                      // A value the map has no entry for is left to the layers beneath.
                      return skipUnmapped && name !== null ? undefined : ramp.color(value);
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
 * The channel as a binding's `choices` narrow it: the same descriptor with its list replaced.
 * @param descriptor - The channel.
 * @param choices - The binding's choices, if any.
 * @returns The descriptor the painter reads.
 * @throws A `GraphtyError` with code `E_OPTION_RANGE` for a choice the channel does not take, and
 *   `E_BAD_LAYER` for choices on a channel that carries no list or an empty list of them.
 */
function withChoices(descriptor: ChannelDescriptor, choices: readonly string[] | undefined): ChannelDescriptor {
    if (choices === undefined) {
        return descriptor;
    }

    if (descriptor.accepts !== "enum" || choices.length === 0) {
        throw badBinding(
            `Choices are a list of ${descriptor.channel}'s values, on a channel that takes one of a list.`,
            {
                channel: descriptor.channel,
                choices,
            },
        );
    }

    for (const choice of choices) {
        if (!(descriptor.values ?? []).includes(choice)) {
            throw outOfRange(descriptor, choice, `The choice "${choice}" on ${descriptor.channel}`);
        }
    }

    return { ...descriptor, values: choices };
}

/**
 * Build the painter for every channel that does not carry a colour.
 * @param declared - The channel, before a binding's `choices` narrow its list.
 * @param binding - The rule binding.
 * @param parts - What preparing it worked out.
 * @returns The painter.
 * @throws A `GraphtyError` with code `E_BAD_LAYER` when a missing value or an override is not one
 *   the channel carries, and `E_CAP_EXCEEDED` when the encoding has more groups than the channel
 *   has values.
 */
function valuePainter(declared: ChannelDescriptor, binding: RuleBinding, parts: AssemblyParts): Painter {
    const descriptor = withChoices(declared, binding.choices);
    if (binding.overflow === "shape" && descriptor.channel === "node.shape") {
        return cyclePainter(binding, parts, OVERFLOW_SHAPES);
    }
    if (binding.overflow === "pattern" && descriptor.channel === "edge.style") {
        return cyclePainter(binding, parts, OVERFLOW_PATTERNS);
    }

    const convert = converterFor(descriptor, binding.format);
    const groups = groupCount(parts.scale, parts.context);
    const context = rangeFor(descriptor, binding, parts, groups);
    const absent = missingValue(descriptor, binding);
    const overrides = valueOverrides(binding, parts.categories.lumped, descriptor);
    const otherwise =
        binding.otherwise === undefined
            ? undefined
            : authoredValue(
                  descriptor,
                  binding.otherwise,
                  `What a value with no entry paints on ${descriptor.channel}`,
              );
    const { map } = parts;
    // Passthrough reads neither the domain nor the range, so it maps onto no range at all. A `map`
    // or an `other` value paints values of its own, so the range no longer bounds what is drawn.
    const bounded =
        descriptor.accepts === "number" &&
        parts.scale !== "passthrough" &&
        overrides === null &&
        otherwise === undefined;
    const ends = bounded ? (context.range ?? [0, 1]) : null;
    const low = ends === null ? undefined : convert(ends[0]);
    const high = ends === null ? undefined : convert(ends[1]);
    const skipUnmapped = binding.unmapped === "skip";
    const overrideOf = (value: unknown): EncodedValue | undefined => {
        const name = overrides === null && otherwise === undefined ? null : readCategory(value);

        return name === null ? undefined : (overrides?.get(name) ?? otherwise);
    };
    const channelMin = descriptor.min ?? Number.NEGATIVE_INFINITY;
    const channelMax = descriptor.max ?? Number.POSITIVE_INFINITY;

    return {
        palette: null,
        groups,
        ...(typeof low === "number" && typeof high === "number" ? { range: [low, high] as const } : {}),
        paint: (value): EncodedValue | undefined => {
            const override = overrideOf(value);
            if (override !== undefined) {
                return override;
            }

            // A value the map has no entry for is left to the layers beneath.
            if (skipUnmapped && readCategory(value) !== null) {
                return undefined;
            }

            const placed = map(value, context);

            return isScaleMiss(placed) ? absent : (convert(placed) ?? absent);
        },
        ...(descriptor.accepts === "number"
            ? {
                  outOfRange: (value: unknown): boolean => {
                      if (overrideOf(value) !== undefined) {
                          return false;
                      }

                      const placed = map(value, context);
                      const number = typeof placed === "number" ? placed : readNumber(placed);

                      return !Number.isNaN(number) && (number < channelMin || number > channelMax);
                  },
              }
            : {}),
    };
}

/**
 * Build the painter for the second half of `overflow: "shape"` (node shapes) or `"pattern"` (edge
 * line patterns).
 *
 * Group i -- largest first, the order the colour half numbers them in -- is drawn in value
 * floor(i / N) of the list, N being the palette's capacity, so each full cycle of colours moves to
 * the next value and two groups that share a colour never share it. A group with its own entry in
 * the binding's `map` keeps that entry. A group folded into "other" is not given a value at all.
 * @param binding - The rule binding, read for the palette whose capacity sets the cycle.
 * @param parts - What preparing it worked out.
 * @param list - The values the cycle steps through.
 * @returns The painter.
 */
function cyclePainter(binding: RuleBinding, parts: AssemblyParts, list: readonly string[]): Painter {
    const cycle = paletteCapacityOf(binding) ?? Number.POSITIVE_INFINITY;
    const values = new Map<string, EncodedValue>(
        parts.categories.categories.map((name, index) => [
            name,
            binding.map?.[name] ?? list[Math.floor(index / cycle)],
        ]),
    );

    return {
        palette: null,
        groups: values.size,
        paint: (value): EncodedValue | undefined => {
            const name = readCategory(value);

            return name === null ? undefined : values.get(name);
        },
    };
}

/**
 * The second half of a colour binding whose overflow cycles a second cue: the node shape binding
 * of `overflow: "shape"` on `node.color`, the edge pattern binding of `overflow: "pattern"` on
 * `edge.color`. Both halves read the same value and count the same palette, so a group that shares
 * a colour with another never shares its shape or pattern.
 * @param channel - The colour channel.
 * @param binding - Its binding.
 * @returns The other channel and its binding, or null when the binding cycles nothing.
 * @since 3.27.0
 */
export function overflowHalf(channel: Channel, binding: Binding): readonly [Channel, RuleBinding] | null {
    if (!("by" in binding)) {
        return null;
    }
    let half: Channel | null = null;
    if (binding.overflow === "shape" && channel === "node.color") {
        half = "node.shape";
    } else if (binding.overflow === "pattern" && channel === "edge.color") {
        half = "edge.style";
    }
    if (half === null) {
        return null;
    }

    return [
        half,
        {
            by: binding.by,
            overflow: binding.overflow,
            ...(binding.scale === undefined ? {} : { scale: binding.scale }),
            ...(binding.palette === undefined ? {} : { palette: binding.palette }),
            ...(binding.colors === undefined ? {} : { colors: binding.colors }),
            ...(binding.other === undefined ? {} : { other: binding.other }),
            ...(binding.hidden === undefined ? {} : { hidden: binding.hidden }),
        },
    ];
}

/**
 * How many groups the binding's colours can name: its own stops, else its palette's capacity.
 * @param binding - The rule binding.
 * @returns The capacity, or null when nothing folds.
 */
function paletteCapacityOf(binding: RuleBinding): number | null {
    return binding.colors === undefined ? overflowCapacity(binding.palette) : binding.colors.length;
}

/**
 * How many categories keep a slot of their own under the binding's overflow policy.
 * @param descriptor - The channel, refused for "shape" when it paints edges.
 * @param binding - The rule binding.
 * @param numeric - Whether the scale reads numbers, which have no groups to fold.
 * @returns The count, or infinity when nothing folds.
 * @throws A `GraphtyError` with code `E_BAD_LAYER` for "shape" on an edge channel.
 */
function overflowKeep(descriptor: ChannelDescriptor, binding: RuleBinding, numeric: boolean): number {
    const { overflow } = binding;

    if (overflow === "shape" && descriptor.target === "edge") {
        throw badBinding(
            `overflow "shape" draws the groups past the palette in other node shapes, and an edge has no shape, so ${descriptor.channel} cannot use it. Use "pattern", "other" or "extend".`,
            { channel: descriptor.channel, overflow },
        );
    }
    if (overflow === "pattern" && descriptor.target === "node") {
        throw badBinding(
            `overflow "pattern" draws the groups past the palette in other edge line patterns, and a node has no line, so ${descriptor.channel} cannot use it. Use "shape", "other" or "extend".`,
            { channel: descriptor.channel, overflow },
        );
    }

    // A channel of a fixed list folds past the values it has; a color, past its palette.
    const capacity =
        overflow === "other" && descriptor.accepts === "enum"
            ? (descriptor.values?.length ?? null)
            : paletteCapacityOf(binding);

    if (numeric || capacity === null || (overflow !== "other" && overflow !== "shape" && overflow !== "pattern")) {
        return Number.POSITIVE_INFINITY;
    }

    if (overflow === "other") {
        return capacity;
    }

    return capacity * (overflow === "shape" ? OVERFLOW_SHAPES : OVERFLOW_PATTERNS).length;
}

/**
 * The facts that come from the counts rather than from settling the domain.
 * @param counts - What the column held.
 * @returns The facts, in the order a legend reads them.
 */
function countFacts(counts: BindingCounts): readonly LegendFact[] {
    const facts: LegendFact[] = [];

    if (counts.unreadable > 0) {
        facts.push({ code: "legend.unreadable", params: { count: counts.unreadable } });
    }

    if (counts.other > 0) {
        facts.push({ code: "legend.lumped", params: { count: counts.other } });
    }

    if (counts.unmeasured > 0) {
        facts.push({ code: "legend.not-measured", params: { count: counts.unmeasured } });
    }

    return facts;
}

/**
 * Where a stepped numeric scale changes step: the cut points it was handed, else the edges between
 * the equal-width groups it cuts its domain into.
 * @param parts - What preparing the binding worked out.
 * @returns The bounds, ascending, or undefined for a scale that is not stepped.
 */
function stepsOf(parts: AssemblyParts): readonly number[] | undefined {
    const { context, numeric, scale } = parts;
    if (!numeric) {
        return undefined;
    }

    if (context.thresholds !== undefined) {
        return Object.freeze([...context.thresholds]);
    }

    const groups = groupCount(scale, context);
    if (groups === 0) {
        return undefined;
    }

    const [low, high] = context.domain;
    const cuts = Array.from({ length: groups - 1 }, (_, at) => low + ((high - low) * (at + 1)) / groups);

    if (low > high) {
        cuts.reverse();
    }

    return Object.freeze(cuts);
}

/**
 * Put the prepared binding together, once everything it depends on is settled.
 * @param descriptor - The channel.
 * @param binding - The rule binding.
 * @param parts - What preparing it worked out.
 * @param given - The painter, when the caller built one itself (stops do); absent, the channel's own.
 * @returns The prepared binding.
 * @throws A `GraphtyError` with code `E_BAD_LAYER` or `E_CAP_EXCEEDED` when the palette, the
 *   channel or the missing value cannot carry what the binding asks of it.
 */
function assemble(
    descriptor: ChannelDescriptor,
    binding: RuleBinding,
    parts: AssemblyParts,
    given?: Painter,
): PreparedBinding {
    const painter =
        given ??
        (descriptor.accepts === "color"
            ? colorPainter(descriptor, binding, parts)
            : valuePainter(descriptor, binding, parts));
    const hidden = new Set((binding.hidden ?? []).map((value) => readCategory(value)).filter((name) => name !== null));
    const steps = stepsOf(parts);
    const paint =
        hidden.size === 0
            ? painter.paint
            : (value: unknown): EncodedValue | undefined => {
                  const name = readCategory(value);
                  return name !== null && hidden.has(name) ? undefined : painter.paint(value);
              };
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
        lumped: parts.categories.lumped,
        categoryValues: parts.facts.categoryValues,
        categoryCounts: parts.facts.categoryCounts,
        hidden,
        groups: painter.groups,
        ...(steps === undefined ? {} : { steps }),
        ...(painter.range === undefined ? {} : { range: painter.range }),
        counts,
        facts: Object.freeze([...parts.settled.facts, ...countFacts(counts)]),
        paint,
        paintIgnoringHidden: painter.paint,
        adjustment: (value): StyleAdjustmentCode | undefined => {
            const painted = paint(value);
            if (painted === undefined) {
                return undefined;
            }

            if (painter.outOfRange?.(value) === true) {
                return "style.out-of-range";
            }

            return dropsAlpha(descriptor.channel, painted) ? "style.alpha-not-drawn" : undefined;
        },
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
    if (binding.stops !== undefined) {
        return prepareStops(descriptor, binding, options);
    }

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
    const categories = settleCategories(facts, binding.other, overflowKeep(descriptor, binding, numeric));
    const order = scale === "index" ? (options.order ?? new Map<string, number>()) : undefined;
    if (order !== undefined) {
        // First seen in element order, before any element is painted, so which value gets which
        // number does not depend on the order a pass happens to visit them in.
        for (const value of options.column ?? []) {
            map(value, { domain: [0, 1], order });
        }
    }

    const base: DomainlessContext = {
        ...(order === undefined ? {} : { order }),
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
        : { domain: [0, 1] as [number, number], notPlottable: 0, clamped: 0, facts: [] };

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
// Stops: a number read against points instead of a scale
// ---------------------------------------------------------------------------------------------

/** The binding fields `stops` replaces, refused beside it because the points already say them. */
const NOT_WITH_STOPS = [
    "palette",
    "colors",
    "domain",
    "clamp",
    "range",
    "reverse",
    "midpoint",
    "bins",
    "exponent",
    "map",
    "other",
    "overflow",
] as const satisfies readonly (keyof RuleBinding)[];

/** One point with its three values read into the form the channel carries. */
interface ReadStop<T> {
    readonly at: number;
    readonly below: T;
    readonly value: T;
    readonly above: T;
}

/**
 * Whether one stop value is one the channel carries.
 * @param descriptor - The channel, which carries a number or a color.
 * @param value - The value as authored.
 * @returns True when it is a finite number on a numeric channel or a color on a color channel.
 */
function readableStopValue(descriptor: ChannelDescriptor, value: unknown): boolean {
    if (descriptor.accepts === "number") {
        return typeof value === "number" && Number.isFinite(value);
    }

    return typeof value === "string" && toColorValue(value) !== null;
}

/**
 * What is wrong with a binding's `stops`, if anything.
 *
 * Numbers outside what the channel draws are NOT wrong here: they are drawn clamped and counted,
 * as a scale's numbers are, because a file's points often run past what the element draws.
 * @param descriptor - The channel.
 * @param binding - The rule binding, which has `stops`.
 * @returns A sentence saying what is wrong, or null when the stops can be painted.
 */
export function stopsProblem(descriptor: ChannelDescriptor, binding: RuleBinding): string | null {
    const { stops } = binding;
    if (descriptor.accepts !== "number" && descriptor.accepts !== "color") {
        return `stops paint numbers or colors, and ${descriptor.channel} carries neither.`;
    }

    if (binding.scale !== undefined && binding.scale !== "linear") {
        return `stops replace the scale, so the "${binding.scale}" scale cannot be used beside them.`;
    }

    const clashing = NOT_WITH_STOPS.filter((field) => binding[field] !== undefined);
    if (clashing.length > 0) {
        return `stops already say what ${clashing.join(", ")} would, so they cannot be given beside them.`;
    }

    if (!Array.isArray(stops) || stops.length === 0) {
        return "stops is a list of points, such as [{ at: 0, value: 1 }, { at: 10, value: 5 }].";
    }

    return stopListProblem(descriptor, stops);
}

/**
 * What is wrong with the points of a non-empty `stops` list, if anything.
 * @param descriptor - The channel, which carries a number or a color.
 * @param stops - The points.
 * @returns A sentence saying what is wrong, or null when the points can be painted.
 */
function stopListProblem(descriptor: ChannelDescriptor, stops: NonNullable<RuleBinding["stops"]>): string | null {
    let previous = Number.NEGATIVE_INFINITY;
    for (const stop of stops) {
        if (typeof stop !== "object" || typeof stop.at !== "number" || !Number.isFinite(stop.at)) {
            return "Every stop has a number at `at`.";
        }

        if (stop.at < previous) {
            return "stops are listed in ascending order of `at`.";
        }

        previous = stop.at;
        const values = [stop.value, stop.below ?? stop.value, stop.above ?? stop.value];
        if (!values.every((value) => readableStopValue(descriptor, value))) {
            const kind = descriptor.accepts === "number" ? "a number" : "a color";
            return `Every stop's value, below and above on ${descriptor.channel} is ${kind}.`;
        }
    }

    return null;
}

/**
 * Read a number against points, Cytoscape's way.
 * @param stops - The points, ascending, at least one.
 * @param x - The number.
 * @param between - How two values blend at a fraction of the way from the first to the second.
 * @returns What the number paints.
 */
function readAgainstStops<T>(stops: readonly ReadStop<T>[], x: number, between: (a: T, b: T, t: number) => T): T {
    const [first] = stops;
    if (x < first.at) {
        return first.below;
    }

    for (let index = 0; index < stops.length - 1; index++) {
        const point = stops[index];
        const next = stops[index + 1];
        if (x === point.at) {
            return point.value;
        }

        if (x < next.at) {
            return between(point.above, next.below, (x - point.at) / (next.at - point.at));
        }
    }

    const last = stops.at(-1) ?? first;

    return x === last.at ? last.value : last.above;
}

/**
 * Blend two colors per component.
 * @param from - The color at the start.
 * @param to - The color at the end.
 * @param t - How far along, 0 to 1.
 * @returns The blend.
 */
function blendColors(from: ColorValue, to: ColorValue, t: number): ColorValue {
    const at = (a: number, b: number): number => a + (b - a) * t;

    return requireColor(
        { r: at(from.r, to.r), g: at(from.g, to.g), b: at(from.b, to.b), a: at(from.a, to.a) },
        "A blend",
    );
}

/**
 * Prepare a binding that reads a number against points.
 * @param descriptor - The channel, which carries a number or a color.
 * @param binding - The rule binding, which has `stops`.
 * @param options - Everything preparing it was given.
 * @returns The prepared binding.
 * @throws A `GraphtyError` with code `E_BAD_LAYER` when the stops cannot be painted.
 */
function prepareStops(
    descriptor: ChannelDescriptor,
    binding: RuleBinding,
    options: PrepareBindingOptions,
): PreparedBinding {
    const problem = stopsProblem(descriptor, binding);
    if (problem !== null) {
        throw badBinding(problem, { channel: descriptor.channel, stops: binding.stops });
    }

    const stops = binding.stops ?? [];
    const absent = missingValue(descriptor, binding);
    const read = <T>(convert: (value: string | number) => T): ReadStop<T>[] =>
        stops.map((stop) => ({
            at: stop.at,
            value: convert(stop.value),
            below: convert(stop.below ?? stop.value),
            above: convert(stop.above ?? stop.value),
        }));
    let painter: Painter;

    if (descriptor.accepts === "color") {
        const points = read((value) => requireColor(value, "A stop"));
        painter = {
            palette: null,
            groups: 0,
            paint: (value): EncodedValue | undefined => {
                const x = readNumber(value);

                return Number.isNaN(x) ? absent : readAgainstStops(points, x, blendColors);
            },
        };
    } else {
        const points = read(Number);
        const low = descriptor.min ?? Number.NEGATIVE_INFINITY;
        const high = descriptor.max ?? Number.POSITIVE_INFINITY;
        const raw = (x: number): number => readAgainstStops(points, x, (a, b, t) => a + (b - a) * t);
        painter = {
            palette: null,
            groups: 0,
            paint: (value): EncodedValue | undefined => {
                const x = readNumber(value);

                return Number.isNaN(x) ? absent : clamp(raw(x), low, high);
            },
            outOfRange: (value): boolean => {
                const x = readNumber(value);
                const number = Number.isNaN(x) ? Number.NaN : raw(x);

                return number < low || number > high;
            },
        };
    }

    const facts = walkColumn(options.column, true);
    const domain: [number, number] = [stops[0].at, (stops.at(-1) ?? stops[0]).at];

    return assemble(
        descriptor,
        binding,
        {
            scale: "linear",
            map: BUILT_IN_SCALES.linear,
            scales: options.scales,
            facts,
            settled: { domain, notPlottable: 0, clamped: 0, facts: [] },
            categories: { categories: [], lumped: [], other: 0 },
            context: { domain },
            numeric: true,
            unmeasured: options.unmeasured ?? 0,
        },
        painter,
    );
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
 *
 * WHERE THESE FAILURES ACTUALLY SURFACE, stated because this comment used to claim otherwise and
 * a reader acted on it. `styles.add()` and `styles.encode()` do NOT call this: the column is read
 * when the frame is painted, so a binding the channel cannot take is refused during the repaint,
 * which catches it, disables the layer for that pass and records a `RepaintProblem`. The edit
 * itself resolves, and the layer sits in the stack enabled. `session.paint.problems()` is the
 * only place the reason appears. A layer's paths are checked at the edit, and nothing else is.
 * @param options - The channel, the binding, the column and the session's scales.
 * @returns The prepared binding.
 * @throws A `GraphtyError`: `E_UNKNOWN_CHANNEL` for a channel the element does not have,
 *   `E_UNKNOWN_SCALE` for a scale nobody registered, `E_BAD_LAYER` for a binding the channel
 *   cannot take, and `E_CAP_EXCEEDED` when the encoding has more groups than a palette the CALLER
 *   named, or than the channel has values for. A palette the element chose for itself is chosen
 *   against the real group count and can never be the one that fails here.
 */
export function prepareBinding(options: PrepareBindingOptions): PreparedBinding {
    const address = parseShaderParamAddress(options.channel);
    if (address !== null) {
        return prepareParamBinding(address, options);
    }

    const descriptor = requireChannel(options.channel);
    const { binding } = options;

    if ("template" in binding) {
        return prepareTemplateBinding(descriptor, binding.template, options);
    }

    return "value" in binding ? prepareLiteral(descriptor, binding) : prepareRule(descriptor, binding, options);
}

// ---------------------------------------------------------------------------------------------
// A preview of a binding not yet written
// ---------------------------------------------------------------------------------------------

/** How many bins a preview cuts a numeric domain into when it is not told. */
const PREVIEW_BINS = 20;

/** How many halvings find a bin edge in the data's units: well past a double's precision. */
const BISECTIONS = 64;

/**
 * One bin of a {@link BindingPreview}: a stretch of the scale, or one category.
 * @since 3.26.0
 */
export interface BindingPreviewBin {
    /** The lower edge, in the data's units; null for a category. */
    readonly from: number | null;
    /** The upper edge, in the data's units; null for a category. */
    readonly to: number | null;
    /** The category, as the data spells it; absent for a stretch of a numeric scale. */
    readonly value?: unknown;
    /** How many elements fall in it. */
    readonly count: number;
    /**
     * What the binding paints there: at the middle of the stretch, or for the category. Null when
     * it paints nothing (a hidden value).
     */
    readonly paints: EncodedValue | null;
}

/**
 * What a binding would paint, read before it is written: the bins of its scale with their counts
 * and what each paints, its step bounds, and the elements it leaves at the ends or has no place
 * for. Every figure comes from the same preparation the repaint runs, so a written layer paints
 * what its preview showed.
 * @since 3.26.0
 */
export interface BindingPreview {
    /** The channel it would paint. */
    readonly channel: Channel;
    /** The scale it reads through: a built-in scale's name, or a registered one's. */
    readonly scale: NonNullable<RuleBinding["scale"]>;
    /** The extent it reads values against, in the data's units; null for a scale of categories. */
    readonly domain: readonly [number, number] | null;
    /**
     * The bins, lowest first. A numeric scale's bins are equal stretches of the scale's own
     * space (equal ratios on a logarithmic scale), or of the data's units on a stepped one; a
     * scale of categories has one bin per category, largest first, then the ones folded into
     * "other".
     */
    readonly bins: readonly BindingPreviewBin[];
    /** Where a stepped scale changes step, ascending, in the data's units; empty otherwise. */
    readonly steps: readonly number[];
    /**
     * How many elements each step paints, lowest step first: one more entry than `steps`, a value
     * on a cut counted in the step above it, and a value beyond the domain in the end step it is
     * painted as. Empty when the scale is not stepped.
     * @since 3.26.0
     */
    readonly stepCounts: readonly number[];
    /** How many elements carry a number below the domain, painted as its lower end. */
    readonly below: number;
    /** How many elements carry a number above the domain, painted as its upper end. */
    readonly above: number;
    /** How many elements carry no value (absent or null). */
    readonly noValue: number;
    /**
     * How many elements carry a value the scale has no place for: text on a numeric scale, or zero
     * and below on a logarithmic one.
     */
    readonly outsideScale: number;
    /** What an element with no value is painted, or null when it is left to the layers beneath. */
    readonly noValuePaints: EncodedValue | null;
    /**
     * The palette painting a colour channel: a catalogue palette's id, `"custom"` for a binding
     * carrying its own stops, null on a channel that carries no colour.
     * @since 3.26.0
     */
    readonly palette: PaletteId | null;
    /**
     * The parts of the binding the element filled in because the binding left them out: the
     * palette (a session default), the scale (linear), the domain (the data's extent) and the
     * range (the channel's default output). A part the binding names is never listed.
     * @since 3.26.0
     */
    readonly defaulted: readonly PreviewDefaultedPart[];
    /** The values' own extent, lowest and highest number carried; null when none is a number. @since 3.26.0 */
    readonly extent: readonly [number, number] | null;
    /**
     * Where the domain's ends sit in the data, as percentiles from 0 to 100: the share of the
     * numbers below the lower end, and the share at or below the upper end. Null for a scale of
     * categories or a column with no numbers.
     * @since 3.26.0
     */
    readonly endPercentiles: readonly [number, number] | null;
    /**
     * How many elements carry exactly the value at each end of the domain. A large count means
     * moving a percentile end a little moves nothing: the tie is the reason.
     * @since 3.26.0
     */
    readonly endTies: readonly [number, number] | null;
}

/** A part of a binding {@link BindingPreview.defaulted} can report as filled in. @since 3.26.0 */
export type PreviewDefaultedPart = "palette" | "scale" | "domain" | "range";

/** Everything {@link previewBinding} is given. */
export interface PreviewBindingOptions {
    /** The channel. */
    readonly channel: Channel;
    /** The binding: a rule, as it would be written. */
    readonly binding: RuleBinding;
    /** The value of the bound path on every element of the channel's kind. */
    readonly column: readonly unknown[];
    /**
     * The values to count into the bins, when only some elements are counted: the scale is still
     * prepared from `column`, so each bin paints what it paints over the whole graph. `column` when
     * absent.
     */
    readonly counted?: readonly unknown[];
    /** The session's scales. */
    readonly scales: ScaleRegistry;
    /** How many bins to cut a numeric domain into. */
    readonly bins?: number;
    /** What the numeric bins span: the domain (the default), or the data's extent and the domain together. */
    readonly span?: PreviewSpan;
    /**
     * The binding as its author wrote it, before the session filled in a default palette: what
     * {@link BindingPreview.defaulted} is read against. `binding` when absent.
     */
    readonly asWritten?: RuleBinding;
}

/**
 * What a preview's numeric bins span. `"domain"` cuts the binding's own domain, so a narrowed
 * domain narrows the bins with it. `"data"` cuts the values' whole extent together with the
 * domain, so an editor drawing the bins as its axis keeps every value on it while the domain
 * moves inside: each bin still paints what the binding paints there, and `below` and `above`
 * still count against the domain.
 * @since 3.26.0
 */
export type PreviewSpan = "domain" | "data";

/**
 * Find the value a monotonic scale places at a position, by halving.
 * @param place - The scale, as a position from 0 to 1.
 * @param domain - The domain's two ends.
 * @param target - The position.
 * @returns The value.
 */
function valueAt(place: (value: number) => number, domain: readonly [number, number], target: number): number {
    let [low, high] = domain;
    for (let at = 0; at < BISECTIONS; at++) {
        const middle = (low + high) / 2;
        if (place(middle) < target) {
            low = middle;
        } else {
            high = middle;
        }
    }

    return (low + high) / 2;
}

/**
 * The extent a `span: "data"` preview cuts: the values' own extent (what an automatic domain
 * would be) together with the binding's domain.
 * @param options - What the preview was given.
 * @param low - The domain's lower end.
 * @param high - The domain's upper end.
 * @returns The two ends, ascending.
 */
function dataAxis(options: PreviewBindingOptions, low: number, high: number): [number, number] {
    const { channel, column, scales } = options;
    const binding: RuleBinding = { ...options.binding, domain: "auto", clamp: undefined };
    const extent = prepareBinding({ channel, binding, column, scales }).domain ?? [low, high];

    return [Math.min(low, ...extent), Math.max(high, ...extent)];
}

/**
 * The parts of a binding the preparation filled in: see {@link BindingPreview.defaulted}.
 * @param binding - The binding as the caller wrote it.
 * @param prepared - What preparing it worked out.
 * @returns The parts, in a fixed order.
 */
function defaultedParts(binding: RuleBinding, prepared: PreparedBinding): PreviewDefaultedPart[] {
    const parts: PreviewDefaultedPart[] = [];
    if (prepared.palette !== null && binding.palette === undefined && binding.colors === undefined) {
        parts.push("palette");
    }

    if (binding.scale === undefined) {
        parts.push("scale");
    }

    if (prepared.domain !== null && (binding.domain === undefined || binding.domain === "auto")) {
        parts.push("domain");
    }

    if (prepared.range !== undefined && binding.range === undefined) {
        parts.push("range");
    }

    return parts;
}

/**
 * The data's extent, and where a domain's ends sit in it: see {@link BindingPreview.extent}.
 * @param column - The values.
 * @param domain - The prepared domain, or null for categories.
 * @returns The extent, the ends' percentiles and the ties at each end.
 */
function previewEnds(
    column: readonly unknown[],
    domain: readonly [number, number] | null,
): Pick<BindingPreview, "extent" | "endPercentiles" | "endTies"> {
    const numbers = column.flatMap((value) => {
        const number = value === undefined || value === null ? Number.NaN : readNumber(value);
        return Number.isFinite(number) ? [number] : [];
    });
    if (numbers.length === 0) {
        return { extent: null, endPercentiles: null, endTies: null };
    }

    const extent: [number, number] = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
    for (const number of numbers) {
        extent[0] = Math.min(extent[0], number);
        extent[1] = Math.max(extent[1], number);
    }

    if (domain === null) {
        return { extent, endPercentiles: null, endTies: null };
    }

    const [low, high] = [Math.min(...domain), Math.max(...domain)];
    const share = (count: number): number => (100 * count) / numbers.length;
    const count = (test: (value: number) => boolean): number => numbers.filter(test).length;

    return {
        extent,
        endPercentiles: [share(count((value) => value < low)), share(count((value) => value <= high))],
        endTies: [count((value) => value === low), count((value) => value === high)],
    };
}

/**
 * Preview a binding not yet written: its bins, counts, steps and what each bin paints.
 * @param options - The channel, the binding, the column and the session's scales.
 * @returns The preview.
 * @throws What {@link prepareBinding} throws for a binding the channel cannot take.
 */
export function previewBinding(options: PreviewBindingOptions): BindingPreview {
    const { channel, binding, column, scales } = options;
    const prepared = prepareBinding({ channel, binding, column, scales });
    const tally = options.counted ?? column;
    const ends = previewEnds(column, prepared.domain);
    const scale = prepared.scale ?? "linear";
    const base = {
        channel: prepared.channel,
        scale,
        steps: prepared.steps ?? [],
        noValuePaints: orNull(prepared.paint(undefined)),
        palette: binding.colors === undefined ? (prepared.palette?.id ?? null) : "custom",
        defaulted: defaultedParts(options.asWritten ?? binding, prepared),
        ...ends,
    };

    if (prepared.domain === null) {
        const { bins, noValue, outsideScale } = previewCategoryBins(prepared, tally);

        return { ...base, stepCounts: [], domain: null, bins, below: 0, above: 0, noValue, outsideScale };
    }

    const { domain } = prepared;
    const { stepCounts, bins, below, above, noValue, outsideScale } = previewScaleBins(
        options,
        prepared,
        domain,
        scale,
        tally,
    );

    return { ...base, stepCounts, domain: [domain[0], domain[1]], bins, below, above, noValue, outsideScale };
}

/**
 * A preview's paint, or null when it paints nothing.
 * @param value - What the binding paints.
 * @returns The value, or null.
 */
function orNull(value: EncodedValue | undefined): EncodedValue | null {
    return value ?? null;
}

/**
 * A categorical binding's preview bins: one per category, lumped ones last, with how many values
 * fall in each.
 * @param prepared - The prepared binding.
 * @param tally - The values counted.
 * @returns The bins and the values with no value or outside the scale.
 */
function previewCategoryBins(
    prepared: PreparedBinding,
    tally: readonly unknown[],
): { bins: BindingPreviewBin[]; noValue: number; outsideScale: number } {
    let noValue = 0;
    let outsideScale = 0;
    const counts = new Map<string, number>();
    for (const value of tally) {
        const name = readCategory(value);
        if (value === undefined || value === null) {
            noValue++;
        } else if (name === null) {
            outsideScale++;
        } else {
            counts.set(name, (counts.get(name) ?? 0) + 1);
        }
    }

    const bins = [...prepared.categories, ...prepared.lumped].map((name): BindingPreviewBin => {
        const value = prepared.categoryValues.get(name);

        return { from: null, to: null, value, count: counts.get(name) ?? 0, paints: orNull(prepared.paint(value)) };
    });

    return { bins, noValue, outsideScale };
}

/** The bounds a scale preview counts values against. */
interface PreviewBounds {
    /** The domain's low end. */
    readonly low: number;
    /** The domain's high end. */
    readonly high: number;
    /** The bins' low end. */
    readonly axisLow: number;
    /** The bins' high end. */
    readonly axisHigh: number;
    /** How many bins. */
    readonly binCount: number;
    /** A stepped scale's cuts, empty for a continuous one. */
    readonly cuts: readonly number[];
    /** Whether the scale is stepped. */
    readonly stepped: boolean;
}

/** What a scale preview counted. */
interface PreviewTally {
    /** Values per bin. */
    readonly counts: number[];
    /** Values per step, empty for a continuous scale. */
    readonly stepCounts: number[];
    /** Values below the domain. */
    below: number;
    /** Values above the domain. */
    above: number;
    /** Elements with no value. */
    noValue: number;
    /** Values the scale does not place. */
    outsideScale: number;
}

/**
 * A continuous or stepped binding's preview bins over its domain, or with `span: "data"` over the
 * values' extent around it.
 * @param options - The preview's options.
 * @param prepared - The prepared binding.
 * @param domain - Its domain.
 * @param scale - Its scale's name.
 * @param tally - The values counted.
 * @returns The bins and the counts the preview reports.
 */
function previewScaleBins(
    options: PreviewBindingOptions,
    prepared: PreparedBinding,
    domain: readonly [number, number],
    scale: string,
    tally: readonly unknown[],
): Omit<PreviewTally, "counts"> & { bins: BindingPreviewBin[] } {
    const [low, high] = [Math.min(...domain), Math.max(...domain)];
    // The bins' extent: the domain, or with `span: "data"` the values' extent around it.
    const axis = options.span === "data" ? dataAxis(options, low, high) : null;
    const [axisLow, axisHigh] = axis ?? [low, high];
    const binCount = Math.max(1, Math.floor(options.bins ?? PREVIEW_BINS));
    const map = options.scales.require(scale);
    // A stepped scale is binned in the data's units; a continuous one in its own space.
    const stepped = prepared.steps !== undefined;
    const place = previewPlacer(options.binding, map, stepped, axis ?? [domain[0], domain[1]], [axisLow, axisHigh]);
    const ascending: readonly [number, number] =
        stepped || axis !== null ? [axisLow, axisHigh] : [domain[0], domain[1]];
    const edges = previewEdges(place, ascending, binCount);
    const bounds: PreviewBounds = { low, high, axisLow, axisHigh, binCount, cuts: prepared.steps ?? [], stepped };
    const { counts, ...counted } = tallyPreview(tally, place, bounds);

    const bins = counts.map((count, at): BindingPreviewBin => {
        const middle = valueAt(place, ascending, (at + 0.5) / binCount);
        const [from, to] = [edges[at], edges[at + 1]];

        return { from: Math.min(from, to), to: Math.max(from, to), count, paints: orNull(prepared.paint(middle)) };
    });

    return { ...counted, bins };
}

/**
 * Where a value sits on a preview's axis, from 0 to 1, or NaN when the scale does not place it.
 * @param binding - The binding, for its midpoint and exponent.
 * @param map - The scale.
 * @param stepped - Whether the scale is stepped, so binned in the data's units.
 * @param domain - The domain the scale maps.
 * @param axis - The bins' extent.
 * @returns The placer.
 */
function previewPlacer(
    binding: RuleBinding,
    map: ScaleFn,
    stepped: boolean,
    domain: [number, number],
    axis: readonly [number, number],
): (value: number) => number {
    const [axisLow, axisHigh] = axis;
    if (stepped) {
        return (value) => (axisHigh === axisLow ? 0 : (value - axisLow) / (axisHigh - axisLow));
    }

    const context: ScaleContext = {
        domain,
        range: [0, 1],
        ...(binding.midpoint === undefined ? {} : { midpoint: binding.midpoint }),
        ...(binding.exponent === undefined ? {} : { exponent: binding.exponent }),
    };

    return (value) => {
        const placed = map(value, context);
        return typeof placed === "number" ? placed : Number.NaN;
    };
}

/**
 * The edges of a preview's bins, ends exact and the rest found by bisection.
 * @param place - Where a value sits on the axis.
 * @param ascending - The axis's ends, low first.
 * @param binCount - How many bins.
 * @returns The `binCount + 1` edges.
 */
function previewEdges(
    place: (value: number) => number,
    ascending: readonly [number, number],
    binCount: number,
): number[] {
    return Array.from({ length: binCount + 1 }, (_, at) => {
        if (at === 0) {
            return ascending[0];
        }

        if (at === binCount) {
            return ascending[1];
        }

        return valueAt(place, ascending, at / binCount);
    });
}

/**
 * Count a scale preview's values into its bins and steps.
 * @param tally - The values counted.
 * @param place - Where a value sits on the axis.
 * @param bounds - The bounds counted against.
 * @returns The counts.
 */
function tallyPreview(
    tally: readonly unknown[],
    place: (value: number) => number,
    bounds: PreviewBounds,
): PreviewTally {
    const counted: PreviewTally = {
        counts: new Array<number>(bounds.binCount).fill(0),
        stepCounts: bounds.stepped ? new Array<number>(bounds.cuts.length + 1).fill(0) : [],
        below: 0,
        above: 0,
        noValue: 0,
        outsideScale: 0,
    };

    for (const value of tally) {
        if (value === undefined || value === null) {
            counted.noValue++;
            continue;
        }

        const number = readNumber(value);
        const position = Number.isNaN(number) ? Number.NaN : place(number);
        if (Number.isNaN(position)) {
            counted.outsideScale++;
            continue;
        }

        countPlaced(counted, number, position, bounds);
    }

    return counted;
}

/**
 * Count one placed value: its step, whether it falls outside the domain, and its bin.
 * @param counted - The counts so far.
 * @param number - The value.
 * @param position - Where it sits on the axis.
 * @param bounds - The bounds counted against.
 */
function countPlaced(counted: PreviewTally, number: number, position: number, bounds: PreviewBounds): void {
    const { low, high, axisLow, axisHigh, binCount, cuts, stepped } = bounds;
    if (stepped) {
        counted.stepCounts[cuts.filter((cut) => number >= cut).length]++;
    }

    if (number < low) {
        counted.below++;
    } else if (number > high) {
        counted.above++;
    }

    if (number >= axisLow && number <= axisHigh) {
        counted.counts[Math.min(binCount - 1, Math.max(0, Math.floor(position * binCount)))]++;
    }
}

// ---------------------------------------------------------------------------------------------
// A binding's values for items in order
// ---------------------------------------------------------------------------------------------

/**
 * What a binding paints for each of a number of items taken in order: item `i` read as the value
 * `i`. See {@link StylesApi.sequence}.
 * @since 3.30.0
 */
export interface StyleSequence {
    /** The channel it paints. */
    readonly channel: Channel;
    /** What each item paints, first item first; undefined where the binding paints nothing. */
    readonly values: readonly (EncodedValue | undefined)[];
    /**
     * The second cue an overflow policy steps through (`overflow: "shape"` on `node.color` gives
     * node shapes, `"pattern"` on `edge.color` gives edge patterns), one per item; null when the
     * binding cycles none.
     */
    readonly cue: { readonly channel: Channel; readonly values: readonly (EncodedValue | undefined)[] } | null;
    /** The palette painting a colour channel, `"custom"` for its own stops, null otherwise. */
    readonly palette: PaletteId | null;
}

/** Everything {@link sequenceOf} is given. */
export interface SequenceOptions {
    /** The channel. */
    readonly channel: Channel;
    /** The binding, its `by` ignored: the items are read as 0, 1, 2 and so on. */
    readonly binding: RuleBinding;
    /** How many items. */
    readonly count: number;
    /** The session's scales. */
    readonly scales: ScaleRegistry;
}

/**
 * What a binding paints for `count` items in order, prepared exactly as a written binding is over
 * a column holding 0 to `count - 1`. A scale of categories numbers them in that order (equal
 * counts tie-break by value), so item `i` takes the palette's or the channel's `i`-th value, and
 * past the palette the binding's own overflow policy decides; a numeric scale spreads them evenly
 * from the range's first end to its last.
 * @param options - The channel, the binding, the count and the scales.
 * @returns One value per item, and the second cue's when the overflow policy cycles one.
 */
export function sequenceOf(options: SequenceOptions): StyleSequence {
    const { channel, scales } = options;
    const descriptor = requireChannel(channel);
    const count = Math.max(0, Math.floor(options.count));
    const numeric = descriptor.accepts === "number";
    // Items are groups for a colour or a list value, amounts for a number.
    const binding: RuleBinding =
        options.binding.scale === undefined && !numeric ? { ...options.binding, scale: "ordinal" } : options.binding;
    if (count === 0) {
        return { channel: descriptor.channel, values: [], cue: null, palette: null };
    }
    const items = Array.from({ length: count }, (_, at) => at);
    // One item on a number has no extent of its own: it stands at the range's first end.
    const column = count === 1 && numeric ? [0, 1] : items;
    const prepare = (bound: Channel, rule: RuleBinding): PreparedBinding =>
        prepareBinding({ channel: bound, binding: rule, column, scales });
    const main = prepare(descriptor.channel, binding);
    const half = overflowHalf(descriptor.channel, binding);
    const cue = half === null ? null : prepare(half[0], half[1]);
    const paintAll = (prepared: PreparedBinding): (EncodedValue | undefined)[] => items.map((at) => prepared.paint(at));

    return {
        channel: descriptor.channel,
        values: paintAll(main),
        cue: half === null || cue === null ? null : { channel: half[0], values: paintAll(cue) },
        palette: binding.colors === undefined ? (main.palette?.id ?? null) : "custom",
    };
}

// ---------------------------------------------------------------------------------------------
// One shader parameter, bound per element
// ---------------------------------------------------------------------------------------------

/**
 * The channel a bound shader parameter reads as: a number or a color between the parameter's
 * declared ends, landing on the layer's uses of its shader.
 * @param address - Where the binding points.
 * @returns A descriptor the binding is prepared against.
 * @throws A `GraphtyError`: `E_UNKNOWN_SHADER` when the catalog lists no such shader, and
 *   `E_UNKNOWN_SHADER_PARAM` when it declares no such parameter or does not let it vary.
 */
export function shaderParamDescriptor(address: ShaderParamTarget): ChannelDescriptor {
    const shader = shaderDescriptor(address.shader);
    if (shader === undefined) {
        throw new GraphtyError({
            code: "E_UNKNOWN_SHADER",
            message: `There is no shader called "${address.shader}".`,
            source: "style",
            details: { shader: address.shader },
        });
    }

    const param = shader.params.find((entry) => entry.name === address.param);
    if (param?.varies !== true) {
        throw new GraphtyError({
            code: "E_UNKNOWN_SHADER_PARAM",
            message: `The shader "${shader.id}" declares no parameter "${address.param}" that varies per element.`,
            source: "style",
            details: {
                shader: shader.id,
                param: address.param,
                candidates: shader.params.filter((entry) => entry.varies === true).map((entry) => entry.name),
            },
        });
    }

    const map = channelDescriptor(address.channel) as ChannelDescriptor;

    return {
        ...map,
        plainName: `${shader.plainName} ${param.plainName}`,
        shortName: param.plainName,
        accepts: param.type === "color" ? "color" : "number",
        ...(typeof param.min === "number" ? { min: param.min } : {}),
        ...(typeof param.max === "number" ? { max: param.max } : {}),
    };
}

/**
 * The descriptor a shader parameter declared `varies` is bound as, by its encode address: a number
 * or a color between the parameter's declared ends, on the list channel the value lands in. What an
 * editor's vary picker reads for a parameter, as it reads `channelDescriptor` for a channel.
 * @param address - The address, `"<target>.shaders.<shader id>.<parameter id>"`.
 * @returns The descriptor; its `channel` is the address's list channel.
 * @throws A `GraphtyError`: `E_BAD_COMMAND` for a string that is not an address,
 *   `E_UNKNOWN_SHADER` and `E_UNKNOWN_SHADER_PARAM` as `shaderParamDescriptor`.
 * @since 3.36.0
 */
export function shaderParamChannel(address: ShaderParamAddress): ChannelDescriptor {
    const target = parseShaderParamAddress(address);
    if (target === null) {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message: `"${address}" is not a shader parameter address: "<target>.shaders.<shader>.<parameter>".`,
            source: "style",
            details: { address },
        });
    }

    return shaderParamDescriptor(target);
}

/**
 * Prepare a binding of one shader parameter: prepared as a number or a color, each value then
 * written onto the layer's uses of its shader as `{ [shader]: { [parameter]: value } }`, one shared object per
 * distinct value.
 * @param address - Where the binding points.
 * @param options - Everything preparing it was given.
 * @returns The prepared binding, painting map patches on the map channel.
 */
function prepareParamBinding(address: ShaderParamTarget, options: PrepareBindingOptions): PreparedBinding {
    const descriptor = shaderParamDescriptor(address);
    const { binding } = options;
    const integer =
        shaderDescriptor(address.shader)?.params.find((entry) => entry.name === address.param)?.type === "integer";
    const ranged =
        "by" in binding &&
        binding.range === undefined &&
        binding.stops === undefined &&
        binding.scale !== "index" &&
        binding.scale !== "passthrough" &&
        descriptor.min !== undefined &&
        descriptor.max !== undefined
            ? { ...binding, range: [descriptor.min, descriptor.max] as [number, number] }
            : binding;
    let prepared: PreparedBinding;
    if ("template" in ranged) {
        prepared = prepareTemplateBinding(descriptor, ranged.template, options);
    } else if ("value" in ranged) {
        prepared = prepareLiteral(descriptor, ranged);
    } else {
        prepared = prepareRule(descriptor, ranged, options);
    }
    const patches = new Map<unknown, EncodedValue>();
    const patch = (value: EncodedValue | undefined): EncodedValue | undefined => {
        if (value === undefined) {
            return undefined;
        }

        const color = typeof value === "object" && value !== null && "hex" in value ? value.hex : null;
        const plain = color ?? (integer && typeof value === "number" ? Math.round(value) : value);
        let made = patches.get(plain);
        if (made === undefined) {
            const params = Object.create(null) as Record<string, unknown>;
            params[address.param] = plain;
            const sets = Object.create(null) as Record<string, unknown>;
            sets[address.shader] = params;
            made = sets;
            patches.set(plain, made);
        }

        return made;
    };

    return {
        ...prepared,
        channel: address.channel,
        paint: (value) => patch(prepared.paint(value)),
        paintIgnoringHidden: (value) => patch(prepared.paintIgnoringHidden(value)),
    };
}
