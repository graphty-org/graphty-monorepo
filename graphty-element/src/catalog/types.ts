/**
 * @file Catalogue descriptor types.
 *
 * Everything the element can offer -- an algorithm, a layout, a file format, a palette, a
 * scale, a theme, an expression function, an option -- is published as a plain-JSON
 * descriptor. A descriptor is data: no classes, no methods, no library objects. That is what
 * lets it be serialised, posted to a worker, diffed, cached, stored in a document or rendered
 * by a consumer that never imports this package's runtime.
 *
 * Option schemas in particular cross the package boundary as {@link OptionDescriptor}, never as
 * Zod objects. Shipping Zod across a boundary makes the consumer's Zod version part of this
 * package's API, and forces the consumer to read Zod's private internals to recover a type, a
 * default and a range. `optionsFromZod` in this directory is the one place the element turns a
 * Zod schema into these descriptors.
 *
 * Names are data on the descriptor, never strings in an application: every descriptor carries
 * both a plain name and a technical name, both always renderable, and which one is primary is
 * the consumer's preference.
 */

import type { DatasetMeta, GeneratorDescriptor } from "@graphty/graph-samples";

import type { DrawingMode } from "../camera/types";
import type { EdgeStyleConfig } from "../config/EdgeStyle";
import type { GraphtyErrorCode } from "../errors/codes";
import type { FileStyleOrigin } from "../session/styles/fileStyles/origin";
import type { TransitionDescriptor } from "../transitions/registry";
import type { LabelStyle } from "./label-style";
import type { ModelDescriptor } from "./models";
import type { ScreenshotPreset } from "./screenshotPresets";
import type { ShaderDescriptor, ShaderText, ShaderUse } from "./shaders";

/**
 * Every error code the element reports. Codes are the contract; messages are not.
 *
 * Declared once, in the error module, so a code cannot mean one thing to a descriptor
 * and another to the error that carries it.
 */
export type { GraphtyErrorCode } from "../errors/codes";

/**
 * Which way the element is drawing: flat, or in three dimensions.
 *
 * Declared in the camera module, where a view reads it, and re-exported here so
 * {@link CameraDescriptor.modes} is nameable from `./catalog` without a consumer reaching into
 * a second module for one word.
 */
export type { DrawingMode } from "../camera/types";

// ---------------------------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------------------------

/** The identity of a node, as it was loaded. */
export type NodeId = string | number;

/** The identity of an edge. */
export type EdgeId = string;

/**
 * What `element.elementAt(point)` finds under a point: a node or an edge, by id. A node wins
 * over an edge drawn beneath it; an edge is found within a few pixels of its line.
 */
export type ElementAtResult =
    { readonly kind: "node"; readonly id: NodeId } | { readonly kind: "edge"; readonly id: EdgeId };

/**
 * What `element.groupOutlineAt(point)` finds under a point: a group outline a style layer draws (a
 * use at the place `group` on its `node.shaders`), by its layer, its shader and its group, the
 * topmost outline first. `group` is the group's `groupBy` value, null for a use drawing one outline.
 * @since 3.36.0
 */
export interface GroupOutlineAtResult {
    readonly kind: "group-outline";
    readonly layer: LayerId;
    readonly shader: string;
    readonly group: string | number | boolean | null;
}

/**
 * What the element's shaders draw now, as `element.drawnShaders()` reads it: for tools, tests and
 * an application that shows whether an effect is playing. Read it again after a frame; it is not
 * a live value.
 * @since 3.36.0
 */
export interface DrawnShaders {
    /**
     * Per node shader id, at any place: how many uses of it nodes draw now, and how many of them
     * are playing their entrance (a reticle's snap, a shockwave's ring) at this moment.
     */
    readonly nodes: ReadonlyMap<string, { readonly drawn: number; readonly entering: number }>;
    /**
     * The group outlines drawn on the last frame, bottom first: each one's layer, shader and the
     * `groupBy` value of each group it outlines (null for a use drawing one outline).
     */
    readonly groupOutlines: readonly {
        readonly layer: LayerId;
        readonly shader: string;
        readonly groups: readonly (string | number | boolean | null)[];
    }[];
}

/** The identity of a run. Stable, selector-safe and author-assignable. */
export type RunId = string;

/**
 * The name an algorithm suggests for a run's result, from the run's settings.
 *
 * `id` becomes the result path a style layer reads (`results.<id>.value`), so it is lower-case
 * letters, digits and underscores, starting with a letter: `pagerank`, `louvain_resolution_1_5`.
 * `label` is what a reader sees in the layer list and the legend: "Influence (damping 0.9)".
 */
export interface SuggestedName {
    readonly id: string;
    readonly label: string;
}

/** The identity of a style layer. Element-minted and stable; never an array index. */
export type LayerId = string;

/**
 * The identity of a kept set. Element-minted; every minted id starts with `set_` and everything
 * after that prefix is opaque. An id is never reissued within a project, and a rename keeps it.
 */
export type SetId = string;

/** The identity of a saved scope: a kept set, so the same type as {@link SetId}. */
export type ScopeId = SetId;

/**
 * A column key: `data.<name>` for a data column, `results.<run>.<field>` for a run's result.
 *
 * The part after the root is the column's name LITERALLY, never an expression: a column named
 * `shared chapters` or `a.b` has the path `data.shared chapters` or `data.a.b`. Wherever a path is
 * taken as a path (a selector's `path`, a filter) it reads that column. To put one INSIDE an
 * expression, pass it through `quotePath` first, which quotes every segment that needs it.
 */
export type Path = string;

/** A JMESPath predicate. The same dialect everywhere an expression is accepted. */
export type Query = string;

// ---------------------------------------------------------------------------------------------
// Keys, with their runtime lists
// ---------------------------------------------------------------------------------------------

/**
 * The built-in algorithms. The list is also available at runtime so a consumer can enumerate
 * the built-in set without a catalogue instance.
 *
 * One of these names is deprecated: `all-paths` is reserved but not implemented, and starting it
 * fails with `E_UNSUPPORTED`. See {@link DEPRECATED_ALGORITHMS}.
 */
export const KNOWN_ALGORITHMS = [
    "degree",
    "betweenness",
    "closeness",
    "pagerank",
    "eigenvector",
    "katz",
    "hits",
    "louvain",
    "leiden",
    "label-propagation",
    "components",
    "shortest-path",
    "all-pairs-distance",
    "all-paths",
    "max-flow",
    "min-cut",
    "k-core",
    "clustering-coefficient",
    "girvan-newman",
    "bfs",
    "dfs",
    "kruskal",
    "prim",
    "bipartite-matching",
    "link-prediction",
    "markov-clustering",
    "spectral-clustering",
    "hierarchical-clustering",
    "astar",
    "edge-betweenness",
] as const;

/**
 * One of the built-in algorithms. `all-paths` is deprecated and does not run; see
 * {@link DEPRECATED_ALGORITHMS}.
 */
export type KnownAlgorithm = (typeof KNOWN_ALGORITHMS)[number];

/**
 * The built-in algorithm names the element reserves but does not run.
 *
 * Nothing implements this one yet. The name stays in {@link KNOWN_ALGORITHMS}, so no plugin can
 * claim it and no code that names it stops compiling, but starting it fails with `E_UNSUPPORTED`
 * rather than `E_UNKNOWN_ALGORITHM`. It is removed at the next major release unless it is
 * implemented first; `all-paths` is tracked by issue #329. `clustering-coefficient`, reserved here
 * until issue #330, now runs.
 */
export const DEPRECATED_ALGORITHMS = ["all-paths"] as const satisfies readonly KnownAlgorithm[];

/** A built-in algorithm name the element reserves but does not run, and will remove. */
export type DeprecatedAlgorithm = (typeof DEPRECATED_ALGORITHMS)[number];

/**
 * An algorithm key. The built-in names keep autocomplete alive; the string arm accepts a
 * plugin's name.
 */
export type AlgorithmKey = KnownAlgorithm | (string & {});

/** The built-in layouts. */
export const KNOWN_LAYOUT_IDS = [
    "force",
    "force-2d",
    "circular",
    "radial",
    "hierarchical",
    "grid",
    "shell",
    "spectral",
    "bipartite",
    "layers",
    "fixed",
    "random",
    "location-map",
] as const;

/** A layout id: a built-in name, or a plugin's. */
export type LayoutId = (typeof KNOWN_LAYOUT_IDS)[number] | (string & {});

/**
 * The built-in layout names kept only as aliases, and removed at the next major release.
 *
 * `force-2d` is the `force` layout drawn by its two-dimensional `arf` engine: asking for it sets
 * layout `force` with engine `arf`, which is what `session.layout` then reports. It is no longer
 * in `catalog.layouts()`. The name stays in {@link KNOWN_LAYOUT_IDS}, so no plugin can claim it and
 * no code that names it stops compiling.
 */
export const DEPRECATED_LAYOUT_IDS = ["force-2d"] as const satisfies readonly (typeof KNOWN_LAYOUT_IDS)[number][];

/**
 * The built-in file formats.
 *
 * "sif" and "cx2" are deprecated: no data source reads them (see `UNSERVED_FORMAT_IDS`, and issues
 * #306 and #307). A load that names either fails with that reason. Both are removed at the next
 * major release unless a reader lands first.
 *
 * "graphty" is the project file (Graphty JSON): written by `exportGraph("graphty")` and read by
 * `session.project.open`, never by `session.data.import`.
 */
export const KNOWN_FORMAT_IDS = [
    "json",
    "csv",
    "graphml",
    "gexf",
    "gml",
    "dot",
    "pajek",
    "sif",
    "cx2",
    "xgmml",
    "cx",
    "cys",
    "obo",
    "graphty",
] as const;

/**
 * How a project file is named and typed: what `element.downloadProject()` gives the file, and
 * what to hand a save picker (`showSaveFilePicker`'s `suggestedName` and `accept`) or a server.
 * @example
 * ```typescript
 * const handle = await showSaveFilePicker({
 *     suggestedName: projectFileName(session.project.name),
 *     types: [{ accept: { [PROJECT_FILE.mediaType]: [PROJECT_FILE.extension] } }],
 * });
 * ```
 */
export const PROJECT_FILE = Object.freeze({
    /** The file name's ending, with its leading dot. */
    extension: ".graphty.json",
    /** The file's media type. */
    mediaType: "application/vnd.graphty+json",
} as const);

/**
 * A format id: a built-in name, or a plugin's.
 *
 * The built-in name "sif" is deprecated and unserved (issue #306); it is removed at the next major
 * release unless a reader lands first.
 */
export type FormatId = (typeof KNOWN_FORMAT_IDS)[number] | (string & {});

/**
 * The built-in palettes: seven sequential ramps, six categorical sets, three diverging ramps and
 * three highlight pairs, in the order `PALETTE_DESCRIPTORS` lists them.
 *
 * All nineteen are here because this list is what autocomplete offers. Four of them used to be,
 * so a consumer typing a palette name was shown a quarter of the element's own palettes and had
 * to read the catalogue table to find the rest.
 */
export const KNOWN_PALETTE_IDS = [
    "viridis",
    "ylorbr",
    "plasma",
    "inferno",
    "blues",
    "greens",
    "oranges",
    "okabe-ito",
    "tol-vibrant",
    "tol-muted",
    "pastel",
    "carbon",
    "kelly",
    "purple-green",
    "blue-orange",
    "red-blue",
    "blue-highlight",
    "green-highlight",
    "orange-highlight",
] as const;

/** A palette id: a built-in name, or a plugin's. */
export type PaletteId = (typeof KNOWN_PALETTE_IDS)[number] | (string & {});

/** The built-in camera views. */
export const KNOWN_CAMERA_IDS = ["fitToGraph", "topView", "sideView", "frontView", "isometric"] as const;

/** A camera view id: a built-in name, or a plugin's. */
export type CameraId = (typeof KNOWN_CAMERA_IDS)[number] | (string & {});

/** The built-in log destinations. */
export const KNOWN_LOG_SINK_IDS = ["console", "remote"] as const;

/** A log destination id: a built-in name, or a plugin's. */
export type LogSinkId = (typeof KNOWN_LOG_SINK_IDS)[number] | (string & {});

