/**
 * @file `encode()`: the one path an analysis layer takes, and the layer it writes.
 *
 * A consumer that has just run an algorithm wants one thing -- "colour the graph by this" -- and
 * everything else in a style layer is detail it can get wrong. So `encode()` takes the run, the
 * channel and the taste (a palette, a scale, a clamp), and `planEncoding` writes the rest:
 * the path, the selector, the layer's kind, its name and where it came from.
 *
 * THE SELECTOR IS WRITTEN HERE, AND IT IS `{ match: "has" }`. The layer paints exactly the
 * elements that carry this run's field and nothing else, which is the rule that stops an
 * algorithm painting elements it has nothing to say about. The consumer never writes the
 * selector and therefore cannot get it wrong -- the way it used to be got wrong was an empty
 * string, which matched every node and every edge and erased every layer underneath.
 *
 * IT IS ALSO THE FAST PATH, WHICH IS WHY IT IS NOT AN EXPRESSION. A presence test costs 7.3 ns
 * per element against 1,322 ns for a `jmespath.search()` call, measured on this machine and
 * recorded in `selector.ts`. At fifty thousand nodes that is the difference between a fraction of
 * a frame and a second and a half, for a selector that says the same thing. The ergonomic road
 * and the cheap road are the same road on purpose.
 *
 * WHAT IT REFUSES, AND WHY EACH REFUSAL EXISTS RATHER THAN A DEFAULT:
 *
 * - A result shape that publishes nothing per element -- a list of scored pairs, a time series, a
 *   single fact -- has nothing to bind a channel to, so binding one would paint nothing and say
 *   nothing about why.
 * - A result shape that names a SUBSET rather than measuring everything -- a route, a chosen set
 *   of nodes or edges -- is a highlight, and `highlight()` paints it. Encoding one would produce
 *   a layer scoped to every element the run looked at, including the ones that are not on the
 *   route, and then colour them by whether they are: exactly the "this algorithm painted my whole
 *   graph" defect, one level down. Only the field that names the subset is refused: a field
 *   published beside it, like the side of a cut every node ended up on, is encoded like any other.
 * - A field the run did not publish, or a field of the wrong half -- a node field driving an edge
 *   channel -- is a spelling mistake that would otherwise match nothing in silence, which reads
 *   exactly like a correct answer of zero.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { scaleDescriptor } from "../../catalog/scales";
import type {
    AlgorithmKey,
    AttributeDescriptor,
    BindingOverflow,
    Channel,
    Encoding,
    FieldDescriptor,
    LayerSpec,
    MeasurementDeclaration,
    PaletteId,
    ResultShape,
    RunId,
} from "../../catalog/types";
import { GraphtyError } from "../../errors";
import { nearestNames } from "../results/ResultsApi";
import { fieldMeasurement, resultPath, resultShapeContract, type RunRef } from "../results/types";
import type { CodedFact, ColumnRef } from "../shared";
import type { ChannelDescriptor, ChannelValueKind } from "./channels";
import { DEFAULT_SIZE_RANGE } from "./derive";
import { requireChannel, type RuleBinding } from "./encoding";
import { columnPaletteFor, sequentialSamples } from "./palettes";
import type { ScaleRegistry } from "./scales";

// ---------------------------------------------------------------------------------------------
// What encode() is asked for, and what it needs to know
// ---------------------------------------------------------------------------------------------

/**
 * What `encode()` is asked for: a run, a channel, and taste.
 *
 * Everything else about the layer -- the path, the selector, the kind, the source, the name -- is
 * written by `planEncoding`, because every one of them is something a consumer can get
 * wrong and none of them is a decision it wanted to make.
 */
