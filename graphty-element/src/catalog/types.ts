/**
 * @file Catalog descriptor types.
 *
 * Everything the element can offer -- an algorithm, a layout, a file format, a palette, a
 * scale, a theme, an expression function, an option -- is published as a plain-JSON
 * descriptor. A descriptor is data: no classes, no methods, no library objects. That is what
 * lets it be serialized, posted to a worker, diffed, cached, stored in a document or rendered
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
import type { EstimateRefusalCode } from "../session/cost/estimate";
import type { CodedFact } from "../session/shared";
import type { ChannelDescriptor } from "../session/styles/channels";
import type { StyleRowId } from "../session/styles/tree";
import type { TransitionDescriptor } from "../transitions/registry";
import type { ChannelValueDescriptor } from "./channelValues";
import type { LabelLookDescriptor } from "./label-looks";
import type { LabelStyle } from "./label-style";
import type { ModelDescriptor } from "./models";
import type { ScreenshotPreset } from "./screenshotPresets";
import type { ShaderDescriptor, ShaderProblem, ShaderText, ShaderUse } from "./shaders";

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
    | {
          /** A node was found. */
          readonly kind: "node";
          /** The node's id. */
          readonly id: NodeId;
      }
    | {
          /** An edge was found. */
          readonly kind: "edge";
          /** The edge's id. */
          readonly id: EdgeId;
      };

/**
 * What `element.groupOutlineAt(point)` finds under a point: a group outline a style layer draws (a
 * use at the place `group` on its `node.shaders`), by its layer, its shader and its group, the
 * topmost outline first. `group` is the group's `groupBy` value, null for a use drawing one outline.
 * @since 3.36.0
 */
export interface GroupOutlineAtResult {
    /** Always `"group-outline"`. */
    readonly kind: "group-outline";
    /** The style layer that draws the outline. */
    readonly layer: LayerId;
    /** The id of the shader that draws it. */
    readonly shader: string;
    /** The group's `groupBy` value, or null when the use draws one outline for everything. */
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
    readonly nodes: ReadonlyMap<
        string,
        {
            /** How many uses of the shader nodes draw now. */
            readonly drawn: number;
            /** How many of those uses are playing their entrance at this moment. */
            readonly entering: number;
        }
    >;
    /**
     * The group outlines drawn on the last frame, bottom first: each one's layer, shader and the
     * `groupBy` value of each group it outlines (null for a use drawing one outline).
     */
    readonly groupOutlines: readonly {
        /** The style layer that draws the outline. */
        readonly layer: LayerId;
        /** The id of the shader that draws it. */
        readonly shader: string;
        /** The `groupBy` value of each group it outlines; null for a use drawing one outline. */
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
    /** The run id to use: lower-case letters, digits and underscores, starting with a letter. */
    readonly id: string;
    /** The default name a reader sees for the result. */
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
 * the built-in set without a catalog instance.
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
    "all-paths",
    "edge-betweenness",
    "removal-impact",
    "articulation-points",
    "bridges",
    "distance-measures",
] as const;

/** One of the built-in algorithms. */
export type KnownAlgorithm = (typeof KNOWN_ALGORITHMS)[number];

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
    "geographic",
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
    "xlsx",
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
 */
export type FormatId = (typeof KNOWN_FORMAT_IDS)[number] | (string & {});

/**
 * The built-in palettes: seven sequential ramps, six categorical sets, three diverging ramps and
 * three highlight pairs, in the order `PALETTE_DESCRIPTORS` lists them.
 *
 * All nineteen are here because this list is what autocomplete offers. Four of them used to be,
 * so a consumer typing a palette name was shown a quarter of the element's own palettes and had
 * to read the catalog table to find the rest.
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
export const KNOWN_CAMERA_IDS = ["fitToGraph", "topView", "sideView", "frontView", "isometric", "bottomView"] as const;

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
export type Measurement = "categorical" | "ordinal" | "quantitative" | "time" | (string & {}); // the open-union idiom; keeps the known literals in autocomplete while accepting others

/**
 * Who said what a column measures, highest precedence first: a `data.declare` call, the algorithm
 * catalog, the file format, or the element's inference from the values. A data column reports
 * `"declared"` or `"inferred"` today; `"catalog"` and `"file"` are reserved for results and for
 * formats that write a column's measurement down.
 *
 * OPEN UNION: values may be added in a minor release.
 */
export type MeasurementSource = "declared" | "catalog" | "file" | "inferred" | (string & {}); // the open-union idiom; keeps the known literals in autocomplete while accepting others

/** What `session.data.declare` says a column measures. An ordinal column lists its values in order. */
export type MeasurementDeclaration =
    | {
          /** What the column measures. */
          readonly measurement: "categorical" | "quantitative" | "time";
      }
    | {
          /** The column holds groups with an order. */
          readonly measurement: "ordinal";
          /** The column's values, lowest first. */
          readonly order: readonly (string | number)[];
      };

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
 * the catalog.
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
    /** The field's name, as its result path spells it: `results.<run>.<name>`. */
    name: string;
    /** The field's default name for a reader, such as "Influence". */
    plainName: string;
    /** The field's name in the literature or the library, such as "pagerank". */
    technicalName: string;
    /** Whether the field holds one value per node, one per edge, or one for the whole graph. */
    kind: "node" | "edge" | "graph";
    /** The type of its values. A `"table"` field holds rows, for a whole-graph result. */
    type: "number" | "integer" | "boolean" | "string" | "table";
    /** The unit its values count, such as `"links"`. Absent when the value has none. */
    unit?: string;
    /** How its values were scaled, such as `"min-max"`. Absent when they are as computed. */
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
    /**
     * The fixed range its values fall in, when the measure defines one (a share is 0 to 1), so a
     * histogram keeps a fixed axis. Experimental: may change or be removed in a minor release.
     * @beta
     */
    domain?: {
        /** The smallest value the measure can take. */
        readonly min: number;
        /** The largest value the measure can take. */
        readonly max: number;
    };
    /**
     * Which end counts as more: `"lower"` for a distance or a rank, where 1 is the top.
     * Experimental: may change or be removed in a minor release.
     * @beta
     */
    polarity?: "higher" | "lower";
    /**
     * The declared order of an ordered value's levels, lowest first.
     * Experimental: may change or be removed in a minor release.
     * @beta
     */
    order?: readonly (string | number)[];
    /**
     * What an element with no value means: `"unreached"` for a search the element was not reached
     * by. Experimental: may change or be removed in a minor release.
     * @beta
     */
    missing?: "unreached" | "unmeasured" | (string & {}); // keeps the named codes in autocomplete while open to others
    /**
     * Present (true) when its values are names a re-run may spell differently (a community's
     * number), so a group is saved by a member it holds rather than by its number.
     * Experimental: may change or be removed in a minor release.
     * @beta
     */
    unstable?: true;
    /** The path a style layer or a rule reads the field by, such as `results.pagerank.score`. */
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
    /** What the bound measures on the graph: one of {@link OPTION_BOUND_SOURCES}. */
    from: (typeof OPTION_BOUND_SOURCES)[number] | (string & {});
}

/**
 * The kinds of control an option asks for.
 *
 * "unknown" is not a control. It is what the Zod emitter records when a schema uses a
 * construct it cannot classify: the option is still published, still carries its name and its
 * default, and says why it could not be typed in `unsupported`. Dropping the option or
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
    /** A list of edge ids. @since 3.40.0 */
    "edge-set",
    "unknown",
] as const;

/** The kind of control an option asks for. */
export type OptionType = (typeof OPTION_TYPES)[number];

/** One choice offered by an option whose type is "enum", or a column `catalog.optionsFor` lists. */
export interface OptionChoice {
    /** The value the option takes when this choice is picked. */
    value: string;
    /** What to show for it. For a run's field, built from `runField`; an app may write its own words. */
    label: string;
    /**
     * The run field this choice names, for a "partition" choice `catalog.optionsFor` lists from a
     * finished run: the run's id and the field's name. Absent for any other choice.
     * @since 3.40.0
     */
    runField?: {
        /** The finished run's id. */
        readonly runId: RunId;
        /** The name of the run's field. */
        readonly field: string;
    };
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
    /** Why the column does not fit. */
    readonly code: "location.column-unfit";
    /** The values the code is about. */
    readonly params: {
        /** The role the option reads the column in. */
        readonly role: "latitude" | "longitude" | "location";
        /** The share of the column's values that read in that role, from 0 to 1. */
        readonly share: number;
    };
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
    /** The option's key, as the options object passed to a run or a layout spells it. */
    name: string;
    /** The option's default name for a reader, such as "Damping". */
    plainName: string;
    /** The option's name in the literature or the library, when it has one. */
    technicalName?: string;
    /** The kind of control the option asks for. */
    type: OptionType;
    /**
     * The names this option was known by before. A saved file's value under one is read as this
     * option (spec/README.md 10.1); a former name is never given to another option of the same
     * owner. Absent when it was never renamed.
     * @since 3.40.0
     */
    formerNames?: readonly string[];
    /** The value used when the option is left out. Absent when there is none. */
    default?: unknown;
    /**
     * The smallest value accepted: a number, or a bound measured on the graph (an
     * {@link OptionBound}, or its bare reference string). `catalog.optionsFor` resolves a bound to
     * a number.
     */
    min?: number | string | OptionBound;
    /** The largest value accepted, written as `min` is. */
    max?: number | string | OptionBound;
    /** The step between values a slider offers. */
    step?: number;
    /** The choices, for an `"enum"` option, and for the options `catalog.optionsFor` lists them for. */
    values?: readonly OptionChoice[];
    /** For an `"attribute"` option, the type of column it reads. */
    attributeType?: AttributeType;
    /** The name of the group of options it belongs with, such as `"engine"`. */
    group?: string;
    /** True for an option most readers can leave at its default; a form may tuck it away. */
    advanced?: boolean;
    /** True for an option that is not meant to be offered to a reader at all. */
    internal?: boolean;
    /**
     * What the option does, in an English sentence.
     * @deprecated Word the option from {@link OptionDescriptor.descriptionId} in the application.
     */
    description?: string;
    /**
     * A stable id for what the option does, which an application keys its own words on, such as
     * "algorithm.pagerank.dampingFactor". Present on every built-in option that has a description;
     * an extension that describes its options supplies its own, prefixed with its namespace.
     * @since 3.55.0
     */
    descriptionId?: string;
    /**
     * Why `type` is "unknown", as a code with no words. Present on every "unknown" option the
     * element derives from a schema; a descriptor written by hand may leave it out. See {@link OptionUnsupportedCode} for the codes.
     * @since 3.38.0
     */
    unsupported?: OptionUnsupported;
}