// ---------------------------------------------------------------------------------------------
// Value classification
// ---------------------------------------------------------------------------------------------

/** How an attribute's values behave, which is what decides the controls offered for it. */
export const ATTRIBUTE_TYPES = ["string", "number", "integer", "boolean", "time", "category", "mixed"] as const;

/** The type of an attribute's values. */
export type AttributeType = (typeof ATTRIBUTE_TYPES)[number];

/**
 * What a column's values measure, which decides how a binding that names no scale draws it.
 *
 * - `"categorical"` -- names of groups with no order: one color per value.
 * - `"ordinal"` -- groups with an order, such as Low, Medium, High: colors and sizes follow it.
 * - `"quantitative"` -- amounts: a ramp, or a size range.
 * - `"time"` -- points in time.
 *
 * OPEN UNION: values may be added in a minor release; treat one you do not know as no measurement.
 */
export type Measurement = "categorical" | "ordinal" | "quantitative" | "time" | (string & {}); // NOSONAR(S4335): the open-union idiom; keeps the known literals in autocomplete while accepting others

/**
 * Who said what a column measures, highest precedence first: a `data.declare` call, the algorithm
 * catalogue, the file format, or the element's inference from the values. A data column reports
 * `"declared"` or `"inferred"` today; `"catalog"` and `"file"` are reserved for results and for
 * formats that write a column's measurement down.
 *
 * OPEN UNION: values may be added in a minor release.
 */
export type MeasurementSource = "declared" | "catalog" | "file" | "inferred" | (string & {}); // NOSONAR(S4335): the open-union idiom; keeps the known literals in autocomplete while accepting others

/** What `session.data.declare` says a column measures. An ordinal column lists its values in order. */
export type MeasurementDeclaration =
    | { readonly measurement: "categorical" | "quantitative" | "time" }
    | { readonly measurement: "ordinal"; readonly order: readonly (string | number)[] };

/**
 * How expensive a computation is, in the one vocabulary every estimate uses. "instant" is
 * cheap enough to run without asking; "unbounded" cannot be estimated in advance at all.
 */
export const COST_CLASSES = ["instant", "iterative", "heavy", "cubic", "unbounded"] as const;

/** The cost class of a computation. */
export type CostClass = (typeof COST_CLASSES)[number];

/**
 * The ten declared result shapes. A shape fixes the field names a result publishes and the
 * primary action a consumer can offer for it, so a result path is guessable without opening
 * the catalogue.
 */
export const RESULT_SHAPES = [
    "node-metric",
    "edge-metric",
    "community",
    "layered-grouping",
    "category-table",
    "path",
    "node-set",
    "edge-set",
    "pair-list",
    "temporal",
    "fact",
] as const;

/** The shape of an algorithm's result. */
export type ResultShape = (typeof RESULT_SHAPES)[number];

/**
 * One band of a field's interpretation scale: a range of values and what a value in it means.
 *
 * A band's lower bound is `above` (exclusive) or `atLeast` (inclusive), never both. The lowest
 * band has neither and takes everything below the band above it.
 */
export interface FieldBand {
    /** A stable id a consumer may key its own wording on, such as "clear". */
    id: string;
    /**
     * The band in a few plain words, such as "Clearly separated".
     * @deprecated Word the band from {@link FieldBand.id} yourself. Removed in the next major.
     */
    plainName: string;
    /**
     * One plain-language sentence on what a value in this band means.
     * @deprecated Word the band from {@link FieldBand.id} yourself. Removed in the next major.
     */
    description: string;
    /** A value strictly greater than this is in the band. */
    above?: number;
    /** A value greater than or equal to this is in the band. */
    atLeast?: number;
}

/**
 * How to read a quality score: what the scale measures, where its bands lie, and where the
 * thresholds come from.
 */
export interface FieldInterpretation {
    /**
     * One sentence on what the score measures and the value that counts as good.
     * @deprecated Word the scale from the field's name and its bands' ids yourself. Removed in the
     *   next major.
     */
    summary: string;
    /** Where the thresholds come from, as a citation a reader can look up. */
    source: string;
    /**
     * The bands, highest first. A value is in the first band whose bound it meets, so every
     * finite value is in exactly one band. `RunResult.band(field)` does this lookup.
     */
    bands: readonly FieldBand[];
}

/** One field a result publishes, per element or for the graph as a whole. */
export interface FieldDescriptor {
    name: string;
    plainName: string;
    technicalName: string;
    kind: "node" | "edge" | "graph";
    type: "number" | "integer" | "boolean" | "string" | "table";
    unit?: string;
    normalization?: string;
    /** How to read the value, for a quality score whose number alone means little. */
    interpretation?: FieldInterpretation;
    /**
     * What the field's values measure, declared by the algorithm. A partition's group field is
     * `"categorical"` by construction. Absent, the element reads strings and booleans as
     * categorical and numbers as quantitative.
     */
    measurement?: Measurement;
    /**
     * Published only for a directed graph: on an undirected one the field repeats another
     * (incoming and outgoing connections are both the total), so `session.data.readableValues()`
     * leaves it out there.
     * @since 3.26.0
     */
    directedOnly?: boolean;
    path: Path;
}

// ---------------------------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------------------------

/** The bound references the element resolves against a loaded graph. */
export const OPTION_BOUND_SOURCES = [
    "graph.nodeCount",
    "graph.edgeCount",
    "graph.maxDegree",
    "graph.maxCore",
    "graph.componentCount",
] as const;

/**
 * A bound that depends on the data rather than on the option itself, written as a documented
 * reference string. The static descriptor stays plain JSON; `catalog.optionsFor(key, scope)`
 * returns the same descriptor with the reference replaced by a number measured on this graph,
 * so a slider bounded by "up to the largest core in this graph" renders correctly instead of
 * guessing.
 */
export interface OptionBound {
    from: (typeof OPTION_BOUND_SOURCES)[number] | (string & {});
}

/**
 * The kinds of control an option asks for.
 *
 * "unknown" is not a control. It is what the Zod emitter records when a schema uses a
 * construct it cannot classify: the option is still published, still carries its name and its
 * default, and says why it could not be typed in `unsupportedReason`. Dropping the option or
 * throwing would both hide a real gap, so neither is allowed.
 */
export const OPTION_TYPES = [
    "number",
    "integer",
    "boolean",
    "string",
    "enum",
    "seed",
    "node-id",
    "node-set",
    "attribute",
    "partition",
    "ordering",
    /** A color, `#rrggbb`: a shader parameter's type. @since 3.36.0 */
    "color",
    "unknown",
] as const;

/** The kind of control an option asks for. */
export type OptionType = (typeof OPTION_TYPES)[number];

/** One choice offered by an option whose type is "enum", or a column `catalog.optionsFor` lists. */
export interface OptionChoice {
    value: string;
    label: string;
    /**
     * Why this choice does not fit the option, when it does not: a column whose values the
     * option cannot read. A form lists such a choice after the fitting ones, disabled, and writes
     * the words for the code. Absent for a choice that fits.
     * @since 3.31.0
     */
    refusal?: OptionChoiceRefusal;
}

/**
 * Why a column does not fit a location option of the `location-map` layout:
 * `location.column-unfit`, with `params.role` (`latitude`, `longitude` or `location`) and
 * `params.share`, the share of its values read in that role (0 to 1; a column fits from 0.5).
 * New codes may be added in a minor release.
 * @since 3.31.0
 */
export interface OptionChoiceRefusal {
    readonly code: "location.column-unfit";
    readonly params: { readonly role: "latitude" | "longitude" | "location"; readonly share: number };
}

/**
 * Which kind of element an "attribute" or "partition" option reads. Without it, neither a form nor
 * the element can tell whether "confidence" names a node attribute or an edge attribute.
 */
export interface OptionDescriptorDomain {
    /** Nodes (the default) or edges. Meaningful only for type "attribute" or "partition". */
    on?: "node" | "edge";
}

/** One configurable option, as plain JSON a form can render with no knowledge of Zod. */
export interface OptionDescriptor extends OptionDescriptorDomain {
    name: string;
    plainName: string;
    technicalName?: string;
    type: OptionType;
    default?: unknown;
    min?: number | string | OptionBound;
    max?: number | string | OptionBound;
    step?: number;
    values?: readonly OptionChoice[];
    attributeType?: AttributeType;
    group?: string;
    advanced?: boolean;
    internal?: boolean;
    description?: string;
    /**
     * Why `type` is "unknown", in a sentence naming the construct that could not be
     * classified. Present only when `type` is "unknown".
     */
    unsupportedReason?: string;
}

// ---------------------------------------------------------------------------------------------
// Style documents, which a theme is made of
// ---------------------------------------------------------------------------------------------

/**
 * Every property a layer can paint.
 *
 * The label channels `labelColor`, `labelSize`, `labelLetterSize`, `labelFont`, `labelWeight`, `labelItalic`, `labelWrapWidth`, `labelWrapTrailingSpace`, `labelWrapEllipsis`, `labelWrapAnywhere`, `labelWrapSpaceCount`, `labelMinScreenSize`, `labelOnTop`, `labelRotation`, `labelBackground`, `labelOutline`, `labelOutlineWidth`, `labelBorder`, `labelBorderWidth`, `labelOpacity`, `labelBackgroundOpacity`, `labelOutlineOpacity`, `labelBorderOpacity`, `labelPadding`, `labelCornerRadius`, `labelLineHeight`, `labelOffsetX`, `labelOffsetY`, `labelShiftX` and `labelShiftY` are
 * single fields of the label style, so they can be bound to a column (`encode`) where the whole
 * `labelStyle` can only be set. They land in the same label style the `labelStyle` channel
 * writes, field by field, the higher layer winning each field.
 *
 * OPEN UNION: later releases add channels as the element learns to paint more. A consumer that
 * keeps a table over every channel (`Record<Channel, ...>`) adds an entry for each new one, or
 * types the table `Partial<Record<Channel, ...>>` and words an unknown channel generically.
 */
