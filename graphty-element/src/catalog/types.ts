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

import type { DrawingMode } from "../camera/types";
import type { EdgeStyleConfig } from "../config/EdgeStyle";
import type { GraphtyErrorCode } from "../errors/codes";
import type { LabelStyle } from "./label-style";

/**
 * Every error code the element reports. Codes are the contract; messages are not.
 *
 * Declared once, in the error module, so a code cannot mean one thing to a descriptor
 * and another to the error that carries it.
 */
export type { GraphtyErrorCode };

/**
 * Which way the element is drawing: flat, or in three dimensions.
 *
 * Declared in the camera module, where a view reads it, and re-exported here so
 * {@link CameraDescriptor.modes} is nameable from `./catalog` without a consumer reaching into
 * a second module for one word.
 */
export type { DrawingMode };


// ---------------------------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------------------------

/** The identity of a node, as it was loaded. */
export type NodeId = string | number;

/** The identity of an edge. */
export type EdgeId = string;

/** The identity of a run. Stable, selector-safe and author-assignable. */
export type RunId = string;

/** The identity of a style layer. Element-minted and stable; never an array index. */
export type LayerId = string;

/** The identity of a saved scope. */
export type ScopeId = string;

/** A JMESPath expression over the published result root. */
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
 * Two of these names are deprecated: `all-paths` and `clustering-coefficient` are reserved but
 * not implemented, and starting either fails with `E_UNSUPPORTED`. See
 * {@link DEPRECATED_ALGORITHMS}.
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
] as const;

/**
 * One of the built-in algorithms. `all-paths` and `clustering-coefficient` are deprecated and do
 * not run; see {@link DEPRECATED_ALGORITHMS}.
 */
export type KnownAlgorithm = (typeof KNOWN_ALGORITHMS)[number];

/**
 * The built-in algorithm names the element reserves but does not run.
 *
 * Nothing implements these two yet. The names stay in {@link KNOWN_ALGORITHMS}, so no plugin can
 * claim them and no code that names them stops compiling, but starting one fails with
 * `E_UNSUPPORTED` rather than `E_UNKNOWN_ALGORITHM`. Each is removed at the next major release
 * unless it is implemented first: `all-paths` is tracked by issue #329 and
 * `clustering-coefficient` by issue #330.
 */
export const DEPRECATED_ALGORITHMS = ["all-paths", "clustering-coefficient"] as const satisfies readonly KnownAlgorithm[];

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
] as const;

/** A layout id: a built-in name, or a plugin's. */
export type LayoutId = (typeof KNOWN_LAYOUT_IDS)[number] | (string & {});

/** The built-in file formats. */
export const KNOWN_FORMAT_IDS = ["json", "csv", "graphml", "gexf", "gml", "dot", "pajek", "sif", "cx2"] as const;

/** A format id: a built-in name, or a plugin's. */
export type FormatId = (typeof KNOWN_FORMAT_IDS)[number] | (string & {});

/**
 * The built-in palettes: seven sequential ramps, five categorical sets, three diverging ramps and
 * three highlight pairs, in the order `PALETTE_DESCRIPTORS` lists them.
 *
 * All eighteen are here because this list is what autocomplete offers. Four of them used to be,
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


/** One field a result publishes, per element or for the graph as a whole. */
export interface FieldDescriptor {
    name: string;
    plainName: string;
    technicalName: string;
    kind: "node" | "edge" | "graph";
    type: "number" | "integer" | "boolean" | "string" | "table";
    unit?: string;
    normalization?: string;
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
    "unknown",
] as const;

/** The kind of control an option asks for. */
export type OptionType = (typeof OPTION_TYPES)[number];

/** One choice offered by an option whose type is "enum". */
export interface OptionChoice {
    value: string;
    label: string;
}