/**
 * Why an option's schema has no control, as {@link OptionDescriptor.unsupported} reports it:
 *
 * - `option.recursive` -- the schema refers to itself, so it has no single value type.
 * - `option.only-null` -- the only value the schema accepts is null.
 * - `option.no-type` -- the schema declares no value type.
 * - `option.union` -- the schema is a union with no single control; `params.types` names its arms'
 *   types.
 * - `option.array` -- an array option; give it a type with an override.
 * - `option.object` -- an object or record option; give it a type with an override.
 * - `option.untyped` -- the construct has no JSON Schema type, so its values cannot be classified.
 * - `option.not-convertible` -- the schema could not be converted to JSON Schema at all.
 *
 * New codes may be added in a minor release.
 * @since 3.38.0
 */
export type OptionUnsupportedCode =
    | "option.recursive"
    | "option.only-null"
    | "option.no-type"
    | "option.union"
    | "option.array"
    | "option.object"
    | "option.untyped"
    | "option.not-convertible";

/**
 * Why an option's schema has no control: a code, and for `option.union` the arms' types.
 * @since 3.38.0
 */
export interface OptionUnsupported {
    /** Why the schema has no control. */
    readonly code: OptionUnsupportedCode;
    /** The values the code is about. */
    readonly params: {
        /** For `option.union`, the types of the union's arms. */
        readonly types?: readonly string[];
    };
}

// ---------------------------------------------------------------------------------------------
// Style documents, which a theme is made of
// ---------------------------------------------------------------------------------------------

/**
 * Every property a layer can paint.
 *
 * The label channels `labelColor`, `labelSize`, `labelLetterSize`, `labelFont`, `labelWeight`, `labelItalic`, `labelUnderline`, `labelWrapWidth`, `labelWrapTrailingSpace`, `labelWrapSkipEndSpace`, `labelWrapUnkerned`, `labelWrapEllipsis`, `labelWrapAnywhere`, `labelWrapSpaceCount`, `labelMaxLines`, `labelMaxLinesEllipsis`, `labelMinScreenSize`, `labelOnTop`, `labelRotation`, `labelBackground`, `labelOutline`, `labelOutlineWidth`, `labelBorder`, `labelBorderWidth`, `labelOpacity`, `labelBackgroundOpacity`, `labelOutlineOpacity`, `labelBorderOpacity`, `labelPadding`, `labelCornerRadius`, `labelLineHeight`, `labelLineBox`, `labelBorderAlign`, `labelBorderStyle`, `labelBackgroundShape`, `labelImage`, `labelImageWidth`, `labelImageHeight`, `labelImageOffsetX`, `labelImageOffsetY`, `labelOffsetX`, `labelOffsetY`, `labelShiftX`, `labelShiftY`, `labelShiftOf` and `labelGapOf` are
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
    | "node.sizeSpace"
    | "node.shape"
    | "node.label"
    | "node.labelStyle"
    | "node.labelColor"
    | "node.labelSize"
    | "node.labelLetterSize"
    | "node.labelFont"
    | "node.labelWeight"
    | "node.labelItalic"
    | "node.labelUnderline"
    | "node.labelWrapWidth"
    | "node.labelWrapTrailingSpace"
    | "node.labelWrapSkipEndSpace"
    | "node.labelWrapUnkerned"
    | "node.labelWrapEllipsis"
    | "node.labelWrapAnywhere"
    | "node.labelWrapSpaceCount"
    | "node.labelMaxLines"
    | "node.labelMaxLinesEllipsis"
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
    | "node.labelLineBox"
    | "node.labelBorderAlign"
    | "node.labelBorderStyle"
    | "node.labelBackgroundShape"
    | "node.labelImage"
    | "node.labelImageWidth"
    | "node.labelImageHeight"
    | "node.labelImageOffsetX"
    | "node.labelImageOffsetY"
    | "node.labelOffsetX"
    | "node.labelOffsetY"
    | "node.labelShiftX"
    | "node.labelShiftY"
    | "node.labelShiftOf"
    | "node.labelGapOf"
    | "node.labelBox"
    | "node.tooltip"
    | "node.tooltipStyle"
    | "node.opacity"
    | "node.outline"
    | "node.outlineWidth"
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
    | "node.relativeExtents"
    | "node.planar"
    | "node.zIndex"
    | "node.drawOrder"
    | "node.onTop"
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
    | "node.raisedBorderWidth"
    | "node.raisedBorderLightColor"
    | "node.raisedBorderDarkColor"
    | "node.shadowColor"
    | "node.shadowOpacity"
    | "node.shadowBlur"
    | "node.shadowOffsetX"
    | "node.shadowOffsetY"
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
    | "node.cornerFraction"
    | "node.shapePoints"
    | "node.shapeStretchPoints"
    | "node.shapeRotation"
    | "node.shapeParts"
    | "node.shapeLines"
    | "node.shapeTexts"
    | "node.labelTable"
    | "node.shapeLineWidth"
    | "node.shapeLineHaloColor"
    | "node.shapeLineHaloWidth"
    | "node.labelFit"
    | "node.labelPaddingX"
    | "node.labelPaddingY"
    | "node.labelFitSquare"
    | "node.labelFitQuantum"
    | "node.labelFitImage"
    | "node.labelFitImagePadding"
    | "node.imageAspect"
    | "node.gradientColor"
    | "node.gradientDirection"
    | "node.gradientColors"
    | "node.gradientStops"
    | "node.gradientKind"
    | "node.gradientCenterX"
    | "node.gradientCenterY"
    | "node.gradientRadius"
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
    | "node.stripeFrame"
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
    | "node.chartBackgroundColor"
    | "node.chartBackgroundOpacity"
    | "node.model"
    | "node.modelSourceUp"
    | "node.modelTurn"
    | "node.modelTint"
    | "node.modelDoubleSided"
    | "node.modelAnimation"
    | "node.modelAnimationSpeed"
    | "node.modelAnimationOffset"
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
    | "edge.colorFrom"
    | "edge.width"
    | "edge.minScreenWidth"
    | "edge.drawOrder"
    | "edge.fadeStart"
    | "edge.fadeEnd"
    | "edge.fadeOpacity"
    | "edge.blending"
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
    | "edge.strandColors"
    | "edge.strandSpacing"
    | "edge.style"
    | "edge.patternCount"
    | "edge.waveAmplitude"
    | "edge.wavePeriod"
    | "edge.dashLength"
    | "edge.dashGap"
    | "edge.dashArray"
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
    | "edge.arrowHeadOutlineWidth"
    | "edge.arrowHeadPosition"
    | "edge.arrowHeadGap"
    | "edge.arrowHeadStack"
    | "edge.arrowHeadColor"
    | "edge.arrowHeadFillColor"
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
    | "edge.arrowTailOutlineWidth"
    | "edge.arrowTailPosition"
    | "edge.arrowTailGap"
    | "edge.arrowTailStack"
    | "edge.arrowTailColor"
    | "edge.arrowTailFillColor"
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
    | "edge.arrowMiddleHeadOutlineWidth"
    | "edge.arrowMiddleHeadPosition"
    | "edge.arrowMiddleHeadColor"
    | "edge.arrowMiddleHeadFillColor"
    | "edge.arrowMiddleHeadOpacity"
    | "edge.arrowMiddleHeadImage"
    | "edge.arrowMiddleTail"
    | "edge.arrowMiddleTailSize"
    | "edge.arrowMiddleTailWidth"
    | "edge.arrowMiddleTailSide"
    | "edge.arrowMiddleTailOutlineWidth"
    | "edge.arrowMiddleTailPosition"
    | "edge.arrowMiddleTailColor"
    | "edge.arrowMiddleTailFillColor"
    | "edge.arrowMiddleTailOpacity"
    | "edge.arrowMiddleTailImage"
    | "edge.animationSpeed"
    | "edge.label"
    | "edge.labelStyle"
    | "edge.tooltip"
    | "edge.tooltipStyle"
    | "edge.labelColor"
    | "edge.labelSize"
    | "edge.labelLetterSize"
    | "edge.labelFont"
    | "edge.labelWeight"
    | "edge.labelItalic"
    | "edge.labelUnderline"
    | "node.visible"
    | "node.tooltipSize"
    | "node.tooltipColor"
    | "node.tooltipBackground"
    | "edge.visible"
    | "edge.labelBackground"
    | "edge.tooltipSize"
    | "edge.tooltipColor"
    | "edge.tooltipBackground"
    | "edge.arrowHeadTextBackground"
    | "edge.arrowTailTextBackground"
    | "node.shaders"
    | "edge.shaders"
    | "edge.taper"
    | "edge.taperSource"
    | "edge.lift"
    | "edge.labelWrapWidth"
    | "edge.labelWrapTrailingSpace"
    | "edge.labelWrapSkipEndSpace"
    | "edge.labelWrapUnkerned"
    | "edge.labelWrapEllipsis"
    | "edge.labelWrapAnywhere"
    | "edge.labelWrapSpaceCount"
    | "edge.labelMaxLines"
    | "edge.labelMaxLinesEllipsis"
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
    | "edge.labelTable"
    | "edge.labelCornerRadius"
    | "edge.labelLineHeight"
    | "edge.labelLineBox"
    | "edge.labelBorderAlign"
    | "edge.labelBorderStyle"
    | "edge.labelBackgroundShape"
    | "edge.labelImage"
    | "edge.labelImageWidth"
    | "edge.labelImageHeight"
    | "edge.labelImageOffsetX"
    | "edge.labelImageOffsetY"
    | "edge.labelOffsetX"
    | "edge.labelOffsetY"
    | "edge.labelShiftX"
    | "edge.labelShiftY"
    | "edge.labelShiftOf"
    | "edge.labelGapOf"
    | "edge.labelBox"
    | "node.xlabel"
    | "node.xlabelStyle"
    | "node.xlabelLocation"
    | "node.xlabelOffsetX"
    | "node.xlabelOffsetY"
    | "node.xlabelTextAlign"
    | "node.xlabelColor"
    | "node.xlabelFont"
    | "node.xlabelWeight"
    | "node.xlabelItalic"
    | "edge.xlabel"
    | "edge.xlabelStyle"
    | "edge.xlabelLocation"
    | "edge.xlabelOffsetX"
    | "edge.xlabelOffsetY";

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
 * A pre-parsed color. Components are 0..255 and alpha is 0..1. The repaint reads this form;
 * the string form is for authoring and export, because parsing a hex string once per element
 * is a cost the encoding already knows how to avoid.
 */