export type Channel =
    | "node.color"
    | "node.size"
    | "node.sizeMode"
    | "node.shape"
    | "node.label"
    | "node.labelStyle"
    | "node.labelColor"
    | "node.labelSize"
    | "node.labelLetterSize"
    | "node.labelFont"
    | "node.labelWeight"
    | "node.labelItalic"
    | "node.labelWrapWidth"
    | "node.labelWrapTrailingSpace"
    | "node.labelWrapEllipsis"
    | "node.labelWrapAnywhere"
    | "node.labelWrapSpaceCount"
    | "node.labelRunAlign"
    | "node.labelMinScreenSize"
    | "node.labelOnTop"
    | "node.labelDeclutter"
    | "node.labelMinNodeScreenSize"
    | "node.labelTextAlign"
    | "node.labelLocation"
    | "node.labelRotation"
    | "node.labelBackground"
    | "node.labelOutline"
    | "node.labelOutlineWidth"
    | "node.labelBorder"
    | "node.labelBorderWidth"
    | "node.labelOpacity"
    | "node.labelBackgroundOpacity"
    | "node.labelOutlineOpacity"
    | "node.labelBorderOpacity"
    | "node.labelPadding"
    | "node.labelCornerRadius"
    | "node.labelLineHeight"
    | "node.labelOffsetX"
    | "node.labelOffsetY"
    | "node.labelShiftX"
    | "node.labelShiftY"
    | "node.tooltip"
    | "node.tooltipStyle"
    | "node.opacity"
    | "node.outline"
    | "node.glow"
    | "node.glowStrength"
    | "node.halo"
    | "node.haloColor"
    | "node.haloScale"
    | "node.haloOpacity"
    | "node.wireframe"
    | "node.meshDetail"
    | "node.flat"
    | "node.unlit"
    | "node.marker"
    | "node.width"
    | "node.height"
    | "node.depth"
    | "node.planar"
    | "node.zIndex"
    | "node.drawOrder"
    | "node.borderColor"
    | "node.borderWidth"
    | "node.borderScreenWidth"
    | "node.borderOpacity"
    | "node.borderStyle"
    | "node.borderPosition"
    | "node.borderWaveAmplitude"
    | "node.borderWavePeriod"
    | "node.outerBorderColor"
    | "node.outerBorderWidth"
    | "node.outerBorderOpacity"
    | "node.outerBorderStyle"
    | "node.outerBorderOffset"
    | "node.outerBorderCount"
    | "node.underlayColor"
    | "node.underlayOpacity"
    | "node.underlayPadding"
    | "node.underlayShape"
    | "node.underlayCornerRadius"
    | "node.overlayColor"
    | "node.overlayOpacity"
    | "node.overlayPadding"
    | "node.overlayShape"
    | "node.overlayCornerRadius"
    | "node.cornerRadius"
    | "node.exactCornerRadius"
    | "node.shapePoints"
    | "node.shapeStretchPoints"
    | "node.shapeParts"
    | "node.shapeLines"
    | "node.shapeTexts"
    | "node.labelTable"
    | "node.shapeLineWidth"
    | "node.labelFit"
    | "node.labelPaddingX"
    | "node.labelPaddingY"
    | "node.labelFitSquare"
    | "node.labelFitQuantum"
    | "node.gradientColor"
    | "node.gradientDirection"
    | "node.gradientColors"
    | "node.gradientStops"
    | "node.gradientKind"
    | "node.image"
    | "node.imageFallback"
    | "node.imageFit"
    | "node.imageWidth"
    | "node.imageHeight"
    | "node.imagePixelSize"
    | "node.imagePositionX"
    | "node.imagePositionY"
    | "node.imageOffsetX"
    | "node.imageOffsetY"
    | "node.imageRepeat"
    | "node.imageClip"
    | "node.imageSmoothing"
    | "node.imageAutoSize"
    | "node.imageOpacity"
    | "node.glyph"
    | "node.glyphFont"
    | "node.glyphSize"
    | "node.glyphWeight"
    | "node.glyphColor"
    | "node.pieColors"
    | "node.pieSizes"
    | "node.pieOpacities"
    | "node.pieRadius"
    | "node.pieHole"
    | "node.pieRotation"
    | "node.pieFitBox"
    | "node.pieOffsetX"
    | "node.pieOffsetY"
    | "node.stripeColors"
    | "node.stripeSizes"
    | "node.stripeOpacities"
    | "node.stripeDirection"
    | "node.stripeSize"
    | "node.chartKind"
    | "node.chartValues"
    | "node.chartColors"
    | "node.chartMin"
    | "node.chartMax"
    | "node.chartHorizontal"
    | "node.chartSize"
    | "node.chartWidth"
    | "node.chartHeight"
    | "node.chartOffsetX"
    | "node.chartOffsetY"
    | "node.chartMargin"
    | "node.chartGap"
    | "node.chartLineWidth"
    | "node.chartBorderColor"
    | "node.chartBorderWidth"
    | "node.model"
    | "node.modelSourceUp"
    | "node.modelTurn"
    | "node.modelTint"
    | "node.modelFit"
    | "node.modelCenter"
    | "node.texture"
    | "node.groupPadding"
    | "node.groupPaddingRatio"
    | "node.groupPaddingOf"
    | "node.groupMinWidth"
    | "node.groupMinHeight"
    | "node.groupMinWidthBiasLeft"
    | "node.groupMinHeightBiasTop"
    | "node.groupIncludeLabels"
    | "edge.color"
    | "edge.width"
    | "edge.minScreenWidth"
    | "edge.opacity"
    | "edge.bandColor"
    | "edge.bandWidth"
    | "edge.bandOpacity"
    | "edge.outlineColor"
    | "edge.outlineWidth"
    | "edge.outlineOpacity"
    | "edge.outlineStyle"
    | "edge.underlayColor"
    | "edge.underlayOpacity"
    | "edge.underlayPadding"
    | "edge.overlayColor"
    | "edge.overlayOpacity"
    | "edge.overlayPadding"
    | "edge.gradientColors"
    | "edge.gradientStops"
    | "edge.gradientKind"
    | "edge.style"
    | "edge.patternCount"
    | "edge.waveAmplitude"
    | "edge.wavePeriod"
    | "edge.curvature"
    | "edge.bends"
    | "edge.fanSpacing"
    | "edge.fanned"
    | "edge.bendCurve"
    | "edge.arcRadius"
    | "edge.supportModel"
    | "edge.supportSpringLength"
    | "edge.supportSpringConstant"
    | "edge.supportRepulsion"
    | "edge.supportCentralGravity"
    | "edge.supportUnit"
    | "edge.supportScale"
    | "edge.route"
    | "edge.arcHeight"
    | "edge.nodeGap"
    | "edge.sourceNodeGap"
    | "edge.targetNodeGap"
    | "edge.sourcePort"
    | "edge.targetPort"
    | "edge.arrowHead"
    | "edge.arrowHeadSize"
    | "edge.arrowHeadWidth"
    | "edge.arrowHeadSide"
    | "edge.arrowHeadPosition"
    | "edge.arrowHeadGap"
    | "edge.arrowHeadStack"
    | "edge.arrowHeadColor"
    | "edge.arrowHeadOpacity"
    | "edge.arrowHeadImage"
    | "edge.arrowHeadText"
    | "edge.arrowHeadTextStyle"
    | "edge.arrowHeadTextSize"
    | "edge.arrowHeadTextLetterSize"
    | "edge.arrowHeadTextFont"
    | "edge.arrowHeadTextColor"
    | "edge.arrowHeadTextWeight"
    | "edge.arrowHeadTextOpacity"
    | "edge.arrowHeadTextDistance"
    | "edge.arrowHeadTextRotation"
    | "edge.arrowHeadTextOffsetX"
    | "edge.arrowHeadTextOffsetY"
    | "edge.arrowTail"
    | "edge.arrowTailSize"
    | "edge.arrowTailWidth"
    | "edge.arrowTailSide"
    | "edge.arrowTailPosition"
    | "edge.arrowTailGap"
    | "edge.arrowTailStack"
    | "edge.arrowTailColor"
    | "edge.arrowTailOpacity"
    | "edge.arrowTailImage"
    | "edge.arrowTailText"
    | "edge.arrowTailTextStyle"
    | "edge.arrowTailTextSize"
    | "edge.arrowTailTextLetterSize"
    | "edge.arrowTailTextFont"
    | "edge.arrowTailTextColor"
    | "edge.arrowTailTextWeight"
    | "edge.arrowTailTextOpacity"
    | "edge.arrowTailTextDistance"
    | "edge.arrowTailTextRotation"
    | "edge.arrowTailTextOffsetX"
    | "edge.arrowTailTextOffsetY"
    | "edge.arrowMiddleHead"
    | "edge.arrowMiddleHeadSize"
    | "edge.arrowMiddleHeadWidth"
    | "edge.arrowMiddleHeadSide"
    | "edge.arrowMiddleHeadPosition"
    | "edge.arrowMiddleHeadColor"
    | "edge.arrowMiddleHeadOpacity"
    | "edge.arrowMiddleHeadImage"
    | "edge.arrowMiddleTail"
    | "edge.arrowMiddleTailSize"
    | "edge.arrowMiddleTailWidth"
    | "edge.arrowMiddleTailSide"
    | "edge.arrowMiddleTailPosition"
    | "edge.arrowMiddleTailColor"
    | "edge.arrowMiddleTailOpacity"
    | "edge.arrowMiddleTailImage"
    | "edge.animationSpeed"
    | "edge.label"
    | "edge.labelStyle"
    | "edge.labelColor"
    | "edge.labelSize"
    | "edge.labelLetterSize"
    | "edge.labelFont"
    | "edge.labelWeight"
    | "edge.labelItalic"
    | "node.visible"
    | "node.tooltipSize"
    | "node.tooltipColor"
    | "node.tooltipBackground"
    | "edge.visible"
    | "edge.labelBackground"
    | "edge.arrowHeadTextBackground"
    | "edge.arrowTailTextBackground"
    | "node.shaders"
    | "edge.shaders"
    | "edge.taper"
    | "edge.lift"
    | "edge.labelWrapWidth"
    | "edge.labelWrapTrailingSpace"
    | "edge.labelWrapEllipsis"
    | "edge.labelWrapAnywhere"
    | "edge.labelWrapSpaceCount"
    | "edge.labelRunAlign"
    | "edge.labelMinScreenSize"
    | "edge.labelOnTop"
    | "edge.labelTextAlign"
    | "edge.labelLocation"
    | "edge.labelRotation"
    | "edge.labelOutline"
    | "edge.labelOutlineWidth"
    | "edge.labelBorder"
    | "edge.labelBorderWidth"
    | "edge.labelOpacity"
    | "edge.labelBackgroundOpacity"
    | "edge.labelOutlineOpacity"
    | "edge.labelBorderOpacity"
    | "edge.labelPadding"
    | "edge.labelCornerRadius"
    | "edge.labelLineHeight"
    | "edge.labelOffsetX"
    | "edge.labelOffsetY"
    | "edge.labelShiftX"
    | "edge.labelShiftY";

/**
 * The values the "edge.style" channel accepts.
 *
 * DERIVED FROM THE SCHEMA THE MESH BUILDER READS, never written out here. This name used to be a
 * hand-typed list of nine -- "dashed", "dotted", "long-dash" and five more the edge renderer has
 * never had a mesh for -- while omitting seven it does have, so a consumer who typed a value this
 * type accepted got a layer the element refused, and the one place that noticed was a test
 * asserting the discrepancy still existed.
 */
export type EdgeLinePattern = NonNullable<NonNullable<EdgeStyleConfig["line"]>["type"]>;

/**
 * A pre-parsed colour. Components are 0..255 and alpha is 0..1. The repaint reads this form;
 * the string form is for authoring and export, because parsing a hex string once per element
 * is a cost the encoding already knows how to avoid.
 */
export interface Rgba {
    r: number;
    g: number;
    b: number;
    a: number;
}

/**
 * How a label is drawn.
 *
 * Declared in `./label-style` and re-exported here so that a consumer importing the channel
 * vocabulary gets the value type its labelStyle channels take, without the two files having to
 * be edited together. The interface grows a field whenever the renderer grows something a reader
 * can point at; the channel union next door grows for entirely different reasons.
 *
 * Only the interface travels this way. Its member unions -- `LabelLocation`, `LabelTextAlign`
 * and the rest -- reach `./catalog` straight from `./label-style`, so re-exporting them here as
 * well gave every one of them two paths out of the package and left the copy here reaching
 * nobody.
 */
export type { LabelStyle } from "./label-style";

/**
 * A literal value written to a channel. The shader channels (`node.shaders`, `edge.shaders`) take
 * a list of {@link ShaderUse}.
 */
export type ChannelValue = string | number | boolean | LabelStyle | Rgba | readonly ShaderUse[];

/**
 * An `encode` key that binds one shader parameter per element:
 * `"<target>.shaders.<shader id>.<parameter id>"`, such as `"node.shaders.uncertainty-aura.intensity"`.
 * It binds that parameter on the layer's own uses of the shader. The parameter must be declared
 * `varies`.
 * @since 3.36.0
 */
export type ShaderParamAddress = `${"node" | "edge"}.shaders.${string}.${string}`;

/** Literal values, one per channel. */
export type StaticStyle = Partial<Record<Channel, ChannelValue>>;

/**
 * What a categorical colour encoding does when the column holds more groups than the palette has
 * colours. N is the palette's capacity: 8 for the default, Okabe-Ito.
 *
 * - `"other"`: the N largest groups keep the palette's colours in palette order, largest group
 *   first, and every remaining group is painted one mid grey (#686868). The legend lists the
 *   grey as its last row, marked `role: "other"` with the elements it paints in `count`.
 * - `"shape"`: node encodings only. Group i is painted colour i mod N and drawn in shape
 *   floor(i / N) from a fixed list (icosphere, box, octahedron, cylinder, cone, torus), so the
 *   first N groups keep the element's default shape. Groups past N x 6 fold into the grey. On an
 *   edge encoding it is refused, because an edge has no shape to cycle. A layer that varies only
 *   the colour this way is drawn in the shapes too, whether or not it stores the shape half.
 * - `"pattern"`: edge encodings only, the edge counterpart of `"shape"`. Group i is painted
 *   colour i mod N and drawn in line pattern floor(i / N) from a fixed list (solid, dash, dot,
 *   dash-dot, wave, diamonds), so two groups that share a colour never share a pattern. On a node
 *   encoding it is refused, because a node has no line. @since 3.27.0
 * - `"extend"`: every group gets a colour of its own. With no palette named, the smallest
 *   categorical palette that fits, else the sequential default sampled once per group; with a
 *   palette named, its colours and then samples of the sequential default. Distinctness is NOT
 *   guaranteed past the palette's capacity.
 *
 * Ignored by a scale that reads numbers, which has no groups to overflow.
 */