export interface EncodingSpec {
    /** The run, its awaited result, or its bare id. All three are what a caller has in hand. */
    readonly run: RunRef;
    /** The field to read. Defaults to the one the run's shape declares primary. */
    readonly field?: string;
    /** The channel to paint. */
    readonly channel: Channel;
    /** The scale to read the values through. Defaults to one that suits the field. */
    readonly scale?: RuleBinding["scale"];
    /**
     * The palette.
     *
     * Left off, the element picks one when the layer is painted, from the groups the run actually
     * produced: a ramp for a measurement, and for groups the smallest palette in the catalogue
     * that can name them all. Named, it is honoured as named -- and refused if the run has more
     * groups than it has colours, because a categorical palette never wraps.
     */
    readonly palette?: PaletteId;
    /**
     * What a categorical colour encoding does when the run found more groups than the palette has
     * colours (8 for the default palette). Ignored for a measurement, which has no groups.
     *
     * - `"other"` -- THE DEFAULT. The 8 largest groups keep the palette's colours in palette order,
     *   largest first, and every remaining group is painted one grey (#505050), which the legend
     *   lists as its last row, marked `role: "other"`.
     * - `"shape"` -- node encodings only. Colours cycle through the palette and each full cycle
     *   moves to the next node shape: group i is colour i mod 8 and shape floor(i / 8) from
     *   icosphere (the default shape), box, octahedron, cylinder, cone, torus. Groups past 48 fold
     *   into the grey. The shape is written by the same layer, so it is added and removed with
     *   the colour. Refused with `E_BAD_COMMAND` on an edge channel, since an edge has no shape.
     * - `"extend"` -- every group gets a colour of its own: a larger categorical palette when one
     *   fits, and past that the sequential default sampled once per group. Colours past the
     *   palette's capacity are NOT guaranteed to be told apart.
     *
     * With a `palette` named, N is that palette's capacity. A named palette with NO overflow keeps
     * the strict rule: too many groups is refused with `E_CAP_EXCEEDED`, because the caller asked
     * for exactly those colours. Naming an overflow applies it instead.
     */
    readonly overflow?: BindingOverflow;
    /** The extent to read values against. Defaults to the extent the run measured. */
    readonly domain?: RuleBinding["domain"];
    /** Percentiles to cut the extent at, so a few outliers do not flatten everything else. */
    readonly clamp?: RuleBinding["clamp"];
    /**
     * The numbers a numeric channel answers in, such as `[1, 5]` for a node size. On `node.size`
     * and `edge.width` with no `scale` named, an amount defaults to `[1, 3]` -- the default size
     * to three times it, the same range a column of amounts gets -- and that range is written into
     * the layer. Anywhere else it defaults to the unit interval.
     */
    readonly range?: RuleBinding["range"];
    /** What an element with no value is painted. Defaults to "skip", which is to leave it alone. */
    readonly missing?: RuleBinding["missing"];
    /** Send the smallest value to the far end of the range instead of the near end. */
    readonly reverse?: boolean;
    /** What to call the layer. Defaults to the run's label and the channel's plain name. */
    readonly name?: string;
}

/**
 * The options every encoding takes whatever it reads: the channel, and the palette, scale,
 * range, overflow, missing, reverse and name. An {@link EncodingSpec} without its run and field.
 */
export type EncodingOptions = Omit<EncodingSpec, "run" | "field">;

/**
 * What `encode()` is asked for when it colors or sizes by a plain data column: an
 * {@link EncodingSpec} with a column in place of the run.
 *
 * Whatever is left off -- the scale, the palette, the range, the overflow -- is chosen from what
 * the column measures when the layer is created, and written into it. A saved layer therefore
 * always draws what it says, whatever the data or a later declaration does.
 */
export interface ColumnEncodingSpec extends EncodingOptions {
    /** The column; an `AttributeDescriptor` from `session.data.attributes()` can be passed as is. */
    readonly column: ColumnRef;
}

/**
 * Why a column cannot be drawn on a channel by default, as the code of a {@link CodedFact}.
 * Every refusal carries `kind`, `name` and `channel` in its params, and:
 *
 * - `"E_UNSUPPORTED"` -- the element has no default drawing for what the column measures on this
 *   channel: groups on a size, amounts on a shape, or a time column on any channel. Params add
 *   `measurement`, null for a column with no values.
 * - `"E_CAP_EXCEEDED"` -- a categorical column has more distinct values than the attribute walk
 *   counts, so it cannot be colored one value at a time. Params add `limit`, the count (256).
 *
 * Params are strings, numbers or null. Naming a `scale` skips every refusal: it is written as asked.
 *
 * OPEN UNION: codes may be added in a minor release.
 */
export type EncodingRefusalCode = "E_UNSUPPORTED" | "E_CAP_EXCEEDED" | (string & {}); // NOSONAR(S4335): the open-union idiom; keeps the known literals in autocomplete while accepting others

