/**
 * @file The legend: what a reader is told about the picture, derived from the encoding model and
 * never from the canvas.
 *
 * THE SOURCE IS THE MODEL, WHICH IS WHY THIS FILE IS HEADLESS. A legend built by sampling pixels
 * can only describe the frame that happened to be on screen: it cannot be asserted in a Node
 * test, it cannot be composed into an export at four times the screen's scale, and it goes stale
 * the moment the camera moves. Every block below is read out of the prepared bindings the repaint
 * already painted from, so the legend and the picture are two readings of one object rather than
 * two guesses that have to be kept in step.
 *
 * DEPARTURES ARE THE HONEST PART. A colour ramp that quietly clamps at the 2nd and 98th
 * percentiles, a logarithmic scale with 312 zeros it cannot plot, a run that measured 300 nodes
 * of 50,000 -- each of those makes the picture say something narrower than "this is the data",
 * and a legend that prints the ramp without printing the narrowing is the thing that turns a
 * reasonable choice into a false claim. {@link LegendBlock.departures} carries them as finished
 * sentences, most of them straight off the prepared binding, which counted them while it was
 * settling the domain and therefore pays nothing extra to report them.
 *
 * ONE DEPARTURE IS THIS FILE'S OWN. A layer lower in the stack can be painted over by a layer
 * above it that writes the same channel over EVERY element, and a block describing colours no
 * reader can see is exactly the false claim the rest of the list exists to prevent. The stack is
 * right here, so it is checked and said.
 *
 * WHAT THE BLOCKS ARE IN: the same order {@link import("./StylesApi").StylesApi.list} returns,
 * BOTTOM FIRST. A second reading order for the same stack is how an off-by-one gets in, and a
 * consumer that wants the winning layer first reverses a list it already draws bottom first.
 *
 * WHERE THE WORDS COME FROM, and why none of them are written here:
 *
 * - A scale's words are its catalogue entry's `plainName`, so the legend and the scale picker
 *   never disagree about what "sqrt" is called. A second dialect invented here would be a second
 *   thing to keep in step with the catalogue, and it would lose.
 * - A field's words come from whoever holds the session's attributes and run fields, through
 *   {@link LegendSources.field}. Absent, the path's last segment is humanised, which is a
 *   fallback and says so rather than pretending a plain name was found.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { Binding, Channel, LayerId, PaletteId, Path, RunId } from "../../catalog/types";
import type { EncodedValue, PreparedBinding } from "./encoding";
import type { Layer } from "./Layer";
import type { SelectorTarget } from "./predicate";
import type { ScaleRegistry } from "./scales";

// ---------------------------------------------------------------------------------------------
// What a legend is made of
// ---------------------------------------------------------------------------------------------

/**
 * One row of a legend: a value, and what the picture paints for it.
 *
 * `value` is the DATA value -- the category, or a number on the domain -- and `color`, `size` and
 * `paints` are what the encoding turns it into. `label` is that same value in the words a reader
 * sees, worked out once here so that two consumers do not format the same number two ways.
 */
export interface LegendSwatch {
    /** The value in the words a reader sees. */
    readonly label: string;
    /** The value itself, for a consumer that wants to filter or select by it. */
    readonly value: unknown;
    /** The colour the encoding paints it, as `#rrggbb` or `#rrggbbaa`. */
    readonly color?: string;
    /** The size or width the encoding paints it. */
    readonly size?: number;
    /** How many elements carry it, when whoever supplied the encoding can say. */
    readonly count?: number;
    /**
     * What the encoding paints it when that is neither a colour nor a size -- a node shape, a
     * line pattern, an arrow.
     *
     * Those channels carry one of a fixed list, and a list of names has no chip a `color` or a
     * `size` could stand in for. Without this a legend for "shape by community" could name the
     * communities and not the shapes, which is half a legend.
     */
    readonly paints?: unknown;
}

/**
 * Everything a reader is told about one channel of one layer.
 *
 * `field`, `scale`, `domain` and `palette` are each absent when there is nothing true to put in
 * them: a layer that writes a fixed colour reads no field, passes through no scale and has no
 * domain, and the prepared binding says so by carrying a null path and a null scale. Filling them
 * with a placeholder would put a field name in a legend that names no field.
 */