export type BindingOverflow = "other" | "shape" | "pattern" | "extend";

/**
 * How a binding writes a number as text: a label, a tooltip or a caption bound to a number value.
 * Each field is the `Intl.NumberFormat` option of the same name; `locale` is its locale, the
 * runtime's own when absent. Without a format a number is written in full, as `String` writes it.
 * @since 3.26.0
 */
export interface BindingNumberFormat {
    /** The most digits after the decimal point, 0 to 100: `2` writes 129.64334 as 129.64. */
    maximumFractionDigits?: number;
    /** The most significant digits, 1 to 21: `3` writes 129.64334 as 130 and 0.0123456 as 0.0123. */
    maximumSignificantDigits?: number;
    /** A BCP 47 locale such as `"en-US"`, which chooses the decimal and grouping marks. */
    locale?: string;
}

/**
 * How a number a layer writes meets the number the layers beneath it painted. `"replace"` (the
 * default) writes over it; `"multiply"` and `"add"` scale or offset it, so a layer that asks for
 * twice the width doubles whatever width each element already had. Where nothing beneath painted
 * the channel, its default is what is scaled; the result is clamped to what the channel draws.
 * Only number channels take a mode other than `"replace"`.
 * @since 3.26.0
 */
export type CombineMode = "replace" | "multiply" | "add";

/**
 * One point of a `stops` binding: what a number exactly at `at` paints, and what the stretches on
 * either side of it start or end with.
 *
 * Between two points the value moves from the left point's `above` to the right point's `below`
 * (numbers linearly, colors per red, green, blue and alpha component). Below the first point every
 * value paints the first point's `below`; above the last, the last point's `above`; exactly at a
 * point, its `value`. `below` and `above` default to `value`, so a plain ramp names only `at` and
 * `value`; giving them separately draws a jump at the point. Points need not be evenly spaced.
 *
 * This is the model Cytoscape's continuous mappings use, so a mapping read from a Cytoscape file
 * keeps its exact meaning.
 */
export interface BindingStop {
    /** Where the point sits, in the bound value's own units. */
    at: number;
    /** What a value exactly at `at` paints: a number for a numeric channel, a color for a color channel. */
    value: string | number;
    /** What the stretch just below `at` ends with. Defaults to `value`. */
    below?: string | number;
    /** What the stretch just above `at` starts with. Defaults to `value`. */
    above?: string | number;
}

/**
 * One channel's binding: a literal, a declarative mapping from a value in the data, or text
 * built from several values.
 *
 * The `template` form is accepted only by the text channels (`node.label`, `edge.label`,
 * `node.tooltip`). Each string is one line. `{path}` reads a value with the same path dialect as
 * `by`; `{path|count}` is the number of distinct values of that path over the graph's nodes (its
 * edges, for `edge.label`); `{path|rank}` is this element's value's 1-based place among those values, sorted. A line with
 * any value missing is left out, and every substituted value is escaped so data cannot inject
 * label markup. The consumer writes every word: the element adds none.
 */
export type Binding =
    | {
          value: ChannelValue;
          /** How the value meets what lies beneath. See {@link CombineMode}. @since 3.26.0 */
          combine?: CombineMode;
      }
    | { template: readonly string[] }
    | {
          by: Path;
          /** How the value meets what lies beneath. See {@link CombineMode}. @since 3.26.0 */
          combine?: CombineMode;
          scale?:
              | "linear"
              | "log"
              | "neglog10"
              | "sqrt"
              | "pow"
              | "bins"
              | "quantile"
              | "ordinal"
              | "passthrough"
              | (string & {});
          palette?: PaletteId;
          /**
           * The binding's own palette: two or more colours, lowest first, saved with the layer.
           * Given, `palette` is not: a binding names a catalogue palette or carries its colors. A
           * scale that names groups reads them as a categorical palette (one colour per group, so
           * as many colors as groups), a binding with a `midpoint` as a diverging one, and anything
           * else as a sequential ramp. The legend names it `custom`.
           * @since 3.26.0
           */
          colors?: string[];
          domain?: [number, number] | "auto";
          clamp?: [number, number];
          range?: [number, number];
          map?: Record<string, string | number>;
          /**
           * What a value with no `map` entry paints, in place of the scale: a layer that varies a
           * property for a few groups keeps one value for every other group. An element with no
           * value at all is still `missing`'s, and a group folded into `other` keeps that.
           * @since 3.26.0
           */
          otherwise?: string | number;
          other?: { threshold: number; value: string | number };
          /**
           * What a categorical colour binding does with more groups than its palette can keep
           * apart. See {@link BindingOverflow}. Absent, a palette the binding names is refused with
           * `E_CAP_EXCEEDED` and one it leaves to the element is chosen large enough.
           */
          overflow?: BindingOverflow;
          missing?: "skip" | { value: string | number };
          /**
           * How a number is written on a channel that carries text (a label, a tooltip, a
           * caption). See {@link BindingNumberFormat}. Ignored on every other channel.
           * @since 3.26.0
           */
          format?: BindingNumberFormat;
          /**
           * What a value `map` has no entry for paints. Absent, it goes on through the scale as
           * before, so with `scale: "passthrough"` an unmapped "green" is painted green. `"skip"`
           * leaves an element whose value the map does not hold exactly as the layers beneath
           * paint it. An element with no value at all still follows `missing`.
           */
          unmapped?: "skip";
          /**
           * Points a number is read against instead of a scale, domain, range and palette: uneven
           * spacing and jumps allowed. See {@link BindingStop}. Works on channels that carry a
           * number or a color, with `scale` absent or `"linear"`; `palette`, `domain`, `clamp`,
           * `range`, `reverse`, `midpoint`, `bins`, `exponent`, `map`, `other` and `overflow` are
           * refused beside it, because the points already say what each of them would.
           */
          stops?: BindingStop[];
          /**
           * Values this binding does not paint: an element carrying one is left exactly as the
           * layers beneath paint it, as an unmeasured element is. Compared as the legend spells a
           * category, so the group `0` and the text `"0"` are the same value. The legend keeps
           * the value's row, marked `hidden`, so it can be shown again. Set it per value with
           * `styles.setValueHidden()`, which is one undoable step.
           */
          hidden?: (string | number | boolean)[];
          reverse?: boolean;
          midpoint?: number;
          bins?: number;
          exponent?: number;
          /**
           * The values a scale's groups paint, lowest group first, on a channel that carries one
           * of a fixed list (a line pattern, a node shape, an arrow): group 0 paints the first,
           * group 1 the second. Each must be one the channel takes. Absent, the groups walk the
           * channel's own list in catalogue order. `styles.proposeEncoding` writes an ordered set
           * here when it steps a number onto such a channel.
           * @since 3.26.0
           */
          choices?: string[];
      };

/**
 * Declarative attribute-to-channel bindings. A key is a channel, or a shader parameter's address
 * (see {@link ShaderParamAddress}).
 */
export type Encoding = Partial<Record<Channel, Binding>> & { [address: ShaderParamAddress]: Binding };

/**
 * What a "top N" does with the tie group its cut falls in. `"fewer"` (the default) leaves the
 * whole group out, so the top holds at most `n` and can hold none when every element ties;
 * `"all"` takes the whole group, so the top holds every element tied at the cut and can hold more
 * than `n`.
 * @since 3.26.0
 */
export type TopTies = "fewer" | "all";

/**
 * What a layer matches. Spelled out rather than implied, so it is greppable and lintable.
 *
 * OPEN UNION: kinds may be added in a minor release; handle unknown kinds.
 */
export type Selector =
    | { match: "expression"; where: Query }
    | { match: "has"; path: Path }
    | { match: "ids"; nodes?: readonly NodeId[]; edges?: readonly EdgeId[] }
    /**
     * The top `n` elements by one run field (`results.<run>.<field>`), cut only between tie
     * groups: a group of equal values is painted whole, and only when all of it fits inside `n`.
     * See `TopRanking` for the policy. `ties: "all"` takes the group the cut falls in whole
     * instead, so the top can hold more than `n` (see {@link TopTies}).
     */
    | { match: "top"; path: Path; n: number; ties?: TopTies }
    | { match: "everything" }
    /**
     * The members of a scope, usually a kept set: `{ match: "member", of: { set: id } }`. The
     * layer follows the set: a redefinition repaints exactly the elements that moved. A removed
     * set paints from its kept record, so removing a set never blanks a layer; a scope that
     * cannot be evaluated paints nothing and never throws.
     */
    | { match: "member"; of: Scope }
    /**
     * The elements a rule tree holds, re-evaluated as the data changes: what a rule set holds,
     * without keeping a set. `edges` is how the edges are read beside a rule about nodes (default
     * `clipped`, the edges between its nodes, as the visibility filter reads it). "Top N by" any
     * number is a `threshold` leaf: `{ kind: "threshold", path: "data.age", top: 10 }`.
     */
    | { match: "rule"; where: RuleTree; edges?: EdgeReading }
    /**
     * The elements a reader is pointing at now: selected (`"selected"`, the selection's nodes and
     * edges), under the pointer (`"hovered"`, one node at most), or drawn outside the time window
     * (`"ghosted"`, while `session.time.settings.outside` is `"ghost"`), or pinned in place
     * (`"pinned"`, nodes only, as `session.positions.pinned` holds them). View state: the layer
     * follows each change with no step.
     * @since 3.26.0
     */
    | { match: "state"; state: "selected" | "hovered" | "ghosted" | "pinned" }
    /**
     * What the reader is pointing at: the node under the pointer (`reach: "node"`, the default),
     * or that node, its neighbors and the edges that touch it (`reach: "neighbors"`). With
     * `invert: true`, everything else -- but only while a node is hovered, so the layer paints
     * nothing at rest. Edges: the edges that touch the hovered node, for either reach. View
     * state: the layer follows the pointer with no undo step. `session.selection.hovered` says
     * which node it is. With `orSelected: true`, while no node is hovered a lone selected node
     * stands in for the hovered one, so a look that follows the pointer stays on the node the
     * reader clicked; several selected nodes, or none, and the layer paints as at rest.
     *
     * ```ts
     * // Fade what the pointed-at node is not linked to.
     * session.styles.add({ name: "Dim the rest", target: "node",
     *     selector: { match: "hover", reach: "neighbors", invert: true }, set: { "node.opacity": 0.25 } });
     * ```
     */
    | { match: "hover"; reach?: "node" | "neighbors"; invert?: boolean; orSelected?: boolean };

/** Who put a layer in the stack. Every layer names its source. */
export type LayerSource =
    | { by: "element"; reason: "default" | "selection" | "hover" | "notes" }
    | { by: "run"; runId: RunId; algorithm: AlgorithmKey; params: Record<string, unknown> }
    | { by: "user" }
    | { by: "template"; templateId: string }
    | { by: "plugin"; name: string };

/** What a layer is for. */
export type LayerKind = "base" | "encoding" | "highlight" | "custom";