/** What `styles.proposeEncoding()` answers: the binding `encode()` would store, or why not. */
export type EncodingProposal =
    | { readonly ok: true; readonly binding: RuleBinding }
    | { readonly ok: false; readonly refusal: CodedFact<EncodingRefusalCode> };

/**
 * What `planEncoding` needs to know about the run it is binding to.
 *
 * A `Run` satisfies this as it stands, which is the point: a session hands one over without
 * building an adapter, and nothing here drags the queue, the abort controllers or the progress
 * machinery in behind a question about a result's fields.
 */
export interface EncodingRun {
    /** The run id, which is the path segment under `results`. */
    readonly id: RunId;
    /** What to call the run, which becomes half of the layer's name. */
    readonly label: string;
    /** Which algorithm produced it, recorded on the layer so the layer can be re-run. */
    readonly algorithm: AlgorithmKey;
    /** The parameters it ran with, recorded for the same reason. */
    readonly params: Readonly<Record<string, unknown>>;
    /** The shape, which fixes the field names and says what a consumer can draw from them. */
    readonly shape: ResultShape;
    /** The fields it publishes. */
    readonly fields: readonly FieldDescriptor[];
}

/** Where `planEncoding` looks a run up. */
export interface EncodingSource {
    /**
     * One run, by any of the three ways a caller names one.
     * @param ref - The run, its result, or its id.
     * @returns The run, or undefined when this session holds no such run.
     */
    run(ref: RunRef): EncodingRun | undefined;
    /**
     * Every run id this session holds, for a "did you mean" when one does not resolve.
     * @returns The ids, in the order the runs were started.
     */
    runIds(): readonly RunId[];
}

// ---------------------------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------------------------

/**
 * The scale an encoding reads its field through when the caller names none.
 * @param field - The field being read.
 * @param shape - The run's result shape.
 * @param accepts - The kind of value the channel carries.
 * @returns The scale's name.
 */
function defaultScale(field: FieldDescriptor, shape: ResultShape, accepts: ChannelValueKind): string {
    if (accepts === "text" || accepts === "boolean") {
        return "passthrough";
    }

    const measurement = fieldMeasurement(field, shape);

    return measurement === "categorical" || measurement === "ordinal" ? "ordinal" : "linear";
}

// ---------------------------------------------------------------------------------------------
// Refusals
// ---------------------------------------------------------------------------------------------

/**
 * The refusal an encoding that cannot be planned gets.
 * @param message - What is wrong, in a sentence.
 * @param details - The offending values, for an editor that points at them.
 * @returns The error to throw.
 */
function badEncoding(message: string, details: Readonly<Record<string, unknown>>): GraphtyError {
    return new GraphtyError({ code: "E_BAD_COMMAND", message, source: "style", details });
}

/**
 * The run id behind any of the three ways a caller names a run.
 * @param ref - The run, its result, or its id.
 * @returns The run id.
 */
function runIdOf(ref: RunRef): RunId {
    if (typeof ref === "string") {
        return ref;
    }

    return "runId" in ref ? ref.runId : ref.id;
}

/**
 * Look the run up, or say which runs there are.
 * @param spec - The encoding, read for the run.
 * @param source - Where runs are looked up.
 * @returns The run.
 * @throws A `GraphtyError` with code `E_UNKNOWN_RUN`, carrying the nearest ids as candidates.
 */
function requireRun(spec: EncodingSpec, source: EncodingSource): EncodingRun {
    const found = source.run(spec.run);
    if (found !== undefined) {
        return found;
    }

    const wanted = runIdOf(spec.run);
    const available = source.runIds();

    throw new GraphtyError({
        code: "E_UNKNOWN_RUN",
        message: `There is no run called "${wanted}" in this session.`,
        source: "style",
        details: { run: wanted, available, candidates: nearestNames(wanted, available) },
    });
}

/**
 * Check the run's shape has something per element to bind a channel to.
 * @param run - The run.
 * @param primary - Whether the field being encoded is the one the shape declares primary.
 * @throws A `GraphtyError` with code `E_BAD_COMMAND` when the shape publishes nothing per element,
 *   or when the field is the one that names a subset rather than measuring everything.
 */