export interface LegendBlock {
    /** The channel the block describes. */
    readonly channel: Channel;
    /** The layer that paints it. */
    readonly layerId: LayerId;
    /** The run behind the layer, when a run put it there. */
    readonly runId?: RunId;
    /** What shape of legend a consumer draws: a ramp, a list of colours, a single chip. */
    readonly kind: "sequential" | "diverging" | "categorical" | "highlight" | "literal";
    /** The field the encoding reads, in both plain and technical words. */
    readonly field?: {
        /** The name a reader sees. */
        readonly plainName: string;
        /** The name the literature and the data use. */
        readonly technicalName: string;
        /** The column path itself. */
        readonly path: Path;
    };
    /** The scale, by name and in words. */
    readonly scale?: {
        /** The scale's name, which is what a binding spells. */
        readonly kind: string;
        /** The same scale in words, from the scale catalogue. */
        readonly label: string;
    };
    /** The extent values were read against, and how it was narrowed. */
    readonly domain?: {
        /** The low end. */
        readonly min: number;
        /** The high end. */
        readonly max: number;
        /** The value a diverging palette centres on, when the binding named one. */
        readonly midpoint?: number;
        /** The percentiles the extent was cut at, when the binding asked for a clamp. */
        readonly clamped?: {
            /** The low percentile, such as "p2". */
            readonly from: string;
            /** The high percentile, such as "p98". */
            readonly to: string;
        };
    };
    /** The palette, when the channel carries a colour. */
    readonly palette?: {
        /** The palette's id. */
        readonly name: PaletteId;
        /** Whether the smallest value lands at the far end of it. */
        readonly reversed: boolean;
    };
    /** Up to twelve rows. */
    readonly swatches: readonly LegendSwatch[];
    /** How many rows did not fit, when some did not. */
    readonly overflow?: {
        /** The number a consumer prints as "and 14 more". */
        readonly hidden: number;
    };
    /**
     * What this encoding does that the picture alone does not admit to.
     *
     * Finished sentences, printed unedited. Empty when the encoding has nothing to confess.
     */
    readonly departures: readonly string[];
}

/** The words one field goes by. */
export interface FieldWords {
    /** The name a reader sees. */
    readonly plainName: string;
    /** The name the literature and the data use. */
    readonly technicalName: string;
}

/**
 * How the encodings one layer prepared are looked up.
 *
 * The legend and the explanation both read the SAME prepared bindings the repaint painted from.
 * Preparing a second set here would walk every bound column again -- 3.3 to 4.6 ms per continuous
 * binding at fifty thousand values -- to produce an answer that would disagree with the picture
 * the moment the data moved.
 *
 * A LIST RATHER THAN A LOOKUP BY CHANNEL, in the order the repaint applies them, because that is
 * the shape the repaint already holds: a layer's prepared channels are a list, and handing one
 * over needs no index keyed by something else. Every binding names the channel it paints, so
 * nothing is lost, and the order is the paint order rather than an order invented here.
 * @param layerId - The layer.
 * @returns Its prepared bindings, fixed values first and rules second. Empty for a layer that
 *   paints nothing, and for one the repaint could not prepare at all.
 */
export type EncodingLookup = (layerId: LayerId) => readonly PreparedBinding[];

/** Everything a legend is built from. */
export interface LegendSources {
    /**
     * The stack, BOTTOM FIRST, exactly as `styles.list()` returns it.
     * @returns The layers.
     */
    layers(): readonly Layer[];
    /** Where the prepared encodings are read from. */
    readonly encoding: EncodingLookup;
    /** The session's scales, for the words a scale goes by. */
    readonly scales: ScaleRegistry;
    /**
     * The words one field goes by, from the session's attributes and run fields.
     *
     * Absent, or absent for a particular path, the path's last segment is humanised.
     * @param path - The column path.
     * @param target - Whether the layer asking paints nodes or edges.
     * @returns The words, or undefined when nothing in the session names that path.
     */
    readonly field?: (path: Path, target: SelectorTarget) => FieldWords | undefined;
}