export interface Rgba {
    /** Red, from 0 to 255. */
    r: number;
    /** Green, from 0 to 255. */
    g: number;
    /** Blue, from 0 to 255. */
    b: number;
    /** Alpha, from 0 (transparent) to 1 (opaque). */
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
 * What a categorical color encoding does when the column holds more groups than the palette has
 * colors. N is the palette's capacity: 8 for the default, Okabe-Ito.
 *
 * - `"other"`: the N largest groups keep the palette's colors in palette order, largest group
 *   first, and every remaining group is painted one mid gray (#686868). The legend lists the
 *   gray as its last row, marked `role: "other"` with the elements it paints in `count`.
 * - `"shape"`: node encodings only. Group i is painted color i mod N and drawn in shape
 *   floor(i / N) from a fixed list (icosphere, box, octahedron, cylinder, cone, torus), so the
 *   first N groups keep the element's default shape. Groups past N x 6 fold into the gray. On an
 *   edge encoding it is refused, because an edge has no shape to cycle. A layer that varies only
 *   the color this way is drawn in the shapes too, whether or not it stores the shape half.
 * - `"pattern"`: edge encodings only, the edge counterpart of `"shape"`. Group i is painted
 *   color i mod N and drawn in line pattern floor(i / N) from a fixed list (solid, dash, dot,
 *   dash-dot, wave, diamonds), so two groups that share a color never share a pattern. On a node
 *   encoding it is refused, because a node has no line. @since 3.27.0
 * - `"extend"`: every group gets a color of its own. With no palette named, the smallest
 *   categorical palette that fits, else the sequential default sampled once per group; with a
 *   palette named, its colors and then samples of the sequential default. Distinctness is NOT
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
    /**
     * Whether thousands are grouped, as `Intl.NumberFormat` groups them: `false` writes 12345 as
     * 12345 rather than 12,345. Absent, they are grouped.
     * @since 3.40.0
     */
    useGrouping?: boolean;
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
 * `node.tooltip`, `edge.tooltip`). Each string is one line. `{path}` reads a value with the same path dialect as
 * `by`; `{path|count}` is the number of distinct values of that path over the graph's nodes (its
 * edges, for `edge.label` and `edge.tooltip`); `{path|rank}` is this element's value's 1-based place among those values, sorted. A line with
 * any value missing is left out, and every substituted value is escaped so data cannot inject
 * label markup. The consumer writes every word: the element adds none.
 */
export type Binding =
    | {
          /** The value every element the layer matches is painted. */
          value: ChannelValue;
          /** How the value meets what lies beneath. See {@link CombineMode}. @since 3.26.0 */
          combine?: CombineMode;
      }
    | {
          /** The text, one string per line, with `{path}` placeholders for the values it reads. */
          template: readonly string[];
          /**
           * How a number a `{path}` placeholder reads is written. See {@link BindingNumberFormat}.
           * Text, counts and ranks are written as before.
           * @since 3.40.0
           */
          format?: BindingNumberFormat;
      }
    | {
          /** The value each element is painted by, such as `data.age` or `results.pagerank.score`. */
          by: Path;
          /** How the value meets what lies beneath. See {@link CombineMode}. @since 3.26.0 */
          combine?: CombineMode;
          /**
           * How a value is placed on the channel: `catalog.scales()` lists each scale and its
           * options. Absent, the element picks one from what the value measures.
           */
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
          /** The catalog palette a color channel is painted from. */
          palette?: PaletteId;
          /**
           * The binding's own palette: two or more colors, lowest first, saved with the layer.
           * Given, `palette` is not: a binding names a catalog palette or carries its colors. A
           * scale that names groups reads them as a categorical palette (one color per group, so
           * as many colors as groups), a binding with a `midpoint` as a diverging one, and anything
           * else as a sequential ramp. The legend names it `custom`.
           * @since 3.26.0
           */
          colors?: string[];
          /**
           * The lowest and highest values the scale reads against. `"auto"` (and absent) is the
           * extent the values actually span.
           */
          domain?: [number, number] | "auto";
          /**
           * Percentiles, from 0 to 100, to cut the extent at, so a few outliers do not flatten
           * everything else: `[5, 95]`.
           */
          clamp?: [number, number];
          /**
           * The numbers a numeric channel is painted in, lowest value first, such as `[1, 5]` for a
           * node size.
           */
          range?: [number, number];
          /** The value each category paints, keyed as the data spells the category. */
          map?: Record<string, string | number>;
          /**
           * What a value with no `map` entry paints, in place of the scale: a layer that varies a
           * property for a few groups keeps one value for every other group. An element with no
           * value at all is still `missing`'s, and a group folded into `other` keeps that.
           * @since 3.26.0
           */
          otherwise?: string | number;
          /** Folds the rare categories into one: every category held by fewer elements than `threshold` paints `value`. */
          other?: {
              /** The fewest elements a category needs to keep a value of its own. */
              threshold: number;
              /** What every folded category paints. */
              value: string | number;
          };
          /**
           * What a categorical color binding does with more groups than its palette can keep
           * apart. See {@link BindingOverflow}. Absent, a palette the binding names is refused with
           * `E_CAP_EXCEEDED` and one it leaves to the element is chosen large enough.
           */
          overflow?: BindingOverflow;
          /**
           * What an element with no value paints. `"skip"` (the default) leaves it as the layers
           * beneath paint it.
           */
          missing?:
              | "skip"
              | {
                    /** What an element with no value paints. */
                    value: string | number;
                };
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
          /** Sends the smallest value to the far end of the range instead of the near end. */
          reverse?: boolean;
          /** The value that lands on the middle color of a diverging palette. */
          midpoint?: number;
          /** How many groups a `"bins"` or `"quantile"` scale cuts the values into. */
          bins?: number;
          /** How hard a `"pow"` scale bends: below 1 spreads the small values out, above 1 the large ones. */
          exponent?: number;
          /**
           * The values a scale's groups paint, lowest group first, on a channel that carries one
           * of a fixed list (a line pattern, a node shape, an arrow): group 0 paints the first,
           * group 1 the second. Each must be one the channel takes. Absent, the groups walk the
           * channel's own list in catalog order. `styles.proposeEncoding` writes an ordered set
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
    | {
          /** The elements an expression matches. */
          match: "expression";
          /** The expression. */
          where: Query;
      }
    | {
          /** The elements that carry a value for a path. */
          match: "has";
          /** The value path, such as `data.age` or `results.pagerank.score`. */
          path: Path;
      }
    | {
          /** The elements listed by id. */
          match: "ids";
          /** The nodes it matches. */
          nodes?: readonly NodeId[];
          /** The edges it matches. */
          edges?: readonly EdgeId[];
      }
    /**
     * The top `n` elements by one run field (`results.<run>.<field>`), cut only between tie
     * groups: a group of equal values is painted whole, and only when all of it fits inside `n`.
     * See `TopRanking` for the policy. `ties: "all"` takes the group the cut falls in whole
     * instead, so the top can hold more than `n` (see {@link TopTies}).
     */
    | {
          /** The top elements by one run field. */
          match: "top";
          /** The run field ranked, `results.<run>.<field>`. */
          path: Path;
          /** How many elements at most, with the default tie policy. */
          n: number;
          /** What the cut does with the tie group it falls in. */
          ties?: TopTies;
      }
    | {
          /** Every element of the layer's target. */
          match: "everything";
      }
    /**
     * The members of a scope, usually a kept set: `{ match: "member", of: { set: id } }`. The
     * layer follows the set: a redefinition repaints exactly the elements that moved. A removed
     * set paints from its kept record, so removing a set never blanks a layer; a scope that
     * cannot be evaluated paints nothing and never throws.
     */
    | {
          /** The members of a scope. */
          match: "member";
          /** The scope, usually `{ set: id }`. */
          of: Scope;
      }
    /**
     * The elements a rule tree holds, re-evaluated as the data changes: what a rule set holds,
     * without keeping a set. `edges` is how the edges are read beside a rule about nodes (default
     * `clipped`, the edges between its nodes, as the visibility filter reads it). "Top N by" any
     * number is a `threshold` leaf: `{ kind: "threshold", path: "data.age", top: 10 }`.
     */
    | {
          /** The elements a rule tree holds. */
          match: "rule";
          /** The rule tree. */
          where: RuleTree;
          /** How the edges are read beside a rule about nodes. Default `clipped`. */
          edges?: EdgeReading;
      }
    /**
     * The elements a reader is pointing at now: selected (`"selected"`, the selection's nodes and
     * edges), under the pointer (`"hovered"`, one node at most), drawn while a held filter
     * condition would remove it (`"ghosted"`), outside the time window (`"outsideWindow"`:
     * a layer selecting it decides how it looks: hidden, faint, or as any other), or pinned in place
     * (`"pinned"`, nodes only, as `session.positions.pinned` holds them). View state: the layer
     * follows each change with no step. The same elements as a rule: a {@link StateLeaf}, which
     * `selectorRule` reads this selector as with its `states` option.
     * @since 3.26.0
     */
    | {
          /** The elements in a reader's state. */
          match: "state";
          /** Which state. */
          state: ElementState;
      }
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
    | {
          /** What the reader is pointing at. */
          match: "hover";
          /** The hovered node alone (`"node"`, the default), or it with its neighbors and edges. */
          reach?: "node" | "neighbors";
          /** Matches everything else instead, while a node is hovered. */
          invert?: boolean;
          /** While no node is hovered, a lone selected node stands in for the hovered one. */
          orSelected?: boolean;
      }
    /**
     * The elements of some types, under the `source-steps` experiment: those whose one type
     * (the readable path `graphty.type`) is listed, such as the accounts of a graph of accounts and
     * merchants. Refused with `E_FEATURE_OFF` while the experiment is off.
     *
     * ```ts
     * session.styles.add({ name: "Accounts", target: "node",
     *     selector: { match: "type", types: ["account"] }, set: { "node.color": "#4c6ef5" } });
     * ```
     * Experimental: may change or be removed in a minor release.
     */
    | {
          /** Match by type. */
          match: "type";
          /** The types whose elements match. */
          types: readonly string[];
      };

/**
 * Who put a layer in the stack. Every layer names its source. An element layer's `reason` says
 * what it is for: `"default"` the look every element is drawn from, `"selection"`, `"hover"` and
 * `"notes"` what they paint, and `"time"` the two
 * locked layers that hide what lies outside a time window.
 */
export type LayerSource =
    | {
          /** The element made it. */
          by: "element";
          /** What it is for. */
          reason: "default" | "selection" | "hover" | "notes";
      }
    | {
          /** A run suggested it. */
          by: "run";
          /** The run. */
          runId: RunId;
          /** The algorithm the run ran. */
          algorithm: AlgorithmKey;
          /** The options the run ran with. */
          params: Record<string, unknown>;
      }
    | {
          /** A reader or the application added it. */
          by: "user";
      }
    | {
          /** It was made from a template. */
          by: "template";
          /** The template's id. */
          templateId: string;
      }
    | {
          /** A plugin added it. */
          by: "plugin";
          /** The plugin's name. */
          name: string;
      };

/** What a layer is for. */
export type LayerKind = "base" | "encoding" | "highlight" | "custom";