function assertShapeEncodes(run: EncodingRun, primary: boolean): void {
    const { layer } = resultShapeContract(run.shape);

    if (layer === "none") {
        throw badEncoding(
            `A "${run.shape}" result is read as a table rather than painted, so there is no value on it to bind a channel to.`,
            { run: run.id, shape: run.shape },
        );
    }

    // Only the field that names the subset is refused. A field published beside it -- the side of
    // a cut every node ended up on -- is carried by exactly the elements it describes, so the
    // "has" selector scopes it as tightly as any metric.
    if (layer === "highlight" && primary) {
        throw badEncoding(
            `A "${run.shape}" result names a subset rather than measuring every element, so it is painted with highlight() rather than encoded. Encoding it would scope the layer to every element the run looked at, including the ones it did not choose.`,
            { run: run.id, shape: run.shape },
        );
    }
}

/**
 * Work out which field the encoding reads, and check the run publishes it.
 * @param spec - The encoding, read for the field.
 * @param run - The run.
 * @param descriptor - The channel, whose target says which half of the result may be read.
 * @returns The field, and whether it is the one the shape declares primary.
 * @throws A `GraphtyError` with code `E_UNKNOWN_ATTRIBUTE` when the run publishes no such field,
 *   and `E_BAD_COMMAND` when the field belongs to the other half of the result, is one number for
 *   the whole graph, or is a table.
 */
function resolveField(
    spec: EncodingSpec,
    run: EncodingRun,
    descriptor: ChannelDescriptor,
): { field: FieldDescriptor; primary: boolean } {
    const { primaryField } = resultShapeContract(run.shape);
    const name = spec.field ?? primaryField;

    if (name === null || name === undefined) {
        throw badEncoding(`A "${run.shape}" result has no primary field, so the field to encode has to be named.`, {
            run: run.id,
            shape: run.shape,
        });
    }

    const field = run.fields.find((candidate) => candidate.name === name);
    if (field === undefined) {
        const published = run.fields.map((candidate) => candidate.name);

        throw new GraphtyError({
            code: "E_UNKNOWN_ATTRIBUTE",
            message: `The run "${run.id}" publishes no field called "${name}".`,
            source: "style",
            details: { run: run.id, field: name, available: published, candidates: nearestNames(name, published) },
        });
    }

    assertFieldFits(field, run, descriptor);

    return { field, primary: name === primaryField };
}

/**
 * Check a field can drive a channel at all.
 * @param field - The field.
 * @param run - The run, for the refusal's details.
 * @param descriptor - The channel.
 * @throws A `GraphtyError` with code `E_BAD_COMMAND` when the field is the graph's rather than an
 *   element's, belongs to the other half of the result, or is a table.
 */
function assertFieldFits(field: FieldDescriptor, run: EncodingRun, descriptor: ChannelDescriptor): void {
    if (field.kind === "graph") {
        throw badEncoding(
            `"${field.name}" is one number for the whole graph, so there is nothing per element for ${descriptor.channel} to read.`,
            { run: run.id, field: field.name, channel: descriptor.channel },
        );
    }

    if (field.kind !== descriptor.target) {
        throw badEncoding(
            `"${field.name}" is published per ${field.kind}, and ${descriptor.channel} paints a ${descriptor.target}.`,
            { run: run.id, field: field.name, channel: descriptor.channel, kind: field.kind },
        );
    }

    if (field.type === "table") {
        throw badEncoding(`"${field.name}" is a table, which is read rather than painted.`, {
            run: run.id,
            field: field.name,
            channel: descriptor.channel,
        });
    }
}

// ---------------------------------------------------------------------------------------------
// What encode() generates
// ---------------------------------------------------------------------------------------------

/**
 * Build the binding the generated layer carries.
 * @param spec - The encoding.
 * @param path - The published path of the field being read.
 * @param scale - The scale's name.
 * @param descriptor - The channel.
 * @returns The binding.
 */