// ---------------------------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------------------------

/** How many swatches a block carries at most, whatever the encoding has to show. */
const SWATCH_CAP = 12;

/**
 * How many stops a continuous ramp is sampled at.
 *
 * Odd, so that the middle of the domain -- which is what a diverging palette centres on -- is one
 * of the stops rather than a gap between two of them.
 */
const RAMP_STOPS = 7;

/**
 * The fewest samples a stepped numeric encoding is swept with, and the fewest per group.
 *
 * The cut points of a grouping by equal counts are a property of the column, and a prepared
 * binding does not publish them; nor does a plugin's scale publish anything at all. Sweeping the
 * domain and watching for the painted value to change finds the boundaries of ANY scale from the
 * outside, at about 12 ns a sample, which is three microseconds for the whole sweep.
 *
 * The per-group floor is what keeps the count EXACT rather than merely plausible: a fixed sample
 * count would start merging neighbouring groups once there were more groups than samples, and an
 * overflow that says "and 6 more" when there are nine is the kind of quiet wrongness a legend
 * exists to prevent.
 */
const SWEEP_SAMPLES = 256;

/** How many samples every group of a stepped encoding gets at least. */
const SWEEP_PER_GROUP = 8;

/** The blocks of a stack with nothing to say. */
const NO_BLOCKS: readonly LegendBlock[] = Object.freeze([]);

// ---------------------------------------------------------------------------------------------
// Words and numbers
// ---------------------------------------------------------------------------------------------

/**
 * Write a number the way a legend prints it.
 *
 * Four significant figures and then the trailing zeros taken off, so a domain that arrived as
 * 0.30000000000000004 reads as 0.3 and one that arrived as 1234567 does not become 1.235e+6 for
 * no reason.
 * @param value - The number.
 * @returns The number in the words a reader sees.
 */
function formatNumber(value: number): string {
    if (!Number.isFinite(value)) {
        return String(value);
    }

    if (Number.isInteger(value) && Math.abs(value) < 1e7) {
        return String(value);
    }

    const magnitude = Math.abs(value);
    if (magnitude >= 1e7 || (magnitude > 0 && magnitude < 1e-3)) {
        return value.toExponential(2);
    }

    return String(Number(value.toPrecision(4)));
}

/**
 * Turn a path into the words a field goes by when nothing in the session can name it.
 *
 * The last segment only: `results.betweenness-1.value` is a field called "Value" on a run, and
 * repeating the run id in the field's name says nothing the block's own `runId` does not.
 * @param path - The column path.
 * @returns The words, which are a fallback and not a lookup.
 */
function humanisePath(path: Path): FieldWords {
    const segments = path.split(".");
    const last = segments[segments.length - 1] ?? path;
    const words = last
        .replace(/([a-z\d])([A-Z])/g, "$1 $2")
        .split(/[\s_-]+/u)
        .filter((word) => word !== "");
    const plainName = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");

    return { plainName: plainName === "" ? path : plainName, technicalName: path };
}

/**
 * The words one field goes by.
 * @param path - The column path.
 * @param target - Whether the layer paints nodes or edges.
 * @param sources - Where the session's own names are looked up.
 * @returns The words, from the session when it has them and from the path when it does not.
 */
function fieldWords(path: Path, target: SelectorTarget, sources: LegendSources): FieldWords {
    return sources.field?.(path, target) ?? humanisePath(path);
}

// ---------------------------------------------------------------------------------------------
// Reading a painted value
// ---------------------------------------------------------------------------------------------

/**
 * Whether a painted value is a colour.
 * @param value - What the encoding painted.
 * @returns True when it carries a hex string, which every colour channel's value does.
 */
function isColorValue(value: unknown): value is { hex: string } {
    return typeof value === "object" && value !== null && "hex" in value && typeof value.hex === "string";
}

/**
 * Split a painted value into the fields a swatch carries it in.
 * @param painted - What the encoding painted, or undefined when it paints this value nothing.
 * @returns The colour, the size, or the finished value of a channel that carries neither.
 */