/** A layer as it is authored, imported or exported: data, never an object with behaviour. */
export interface LayerSpec {
    name: string;
    target?: "node" | "edge";
    kind?: LayerKind;
    selector: Selector;
    set?: StaticStyle;
    encode?: Encoding;
    source?: LayerSource;
    enabled?: boolean;
    userData?: Record<string, unknown>;
    /**
     * Where a layer made from a file's styles came from: the element's facts about it, set when
     * a load makes the layer, saved and restored with it, and read with `fileStyleOf(layer)`.
     * Absent on every other layer. An update that does not name it keeps it.
     */
    fileStyle?: FileStyleOrigin;
    /**
     * The row this layer is a part of: the id of the row's node part. Two layers sharing a row
     * are one entry that paints nodes and edges (`styles.addRow` with target `"both"`), and
     * remove and move act on both. Minted by the element; `add` and `update` refuse it.
     */
    row?: LayerId;
    /**
     * What the last re-run of a run this layer reads could not match to its groups, as codes:
     * see {@link LayerUnmatchedGroup}. Written by the element; absent when everything matched.
     */
    unmatched?: readonly LayerUnmatchedGroup[];
}

/**
 * A group a re-run could not match. `group.new`: a group the re-run made that matches no group
 * before it. `group.gone`: a group before it that matches none after it.
 */
export type GroupMatchCode = "group.new" | "group.gone";

/**
 * One group a run's re-run could not match, reported on each layer that reads the run's value.
 *
 * When a run that publishes a partition (a community run) re-runs, its groups are renumbered, and
 * each old group is matched to the new group sharing the most members; a value that names
 * something (a data-like label) is matched by name. A layer's value-table entries, hidden values
 * and rule conditions naming a matched group move with it. What matched nothing is reported here.
 */
export interface LayerUnmatchedGroup {
    /** Whether the group is new after the re-run or gone from it. */
    readonly code: GroupMatchCode;
    /** Which group, of which value. */
    readonly params: {
        /** The value path the group is a value of, such as `results.louvain.group`. */
        readonly path: Path;
        /** The group, as the data spells it. */
        readonly value: string | number | boolean;
        /** True when the layer named the group (an entry, a hidden value, a rule) and lost it. */
        readonly dropped?: boolean;
    };
}

/** A portable stack of layers, with any palettes it depends on travelling beside it. */
export interface StyleDocument {
    version: 1;
    layers: readonly LayerSpec[];
    palettes?: readonly PaletteDescriptor[];
    /**
     * The style tree: folders, pins, the reader's locks and hidden rows, bottom first. A layer row
     * names its layer by its place in `layers`. Absent when the tree is one plain row per layer.
     */
    tree?: readonly StyleDocumentRow[];
    /**
     * The text of each pasted shader the layers name, verbatim in the shader text format, so a
     * document copied alone keeps its shaders. Absent when the layers name none.
     * @since 3.36.0
     */
    shaders?: readonly { readonly id: string; readonly text: ShaderText }[];
}

/** One row of a saved style tree: a layer, by its place in the document, or a folder. */
export type StyleDocumentRow = (
    | { layer: number }
    | {
          folder: string;
          /** The folder's rows, bottom first. */
          children: readonly StyleDocumentRow[];
      }
) & {
    /** Where the row is pinned among its siblings; absent means not pinned. */
    pin?: "top" | "bottom" | "none";
    /** The reader's lock. */
    locked?: boolean;
    /** Whether the row is hidden. */
    hidden?: boolean;
};

// ---------------------------------------------------------------------------------------------
// The catalogue descriptors
// ---------------------------------------------------------------------------------------------

/** One algorithm the element can run. */
export interface AlgorithmDescriptor {
    key: AlgorithmKey;
    plainName: string;
    technicalName: string;
    description: string;
    category: "centrality" | "community" | "path" | "flow" | "structure" | "prediction" | (string & {});
    shape: ResultShape;
    fields: readonly FieldDescriptor[];
    options: readonly OptionDescriptor[];
    costClass: CostClass;
    complexity: string;
    /**
     * A cost model in seconds over a graph of n nodes and m edges.
     *
     * SUPERSEDED BY `RegisteredAlgorithm.cost`, and not to be set by a plugin. A function is not
     * plain JSON, so a descriptor carrying one stops surviving `JSON.stringify` and a
     * `postMessage` -- which is why no built-in sets it and a test pins that. Declare
     * `static cost` on the algorithm class instead, where the registry holds it beside the class
     * reference and a function belongs.
     */
    cost?: (n: number, m: number) => number;
    approximable?: {
        method: string;
        plainName: string;
        defaultSample: number;
        seeded: boolean;
    };
    requires?: {
        directed?: boolean;
        weighted?: boolean;
        accelerator?: boolean;
        connected?: boolean;
    };
    /**
     * What a run over a scope computes on. `"subgraph"`: the scope's own nodes and edges, so a
     * small scope is estimated and run as small. `"none"`: the whole graph, keeping only the
     * scope's values, so the run is estimated -- and refused -- as a whole-graph run.
     *
     * DERIVED, NOT AUTHORED: `Algorithm.register` fills it from the class's `static scopeInput`,
     * which is the one declaration the run, its caveat and this field all read. A plugin leaves
     * it out of the descriptor it writes; one that disagrees with the class is refused.
     *
     * OPEN UNION: values may be added in a minor release (`"mask"` is reserved); treat an
     * unknown value as `"none"`.
     */
    scopeInput?: "none" | "subgraph";
    /**
     * The meaning of edge weight a run of this algorithm reads: `"strength"` (larger is closer),
     * `"distance"` (larger is farther) or `"capacity"` (larger carries more), or null when it has
     * no weighted form. An algorithm that reads one takes the `weight` option: absent, the weight
     * the graph was loaded with; null, none; a column's name, or `{ attribute, meaning }`, that
     * column. A weight of another meaning is left unread and the run counts edges, saying so in
     * `caveats.weightSkipped`; a strength reader also reads a weight whose meaning nobody stated.
     *
     * OPEN UNION: meanings may be added in a minor release. Absent on a plugin's descriptor.
     */
    weightMeaning?: "strength" | "distance" | "capacity" | null;
}

/** One layout the element can place a graph with. */
export interface LayoutDescriptor {
    id: LayoutId;
    plainName: string;
    technicalName: string;
    description: string;
    family: string;
    kind: "live" | "batch";
    maxDimensions: 2 | 3;
    sizeRating: "any" | 10000 | 2000 | 500;
    structuralInputs: readonly ("node" | "partition" | "ordering")[];
    options: readonly OptionDescriptor[];
    /** The implementation behind this layout. */
    engine: string;
    /**
     * Whether the default engine arranges this graph differently when its edges carry weights.
     *
     * A picker reads it to know which arrangements the `weighted` option actually does something
     * for. Of the element's own sixteen engines only Kamada-Kawai and ForceAtlas2 answer true;
     * offering a weight control on the other fourteen would advertise a setting that changes
     * nothing.
     */
    honoursWeights: boolean;
    /**
     * Whether the default engine accepts a scope: `setLayout(type, opts, { scope })` moves only
     * the scope's nodes and holds every other node still.
     *
     * A picker reads it to know where a "Lay out this set" control does something. Of the
     * element's own engines, the five live simulations answer true; a one-shot arrangement
     * refuses a scope with `E_UNSUPPORTED`.
     */
    scoped: boolean;
    /**
     * What has to be true before the default engine can run at all. `package` names an optional
     * peer package that must be installed (the Graphviz layouts need `@hpcc-js/wasm-graphviz`);
     * `accelerator: true` means the engine runs only on hardware. Absent when nothing is needed.
     * @since 3.29.0
     */
    requires?: LayoutRequirements;
}

/** What has to be true before a layout engine can run. */
export interface LayoutRequirements {
    /** The engine runs only on an accelerator. */
    accelerator?: boolean;
    /**
     * An optional peer package that must be installed, such as `@hpcc-js/wasm-graphviz`.
     * @since 3.29.0
     */
    package?: string;
}

/**
 * A layout descriptor as a third party's engine class authors it.
 *
 * `honoursWeights` and `scoped` are missing from it because the engine class already declares
 * those facts as statics, and a fact written in two places is a fact that can disagree with
 * itself. `LayoutEngine.register` reads the statics and publishes the complete descriptor.
 */
export type AuthoredLayoutDescriptor = Omit<LayoutDescriptor, "honoursWeights" | "scoped">;

/** One file format the element can read, write, or both. */
export interface FormatDescriptor {
    id: FormatId;
    plainName: string;
    extensions: readonly string[];
    mimeTypes: readonly string[];
    canImport: boolean;
    canExport: boolean;
    /**
     * True when the format's files are not text (a Cytoscape session is a zip archive): an
     * export's `text()` rejects with `E_UNSUPPORTED`, so read its `bytes`. Absent means text.
     */
    binary?: boolean;
    /** The options its reader accepts. */
    options: readonly OptionDescriptor[];
    /**
     * The options `exportGraph` accepts for it, graph-io's common `sanitizeIds` and
     * `onMixedDirection` included. Absent when nothing writes the format; an option not listed
     * here is refused with `E_UNKNOWN_OPTION`.
     */
    writerOptions?: readonly OptionDescriptor[];
    /**
     * Whether the format's files carry styles: `read` when its reader can draw a file's own
     * styles (`styles: "file"` on a load), and what its writer keeps of a graph's styles --
     * `"rules"` (the layers come back as layers when the file is read again), `"values"` (only
     * each element's values) or `"none"`. Absent means `{ read: false, write: "none" }`.
     */
    styles?: FormatStyles;
    /**
     * The distinct file types the writer produces, when it produces more than one: JSON's seven
     * graph shapes, CSV's plain, Gephi and Neo4j tables. A picker can offer one entry per variant
     * and call `exportGraph(format.id, { ...variant.preset, ...values })`. Absent when the format
     * writes one kind of file.
     */
    exportVariants?: readonly FormatExportVariant[];
    /** What the format is for, when its name does not say, such as which call reads it. */
    description?: string;
}

/** What a format's files keep of a graph's styles. See {@link FormatDescriptor.styles}. */
export interface FormatStyles {
    /** Whether the reader can draw a file's own styles. */
    readonly read: boolean;
    /** What the writer keeps: the rules, only the values, or nothing. Open union. */
    readonly write: "rules" | "values" | "none";
}

/** One kind of file a format's writer produces: a format id plus the writer options that fix it. */
export interface FormatExportVariant {
    /** Unique within its format. */
    id: string;
    plainName: string;
    extensions: readonly string[];
    mimeTypes: readonly string[];
    /** The writer options this variant fixes, passed to `exportGraph` unchanged. */
    preset: Readonly<Record<string, unknown>>;
    /**
     * The writer options that apply to this variant: the format's `writerOptions` without the
     * preset's keys and without anything that applies only to another variant.
     */
    options: readonly OptionDescriptor[];
}

/** One colour palette. */
export interface PaletteDescriptor {
    id: PaletteId;
    plainName: string;
    kind: "sequential" | "diverging" | "categorical";
    colors: readonly string[];
    /** How many distinct values the palette can carry, or null when it is continuous. */
    capacity: number | null;
    colorblindSafe: readonly ("deuteranopia" | "protanopia" | "tritanopia")[];
}

/**
 * What `registerPalette` accepts: a {@link PaletteDescriptor} whose derived and optional members
 * may be left off. `capacity` is derived from the kind and the colours, and a missing
 * `colorblindSafe` is no claim.
 */
export type PaletteRegistration = Omit<PaletteDescriptor, "capacity" | "colorblindSafe"> & {
    capacity?: number | null;
    colorblindSafe?: PaletteDescriptor["colorblindSafe"];
};

/**
 * One camera view: a named way of deciding where the viewer stands and what they look at.
 *
 * `modes` is how a view says where it can be used. The five built-in views used to express that
 * by throwing from inside a switch, and a picker cannot read a throw -- so a view unusable in 2D
 * was offered in 2D and failed when chosen. With the modes declared, the element refuses before
 * calling with `E_UNSUPPORTED` and a picker offers only what will work.
 */
export interface CameraDescriptor {
    id: CameraId;
    plainName: string;
    description: string;
    /** The drawing modes this view can be computed in. The element refuses the others. */
    modes: readonly DrawingMode[];
    options: readonly OptionDescriptor[];
}

/**
 * One destination log records can be delivered to.
 *
 * A destination has a descriptor so that it can be named in a configuration and listed by a
 * settings panel. That is the whole difference between the element's own remote destination,
 * which a string in a config object turns on, and a third party's, which used to be reachable
 * only by holding a live JavaScript object.
 */