function buildBinding(spec: EncodingOptions, path: string, scale: string, descriptor: ChannelDescriptor): RuleBinding {
    const binding: RuleBinding = { by: path, scale };

    // THE PALETTE IS LEFT OFF WHEN THE CALLER NAMED NONE, and that is the point rather than an
    // omission. Nothing here knows how many groups the run found -- the field's values are not
    // read at plan time and the count is only settled when the column is walked -- so a palette
    // written in now is a guess, and the guess was wrong: a ten-community result was planned onto
    // an eight-colour palette and then refused by the capacity check one step later, leaving a
    // correct, enabled layer painting nothing. A binding with no palette is chosen for in
    // `prepareRamp`, where the real count is in hand. A caller who wants the colours pinned names
    // the palette, and then it is recorded and honoured exactly as written.
    if (descriptor.accepts === "color" && spec.palette !== undefined) {
        binding.palette = spec.palette;
    }

    if (spec.domain !== undefined) {
        binding.domain = spec.domain;
    }

    if (spec.clamp !== undefined) {
        binding.clamp = spec.clamp;
    }

    if (spec.range !== undefined) {
        binding.range = spec.range;
    }

    if (spec.missing !== undefined) {
        binding.missing = spec.missing;
    }

    if (spec.reverse !== undefined) {
        binding.reverse = spec.reverse;
    }

    const overflow = overflowOf(spec, scale, descriptor);
    if (overflow !== undefined) {
        binding.overflow = overflow;
    }

    return binding;
}

/**
 * The overflow policy a binding records.
 *
 * The default, "other", is written only onto a colour binding whose scale names groups and whose
 * palette the element picks. A named palette with no policy keeps the strict refusal, and a
 * measurement has no groups to overflow, so writing a policy onto either would be noise in every
 * saved document. A policy the caller asked for is always recorded.
 * @param spec - The encoding.
 * @param scale - The scale's name.
 * @param descriptor - The channel.
 * @returns The policy, or undefined when the binding carries none.
 */
function overflowOf(spec: EncodingOptions, scale: string, descriptor: ChannelDescriptor): BindingOverflow | undefined {
    if (descriptor.accepts !== "color") {
        return undefined;
    }

    if (spec.overflow !== undefined) {
        return spec.overflow;
    }

    const groups = scaleDescriptor(scale)?.domainKind === "categorical";

    return groups && spec.palette === undefined ? "other" : undefined;
}

/**
 * The node shape half of `overflow: "shape"`, written into the same layer as the colour.
 * @param spec - The encoding.
 * @param colour - The colour binding it pairs with.
 * @param descriptor - The channel, refused when it paints edges.
 * @returns The extra channel bindings, empty unless the policy is "shape".
 * @throws A `GraphtyError` with code `E_BAD_COMMAND` for "shape" on an edge channel.
 */
function overflowCompanion(spec: EncodingOptions, colour: RuleBinding, descriptor: ChannelDescriptor): Encoding {
    if (colour.overflow !== "shape") {
        return {};
    }

    if (descriptor.target === "edge") {
        throw badEncoding(
            `overflow "shape" draws the groups past the palette in other node shapes, and an edge has no shape, so ${descriptor.channel} cannot use it. Use "other" or "extend".`,
            { channel: descriptor.channel, overflow: colour.overflow },
        );
    }

    const shape: RuleBinding = { by: colour.by, scale: colour.scale, overflow: "shape" };
    if (colour.palette !== undefined) {
        shape.palette = colour.palette;
    }

    return { "node.shape": shape };
}

/**
 * Turn an encoding into the layer it stands for.
 *
 * Everything a consumer could get wrong is written here: the published path of the field, the
 * selector that scopes the layer to exactly the elements the run measured, the layer's kind, and
 * the source that records which run, which algorithm and which parameters produced it -- which is
 * what lets the layer be re-run, re-bound to another dataset, or removed by source later.
 * @param spec - What to encode.
 * @param source - Where the run is looked up.
 * @returns The layer, ready to be validated and added like any other.
 * @throws A `GraphtyError`: `E_UNKNOWN_CHANNEL` for a channel the element does not have,
 *   `E_UNKNOWN_RUN` for a run this session does not hold, `E_UNKNOWN_ATTRIBUTE` for a field the
 *   run does not publish, and `E_BAD_COMMAND` when the result has nothing per element to bind,
 *   names a subset rather than measuring one, or is an edge encoding asked for `overflow: "shape"`.
 */