function swatchPaint(painted: EncodedValue | undefined): Pick<LegendSwatch, "color" | "paints" | "size"> {
    if (painted === undefined) {
        return {};
    }

    if (isColorValue(painted)) {
        return { color: painted.hex };
    }

    if (typeof painted === "number") {
        return { size: painted };
    }

    return { paints: painted };
}

/**
 * A key two painted values are the same under.
 *
 * Colours are compared by their hex rather than by identity: the ramp mints a new object per
 * sampled step, so two samples of one colour are two objects and `===` would find every sweep
 * sample distinct.
 * @param painted - What the encoding painted.
 * @returns The key, or null when nothing was painted at all.
 */
function paintKey(painted: EncodedValue | undefined): string | null {
    if (painted === undefined) {
        return null;
    }

    if (isColorValue(painted)) {
        return painted.hex;
    }

    return typeof painted === "object" ? JSON.stringify(painted) : String(painted);
}

// ---------------------------------------------------------------------------------------------
// The swatches
// ---------------------------------------------------------------------------------------------

/** One run of domain values the encoding paints identically. */
interface PaintedRun {
    /** The lowest value in the run. */
    readonly from: number;
    /** The highest value in the run. */
    readonly to: number;
    /** What the encoding paints all of them. */
    readonly painted: EncodedValue;
}

/**
 * Sweep a numeric domain and collect the stretches the encoding paints identically.
 *
 * This is how a grouping by equal ranges, a grouping by equal counts and a plugin's scale nobody
 * here has heard of all produce correct group boundaries from the same code: the encoding is
 * asked, rather than reimplemented.
 * @param prepared - The prepared binding.
 * @param domain - The extent to sweep.
 * @returns The runs, in ascending order of value.
 */
function sweepRuns(prepared: PreparedBinding, domain: readonly [number, number]): readonly PaintedRun[] {
    const [low, high] = domain;
    const span = high - low;
    const samples = Math.max(SWEEP_SAMPLES, prepared.groups * SWEEP_PER_GROUP);
    const runs: PaintedRun[] = [];
    let key: string | null = null;

    for (let step = 0; step < samples; step++) {
        const value = span === 0 ? low : low + (span * step) / (samples - 1);
        const painted = prepared.paint(value);
        const sampleKey = paintKey(painted);

        if (sampleKey === null || painted === undefined) {
            key = null;
            continue;
        }

        const last = runs[runs.length - 1];
        if (sampleKey === key && last !== undefined) {
            runs[runs.length - 1] = { from: last.from, to: value, painted: last.painted };
            continue;
        }

        key = sampleKey;
        runs.push({ from: value, to: value, painted });
    }

    return runs;
}

/**
 * The swatches of an encoding that names categories.
 * @param prepared - The prepared binding.
 * @returns One swatch per category, largest group first, before the cap is applied.
 */
function categorySwatches(prepared: PreparedBinding): readonly LegendSwatch[] {
    return prepared.categories.map((category) => ({
        label: category,
        value: category,
        ...swatchPaint(prepared.paint(category)),
    }));
}

/**
 * The swatches of an encoding that cuts a numeric domain into groups.
 * @param prepared - The prepared binding.
 * @param domain - The extent it reads values against.
 * @returns One swatch per group, labelled with the values that fall in it.
 */
function groupSwatches(prepared: PreparedBinding, domain: readonly [number, number]): readonly LegendSwatch[] {
    return sweepRuns(prepared, domain).map((run) => ({
        label: run.from === run.to ? formatNumber(run.from) : `${formatNumber(run.from)} - ${formatNumber(run.to)}`,
        value: run.from,
        ...swatchPaint(run.painted),
    }));
}

/**
 * The swatches of a continuous ramp: evenly spaced stops across the domain.
 * @param prepared - The prepared binding.
 * @param domain - The extent it reads values against.
 * @returns The stops, low end first.
 */
function rampSwatches(prepared: PreparedBinding, domain: readonly [number, number]): readonly LegendSwatch[] {
    const [low, high] = domain;
    const span = high - low;
    const stops = span === 0 ? 1 : RAMP_STOPS;
    const swatches: LegendSwatch[] = [];

    for (let step = 0; step < stops; step++) {
        const value = stops === 1 ? low : low + (span * step) / (stops - 1);
        swatches.push({ label: formatNumber(value), value, ...swatchPaint(prepared.paint(value)) });
    }

    return swatches;
}