export interface LogSinkDescriptor {
    id: LogSinkId;
    plainName: string;
    description: string;
    options: readonly OptionDescriptor[];
}

/** One scale, mapping a domain of values onto a channel's range. */
export interface ScaleDescriptor {
    name: string;
    plainName: string;
    domainKind: "numeric" | "categorical" | "boolean";
    options: readonly OptionDescriptor[];
}

/**
 * One named style document, offered as a whole look.
 *
 * Nothing produces one yet: it is returned only by the deprecated `CatalogApi.themes()`, and goes
 * with it at the next major release unless that is implemented first (issue #331).
 */
export interface ThemeDescriptor {
    name: string;
    plainName: string;
    document: StyleDocument;
}

/**
 * One function the expression grammar accepts.
 *
 * Nothing produces one yet: it is returned only by the deprecated `CatalogApi.functions()`, and
 * goes with it at the next major release unless that is implemented first (issue #332).
 */
export interface FunctionDescriptor {
    name: string;
    /** The smallest and largest argument count accepted. */
    arity: [number, number];
    description: string;
    returns: "number" | "boolean" | "string";
}

// ---------------------------------------------------------------------------------------------
// Attributes, metrics and validation
// ---------------------------------------------------------------------------------------------

/**
 * What a column does for the graph, beyond holding values: the node ids were read from it
 * (`"key"`), nodes are named by it (`"label"`), edge weights were read from it (`"weight"`),
 * edge endpoints (`"source"`, `"target"`), times (`"time"`) or the file's own edge ids
 * (`"edgeId"`), or node locations are read from it, one column per kind (`"latitude"`,
 * `"longitude"`, `"coordinates"`, `"country"`, `"region"`, `"city"`).
 *
 * OPEN UNION: roles may be added in a minor release; handle unknown roles.
 */
export type AttributeRole =
    | "key"
    | "label"
    | "weight"
    | "source"
    | "target"
    | "time"
    | "edgeId"
    | "latitude"
    | "longitude"
    | "coordinates"
    | "country"
    | "region"
    | "city";

/**
 * One thing that reads a column: a style layer whose selector or bindings read it, or a finished
 * run that weighed its edges by it.
 *
 * OPEN UNION: kinds may be added in a minor release; handle unknown kinds.
 */
export type AttributeUse =
    { readonly kind: "layer"; readonly id: LayerId } | { readonly kind: "run"; readonly id: RunId };

/** One attribute available on this session, whether it was imported, joined or computed. */
export interface AttributeDescriptor {
    /** The column's key, `data.<name>`, with the name unquoted; see {@link Path}. Quote it with `quotePath` before using it inside an expression. */
    path: Path;
    /** The bracketed form a formula uses, such as "[betweenness_centrality]". */
    token: string;
    name: string;
    plainName: string;
    technicalName: string;
    kind: "node" | "edge";
    type: AttributeType;
    /**
     * What the values measure. Inferred as `"categorical"` for strings and booleans and
     * `"quantitative"` for numbers; `"ordinal"` and `"time"` are never inferred. A column of
     * number codes needs a `data.declare` to be read as groups. Absent for a column with no values.
     */
    measurement?: Measurement;
    /** Who said so. Present exactly when `measurement` is. */
    measurementSource?: MeasurementSource;
    origin: "imported" | "joined" | "computed" | "result";
    /** The fraction of elements that carry a value, from 0 to 1. */
    completeness: number;
    uniqueCount?: number;
    min?: number;
    max?: number;
    sampleValues: readonly unknown[];
    /**
     * Present (true) when every value is text the element reads as a color (`#rgb`, `#rrggbb`,
     * `rgb(...)`, a CSS color name), so a channel can paint it as it is through the `passthrough`
     * scale. Absent otherwise.
     * @since 3.26.0
     */
    valuesAreColors?: true;
    /**
     * Present (true) on a node column whose value on every node spells that node's own id (a CSV's
     * `id` column kept as data), so a picker can list the node id once. Absent otherwise.
     * @since 3.27.0
     */
    holdsNodeIds?: true;
    /** Set when the attribute came from a run. */
    runId?: RunId;
    /**
     * What the column does for the graph: the roles it plays, read from the data configuration
     * (`data.knownFields`) and the last load. Absent when it plays none. A column named with
     * spaces (`shared chapters`) is matched by its literal name.
     *
     * ```ts
     * const key = session.data.attributes().find((a) => a.roles?.includes("key")); // the node ids
     * ```
     */
    roles?: readonly AttributeRole[];
    /**
     * What reads the column now: each style layer that selects or paints by it, in stack order,
     * then each run that weighed its edges by it. Absent when nothing does. Together with `roles`
     * this is "the attributes in use":
     *
     * ```ts
     * const inUse = session.data.attributes().filter((a) => a.roles !== undefined || a.usedBy !== undefined);
     * ```
     */
    usedBy?: readonly AttributeUse[];
    /**
     * The loads whose rows carry the column, oldest first (`session.data.sources()` keys). Absent
     * when no load recorded what it supplied.
     */
    sources?: readonly SourceKey[];
    /**
     * True when the column was hidden with `session.data.setHidden`; absent otherwise. Its values
     * are all still there: what to leave out for a hidden column is the consumer's choice.
     * @since 3.30.0
     */
    hidden?: boolean;
    /**
     * True when every value is a whole number from 1000 to 2999 and they span 500 or less, as a
     * column of years does (`1975`); absent otherwise. A consumer that groups digits may leave
     * them ungrouped for such a column: `1975`, not `1,975`.
     * @since 3.30.0
     */
    yearLike?: true;
}

/**
 * What kind of value a {@link ReadableValue} holds: amounts, named groups, free text, or yes and no.
 * @since 3.26.0
 */
export type ReadableValueKind = "number" | "category" | "text" | "yes-no";

/**
 * The kinds of channel value a {@link ReadableValue} can drive, as a style channel's `accepts`
 * names them.
 * @since 3.26.0
 */
export type ReadableChannelKind = "color" | "number" | "enum" | "text" | "boolean";

/**
 * One value a rule or a binding can read: the element's own node id, a data column, or a field a
 * finished run published per element. `session.data.readableValues()` lists them all.
 *
 * ```ts
 * for (const value of session.data.readableValues()) {
 *     console.log(value.path, value.plainName, value.kind, value.range ?? value.valueCount);
 * }
 * // "data.age" "age" "number" { min: 18, max: 64 }
 * // "results.louvain.group" "Community" "category" 6
 * ```
 * @since 3.26.0
 */
export interface ReadableValue {
    /**
     * What a rule or a binding reads: `"id"` for the node id (a rule's text leaf reads it),
     * `data.<name>` for a data column, `results.<run>.<field>` for a run's field. Distinct for every
     * entry, so the node id and a data column named `id` are two entries.
     */
    readonly path: Path;
    /** The catalog name: the column's own name, the field's plain name, or "Node id". */
    readonly plainName: string;
    /** The name a technical reader knows it by. */
    readonly technicalName: string;
    /** Whether nodes or edges carry it. */
    readonly on: "node" | "edge";
    /** Where it comes from. */
    readonly from: "element" | "data" | "run";
    /** The run that published it, when `from` is `"run"`. */
    readonly runId?: RunId;
    /** What kind of value it is. A partition's group is a category however its ids are spelled. */
    readonly kind: ReadableValueKind;
    /** The lowest and highest value, for a number. */
    readonly range?: { readonly min: number; readonly max: number };
    /**
     * How many distinct values, for a category or a yes-or-no, and for a number when the column
     * holds few enough distinct values to count (256 or fewer): College football's conference
     * column of the codes 0 to 11 has 12, so "one color per value" through the `ordinal` scale
     * can be offered for it.
     */
    readonly valueCount?: number;
    /**
     * Present (true) when every value is text the element reads as a color, so the `passthrough`
     * scale paints it as it is. See {@link AttributeDescriptor.valuesAreColors}.
     * @since 3.26.0
     */
    readonly valuesAreColors?: true;
    /**
     * Present (true) on a node data column whose value on every node spells that node's own id, so
     * a picker that lists the node id (`path` `"id"`) can leave this column out, or the other way
     * round. See {@link AttributeDescriptor.holdsNodeIds}.
     * @since 3.27.0
     */
    readonly holdsNodeIds?: true;
    /**
     * Present on an edge entry that reads a value of the node at one end of each edge: `path` is
     * `graphty.source.<node path>` or `graphty.target.<node path>`, and `plainName`,
     * `technicalName`, `kind`, `range` and `valueCount` are the node value's (read over the nodes).
     * A rule such as "edges whose source is Valjean" reads
     * `{ kind: "text", reads: "graphty.source.data.name", mode: "exact", text: "Valjean" }`, and a
     * binding such as "width by the source's Connections" reads `graphty.source.results.<run>.value`.
     * @since 3.26.0
     */
    readonly end?: "source" | "target";
    /** The fraction of the nodes (or edges) that carry a value, from 0 to 1. */
    readonly completeness: number;
    /**
     * The kinds of channel on its half it can drive with no scale named: exactly the channels
     * `styles.proposeEncoding({ column })` proposes a binding for. Empty for the node id, which
     * only a rule reads.
     */
    readonly fits: readonly ReadableChannelKind[];
    /**
     * What reads it now: each style layer that selects or paints by it, in stack order, then (for
     * a data column) each run that weighed its edges by it. Absent when nothing does, so a picker
     * can list the values already in use first.
     * @since 3.26.0
     */
    readonly usedBy?: readonly AttributeUse[];
    /**
     * The rule leaves that can test it, so a condition editor offers the tests the value supports
     * after the reader picks it: see {@link RuleTestKind}. A number with few enough distinct values
     * to count is offered both number and category tests.
     * @since 3.26.0
     */
    readonly tests: readonly RuleTestKind[];
}

/**
 * A value every node carries from the graph's structure, which a rule reads with no run and no
 * column: `graphty.degree`, and on a directed graph `graphty.inDegree` and `graphty.outDegree`.
 * See `SessionDataApi.structureValues`.
 * @since 3.35.0
 */
export interface StructureValue {
    /** What a rule reads, such as `"graphty.degree"`. */
    readonly path: Path;
    /** The catalog name: "Degree", "In-degree" or "Out-degree". */
    readonly plainName: string;
    /** The name a technical reader knows it by: "degree", "inDegree" or "outDegree". */
    readonly technicalName: string;
}

/**
 * A rule leaf that can test a {@link ReadableValue}, by the `kind` it has in a {@link RuleTree}:
 * `range` (between, at least, at most, is), `top` (a `threshold` leaf's top N), `above` (a
 * `threshold` leaf's strictly above), `categories` (is one of, is not one of) and `text`
 * (contains, is, starts with, ends with, matches).
 *
 * More kinds may be added in a minor release.
 * @since 3.26.0
 */
export type RuleTestKind = "range" | "top" | "above" | "categories" | "text";

/**
 * Whether a metric can be computed on this graph, what it would cost, and whether it has
 * already been run. Metrics that have never been run are listed too, which is what makes the
 * catalogue self-describing: a stranger can see everything the element could compute, with a
 * cost and an availability reason beside each entry, before computing anything.
 */
export interface MetricAvailability {
    key: AlgorithmKey;
    plainName: string;
    technicalName: string;
    available: boolean;
    /** Why it is unavailable on this graph. Present only when `available` is false. */
    reason?: string;
    costClass: CostClass;
    estimateSeconds: number;
    hasRun: boolean;
    runIds: readonly RunId[];
}

/**
 * The result of checking an expression. Validation covers references, not only syntax: an
 * expression that parses perfectly and names a run or an attribute that does not exist matches
 * nothing, silently, which reads exactly like a correct answer of zero.
 */
export interface QueryValidation {
    ok: boolean;
    error?: { code: GraphtyErrorCode; message: string; position: number };
    unresolvedPaths: readonly {
        path: Path;
        reason: "unknown-run" | "unknown-attribute";
        candidates: readonly string[];
    }[];
}