export function planEncoding(spec: EncodingSpec, source: EncodingSource): LayerSpec {
    const descriptor = requireChannel(spec.channel);
    const run = requireRun(spec, source);

    const { primaryField } = resultShapeContract(run.shape);
    assertShapeEncodes(run, (spec.field ?? primaryField) === primaryField);

    const { field } = resolveField(spec, run, descriptor);
    const path = resultPath(run.id, field.name);
    const scale = spec.scale ?? defaultScale(field, run.shape, descriptor.accepts);
    // An amount on a size gets the same default range a column's does, written into the layer
    // now, rather than the unit interval that draws every node smaller than the default size.
    const sized =
        spec.scale === undefined &&
        spec.range === undefined &&
        SIZE_CHANNELS.has(descriptor.channel) &&
        scaleDescriptor(scale)?.domainKind === "numeric";
    const ranged: EncodingOptions = sized ? { ...spec, range: [DEFAULT_SIZE_RANGE[0], DEFAULT_SIZE_RANGE[1]] } : spec;
    const binding = buildBinding(ranged, path, scale, descriptor);

    return {
        name: spec.name ?? `${run.label} - ${descriptor.plainName}`,
        target: descriptor.target,
        kind: "encoding",
        selector: { match: "has", path },
        encode: { [spec.channel]: binding, ...overflowCompanion(spec, binding, descriptor) },
        source: { by: "run", runId: run.id, algorithm: run.algorithm, params: run.params },
    };
}

// ---------------------------------------------------------------------------------------------
// Encoding a plain data column
// ---------------------------------------------------------------------------------------------

/** How many distinct values the attribute walk counts before it stops; past it, too many to name. */
const DISTINCT_LIMIT = 256;

/** The channels that default to {@link DEFAULT_SIZE_RANGE} for an amount. */
const SIZE_CHANNELS: ReadonlySet<Channel> = new Set(["node.size", "edge.width"]);

/** A default the column measurement chose: a scale and what goes with it, or a refusal. */
type DefaultChoice =
    | { readonly scale: string; readonly extra?: Partial<RuleBinding> }
    | { readonly refuse: EncodingRefusalCode; readonly params?: Record<string, number> };

/**
 * The default for a categorical column on a channel that paints groups (a color or a shape).
 * @param spec - The encoding.
 * @param column - The column's descriptor.
 * @param accepts - What the channel carries.
 * @param scales - The session's scales, which decide the palette.
 * @returns The choice.
 */
function chooseForGroups(
    spec: ColumnEncodingSpec,
    column: AttributeDescriptor,
    accepts: ChannelValueKind,
    scales: ScaleRegistry,
): DefaultChoice {
    if (column.uniqueCount === undefined) {
        return { refuse: "E_CAP_EXCEEDED", params: { limit: DISTINCT_LIMIT } };
    }

    if (accepts === "enum") {
        return { scale: "ordinal", extra: { overflow: spec.overflow ?? "other" } };
    }

    // As for a run: a palette the caller named keeps the strict refusal unless they named an overflow.
    const palette = spec.palette ?? columnPaletteFor(scales, "ordinal", column.uniqueCount);
    return { scale: "ordinal", extra: { palette, ...(spec.palette === undefined ? { overflow: "other" } : {}) } };
}

/**
 * The default for an ordinal column on a color or a size: each declared value mapped, in order.
 * @param spec - The encoding.
 * @param order - The declared values, lowest first.
 * @param accepts - What the channel carries.
 * @returns The choice.
 */
function chooseForOrder(
    spec: ColumnEncodingSpec,
    order: readonly (string | number)[],
    accepts: ChannelValueKind,
): DefaultChoice {
    const [low, high] = spec.range ?? DEFAULT_SIZE_RANGE;
    const values =
        accepts === "color"
            ? sequentialSamples(order.length)
            : order.map((_, index) => low + ((high - low) * index) / Math.max(1, order.length - 1));
    return {
        scale: "ordinal",
        extra: { map: Object.fromEntries(order.map((value, index) => [String(value), values[index]])) },
    };
}

/**
 * The default for amounts on a color or a size: a linear ramp.
 * @param spec - The encoding.
 * @param descriptor - The channel.
 * @param scales - The session's scales, which decide the palette.
 * @returns The choice.
 */
function chooseForAmounts(
    spec: ColumnEncodingSpec,
    descriptor: ChannelDescriptor,
    scales: ScaleRegistry,
): DefaultChoice {
    if (descriptor.accepts === "color") {
        return { scale: "linear", extra: { palette: spec.palette ?? columnPaletteFor(scales, "linear", 0) } };
    }

    const range = spec.range ?? (SIZE_CHANNELS.has(descriptor.channel) ? DEFAULT_SIZE_RANGE : undefined);
    return { scale: "linear", extra: range === undefined ? {} : { range: [range[0], range[1]] } };
}