/**
 * The swatch of a layer that writes one fixed value.
 * @param prepared - The prepared binding, whose paint answers the same thing for every element.
 * @param layer - The layer, whose name is what a fixed value is called in a legend.
 * @returns The one swatch, or none when the fixed value paints nothing.
 */
function literalSwatches(prepared: PreparedBinding, layer: Layer): readonly LegendSwatch[] {
    const painted = prepared.paint(undefined);

    if (painted === undefined) {
        return [];
    }

    return [{ label: layer.name, value: layer.set?.[prepared.channel], ...swatchPaint(painted) }];
}

/**
 * Every swatch one encoding has to show, before the cap.
 * @param prepared - The prepared binding.
 * @param layer - The layer it belongs to.
 * @returns The swatches, in the order a legend reads them.
 */
function allSwatches(prepared: PreparedBinding, layer: Layer): readonly LegendSwatch[] {
    if (prepared.path === null) {
        return literalSwatches(prepared, layer);
    }

    if (prepared.categories.length > 0) {
        return categorySwatches(prepared);
    }

    if (prepared.domain === null) {
        return [];
    }

    return prepared.groups > 0 ? groupSwatches(prepared, prepared.domain) : rampSwatches(prepared, prepared.domain);
}

// ---------------------------------------------------------------------------------------------
// The block
// ---------------------------------------------------------------------------------------------

/**
 * What shape of legend a consumer draws for one encoding.
 * @param prepared - The prepared binding.
 * @param layer - The layer it belongs to.
 * @returns The kind.
 */
function kindOf(prepared: PreparedBinding, layer: Layer): LegendBlock["kind"] {
    if (prepared.path === null) {
        return layer.kind === "highlight" ? "highlight" : "literal";
    }

    if (prepared.palette !== null) {
        return prepared.palette.kind;
    }

    return prepared.categories.length > 0 ? "categorical" : "sequential";
}

/**
 * The binding a layer authored for one channel, which carries the taste a prepared binding does
 * not keep: the clamp's percentiles, the midpoint, and whether the scale was reversed.
 * @param layer - The layer.
 * @param channel - The channel.
 * @returns The authored binding, or undefined when the layer writes the channel as a fixed value.
 */
function authoredRule(layer: Layer, channel: Channel): Extract<Binding, { by: Path }> | undefined {
    const binding = layer.encode?.[channel];

    return binding !== undefined && "by" in binding ? binding : undefined;
}

/**
 * The extent an encoding read values against, and how it was narrowed.
 * @param prepared - The prepared binding.
 * @param rule - The authored binding, for the clamp and the midpoint it declared.
 * @returns The domain, or undefined when the scale reads no numeric domain.
 */
function domainOf(prepared: PreparedBinding, rule: Extract<Binding, { by: Path }> | undefined): LegendBlock["domain"] {
    if (prepared.domain === null) {
        return undefined;
    }

    const [min, max] = prepared.domain;
    const midpoint = rule?.midpoint;
    const clamp = rule?.clamp;

    return {
        min,
        max,
        ...(midpoint === undefined ? {} : { midpoint }),
        ...(clamp === undefined
            ? {}
            : { clamped: { from: `p${formatNumber(clamp[0])}`, to: `p${formatNumber(clamp[1])}` } }),
    };
}

/**
 * Whether a layer above this one paints the same channel over every element it can reach.
 *
 * `{match:"everything"}` is the only selector that can be known to cover an element without
 * asking about one: an expression or an id list may or may not, and claiming it does would put a
 * departure on a block that is perfectly visible.
 * @param layers - The stack, bottom first.
 * @param at - Where the block's layer sits in it.
 * @param channel - The channel the block describes.
 * @returns The name of the layer that covers it, or null when nothing does.
 */