/**
 * What an operation runs over: a set reference.
 *
 * `{ define }` carries a set definition inline, with edge members in stable form; a write
 * position that also accepts session edge ids takes {@link ScopeInput}. The keyword `"search"` is
 * reserved for a later release and refused.
 *
 * OPEN UNION: forms may be added in a minor release; handle unknown forms.
 */
export type Scope =
    | "visible"
    | "graph"
    | "selection"
    | "largest-component"
    | { set: ScopeId }
    | { where: Query }
    | { nodes: readonly NodeId[] }
    | { define: SetDefinition };

/**
 * A {@link Scope} as a write position accepts it: an inline definition may name edges by session
 * {@link EdgeId}. Every getter returns the canonical {@link Scope}, with stable members.
 */
export type ScopeInput = Exclude<Scope, { define: unknown }> | { define: SetDefinitionInput };

/**
 * Which way an edge is followed: arriving (`in`), leaving (`out`) or both (`all`). What a degree
 * leaf counts and which way a neighbourhood selection walks.
 */
export type SelectionDirection = "in" | "out" | "all";

/**
 * Which nodes a `range` or `categories` leaf keeps when its attribute lives on edges (such as
 * `data.weight`). `"all"` (the default): the leaf is silent about nodes, so every node stays and
 * only the passing edges are kept. `"ends"`: only the nodes at the ends of a passing edge are kept.
 * When the nodes carry the attribute too, `"ends"` keeps a node only when it passes AND is an end.
 * `"none"` (since 3.26.0): the leaf holds no nodes at all, and the edges that pass are kept
 * whatever the rule's edge reading says of their ends, so a rule about edges on a layer that paints
 * nodes and edges paints just the passing edges.
 */
export type AttributeLeafNodes = "all" | "ends" | "none";

/**
 * How a text test compares: the value contains the text (`substring`), is it (`exact`), starts
 * or ends with it, or matches it as a regular expression (`regex`).
 *
 * OPEN UNION: modes may be added in a minor release; handle unknown modes.
 */
export type TextMatchMode = "substring" | "exact" | "starts-with" | "ends-with" | "regex";

/**
 * A rule tree: what the visibility filter keeps, and what a rule set holds.
 *
 * Every leaf speaks about nodes, edges or both, and is SILENT about the rest: `all` and `any` fold
 * the halves that are not silent, and `not` negates only those. `edges`, `self-loop` and
 * `repeated-edge` speak edges; `range` and `categories` speak each half whose elements carry the
 * attribute (one on `data.weight` speaks edges); `member` speaks the referenced set's nodes, and
 * its edges only when that set is read `listed` or `clipped` (`"visible"` is); `item` and
 * `threshold` speak the half or halves their field lives on; `source` speaks both halves, or the
 * one its `side` names; every other leaf speaks nodes. A group with no members constrains nothing.
 *
 * OPEN UNION: leaf kinds may be added in a minor release; handle unknown kinds.
 */
export type RuleTree =
    | { readonly kind: "expression"; readonly where: Query }
    | {
          readonly kind: "range";
          readonly attribute: Path;
          readonly min?: number;
          readonly max?: number;
          /** Which nodes the leaf keeps when its attribute lives on edges: see {@link AttributeLeafNodes}. */
          readonly nodes?: AttributeLeafNodes;
      }
    | {
          readonly kind: "categories";
          readonly attribute: Path;
          readonly values: readonly string[];
          /** Which nodes the leaf keeps when its attribute lives on edges: see {@link AttributeLeafNodes}. */
          readonly nodes?: AttributeLeafNodes;
      }
    | {
          readonly kind: "degree";
          readonly min?: number;
          readonly max?: number;
          readonly direction?: SelectionDirection;
      }
    | { readonly kind: "component"; readonly id: number }
    | { readonly kind: "neighborhood"; readonly seeds: readonly NodeId[]; readonly depth: number }
    /**
     * The nodes with no edge to another node: each is a component of its own, so these are exactly
     * the nodes `data.statistics().components.isolatedCount` counts. A node whose only edges are
     * self-loops is one. Speaks nodes.
     */
    | { readonly kind: "isolated" }
    /** The edges whose two ends are the same node: `statistics().selfLoopCount` of them. Speaks edges. */
    | { readonly kind: "self-loop" }
    /**
     * The edges beyond the first between one pair of nodes, in the graph's edge order: exactly the
     * edges `statistics().repeatedEdgeCount` counts. On an undirected graph `a`-`b` and `b`-`a` are
     * one pair; on a directed graph they are two. Speaks edges.
     */
    | { readonly kind: "repeated-edge" }
    | { readonly kind: "edges"; readonly where: Query }
    /**
     * The members of a scope, usually a kept set: `{ kind: "member", of: { set: id } }`. A removed
     * set is read from its kept record, so removing a set never changes what a rule holds.
     */
    | { readonly kind: "member"; readonly of: Scope }
    /**
     * The elements one item of a result holds: community 3, the path's nodes and edges. Speaks
     * the half or halves the result publishes the key's field on (`onPath` speaks both).
     */
    | { readonly kind: "item"; readonly item: ResultItem }
    /**
     * The elements whose value for a path passes one cut. The population is the elements that
     * carry a finite number for the path; each half that has one speaks, ranked on its own.
     * Reserved, refused until built: `percentile`, `z` and `population`.
     */
    | {
          readonly kind: "threshold";
          /** A value path: `results.<run>.<field>` or `data.<field>`. */
          readonly path: Path;
          /** The top `n`, whole tie groups only (the `TopRanking` tie policy). Exactly one cut. */
          readonly top?: number;
          /** What `top` does with the tie group its cut falls in: see {@link TopTies}. @since 3.26.0 */
          readonly ties?: TopTies;
          /** Strictly above this value. Exactly one cut. */
          readonly above?: number;
      }
    /**
     * The elements whose text for one value passes a text test: "name contains bob", "id matches
     * `[13579]$`". The same matcher a selection's text search runs. A number or a yes-or-no value
     * is read as its text; an element without a value fails. Reading `"id"` speaks nodes; a value
     * path speaks each half whose elements carry it, as a `range` leaf does.
     */
    | {
          readonly kind: "text";
          /** What it reads: `"id"` for the node's id, or a value path such as `data.name`. */
          readonly reads: Path;
          /** How the text is compared. */
          readonly mode: TextMatchMode;
          /** The text, or the regular expression for `regex`. */
          readonly text: string;
          /**
           * Whether case counts. Default false: both sides are folded the way find folds them
           * (case, accents and runs of spaces), and a `regex` ignores case.
           */
          readonly caseSensitive?: boolean;
          /** Which nodes the leaf keeps when its value lives on edges: see {@link AttributeLeafNodes}. */
          readonly nodes?: AttributeLeafNodes;
      }
    /**
     * The nodes and edges any of these loads supplied (`session.data.sources()` keys): what
     * `session.data.sourcesOf(id)` lists. An element two loads both supplied matches either.
     * Speaks nodes and edges.
     */
    | {
          readonly kind: "source";
          readonly sources: readonly SourceKey[];
          /**
           * Which half the rule speaks: both when absent; `"nodes"` keeps the nodes the loads
           * supplied and leaves every edge between them, whichever load supplied it; `"edges"`
           * keeps only the edges they supplied. @since 3.30.0
           */
          readonly side?: RuleSide;
      }
    | { readonly kind: "all"; readonly of: readonly RuleTree[] }
    | { readonly kind: "any"; readonly of: readonly RuleTree[] }
    | { readonly kind: "not"; readonly of: RuleTree };

/**
 * Which half of the graph a `source` rule leaf speaks: its nodes or its edges.
 * @since 3.30.0
 */
export type RuleSide = "nodes" | "edges";

/** A load's stable key, as `session.data.sources()` lists it and a `source` rule names it. */
export type SourceKey = string; // NOSONAR(S6564): a named public type in the API report; removing it breaks consumers

/**
 * One step of a stepped visibility filter: a rule that can be switched off without being lost.
 * The steps that are on combine with AND, in order, so each one narrows what the step before it
 * left.
 */
export interface FilterStep {
    /** The step's id, unique among the steps. */
    readonly id: string;
    /** Whether the step applies. A step that is off keeps its rule and hides nothing. */
    readonly on: boolean;
    /** What the step keeps. */
    readonly rule: RuleTree;
}

/**
 * What a filter condition that is on does: `"keep"` hides everything its rule does not match,
 * `"exclude"` hides what it matches, `"select"` selects what it matches and hides nothing.
 *
 * OPEN UNION: a later release may add an effect on visibility or selection; handle unknown
 * effects. Styling, saving a set or running on the matches belong to `styles`, `sets` and `runs`,
 * never here.
 * Experimental: may change or be removed in a minor release.
 * @since 3.32.0
 * @beta
 */
export type FilterEffect = "keep" | "exclude" | "select";

/**
 * One filter condition: a rule that can be switched off without being lost, with what it does.
 *
 * Conditions are independent and order never matters: every keep condition that is on narrows
 * what stays, every exclude condition that is on hides its matches (two of them hide what either
 * matches), and the select conditions that are on select what all of them match, over the whole
 * graph, visible or not.
 *
 * A `range`, `categories` or `text` leaf on an edge value that names no `nodes` reading gets one
 * from the effect: keep keeps the matching edges and the nodes at their ends, exclude hides only
 * the matching edges, select selects only the matching edges. A reading written in the rule wins.
 * Experimental: may change or be removed in a minor release.
 * @since 3.32.0
 * @beta
 */
export interface FilterCondition {
    /** The condition's id, unique among the conditions. */
    readonly id: string;
    /** Whether the condition applies. One that is off keeps its rule and does nothing. */
    readonly on: boolean;
    /** What it does when on. */
    readonly effect: FilterEffect;
    /** What it matches. */
    readonly rule: RuleTree;
}

/**
 * A filter condition as it is handed in: the id is made when absent, and `on` defaults to true.
 * Experimental: may change or be removed in a minor release.
 * @since 3.32.0
 * @beta
 */
export type FilterConditionInput = Omit<FilterCondition, "id" | "on"> & {
    readonly id?: string;
    readonly on?: boolean;
};

// ---------------------------------------------------------------------------------------------
// Sets: what a kept set holds, and how it came to exist
//
// Every value here is plain, frozen-friendly and structured-cloneable, so a definition can be
// stored, posted to a worker, hashed and compared by value. `parseSetDefinition` (in
// `./sets/parse`) is the one validator that turns an unknown value into one of these.
//
// No kind, reading or keyword the element defines will ever contain a colon. A plugin's kind is
// spelled `<package>:<kind>`, so it can never collide with a later built-in.
// ---------------------------------------------------------------------------------------------

/**
 * Which edges come with a set's nodes. Stored, never inferred from whether edges are present.
 *
 * - `induced`: the node half plus every edge between its nodes (NetworkX `G.subgraph(nodes)`).
 * - `listed`: the edge half plus its endpoints, plus the node half (NetworkX
 *   `G.edge_subgraph(edges)` plus any listed nodes). Paths, edge sets and edge rules.
 * - `clipped`: the node half, plus the edge half clipped to edges whose endpoints are both in the
 *   node half. Rules only: exactly what the visibility filter shows. A fixed set given `clipped`
 *   is stored `listed`, which holds the same members.
 * - `incident`: the node half, plus the edge half (every edge when silent) clipped to edges with
 *   AT LEAST ONE endpoint in the node half: the edges "touching" the nodes, where `induced` and
 *   `clipped` are the edges "between" them. Rules only; a fixed set is refused it.
 *
 * OPEN UNION: kinds may be added in a minor release; handle unknown kinds.
 */
export type EdgeReading = "induced" | "listed" | "clipped" | "incident";

/**
 * An edge member, by its stable identity: the endpoints plus exactly one discriminator, `id`,
 * `key` or the pair `ordinal` and `among`. The validator refuses any other combination.
 *
 * OPEN: may gain optional members in a minor release.
 */