/**
 * The default a column gets on a channel from what it measures, with no scale named.
 * @param spec - The encoding.
 * @param column - The column's descriptor, with any declaration already applied.
 * @param declaration - The column's declaration, read for an ordinal column's order.
 * @param descriptor - The channel.
 * @param scales - The session's scales.
 * @returns The choice.
 */
function chooseDefault(
    spec: ColumnEncodingSpec,
    column: AttributeDescriptor,
    declaration: MeasurementDeclaration | undefined,
    descriptor: ChannelDescriptor,
    scales: ScaleRegistry,
): DefaultChoice {
    const { accepts } = descriptor;
    const { measurement } = column;
    const groups = accepts === "color" || accepts === "enum";

    if (measurement === "categorical" && groups) {
        return chooseForGroups(spec, column, accepts, scales);
    }

    const order = declaration?.measurement === "ordinal" ? declaration.order : undefined;
    if (measurement === "ordinal" && order !== undefined && accepts !== "enum") {
        return chooseForOrder(spec, order, accepts);
    }

    if (measurement === "quantitative" && accepts !== "enum") {
        return chooseForAmounts(spec, descriptor, scales);
    }

    // Time has no default yet; groups on a size or amounts on a shape have none at all.
    return { refuse: "E_UNSUPPORTED" };
}

/**
 * The binding a column gets on a channel, decided from what the column measures.
 * @param spec - The encoding.
 * @param column - The column's descriptor, with any declaration already applied.
 * @param declaration - The column's declaration, read for an ordinal column's order.
 * @param scales - The session's scales, which decide the palette.
 * @returns The binding, or the refusal.
 */
export function proposeColumnBinding(
    spec: ColumnEncodingSpec,
    column: AttributeDescriptor,
    declaration: MeasurementDeclaration | undefined,
    scales: ScaleRegistry,
): EncodingProposal {
    const descriptor = requireChannel(spec.channel);
    const bind = (scale: string, extra: Partial<RuleBinding> = {}): EncodingProposal => ({
        ok: true,
        binding: { ...extra, ...buildBinding(spec, column.path, scale, descriptor) },
    });

    // A scale the caller named is the caller's decision: written as asked.
    if (spec.scale !== undefined) {
        return bind(spec.scale);
    }

    if (descriptor.accepts === "text" || descriptor.accepts === "boolean") {
        return bind("passthrough");
    }

    const choice = chooseDefault(spec, column, declaration, descriptor, scales);
    if ("scale" in choice) {
        return bind(choice.scale, choice.extra);
    }

    const about = { kind: column.kind, name: column.name, channel: descriptor.channel };
    const measurement = column.measurement ?? null;
    return {
        ok: false,
        refusal: { code: choice.refuse, params: { ...about, ...(choice.params ?? { measurement }) } },
    };
}

/**
 * Turn a column encoding into the layer it stands for, with every default written in.
 * @param spec - What to encode.
 * @param column - The column's descriptor, with any declaration already applied.
 * @param declaration - The column's declaration, read for an ordinal column's order.
 * @param scales - The session's scales.
 * @returns The layer, ready to be added like any other.
 * @throws A `GraphtyError` with the refusal's code and its params as details, when the column
 *   cannot be drawn on the channel by default; `E_UNKNOWN_CHANNEL` for a channel the element does
 *   not have.
 */
export function planColumnEncoding(
    spec: ColumnEncodingSpec,
    column: AttributeDescriptor,
    declaration: MeasurementDeclaration | undefined,
    scales: ScaleRegistry,
): LayerSpec {
    const proposal = proposeColumnBinding(spec, column, declaration, scales);
    if (!proposal.ok) {
        throw new GraphtyError({
            code: proposal.refusal.code as "E_UNSUPPORTED",
            message: `The ${column.kind} column ${JSON.stringify(column.name)} cannot be drawn on ${spec.channel} by default; name a scale to draw it anyway.`,
            source: "style",
            details: proposal.refusal.params,
        });
    }

    const descriptor = requireChannel(spec.channel);
    return {
        name: spec.name ?? column.name,
        target: descriptor.target,
        selector: { match: "has", path: column.path },
        encode: { [spec.channel]: proposal.binding, ...overflowCompanion(spec, proposal.binding, descriptor) },
    };
}