/** One configurable option, as plain JSON a form can render with no knowledge of Zod. */
export interface OptionDescriptor {
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

/** Every property a layer can paint. */
export type Channel =
    | "node.color"
    | "node.size"
    | "node.shape"
    | "node.label"
    | "node.labelStyle"
    | "node.tooltip"
    | "node.tooltipStyle"
    | "node.opacity"
    | "node.outline"
    | "node.glow"
    | "node.glowStrength"
    | "node.wireframe"
    | "node.flat"
    | "node.marker"
    | "edge.color"
    | "edge.width"
    | "edge.opacity"
    | "edge.style"
    | "edge.patternCount"
    | "edge.curvature"
    | "edge.arrowHead"
    | "edge.arrowHeadSize"
    | "edge.arrowHeadColor"
    | "edge.arrowHeadOpacity"
    | "edge.arrowHeadText"
    | "edge.arrowHeadTextStyle"
    | "edge.arrowTail"
    | "edge.arrowTailSize"
    | "edge.arrowTailColor"
    | "edge.arrowTailOpacity"
    | "edge.arrowTailText"
    | "edge.arrowTailTextStyle"
    | "edge.animationSpeed"
    | "edge.label"
    | "edge.labelStyle";

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

/** A literal value written to a channel. */
export type ChannelValue = string | number | boolean | LabelStyle | Rgba;

/** Literal values, one per channel. */
export type StaticStyle = Partial<Record<Channel, ChannelValue>>;

/**
 * What a categorical colour encoding does when the column holds more groups than the palette has
 * colours. N is the palette's capacity: 8 for the default, Okabe-Ito.
 *
 * - `"other"`: the N largest groups keep the palette's colours in palette order, largest group
 *   first, and every remaining group is painted one dark grey (#505050). The legend names the
 *   grey "other: K groups".
 * - `"shape"`: node encodings only. Group i is painted colour i mod N and drawn in shape
 *   floor(i / N) from a fixed list (icosphere, box, octahedron, cylinder, cone, torus), so the
 *   first N groups keep the element's default shape. Groups past N x 6 fold into the grey. On an
 *   edge encoding it is refused, because an edge has no shape to cycle.
 * - `"extend"`: every group gets a colour of its own. With no palette named, the smallest
 *   categorical palette that fits, else the sequential default sampled once per group; with a
 *   palette named, its colours and then samples of the sequential default. Distinctness is NOT
 *   guaranteed past the palette's capacity.
 *
 * Ignored by a scale that reads numbers, which has no groups to overflow.
 */
export type BindingOverflow = "other" | "shape" | "extend";

/** One channel's binding: a literal, or a declarative mapping from a value in the data. */
export type Binding =
    | { value: ChannelValue }
    | {
          by: Path;
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
          domain?: [number, number] | "auto";
          clamp?: [number, number];
          range?: [number, number];
          map?: Record<string, string | number>;
          other?: { threshold: number; value: string | number };
          /**
           * What a categorical colour binding does with more groups than its palette can keep
           * apart. See {@link BindingOverflow}. Absent, a palette the binding names is refused with
           * `E_CAP_EXCEEDED` and one it leaves to the element is chosen large enough.
           */
          overflow?: BindingOverflow;
          missing?: "skip" | { value: string | number };
          reverse?: boolean;
          midpoint?: number;
          bins?: number;
          exponent?: number;
      };

/** Declarative attribute-to-channel bindings. */
export type Encoding = Partial<Record<Channel, Binding>>;

/** What a layer matches. Spelled out rather than implied, so it is greppable and lintable. */
export type Selector =
    | { match: "expression"; where: Query }
    | { match: "has"; path: Path }
    | { match: "ids"; nodes?: readonly NodeId[]; edges?: readonly EdgeId[] }
    | { match: "everything" };

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
}

/** A portable stack of layers, with any palettes it depends on travelling beside it. */
export interface StyleDocument {
    version: 1;
    layers: readonly LayerSpec[];
    palettes?: readonly PaletteDescriptor[];
}

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
}

/**
 * A layout descriptor as a third party's engine class authors it.
 *
 * `honoursWeights` is missing from it because the engine class already declares that fact as a
 * static, and a fact written in two places is a fact that can disagree with itself.
 * `LayoutEngine.register` reads the static and publishes the complete descriptor.
 */
export type AuthoredLayoutDescriptor = Omit<LayoutDescriptor, "honoursWeights">;

/** One file format the element can read, write, or both. */
export interface FormatDescriptor {
    id: FormatId;
    plainName: string;
    extensions: readonly string[];
    mimeTypes: readonly string[];
    canImport: boolean;
    canExport: boolean;
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

/** One attribute available on this session, whether it was imported, joined or computed. */
export interface AttributeDescriptor {
    path: Path;
    /** The bracketed form a formula uses, such as "[betweenness_centrality]". */
    token: string;
    name: string;
    plainName: string;
    technicalName: string;
    kind: "node" | "edge";
    type: AttributeType;
    origin: "imported" | "joined" | "computed" | "result";
    /** The fraction of elements that carry a value, from 0 to 1. */
    completeness: number;
    uniqueCount?: number;
    min?: number;
    max?: number;
    sampleValues: readonly unknown[];
    /** Set when the attribute came from a run. */
    runId?: RunId;
}

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

/** What a run, a layout or an export is allowed to look at. */
export type Scope =
    | "visible"
    | "graph"
    | "selection"
    | "largest-component"
    | { set: ScopeId }
    | { where: Query }
    | { nodes: readonly NodeId[] };

/**
 * The catalogue: everything the element can offer, as data.
 *
 * `session.catalog` implements every method here except the six named in
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
     * The options for one algorithm or layout, with data-dependent bounds resolved.
     * @deprecated Not implemented; `algorithms()` and `layouts()` carry the static option
     * descriptors. Removed at the next major release unless it is implemented first (issue #336).
     */
    optionsFor(key: AlgorithmKey | LayoutId, scope?: Scope): Promise<readonly OptionDescriptor[]>;
}

/**
 * The {@link CatalogApi} methods nothing implements yet, which `session.catalog` leaves out.
 *
 * Implementing one means deleting its name here: `SessionCatalogApi` is derived from this list,
 * so the two cannot drift apart.
 */
export type DeprecatedCatalogMethod =
    | "themes"
    | "functions"
    | "timeAttributes"
    | "applicable"
    | "validate"
    | "optionsFor";

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