export interface EdgeMember {
    /** The node the edge leaves, as loaded. */
    readonly source: NodeId;
    /** The node the edge enters, as loaded. */
    readonly target: NodeId;
    /**
     * The file's edge id, read at the element's configured `edgeIdPath`, or for an edge added in
     * the session without one, the id the element minted for it (`graphty:e<n>`).
     */
    readonly id?: string | number;
    /** The file's parallel-edge key. Reserved: refused until the element reads one. */
    readonly key?: string | number;
    /**
     * Last resort, for a file edge without an id: the edge's position, counting from 0, among
     * every edge of its pair in the load that ingested it, in ingest order. Present with `among`
     * or not at all.
     */
    readonly ordinal?: number;
    /** That pair's edge count in that load. Present with `ordinal` or not at all. */
    readonly among?: number;
}

/**
 * An edge as a write position accepts it: a session {@link EdgeId}, or its stable
 * {@link EdgeMember}. The element stores the stable form; every getter returns it.
 */
export type EdgeRef = EdgeId | EdgeMember;

/**
 * What a set holds.
 *
 * - `fixed`: a member list. Ids, never row indices; ids the graph no longer holds read missing
 *   and are never pruned. A fixed set read `induced` stores no edges unless some were listed.
 * - `rule`: a query or a rule tree, re-evaluated as the data changes.
 * - `path`: a walk, in order, node-first. Repeats allowed; one node is a zero-length path. It
 *   resolves to its distinct nodes and the edges its steps name, read `listed`.
 *
 * OPEN UNION: kinds may be added in a minor release; handle unknown kinds.
 */
export type SetDefinition =
    | {
          readonly kind: "fixed";
          /** Canonical order, no duplicates. */
          readonly nodes: readonly NodeId[];
          /** Canonical order, no duplicates. Only edges listed explicitly; an induced set derives its edges. */
          readonly edges?: readonly EdgeMember[];
          readonly reading: "induced" | "listed";
      }
    | {
          readonly kind: "rule";
          /** A JMESPath predicate over nodes, or a rule tree ({@link RuleTree}). */
          readonly where: Query | RuleTree;
          readonly reading: EdgeReading;
      }
    | {
          readonly kind: "path";
          /** The walk, in order. */
          readonly nodes: readonly NodeId[];
          /**
           * Optional; when present, exactly `nodes.length - 1` entries. Entry i names the edge, or
           * the group of parallel or reciprocal edges, joining `nodes[i]` and `nodes[i + 1]`.
           * `null`: every edge between that pair.
           */
          readonly edges?: readonly (EdgeMember | readonly EdgeMember[] | null)[];
          /** Steps must follow declared edge direction. Default false. */
          readonly directed?: boolean;
      };

/**
 * A {@link SetDefinition} as a write position accepts it: edges may be named by session
 * {@link EdgeId} wherever an {@link EdgeMember} appears, and a fixed set may say `clipped` (stored
 * as `listed`). Every getter returns the canonical {@link SetDefinition}.
 */
export type SetDefinitionInput =
    | {
          readonly kind: "fixed";
          readonly nodes: readonly NodeId[];
          readonly edges?: readonly EdgeRef[];
          readonly reading: EdgeReading;
      }
    | Extract<SetDefinition, { kind: "rule" }>
    | {
          readonly kind: "path";
          readonly nodes: readonly NodeId[];
          readonly edges?: readonly (EdgeRef | readonly EdgeRef[] | null)[];
          readonly directed?: boolean;
      };

/**
 * How an item is found in a result. A field matches when it equals the value or, for an
 * array-valued field, contains it.
 *
 * OPEN UNION: forms may be added in a minor release; handle unknown forms.
 */
export type ItemKey = {
    /** The result field, such as `group` for a community or `onPath` for a path. */
    readonly field: string;
    /** The value an element's field equals, or its array contains, to be in the item. */
    readonly value: string | number | boolean;
};

/**
 * The id of a result: what a style layer, a rule or an item address binds to. The same string as
 * the {@link RunId} a run answers to, because a result is named by its first run and keeps the
 * name while later runs replace its values.
 */
export type ResultId = RunId;

/**
 * One item of a result: community 3 of a Louvain result, the path of a Dijkstra result.
 *
 * OPEN: may gain optional members in a minor release.
 */
export interface ResultItem {
    /** The result that holds the item. */
    readonly result: ResultId;
    /**
     * Present: holds that one run of the result, as it was. Absent: follows the result's current
     * run. Opaque; compare for equality only.
     */
    readonly run?: string;
    /** How the item's elements are found in that result. */
    readonly key: ItemKey;
}

/**
 * How two or more sets combine into one.
 *
 * OPEN UNION: operations may be added in a minor release; handle unknown operations.
 */
export type SetCombine = "union" | "intersection" | "difference" | "symmetric-difference";

/**
 * A reference as {@link SetCreatedFrom} records it: a scope, or an inline member list replaced by
 * its sizes, so a large operand is never stored twice.
 */
export type SetOperand = Scope | { readonly inline: { readonly nodes: number; readonly edges: number } };

/**
 * How a set came to exist. Written once, when the set is created.
 *
 * OPEN UNION: kinds may be added in a minor release; handle unknown kinds.
 */
export type SetCreatedFrom =
    | { readonly kind: "user" }
    | { readonly kind: "selection" }
    | { readonly kind: "scope"; readonly from: SetOperand }
    /** `item.run` is always present: the set holds the run it was created from. */
    | { readonly kind: "result"; readonly item: ResultItem }
    | { readonly kind: "combine"; readonly op: SetCombine; readonly of: readonly SetOperand[] };

/**
 * What kind of walk a path set is, most specific first: `cycle` (a closed trail), `simple` (no
 * node repeats), `trail` (no edge repeats), `walk` (anything else).
 *
 * OPEN UNION: kinds may be added in a minor release; handle unknown kinds.
 */
export type PathKind = "simple" | "trail" | "walk" | "cycle";

/**
 * The catalogue: everything the element can offer, as data.
 *
 * `session.catalog` implements every method here except the ones named in
 * {@link DeprecatedCatalogMethod}, which nothing implements yet.
 */
export interface CatalogApi {
    algorithms(): readonly AlgorithmDescriptor[];
    layouts(): readonly LayoutDescriptor[];
    formats(): readonly FormatDescriptor[];
    palettes(): readonly PaletteDescriptor[];
    cameras(): readonly CameraDescriptor[];
    logSinks(): readonly LogSinkDescriptor[];
    scales(): readonly ScaleDescriptor[];
    /**
     * Every shader the element can draw: its presets first, then shaders registered through
     * `registerShader` or `defineShader`.
     * @since 3.36.0
     */
    shaders(): readonly ShaderDescriptor[];
    /**
     * Every layout transition `layoutTransition` can name: the element's presets first, then the
     * ones registered through `registerTransition`.
     * @since 3.36.0
     */
    transitions(): readonly TransitionDescriptor[];
    /**
     * Every graph generator `session.data.generate` runs, with a default name, one sentence and
     * its parameters with their defaults and ranges. Supplied by @graphty/graph-samples.
     */
    generators(): readonly GeneratorDescriptor[];
    /**
     * Every sample dataset `session.data.loadDataset` downloads, with its size, source, citation
     * and license. Supplied by @graphty/graph-samples.
     */
    datasets(): readonly DatasetMeta[];
    /**
     * Every sample 3D model graphty-element ships, which a style layer names in `node.model`
     * (`"asset:sample/server"`) without adding a file, with a plain name and a thumbnail picture.
     */
    models(): readonly ModelDescriptor[];
    /**
     * Every screenshot preset `captureScreenshot({ preset })` takes, with the size, format and
     * background each sets, so an export dialog can show them. Static; also published as
     * `SCREENSHOT_PRESET_DESCRIPTORS` from the `./catalog` entry.
     */
    screenshotPresets(): readonly ScreenshotPreset[];
    /**
     * @deprecated Not implemented. Removed at the next major release unless it is implemented
     * first (issue #331).
     */
    themes(): readonly ThemeDescriptor[];
    /**
     * @deprecated Not implemented. Removed at the next major release unless it is implemented
     * first (issue #332).
     */
    functions(): readonly FunctionDescriptor[];
    /**
     * @deprecated Not implemented. Removed at the next major release unless it is implemented
     * first (issue #333).
     */
    timeAttributes(): readonly AttributeDescriptor[];
    metrics(): readonly MetricAvailability[];
    /**
     * The metrics that can run on this graph. A runtime query, not a static list.
     * @deprecated Not implemented; `metrics()` carries `available` and `reason` for the same
     * question. Removed at the next major release unless it is implemented first (issue #334).
     */
    applicable(): readonly MetricAvailability[];
    /**
     * @deprecated Not implemented. Removed at the next major release unless it is implemented
     * first (issue #335).
     */
    validate(query: Query, o?: { kind?: "selector" | "filter" | "formula" }): QueryValidation;
    /**
     * The options for one algorithm or layout, with data-dependent bounds resolved for a scope.
     *
     * A bound written as an {@link OptionBound} reference (or as the bare reference string) comes
     * back as the number measured over the scope, and a "node-id" or "node-set" option comes back
     * with `values`: one choice per node in the scope, its value and label the node id as a
     * string. A "partition" option on nodes comes back with `values` too: one choice per column
     * that can group the nodes -- a categorical node attribute (value: its name) or a finished
     * run's categorical node field (value: its `results.` path, label: the run's label) --
     * leaving out the key and label columns and any column with a value per node. Every other
     * field is the static descriptor's.
     * @param key - An algorithm key, looked for first, or a layout id.
     * @param scope - What to measure; the session's default run scope when absent.
     * @returns The options, in declaration order.
     * @throws `E_UNKNOWN_ALGORITHM` when no algorithm or layout is registered under `key`.
     */
    optionsFor(key: AlgorithmKey | LayoutId, scope?: Scope): Promise<readonly OptionDescriptor[]>;
}

/**
 * The {@link CatalogApi} methods nothing implements yet, which `session.catalog` leaves out.
 *
 * Implementing one means deleting its name here: `SessionCatalogApi` is derived from this list,
 * so the two cannot drift apart.
 */
export type DeprecatedCatalogMethod = "themes" | "functions" | "timeAttributes" | "applicable" | "validate";

// ---------------------------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------------------------

/**
 * Tell whether a value is one of the option types.
 * @param value - The value to test.
 * @returns True when the value is a member of OPTION_TYPES.
 */
export function isOptionType(value: unknown): value is OptionType {
    return typeof value === "string" && (OPTION_TYPES as readonly string[]).includes(value);
}

/**
 * Tell whether an algorithm key names a built-in the element reserves but does not run.
 * @param key - The algorithm key.
 * @returns True when the key is a member of DEPRECATED_ALGORITHMS.
 */
export function isDeprecatedAlgorithm(key: string): key is DeprecatedAlgorithm {
    return (DEPRECATED_ALGORITHMS as readonly string[]).includes(key);
}

/**
 * Tell whether a value is one of the cost classes.
 * @param value - The value to test.
 * @returns True when the value is a member of COST_CLASSES.
 */
export function isCostClass(value: unknown): value is CostClass {
    return typeof value === "string" && (COST_CLASSES as readonly string[]).includes(value);
}

/**
 * Tell whether a value is one of the declared result shapes.
 * @param value - The value to test.
 * @returns True when the value is a member of RESULT_SHAPES.
 */
export function isResultShape(value: unknown): value is ResultShape {
    return typeof value === "string" && (RESULT_SHAPES as readonly string[]).includes(value);
}

/**
 * Tell whether a value is one of the attribute types.
 * @param value - The value to test.
 * @returns True when the value is a member of ATTRIBUTE_TYPES.
 */
export function isAttributeType(value: unknown): value is AttributeType {
    return typeof value === "string" && (ATTRIBUTE_TYPES as readonly string[]).includes(value);
}

/**
 * Tell whether an option bound is a reference to a measurement of the graph rather than a
 * literal. A consumer that renders a slider needs the answer before it can label the end of
 * the track, and catalog.optionsFor resolves the references away.
 * @param value - The bound to test, as it appears on OptionDescriptor.min or .max.
 * @returns True when the bound is an OptionBound reference.
 */
export function isOptionBound(value: unknown): value is OptionBound {
    return typeof value === "object" && value !== null && typeof (value as OptionBound).from === "string";
}