/** A layer as it is authored, imported or exported: data, never an object with behavior. */
export interface LayerSpec {
    /** The layer's name, the consumer's. */
    name: string;
    /** Whether the layer paints nodes (the default) or edges. */
    target?: "node" | "edge";
    /** What the layer is for. */
    kind?: LayerKind;
    /** What the layer matches. */
    selector: Selector;
    /** The fixed values it paints on every element it matches. */
    set?: StaticStyle;
    /** The values it paints from the data, per channel. */
    encode?: Encoding;
    /** Who put the layer in the stack. */
    source?: LayerSource;
    /** Whether the layer paints. Default true. */
    enabled?: boolean;
    /** The consumer's own data, kept with the layer and never read by the element. */
    userData?: Record<string, unknown>;
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

/** A portable stack of layers, with any palettes it depends on traveling beside it. */
export interface StyleDocument {
    /** The document format's version. */
    version: 1;
    /** The layers, bottom first. */
    layers: readonly LayerSpec[];
    /**
     * The id each layer had in the session that wrote it, by its place in `layers`. Applying the
     * document gives a layer this id again when no layer in the session already has it, and mints a
     * new one from the layer's name otherwise, so an application that holds a layer by id (the
     * reader's pick, an open editor) still finds it after the work is opened again. Absent, or a
     * place left empty, mints every id from the name.
     * @since 3.40.0
     */
    ids?: readonly (LayerId | undefined)[];
    /**
     * Every palette a layer names, built-ins included, as the writing build painted it. A layer's
     * palette name resolves here before the reader's own catalog, so a file opens with the same
     * colors on a build that no longer ships a palette, or ships it changed. A document written
     * before 3.40 carries only registered palettes, and its other names resolve in the catalog.
     */
    palettes?: readonly PaletteDescriptor[];
    /**
     * Every label look a layer names (`LabelStyle.look`), with the fields it set, resolved here
     * before the reader's catalog in the same way as `palettes`. Absent when no layer names one.
     * @since 3.40.0
     */
    labelLooks?: readonly LabelLookDescriptor[];
    /**
     * The style tree: folders, pins, the reader's locks and hidden rows, bottom first. A layer row
     * names its layer by its place in `layers`. Absent when the tree is one plain row per layer.
     */
    tree?: readonly StyleDocumentRow[];
    /**
     * The project's shaders, each `{ id, text }` with the complete shader text (header, parameter
     * declarations and defaults, body, low-detail body), built-ins copied in included. An `id` is a
     * key into this list and nothing more: a layer's use, an encode key
     * `<target>.shaders.<id>.<param>` and the background name a shader by it, and a reader resolves
     * them here, never against its own catalog, so a file opens the same on a build that no longer
     * ships a shader it used. Absent when the project holds none.
     * @since 3.36.0
     */
    shaders?: readonly {
        /** The shader's id, as the layers name it. */
        readonly id: string;
        /** The complete shader text. */
        readonly text: ShaderText;
    }[];
    /**
     * What `toDocument` found wrong while writing: `shader.not-saved` with `id`, a shader a layer,
     * an encode key or the background names that the document does not carry. An element bug,
     * never expected; ignored on reading. Absent when nothing is wrong.
     * @since 3.36.0
     */
    problems?: readonly ShaderProblem[];
}

/** One row of a saved style tree: a layer, by its place in the document, or a folder. */
export type StyleDocumentRow = (
    | {
          /** The layer's place in the document's `layers`. */
          layer: number;
      }
    | {
          /** The folder's name. */
          folder: string;
          /**
           * The folder's id in the session that wrote it: applying the document keeps it when it is
           * free, as {@link StyleDocument.ids} keeps a layer's.
           * @since 3.40.0
           */
          id?: StyleRowId;
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
// The catalog descriptors
// ---------------------------------------------------------------------------------------------

/**
 * A key a descriptor replaces, with the parameters that reproduce what that key used to do.
 *
 * The parameters are what makes this a rename rather than an alias: `scc` does not become
 * `components`, it becomes `components` run with `{ strength: "strong" }`, and a reader that
 * forgets the second half silently computes the wrong answer.
 */
export interface LegacyAlgorithmKey {
    /** The key that was replaced, with no namespace. */
    readonly key: string;
    /** The parameters that reproduce what the old key did. Absent when only the key changed. */
    readonly params?: Readonly<Record<string, unknown>>;
}

/** One algorithm the element can run. */
export interface AlgorithmDescriptor {
    /** The key a run names the algorithm by, such as `"pagerank"`. */
    key: AlgorithmKey;
    /** The algorithm's default name for a reader, such as "Influence". */
    plainName: string;
    /** The algorithm's name in the literature or the library, such as "PageRank". */
    technicalName: string;
    /**
     * What the algorithm does, in an English sentence.
     * @deprecated Word the algorithm from {@link AlgorithmDescriptor.descriptionId} in the application.
     */
    description: string;
    /**
     * A stable id for what the algorithm does, which an application keys its own words on, such as
     * "algorithm.pagerank". Present on every built-in algorithm; an extension that describes its
     * algorithms supplies its own, prefixed with its namespace.
     * @since 3.55.0
     */
    descriptionId?: string;
    /**
     * The keys this algorithm was known by before, each with the parameters that reproduce it. A
     * saved file naming one opens as this algorithm (spec/README.md 10.1); a former key is never
     * given to another algorithm. Absent when it was never renamed.
     * @since 3.40.0
     */
    formerKeys?: readonly LegacyAlgorithmKey[];
    /** The kind of question the algorithm answers. Open union: an extension may name its own. */
    category: "centrality" | "community" | "path" | "flow" | "structure" | "prediction" | (string & {});
    /**
     * Other words a reader may search for it by (`union`, `bridges`), so a picker finds it by more
     * than its name. Experimental: may change or be removed in a minor release.
     * @beta
     */
    keywords?: readonly string[];
    /** The shape of its result, which fixes the field names it publishes. */
    shape: ResultShape;
    /** The fields its result publishes. */
    fields: readonly FieldDescriptor[];
    /** The options a run takes. */
    options: readonly OptionDescriptor[];
    /** How expensive a run is, roughly. */
    costClass: CostClass;
    /** Its time complexity in big-O notation, such as `"O(n + m)"`. */
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
    /**
     * The approximate method a run falls back to when an exact run would cost more than the cap
     * allows. Absent when the algorithm has none, so such a run is refused instead.
     */
    approximable?: {
        /** The approximate method's id. */
        method: string;
        /** The approximate method's default name for a reader. */
        plainName: string;
        /** How many nodes it samples when the run does not say. */
        defaultSample: number;
        /** Whether it takes a seed, so a seeded run gives the same answer every time. */
        seeded: boolean;
    };
    /** What a graph must be for the algorithm to run on it. Absent when it runs on any graph. */
    requires?: {
        /** The graph must be directed. */
        directed?: boolean;
        /** The edges must carry weights. */
        weighted?: boolean;
        /** The algorithm runs only on an accelerator (WebGPU). */
        accelerator?: boolean;
        /** The graph must be connected. */
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
    /** The id `setLayout` names the layout by, such as `"force"`. */
    id: LayoutId;
    /** The layout's default name for a reader. */
    plainName: string;
    /** The library or algorithm the default engine runs, such as "d3-force-3d". */
    technicalName: string;
    /**
     * What the layout does, in an English sentence.
     * @deprecated Word the layout from {@link LayoutDescriptor.descriptionId} in the application.
     */
    description: string;
    /**
     * A stable id for what the layout does, which an application keys its own words on, such as
     * "layout.force". Present on every built-in layout; an extension that describes its
     * layouts supplies its own, prefixed with its namespace.
     * @since 3.55.0
     */
    descriptionId?: string;
    /** The kind of arrangement it draws, such as `"force"`, `"hierarchical"` or `"geometric"`. */
    family: string;
    /**
     * How the default engine places nodes: `"live"` moves them a step each frame until it settles,
     * `"batch"` computes every position at once.
     */
    kind: "live" | "batch";
    /** The most dimensions it lays out in: 2 for a flat drawing only, 3 for 2D or 3D. */
    maxDimensions: 2 | 3;
    /** The largest graph, in nodes, the default engine is advised for; `"any"` for no limit. */
    sizeRating: "any" | 10000 | 2000 | 500;
    /**
     * What the layout needs to be given before it can run: a root node, a partition or an
     * ordering. Empty when it needs nothing.
     */
    structuralInputs: readonly ("node" | "partition" | "ordering")[];
    /** The options the layout takes. */
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
    honorsWeights: boolean;
    /**
     * The British spelling of {@link LayoutDescriptor.honorsWeights}, always the same value.
     * @deprecated Read `honorsWeights`. Removed in the next major.
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
 * `honorsWeights` (and its British spelling `honoursWeights`) and `scoped` are missing from it because the engine class already declares
 * those facts as statics, and a fact written in two places is a fact that can disagree with
 * itself. `LayoutEngine.register` reads the statics and publishes the complete descriptor.
 */
export type AuthoredLayoutDescriptor = Omit<LayoutDescriptor, "honorsWeights" | "honoursWeights" | "scoped">;

/** One file format the element can read, write, or both. */
export interface FormatDescriptor {
    /** The id a load or an export names the format by, such as `"graphml"`. */
    id: FormatId;
    /** The format's default name for a reader. */
    plainName: string;
    /** The file name extensions its files use, such as `".graphml"`. */
    extensions: readonly string[];
    /** The media types its files are served as. */
    mimeTypes: readonly string[];
    /** Whether the element can read the format. */
    canImport: boolean;
    /** Whether the element can write the format. */
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
     * @experimental file-styles
     */
    styles?: FormatStyles;
    /**
     * The distinct file types the writer produces, when it produces more than one: JSON's seven
     * graph shapes, CSV's plain, Gephi and Neo4j tables. A picker can offer one entry per variant
     * and call `exportGraph(format.id, { ...variant.preset, ...values })`. Absent when the format
     * writes one kind of file.
     */
    exportVariants?: readonly FormatExportVariant[];
    /**
     * What the format is for, when its name does not say, such as which call reads it, in an
     * English sentence.
     * @deprecated Word the format from {@link FormatDescriptor.descriptionId} in the application.
     */
    description?: string;
    /**
     * A stable id for what the format is for, which an application keys its own words on, such as
     * "format.graphty". Present on every built-in format that has a description; an extension that
     * describes its formats supplies its own, prefixed with its namespace.
     * @since 3.55.0
     */
    descriptionId?: string;
}

/**
 * What a format's files keep of a graph's styles. See {@link FormatDescriptor.styles}.
 * @experimental file-styles
 */
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
    /** The variant's default name for a reader. */
    plainName: string;
    /** The file name extensions its files use. */
    extensions: readonly string[];
    /** The media types its files are served as. */
    mimeTypes: readonly string[];
    /** The writer options this variant fixes, passed to `exportGraph` unchanged. */
    preset: Readonly<Record<string, unknown>>;
    /**
     * The writer options that apply to this variant: the format's `writerOptions` without the
     * preset's keys and without anything that applies only to another variant.
     */
    options: readonly OptionDescriptor[];
}

/** One color palette. */
export interface PaletteDescriptor {
    /** The id a binding names the palette by. */
    id: PaletteId;
    /** The palette's default name for a reader. */
    plainName: string;
    /**
     * A ramp for amounts (`"sequential"`), a ramp with a middle (`"diverging"`), or distinct colors
     * for groups (`"categorical"`).
     */
    kind: "sequential" | "diverging" | "categorical";
    /** The colors, `#rrggbb`, lowest first for a ramp. */
    colors: readonly string[];
    /** How many distinct values the palette can carry, or null when it is continuous. */
    capacity: number | null;
    /** The kinds of color blindness its colors stay told apart under. */
    colorblindSafe: readonly ("deuteranopia" | "protanopia" | "tritanopia")[];
}

/**
 * What `registerPalette` accepts: a {@link PaletteDescriptor} whose derived and optional members
 * may be left off. `capacity` is derived from the kind and the colors, and a missing
 * `colorblindSafe` is no claim.
 */
export type PaletteRegistration = Omit<PaletteDescriptor, "capacity" | "colorblindSafe"> & {
    /** How many distinct values it carries. Derived from the kind and the colors when absent. */
    capacity?: number | null;
    /** The kinds of color blindness its colors stay told apart under. Absent is no claim. */
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
    /** The id the view is named by. */
    id: CameraId;
    /** The view's default name for a reader. */
    plainName: string;
    /**
     * What the view does, in an English sentence.
     * @deprecated Word the view from {@link CameraDescriptor.descriptionId} in the application.
     */
    description: string;
    /**
     * A stable id for what the view does, which an application keys its own words on, such as
     * "camera.fitToGraph". Present on every built-in view; an extension that describes its
     * views supplies its own, prefixed with its namespace.
     * @since 3.55.0
     */
    descriptionId?: string;
    /** The drawing modes this view can be computed in. The element refuses the others. */
    modes: readonly DrawingMode[];
    /** The options the view takes. */
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
    /** The id a logging configuration names the destination by. */
    id: LogSinkId;
    /** The destination's default name for a reader. */
    plainName: string;
    /**
     * What the destination does, in an English sentence.
     * @deprecated Word the destination from {@link LogSinkDescriptor.descriptionId} in the application.
     */
    description: string;
    /**
     * A stable id for what the destination does, which an application keys its own words on, such as
     * "logSink.console". Present on every built-in destination; an extension that describes its
     * destinations supplies its own, prefixed with its namespace.
     * @since 3.55.0
     */
    descriptionId?: string;
    /** The options the destination takes. */
    options: readonly OptionDescriptor[];
}

/** One scale, mapping a domain of values onto a channel's range. */
export interface ScaleDescriptor {
    /** The name a binding's `scale` names it by, such as `"log"`. */
    name: string;
    /** The scale's default name for a reader. */
    plainName: string;
    /** The kind of values it reads: amounts, groups, or yes and no. */
    domainKind: "numeric" | "categorical" | "boolean";
    /** The binding fields that tune it, such as `bins` or `exponent`. */
    options: readonly OptionDescriptor[];
}

/**
 * One named style document, offered as a whole look.
 *
 * Nothing produces one yet: it is returned only by the deprecated `CatalogApi.themes()`, and goes
 * with it at the next major release unless that is implemented first (issue #331).
 */
export interface ThemeDescriptor {
    /** The theme's id. */
    name: string;
    /** The theme's default name for a reader. */
    plainName: string;
    /** The style document the theme applies. */
    document: StyleDocument;
}

/**
 * One function the expression grammar accepts.
 *
 * Nothing produces one yet: it is returned only by the deprecated `CatalogApi.functions()`, and
 * goes with it at the next major release unless that is implemented first (issue #332).
 */
export interface FunctionDescriptor {
    /** The name an expression calls it by. */
    name: string;
    /** The smallest and largest argument count accepted. */
    arity: [number, number];
    /**
     * What the function does, in an English sentence.
     * @deprecated Word the function from {@link FunctionDescriptor.descriptionId} in the application.
     */
    description: string;
    /**
     * A stable id for what the function does, which an application keys its own words on, such as
     * "function.log". An extension supplies its own, prefixed with its namespace.
     * @since 3.55.0
     */
    descriptionId?: string;
    /** The type of value it returns. */
    returns: "number" | "boolean" | "string";
}

// ---------------------------------------------------------------------------------------------
// Attributes, metrics and validation
// ---------------------------------------------------------------------------------------------

/**
 * What a column does for the graph, beyond holding values: the node ids were read from it
 * (`"key"`), nodes are named by it (`"label"`), edge weights were read from it (`"weight"`),
 * edge endpoints (`"source"`, `"target"`), times (`"time"`) or the file's own edge ids
 * (`"edgeId"`), each element's kind -- person, account, device -- is read from it (`"kind"`), or
 * node locations are read from it, one column per kind (`"latitude"`,
 * `"longitude"`, `"coordinates"`, `"country"`, `"region"`, `"city"`), or node positions are read from
 * it (`"x"`, `"y"`, `"z"`).
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
    | "kind"
    | "latitude"
    | "longitude"
    | "coordinates"
    | "country"
    | "region"
    | "city"
    | "x"
    | "y"
    | "z";

/**
 * One thing that reads a column: a style layer whose selector or bindings read it, or a finished
 * run that weighed its edges by it.
 *
 * OPEN UNION: kinds may be added in a minor release; handle unknown kinds.
 */
export type AttributeUse =
    | {
          /** A style layer reads the column. */
          readonly kind: "layer";
          /** The layer. */
          readonly id: LayerId;
      }
    | {
          /** A finished run weighed its edges by the column. */
          readonly kind: "run";
          /** The run. */
          readonly id: RunId;
      };

/** One attribute available on this session, whether it was imported, joined or computed. */
export interface AttributeDescriptor {
    /** The column's key, `data.<name>`, with the name unquoted; see {@link Path}. Quote it with `quotePath` before using it inside an expression. */
    path: Path;
    /** The bracketed form a formula uses, such as "[betweenness_centrality]". */
    token: string;
    /** The column's name, as the data spells it. */
    name: string;
    /** The column's default name for a reader. */
    plainName: string;
    /** The column's name as its source spells it: the data's name, or a run field's technical name. */
    technicalName: string;
    /** Whether the column is on nodes or on edges. */
    kind: "node" | "edge";
    /** The type of its values. */
    type: AttributeType;
    /**
     * What the values measure. Inferred as `"categorical"` for strings and booleans and
     * `"quantitative"` for numbers; `"ordinal"` and `"time"` are never inferred. A column of
     * number codes needs a `data.declare` to be read as groups. Absent for a column with no values.
     */
    measurement?: Measurement;
    /** Who said so. Present exactly when `measurement` is. */
    measurementSource?: MeasurementSource;
    /**
     * Where the column came from: a loaded file (`"imported"`), a join onto loaded data
     * (`"joined"`), a computation in the session (`"computed"`), or a run's result (`"result"`).
     */
    origin: "imported" | "joined" | "computed" | "result";
    /** The fraction of elements that carry a value, from 0 to 1. */
    completeness: number;
    /** How many distinct values it holds. Absent when it was not counted. */
    uniqueCount?: number;
    /** The smallest value, for a number column. */
    min?: number;
    /** The largest value, for a number column. */
    max?: number;
    /** A few of its values, as they are stored. */
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
 * What a value is, for the control that tests it: an amount (`"number"`), an instant (`"time"`),
 * levels with a declared order (`"ordered"`), groups (`"category"`), a list of labels (`"tags"`),
 * yes or no (`"flag"`) or free text (`"text"`). Derived by the element from the value's type, what
 * it measures, a declared order and list values.
 *
 * OPEN UNION: kinds may be added in a minor release; handle unknown kinds.
 * Experimental: may change or be removed in a minor release.
 * @beta
 */
export type ValueKind = "number" | "time" | "ordered" | "category" | "tags" | "flag" | "text";

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
    /**
     * What a value is, for the control that tests it: see {@link ValueKind}.
     * Experimental: may change or be removed in a minor release.
     * @beta
     */
    readonly valueKind?: ValueKind;
    /**
     * A run field's declared facts: its fixed range, which end counts as more, its levels' order,
     * what a missing value means, and whether its values are unstable names. Absent for a data
     * column, and for a field that declares none.
     * Experimental: may change or be removed in a minor release.
     * @beta
     */
    readonly facts?: Pick<FieldDescriptor, "domain" | "polarity" | "order" | "missing" | "unstable">;
    /** The lowest and highest value, for a number. */
    readonly range?: {
        /** The lowest value. */
        readonly min: number;
        /** The highest value. */
        readonly max: number;
    };
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
    /**
     * What a value is: a count, so `"number"`. See {@link ValueKind}.
     * Experimental: may change or be removed in a minor release.
     * @beta
     */
    readonly valueKind?: ValueKind;
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
 * catalog self-describing: a stranger can see everything the element could compute, with a
 * cost and why it is unavailable beside each entry, before computing anything.
 */
export interface MetricAvailability {
    /** The algorithm's key. */
    key: AlgorithmKey;
    /** The algorithm's default name for a reader. */
    plainName: string;
    /** The algorithm's name in the literature or the library. */
    technicalName: string;
    /** Whether it can run on this graph. */
    available: boolean;
    /**
     * Why it is unavailable on this graph, as a code and the values it is about, as
     * `CostEstimate.refusal` reports it. Present only when `available` is false.
     */
    refusal?: CodedFact<EstimateRefusalCode>;
    /** How expensive a run is, roughly, on this graph. */
    costClass: CostClass;
    /** The estimated time of a run on this graph, in seconds. */
    estimateSeconds: number;
    /** Whether it has been run in this session. */
    hasRun: boolean;
    /** The ids of its runs in this session; empty when it has not been run. */
    runIds: readonly RunId[];
}

/**
 * The result of checking an expression. Validation covers references, not only syntax: an
 * expression that parses perfectly and names a run or an attribute that does not exist matches
 * nothing, silently, which reads exactly like a correct answer of zero.
 *
 * `ok` is true only when the expression parses and every path it reads is answered.
 */
export interface QueryValidation {
    /** True when the expression parses and every path it reads is answered. */
    ok: boolean;
    /**
     * Why the expression does not parse, as a code and its parameters, never as words: `code` is
     * `E_BAD_SELECTOR`, `position` the character offset of the mistake, and `params` the error's
     * `details` (`reason`, one of the selector refusal reasons, and the values it names). A
     * `formula` is `E_UNSUPPORTED` at position 0, since the formula grammar is not implemented.
     * Absent when it parses.
     */
    error?: {
        /** The error code, `E_BAD_SELECTOR` or `E_UNSUPPORTED`. */
        code: GraphtyErrorCode;
        /** The character offset of the mistake. */
        position: number;
        /** The error's details. */
        params: Readonly<Record<string, unknown>>;
    };
    /**
     * The paths it reads that nothing in this session answers: `unknown-run` for a `results.`
     * path naming no run here, `unknown-attribute` for any other. `candidates` are the nearest
     * paths that would be answered, nearest first. Empty when it does not parse.
     */
    unresolvedPaths: readonly {
        /** The path nothing answers. */
        path: Path;
        /** Whether it names no run here or no attribute. */
        reason: "unknown-run" | "unknown-attribute";
        /** The nearest paths that would be answered, nearest first. */
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
    | {
          /** A kept set, by id. */
          set: ScopeId;
      }
    | {
          /** The nodes an expression matches. */
          where: Query;
      }
    | {
          /** The nodes listed by id. */
          nodes: readonly NodeId[];
      }
    | {
          /** A set definition, inline. */
          define: SetDefinition;
      };

/**
 * A {@link Scope} as a write position accepts it: an inline definition may name edges by session
 * {@link EdgeId}. Every getter returns the canonical {@link Scope}, with stable members.
 */
export type ScopeInput =
    | Exclude<
          Scope,
          {
              /** Leaves out the stored inline form, which this type replaces. */
              define: unknown;
          }
      >
    | {
          /** A set definition, inline, whose edges may be named by session edge id. */
          define: SetDefinitionInput;
      }
    /**
     * Under the `source-steps` experiment: the nodes whose one type (`graphty.type`) is listed and
     * the edges between them. Read back as its canonical `{ where }` on `graphty.type`.
     * Experimental: may change or be removed in a minor release.
     */
    | {
          /** The types whose nodes are in scope. */
          types: readonly string[];
      };

/**
 * Which way an edge is followed: arriving (`in`), leaving (`out`) or both (`all`). What a degree
 * leaf counts and which way a neighborhood selection walks.
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
    | {
          /** The elements an expression matches. */
          readonly kind: "expression";
          /** The expression. */
          readonly where: Query;
      }
    | {
          /** The elements whose number for an attribute lies between `min` and `max`. */
          readonly kind: "range";
          /** The attribute's value path, such as `data.age`. */
          readonly attribute: Path;
          /** The smallest value kept. Absent, no lower bound. */
          readonly min?: number;
          /** The largest value kept. Absent, no upper bound. */
          readonly max?: number;
          /**
           * How each value is read. Absent, the leaf compares numbers. `"time"` compares instants:
           * `min` and `max` are epoch milliseconds, and each value is read the way the session's
           * time field reads it (`session.time.parse`: a date with no zone is UTC; a designated
           * column's own unit), so `{ max: Date.UTC(2005, 0, 1) - 1, as: "time" }` keeps what
           * happened before 2005.
           * @since 3.36.0
           */
          readonly as?: "time";
          /** Which nodes the leaf keeps when its attribute lives on edges: see {@link AttributeLeafNodes}. */
          readonly nodes?: AttributeLeafNodes;
          /**
           * Whether an element with no value (absent, NaN or infinite) passes. Default `"exclude"`.
           * Experimental: may change or be removed in a minor release.
           * @beta
           */
          readonly missing?: MissingValues;
      }
    | {
          /** The elements whose value for an attribute is one of `values`. */
          readonly kind: "categories";
          /** The attribute's value path, such as `data.team`. */
          readonly attribute: Path;
          /** The values kept, as the data spells them. */
          readonly values: readonly string[];
          /** Which nodes the leaf keeps when its attribute lives on edges: see {@link AttributeLeafNodes}. */
          readonly nodes?: AttributeLeafNodes;
          /**
           * Whether an element with no value passes. Default `"exclude"`.
           * Experimental: may change or be removed in a minor release.
           * @beta
           */
          readonly missing?: MissingValues;
          /**
           * How a list value is read: `"any"` passes when it holds any of `values`, `"all"` when it
           * holds every one. Absent, a value is read as one category, as before.
           * Experimental: may change or be removed in a minor release.
           * @beta
           */
          readonly match?: "any" | "all";
      }
    | {
          /** The nodes whose number of edges lies between `min` and `max`. */
          readonly kind: "degree";
          /** The fewest edges kept. Absent, no lower bound. */
          readonly min?: number;
          /** The most edges kept. Absent, no upper bound. */
          readonly max?: number;
          /** Which edges are counted. Default `all`. */
          readonly direction?: SelectionDirection;
      }
    | {
          /** The nodes of one connected component. */
          readonly kind: "component";
          /** The component's index, from 0 up to the number of components less one. */
          readonly id: number;
      }
    | {
          /** The nodes at most `depth` hops from the seed nodes. */
          readonly kind: "neighborhood";
          /** The nodes it starts from. */
          readonly seeds: readonly NodeId[];
          /** The most hops from a seed. */
          readonly depth: number;
      }
    /**
     * The nodes with no edge to another node: each is a component of its own, so these are exactly
     * the nodes `data.statistics().components.isolatedCount` counts. A node whose only edges are
     * self-loops is one. Speaks nodes.
     */
    | {
          /** The nodes with no edge to another node. */
          readonly kind: "isolated";
      }
    /** The edges whose two ends are the same node: `statistics().selfLoopCount` of them. Speaks edges. */
    | {
          /** The edges whose two ends are the same node. */
          readonly kind: "self-loop";
      }
    /**
     * The edges beyond the first between one pair of nodes, in the graph's edge order: exactly the
     * edges `statistics().repeatedEdgeCount` counts. On an undirected graph `a`-`b` and `b`-`a` are
     * one pair; on a directed graph they are two. Speaks edges.
     */
    | {
          /** The edges beyond the first between one pair of nodes. */
          readonly kind: "repeated-edge";
      }
    | {
          /** The edges an expression matches. */
          readonly kind: "edges";
          /** The expression, over edges. */
          readonly where: Query;
      }
    | StateLeaf
    /**
     * The members of a scope, usually a kept set: `{ kind: "member", of: { set: id } }`. A removed
     * set is read from its kept record, so removing a set never changes what a rule holds.
     */
    | {
          /** The members of a scope. */
          readonly kind: "member";
          /** The scope, usually `{ set: id }`. */
          readonly of: Scope;
      }
    /**
     * The elements one item of a result holds: community 3, the path's nodes and edges. Speaks
     * the half or halves the result publishes the key's field on (`onPath` speaks both).
     */
    | {
          /** The elements one item of a result holds. */
          readonly kind: "item";
          /** The item. */
          readonly item: ResultItem;
      }
    /**
     * The elements whose value for a path passes one cut. The population is the elements that
     * carry a finite number for the path; each half that has one speaks, ranked on its own.
     * Reserved, refused until built: `percentile`, `z` and `population`.
     */
    | {
          /** The elements whose value for a path passes one cut. */
          readonly kind: "threshold";
          /** A value path: `results.<run>.<field>` or `data.<field>`. */
          readonly path: Path;
          /** The top `n`, whole tie groups only (the `TopRanking` tie policy). Exactly one cut. */
          readonly top?: number;
          /** What `top` does with the tie group its cut falls in: see {@link TopTies}. @since 3.26.0 */
          readonly ties?: TopTies;
          /** Strictly above this value. Exactly one cut. */
          readonly above?: number;
          /**
           * The share of the population, from 0 to 100, kept from the `from` end; whole tie groups
           * only, as `top` keeps them. Exactly one cut.
           * Experimental: may change or be removed in a minor release.
           * @beta
           */
          readonly percentile?: number;
          /**
           * Which end `top` and `percentile` count from: the highest values (`"high"`, the default)
           * or the lowest. `above` reads it as "below" when `"low"`.
           * Experimental: may change or be removed in a minor release.
           * @beta
           */
          readonly from?: "high" | "low";
          /**
           * Whether an element with no value passes. Default `"exclude"`.
           * Experimental: may change or be removed in a minor release.
           * @beta
           */
          readonly missing?: MissingValues;
          /**
           * Which elements are ranked: `"graph"` (the default) ranks the whole column, so a node's
           * place does not move as a filter changes; `"visible"` ranks only what the filter and the
           * time window leave shown. Inside a step, the step's own population is ranked. A filter
           * cannot rank within what it shows itself.
           * @since 3.40.0
           */
          readonly within?: "graph" | "visible";
      }
    /**
     * The elements whose text for one value passes a text test: "name contains bob", "id matches
     * `[13579]$`". The same matcher a selection's text search runs. A number or a yes-or-no value
     * is read as its text; an element without a value fails. Reading `"id"` speaks nodes; a value
     * path speaks each half whose elements carry it, as a `range` leaf does.
     */
    | {
          /** The elements whose text for one value passes a text test. */
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
          /** The nodes and edges some loads supplied. */
          readonly kind: "source";
          /** The loads, as `session.data.sources()` keys them. */
          readonly sources: readonly SourceKey[];
          /**
           * Which half the rule speaks: both when absent; `"nodes"` keeps the nodes the loads
           * supplied and leaves every edge between them, whichever load supplied it; `"edges"`
           * keeps only the edges they supplied. @since 3.30.0
           */
          readonly side?: RuleSide;
      }
    | UnionLeaf
    | HopsLeaf
    | TouchingLeaf
    | NonemptyLeaf
    | SameValueLeaf
    | BySizeLeaf
    | MeasureLeaf
    | {
          /** The elements every rule holds. */
          readonly kind: "all";
          /** The rules. */
          readonly of: readonly RuleTree[];
      }
    | {
          /** The elements any rule holds. */
          readonly kind: "any";
          /** The rules. */
          readonly of: readonly RuleTree[];
      }
    | {
          /** The elements a rule does not hold. */
          readonly kind: "not";
          /** The rule. */
          readonly of: RuleTree;
      };

/**
 * What a reader is doing to an element now: selected, under the pointer, drawn while a held filter
 * condition would remove it (`"ghosted"`), outside the time window (`"outsideWindow"`), or pinned
 * in place.
 * @since 3.36.0
 */
export type ElementState = "selected" | "hovered" | "ghosted" | "outsideWindow" | "pinned";

/**
 * The elements in a state now, as a calculated value: what `{ match: "state", state }` paints,
 * written as a condition, so it sits beside others in an `all`, a `not` or a union step (Add, Keep,
 * Except). Speaks nodes and edges, each half on its own: a selected edge stays held whether or not
 * its ends are selected. `"hovered"` and `"pinned"` hold no edge. Live: a layer reading it repaints
 * as the state moves, with no undo step, so a kept set or a visibility filter, which do not follow
 * the reader, refuse it.
 * @since 3.36.0
 */
export interface StateLeaf {
    /** The elements in a reader's state. */
    readonly kind: "state";
    /** Which state. */
    readonly state: ElementState;
}

/**
 * Whether an element with no value for a leaf's path (absent, NaN or infinite) passes the leaf.
 * Experimental: may change or be removed in a minor release.
 * @beta
 */
export type MissingValues = "include" | "exclude";

/**
 * What a step's leaf is relative to: a {@link Scope}, or one of two forms that exist only inside a
 * {@link UnionStep}: `"hovered-or-selected"` (the hovered node, else a lone selected node: what a
 * `{ match: "hover", orSelected: true }` selector follows) and `"so-far"` (the step's input: its
 * branch before this step). A reference that holds no node matches nothing; it is never read as
 * an unset option.
 *
 * OPEN UNION: forms may be added in a minor release; handle unknown forms.
 * Experimental: may change or be removed in a minor release.
 * @beta
 */
export type StepReference = Scope | "hovered-or-selected" | "so-far";

/**
 * A selection built from branches, each folded from a start by ordered steps, the way a vector
 * editor combines shapes: the result is everything in ANY branch that is on.
 *
 * A branch starts with all of `side` within the base, or with none, then each step that is on
 * adds what its leaf matches (`add`), keeps only what it matches (`keep`), or removes it
 * (`except`). Every population a leaf ranks or counts over (a threshold's top, a percentile, a
 * category's size) is the base, or the step's input when it is computed on `"so-far"`. A node
 * branch reads an edge leaf as the nodes touching a passing edge; an edge branch reads a node leaf
 * by its step's `ends`. A leaf silent on `side` changes nothing.
 *
 * Speaks `side` only. `session.scope.watchSteps` reads every branch's and step's count and state.
 * Experimental: may change or be removed in a minor release.
 * @beta
 */
export interface UnionLeaf {
    /** A selection built from branches. */
    readonly kind: "union";
    /** Which half the branches select. */
    readonly side: "nodes" | "edges";
    /**
     * The base: `"visible"` (what the visibility filter leaves drawn) or `"graph"` (everything
     * loaded). A visibility filter condition must read `"graph"`.
     */
    readonly within: "graph" | "visible";
    /**
     * Narrows the base to the nodes and edges these loads supplied (`session.data.sources()`
     * keys, what `session.data.sourcesOf(id)` lists): a branch that starts with `"all"` starts
     * with theirs, a step adds only theirs, and a reading's totals count only theirs. Absent:
     * every load's. A load that is gone supplies nothing. Under the source-steps experiment, one
     * staged source's rows are read as they will be once it is added, none of them shown yet.
     * @since 3.36.0
     */
    readonly sources?: readonly SourceKey[];
    /** The branches, in order. */
    readonly branches: readonly UnionBranch[];
}

/**
 * One branch of a {@link UnionLeaf}.
 * Experimental: may change or be removed in a minor release.
 * @beta
 */
export interface UnionBranch {
    /** Its id, unique in the leaf; filled by the element on write, always present on read. */
    readonly id?: string;
    /** Its name, the consumer's. */
    readonly name?: string;
    /**
     * Whether `name` was given automatically by the consumer (a letter, say) rather than typed by a
     * reader, so the consumer may clear or replace it. The element only stores it. Default false.
     */
    readonly autoName?: boolean;
    /** Its color, filled from the branch palette on write (`session.scope.options.branchPalette`). */
    readonly color?: string;
    /** Whether it counts. Default true. */
    readonly on?: boolean;
    /** What it starts with before its first step: all of the side within the base, or none. */
    readonly start: "all" | "none";
    /** The steps, folded in order. */
    readonly steps: readonly UnionStep[];
}

/**
 * One step of a {@link UnionBranch}: a verb and one leaf.
 * Experimental: may change or be removed in a minor release.
 * @beta
 */
export interface UnionStep {
    /** Its id, unique in the leaf; filled by the element on write. */
    readonly id?: string;
    /** `add`: the branch so far plus the matches; `keep`: only the matches; `except`: minus them. */
    readonly op: "add" | "keep" | "except";
    /** Whether it applies. Default true. */
    readonly on?: boolean;
    /** What it matches. A `union` is refused here. */
    readonly rule: RuleTree;
    /** What its populations are: the base (default) or the branch before this step. */
    readonly computedOn?: "base" | "so-far";
    /**
     * An edge-side rule: the step's computation (a `measure`, a degree path, `hops`, `touching`)
     * reads only the edges that pass it, within the step's input -- "ignore links with weight
     * under 2" for one step, where the visibility filter would hide those links for every reader.
     * Like So far, such a computation belongs to the step: cached by definition, never a
     * `session.runs` entry. A rule holding a `union` or a node-only leaf is refused
     * (`E_BAD_COMMAND`, reason `links-not-edges`). Absent: every edge of the input.
     */
    readonly links?: RuleTree;
    /** On an edge branch, how a node leaf is read: both ends pass (default), or either. */
    readonly ends?: "both" | "either";
    /** Written by the element when it froze a live reference on a write that cannot follow one. */
    readonly frozenFrom?: "selection" | "hovered-or-selected";
    /**
     * The consumer's own name for how the step's test is edited -- a mode picked before any bound
     * is set, say. The element keeps it with the step (copies, saves, undo) and never reads it.
     */
    readonly mode?: string;
}

/**
 * The nodes at most `max` hops from a reference, the reference included; without `max`, every
 * node it reaches. `direction` follows arcs out of, into, or either way (default) on a directed
 * graph. Speaks nodes. A step leaf: valid only inside a {@link UnionStep}.
 * Experimental: may change or be removed in a minor release.
 * @beta
 */
export interface HopsLeaf {
    /** The nodes within some hops of a reference. */
    readonly kind: "hops";
    /** The reference. Absent, the step is inert (`no-reference`). */
    readonly of?: StepReference;
    /** The most hops from the reference. Absent, every node it reaches. */
    readonly max?: number;
    /** Which way edges are followed on a directed graph. Default `all`. */
    readonly direction?: SelectionDirection;
}

/**
 * The edges with `"either"`, `"both"` or exactly `"one"` end in a reference. Speaks edges. A step
 * leaf: valid only inside a {@link UnionStep}.
 * Experimental: may change or be removed in a minor release.
 * @beta
 */
export interface TouchingLeaf {
    /** The edges touching a reference. */
    readonly kind: "touching";
    /** The reference. Absent, the step is inert (`no-reference`). */
    readonly of?: StepReference;
    /** How many of an edge's ends must be in the reference: either, both, or exactly one. */
    readonly ends: "either" | "both" | "one";
}

/**
 * Everything while a reference holds a node, else nothing. Speaks nodes and edges. A step leaf:
 * valid only inside a {@link UnionStep}.
 * Experimental: may change or be removed in a minor release.
 * @beta
 */
export interface NonemptyLeaf {
    /** Everything while a reference holds a node. */
    readonly kind: "nonempty";
    /** The reference. Absent, the step is inert (`no-reference`). */
    readonly of?: StepReference;
}

/**
 * The elements whose value for `path` equals (or, for a list, shares) a value a reference node
 * holds: "the community of Valjean". Speaks the halves that carry the path. A step leaf: valid
 * only inside a {@link UnionStep}.
 * Experimental: may change or be removed in a minor release.
 * @beta
 */
export interface SameValueLeaf {
    /** The elements sharing a value with a reference node. */
    readonly kind: "same-value";
    /** A value path: `data.<field>`, `results.<run>.<field>` or `graphty.degree`. */
    readonly path: Path;
    /** The reference. Absent, the step is inert (`no-reference`). */
    readonly as?: StepReference;
}

/**
 * The elements whose category for `path` has a member count in `min..max`, or is among the `top`
 * categories by size (whole tie groups, as a threshold's `top`), counted over the population.
 * Experimental: may change or be removed in a minor release.
 * @beta
 */
export interface BySizeLeaf {
    /** The elements whose category's size passes a test. */
    readonly kind: "by-size";
    /** The value path whose categories are counted. */
    readonly path: Path;
    /** The fewest members a category keeps. */
    readonly min?: number;
    /** The most members a category keeps. */
    readonly max?: number;
    /** How many categories by size, whole tie groups only. */
    readonly top?: number;
    /** Which end `top` counts from: the largest categories (default) or the smallest. */
    readonly from?: "high" | "low";
    /** What `top` does with the tie group its cut falls in. */
    readonly ties?: TopTies;
}

/**
 * The test a {@link MeasureLeaf} puts to its field: the body of a `range`, `threshold`,
 * `categories`, `text`, `by-size` or `same-value` leaf without its path.
 *
 * OPEN UNION: kinds may be added in a minor release; handle unknown kinds.
 * Experimental: may change or be removed in a minor release.
 * @beta
 */
export type MeasureTest =
    | Omit<
          Extract<
              RuleTree,
              {
                  /** Picks the rule tree leaf of this kind. */
                  kind: "range";
              }
          >,
          "attribute" | "nodes"
      >
    | Omit<
          Extract<
              RuleTree,
              {
                  /** Picks the rule tree leaf of this kind. */
                  kind: "threshold";
              }
          >,
          "path"
      >
    | Omit<
          Extract<
              RuleTree,
              {
                  /** Picks the rule tree leaf of this kind. */
                  kind: "categories";
              }
          >,
          "attribute" | "nodes"
      >
    | Omit<
          Extract<
              RuleTree,
              {
                  /** Picks the rule tree leaf of this kind. */
                  kind: "text";
              }
          >,
          "reads" | "nodes"
      >
    | Omit<BySizeLeaf, "path">
    | Omit<SameValueLeaf, "path">;

/**
 * The elements whose value of an algorithm's field passes `test`. The element reads the session
 * run with the same algorithm, params and base, or starts one (without suggested styles), so the
 * leaf saves the algorithm, not a run id. `bind` maps the algorithm's node options to references,
 * resolved to node ids before it is called. A step leaf: valid only inside a {@link UnionStep}.
 * Experimental: may change or be removed in a minor release.
 * @beta
 */
export interface MeasureLeaf {
    /** The elements whose value of an algorithm's field passes a test. */
    readonly kind: "measure";
    /** The algorithm's key, as `session.catalog.algorithms` lists it. */
    readonly algorithm: string;
    /** The options the algorithm runs with. */
    readonly params?: Readonly<Record<string, unknown>>;
    /** Node options of the algorithm, each bound to a reference resolved to node ids before the run. */
    readonly bind?: Readonly<Record<string, StepReference>>;
    /** The result field to test. */
    readonly field: string;
    /** The test. Absent, every element the field measures passes, as a range with neither bound does. */
    readonly test?: MeasureTest;
    /**
     * The scope of the session run the step reads, as that run's `scope.spec` gives it: a step
     * picked from a run's results stays bound to that run, whatever the step's base. The step reads
     * the newest listed run with this algorithm, params and scope, as the run left it (a later
     * change to what the scope holds does not re-run it), and starts one over the scope only when
     * none is listed. Absent, the step's base. Ignored for a step computed on So far, with `links`
     * or bound to a live reference: those compute their own.
     * Experimental: may change or be removed in a minor release.
     * @beta
     */
    readonly scope?: Scope;
}

/**
 * Which half of the graph a `source` rule leaf speaks: its nodes or its edges.
 * @since 3.30.0
 */
export type RuleSide = "nodes" | "edges";

/** A load's stable key, as `session.data.sources()` lists it and a `source` rule names it. */
export type SourceKey = string; // eslint-disable-line sonarjs/redundant-type-aliases -- a named public type in the API report; removing it breaks consumers

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
 * matches), and the select conditions that are on select what all of them match among what is
 * visible, or over the whole graph (see {@link FilterCondition.within}).
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
    /**
     * Where a select condition looks for its matches; read only when `effect` is `"select"`.
     * `"picture"` (the default, when absent): only the matches that are visible. `"graph"`: every
     * match in the graph, visible or not, used only when every select condition that is on reads
     * `"graph"`. The selection is recomputed whenever a keep or exclude condition is added,
     * removed, switched or edited while a select condition is on, and on undo and redo of such a
     * change. The order of the conditions never matters.
     * @since 3.33.0
     */
    readonly within?: FilterSelectWithin;
    /**
     * The condition's name, as the reader typed it; absent, an application names it from its rule.
     * The element never reads it: it is kept, saved and restored with the condition, and a change
     * to it alone is one undo step (`updateCondition(id, { name })`).
     * @since 3.36.0
     */
    readonly name?: string;
    /**
     * The load the condition belongs to (`session.data.sources()` key): it judges only the nodes
     * and edges that load supplied (`session.data.sourcesOf(id)`) and leaves every other load's
     * elements as they are. A keep condition hides only that load's elements its rule does not
     * match, an exclude condition hides only that load's matches, and a select condition selects
     * only among that load's elements; `conditionCounts()` counts it over that load's elements.
     * An element two loads supplied belongs to both. Absent: the condition judges every element.
     * A load that is gone supplies nothing, so its conditions then do nothing. The `steps` view
     * shows such a condition's rule without its load. To have a selection's totals read the same
     * load, narrow its `union` leaf with {@link UnionLeaf.sources}.
     * @since 3.36.0
     */
    readonly source?: SourceKey;
}

/**
 * Where a select condition looks for its matches: the whole graph, or only what the keep and
 * exclude conditions leave drawn. See {@link FilterCondition.within}.
 *
 * OPEN UNION: a later release may add a value; handle unknown values.
 * @since 3.33.0
 */
export type FilterSelectWithin = "graph" | "picture";

/**
 * A filter condition as it is handed in: the id is made when absent, and `on` defaults to true.
 * Experimental: may change or be removed in a minor release.
 * @since 3.32.0
 * @beta
 */
export type FilterConditionInput = Omit<FilterCondition, "id" | "on"> & {
    /** The condition's id. Made by the element when absent. */
    readonly id?: string;
    /** Whether the condition applies. Default true. */
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
          /** A member list. */
          readonly kind: "fixed";
          /** Canonical order, no duplicates. */
          readonly nodes: readonly NodeId[];
          /** Canonical order, no duplicates. Only edges listed explicitly; an induced set derives its edges. */
          readonly edges?: readonly EdgeMember[];
          /** Which edges come with its nodes. */
          readonly reading: "induced" | "listed";
      }
    | {
          /** A rule, re-evaluated as the data changes. */
          readonly kind: "rule";
          /** A JMESPath predicate over nodes, or a rule tree ({@link RuleTree}). */
          readonly where: Query | RuleTree;
          /** Which edges come with its nodes. */
          readonly reading: EdgeReading;
      }
    | {
          /** A walk, in order. */
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
          /** A member list. */
          readonly kind: "fixed";
          /** The nodes it holds. */
          readonly nodes: readonly NodeId[];
          /** The edges it lists explicitly, by session id or stable member. */
          readonly edges?: readonly EdgeRef[];
          /** Which edges come with its nodes; `clipped` is stored as `listed`. */
          readonly reading: EdgeReading;
      }
    | Extract<
          SetDefinition,
          {
              /** Picks the rule form out of the set definition forms. */
              kind: "rule";
          }
      >
    | {
          /** A walk, in order. */
          readonly kind: "path";
          /** The walk, in order. */
          readonly nodes: readonly NodeId[];
          /**
           * When present, exactly `nodes.length - 1` entries: entry i names the edge or edges joining
           * `nodes[i]` and `nodes[i + 1]`, or `null` for every edge between that pair.
           */
          readonly edges?: readonly (EdgeRef | readonly EdgeRef[] | null)[];
          /** Steps must follow declared edge direction. Default false. */
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
export type SetOperand =
    | Scope
    | {
          /** An inline member list, recorded by its sizes. */
          readonly inline: {
              /** How many nodes it listed. */
              readonly nodes: number;
              /** How many edges it listed. */
              readonly edges: number;
          };
      };

/**
 * How a set came to exist. Written once, when the set is created.
 *
 * OPEN UNION: kinds may be added in a minor release; handle unknown kinds.
 */
export type SetCreatedFrom =
    | {
          /** Made by a reader or the application from a member list or a definition. */
          readonly kind: "user";
      }
    | {
          /** Made from the selection. */
          readonly kind: "selection";
      }
    | {
          /** Made from a scope. */
          readonly kind: "scope";
          /** The scope. */
          readonly from: SetOperand;
      }
    /** `item.run` is always present: the set holds the run it was created from. */
    | {
          /** Made from one item of a result. */
          readonly kind: "result";
          /** The item. */
          readonly item: ResultItem;
      }
    | {
          /** Made by combining sets. */
          readonly kind: "combine";
          /** How they were combined. */
          readonly op: SetCombine;
          /** The sets combined, in order. */
          readonly of: readonly SetOperand[];
      };

/**
 * What kind of walk a path set is, most specific first: `cycle` (a closed trail), `simple` (no
 * node repeats), `trail` (no edge repeats), `walk` (anything else).
 *
 * OPEN UNION: kinds may be added in a minor release; handle unknown kinds.
 */
export type PathKind = "simple" | "trail" | "walk" | "cycle";

/**
 * The catalog: everything the element can offer, as data.
 *
 * `session.catalog` implements every method here except the ones named in
 * {@link DeprecatedCatalogMethod}, which nothing implements yet.
 */
export interface CatalogApi {
    /**
     * Every algorithm the element can run, built-in and registered.
     * @returns The algorithms.
     */
    algorithms(): readonly AlgorithmDescriptor[];
    /**
     * Every layout the element can place a graph with, built-in and registered.
     * @returns The layouts.
     */
    layouts(): readonly LayoutDescriptor[];
    /**
     * Every file format the element can read, write, or both.
     * @returns The formats.
     */
    formats(): readonly FormatDescriptor[];
    /**
     * The style channels this session offers for nodes or for edges, in table order. With the
     * `file-styles` experiment on it is the same array `channelsFor(target)` returns; with it off it
     * leaves out the channels the experiment added and the values it added to the rest (node shapes,
     * arrowheads, line patterns, a size mode). A style editor builds its pickers from it. A layer that
     * writes a value it leaves out is still accepted and drawn.
     * @param target - Nodes or edges.
     * @returns The channels, the same array on every call with the same target.
     * @since 3.36.0
     */
    channels(target: "node" | "edge"): readonly ChannelDescriptor[];
    /**
     * Every value of one enum channel this session offers, in the order of the channel's
     * `values`, each with a default name and, for a node shape, an arrowhead or a line pattern
     * (a border's included), a picture. With the `file-styles` experiment off it leaves out the
     * values the experiment added, as {@link CatalogApi.channels} does.
     *
     * ```ts
     * session.catalog.channelValues("node.shape"); // [{ id: "box", plainName: "Box", glyph: "<svg ..." }, ...]
     * ```
     * @param channel - The channel.
     * @returns The values; empty for a channel that is not an enum or that the session does not offer.
     * @since 3.40.0
     */
    channelValues(channel: Channel): readonly ChannelValueDescriptor[];
    /**
     * Every color palette a binding can name, built-in and registered.
     * @returns The palettes.
     */
    palettes(): readonly PaletteDescriptor[];
    /**
     * Every camera view the element can compute.
     * @returns The views.
     */
    cameras(): readonly CameraDescriptor[];
    /**
     * Every destination log records can be delivered to.
     * @returns The destinations.
     */
    logSinks(): readonly LogSinkDescriptor[];
    /**
     * Every scale a binding can read its values through.
     * @returns The scales.
     */
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
     * The attributes that hold points in time, for a time slider: first those `data.attributes()`
     * gives the `time` role (declared by the file or the load), then the columns whose values read
     * as time, best first, as `session.time.candidates()` finds them -- dates in text, epochs, and
     * whole numbers from 1000 to 2999 in a column whose name speaks of time.
     * @returns The time attributes, nodes and edges both; empty when the graph has none.
     * @since 3.40.0
     */
    timeAttributes(): readonly AttributeDescriptor[];
    /**
     * Every algorithm, with whether it can run on this graph, what a run would cost, and the runs
     * already made. Algorithms never run are listed too.
     * @returns One entry per algorithm.
     */
    metrics(): readonly MetricAvailability[];
    /**
     * The metrics that can run on this graph. A runtime query, not a static list.
     * @deprecated Not implemented; `metrics()` carries `available` and `reason` for the same
     * question. Removed at the next major release unless it is implemented first (issue #334).
     */
    applicable(): readonly MetricAvailability[];
    /**
     * Check an expression against this session without running it, as a form field would on
     * every keystroke: whether it parses, where it does not, and which paths it reads that
     * nothing here answers. Selectors and filters share one expression grammar; a `formula` is
     * refused with `E_UNSUPPORTED`, since the formula grammar is not implemented.
     * @param query - The expression.
     * @param o - Options.
     * @param o.kind - Which kind of expression it is; a selector when absent.
     * @returns The check. Never throws for a bad expression.
     * @since 3.40.0
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
     * leaving out the key and label columns and any column with a value per node. The choices
     * come best grouping first: finished runs' fields, the newest run first, then attributes, the
     * fewest distinct values first (a column holding one value, or an unknown count, last), so a
     * form can open on the first. Every other field is the static descriptor's.
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
export type DeprecatedCatalogMethod = "themes" | "functions" | "applicable";

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