function coveredBy(layers: readonly Layer[], at: number, channel: Channel): string | null {
    const mine = layers[at];

    for (let above = at + 1; above < layers.length; above++) {
        const layer = layers[above];
        const paints = layer.set?.[channel] !== undefined || layer.encode?.[channel] !== undefined;

        if (layer.enabled && layer.target === mine.target && layer.selector.match === "everything" && paints) {
            return layer.name;
        }
    }

    return null;
}

/**
 * Everything a reader has to be told about one encoding.
 * @param prepared - The prepared binding, which counted most of them while settling its domain.
 * @param layers - The stack, bottom first.
 * @param at - Where the block's layer sits in it.
 * @returns The sentences, in the order a legend prints them.
 */
function departuresOf(prepared: PreparedBinding, layers: readonly Layer[], at: number): readonly string[] {
    const covering = coveredBy(layers, at, prepared.channel);

    if (covering === null) {
        return prepared.departures;
    }

    return [...prepared.departures, `painted over by "${covering}"`];
}

/**
 * Build one block.
 * @param layer - The layer it describes.
 * @param prepared - One encoding the layer prepared, which names the channel it paints.
 * @param layers - The stack, bottom first, for the layers that paint over this one.
 * @param at - Where the layer sits in the stack.
 * @param sources - Where the scale's and the field's words come from.
 * @returns The block.
 */
function buildBlock(
    layer: Layer,
    prepared: PreparedBinding,
    layers: readonly Layer[],
    at: number,
    sources: LegendSources,
): LegendBlock {
    const { channel } = prepared;
    const rule = authoredRule(layer, channel);
    const swatches = allSwatches(prepared, layer);
    const hidden = Math.max(0, swatches.length - SWATCH_CAP);
    const { path, scale } = prepared;
    const domain = domainOf(prepared, rule);

    return {
        channel,
        layerId: layer.id,
        ...(layer.source.by === "run" ? { runId: layer.source.runId } : {}),
        kind: kindOf(prepared, layer),
        ...(path === null ? {} : { field: { ...fieldWords(path, layer.target, sources), path } }),
        ...(scale === null
            ? {}
            : { scale: { kind: scale, label: sources.scales.describe(scale)?.plainName ?? scale } }),
        ...(domain === undefined ? {} : { domain }),
        ...(prepared.palette === null
            ? {}
            : { palette: { name: prepared.palette.id, reversed: rule?.reverse === true } }),
        swatches: Object.freeze(swatches.slice(0, SWATCH_CAP)),
        ...(hidden === 0 ? {} : { overflow: { hidden } }),
        departures: Object.freeze([...departuresOf(prepared, layers, at)]),
    };
}

// ---------------------------------------------------------------------------------------------
// The door
// ---------------------------------------------------------------------------------------------

/**
 * Read the legend out of the encoding model.
 *
 * SYNCHRONOUS, and it paints nothing and measures nothing: every figure it prints was worked out
 * when the bindings were prepared. The one cost it adds is the sweep that finds a stepped
 * encoding's group boundaries, which is a few hundred calls into a closure per block.
 *
 * THE BASE LAYERS ARE NOT IN IT. A layer of kind "base" is what the picture looks like when
 * nothing has been said about the data, and a legend is a list of the things that HAVE been said.
 * A consumer that wants the defaults too reads `styles.list()`, which has them.
 *
 * A DISABLED LAYER IS NOT IN IT EITHER, because it paints nothing, and a legend row for paint
 * nobody can see is the false claim this whole file is arranged against.
 * @param sources - The stack, the prepared encodings, the scales and the field names.
 * @returns The blocks, BOTTOM FIRST -- the same order `styles.list()` returns.
 */
export function buildLegend(sources: LegendSources): readonly LegendBlock[] {
    const layers = sources.layers();
    const blocks: LegendBlock[] = [];

    for (let at = 0; at < layers.length; at++) {
        const layer = layers[at];

        if (!layer.enabled || layer.kind === "base") {
            continue;
        }

        for (const prepared of sources.encoding(layer.id)) {
            blocks.push(buildBlock(layer, prepared, layers, at, sources));
        }
    }

    return blocks.length === 0 ? NO_BLOCKS : Object.freeze(blocks);
}
