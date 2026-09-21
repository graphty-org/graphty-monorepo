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

import type { GraphtyErrorCode } from "../errors/codes";

/**
 * Every error code the element reports. Codes are the contract; messages are not.
 *
 * Declared once, in the error module, so a code cannot mean one thing to a descriptor
 * and another to the error that carries it.
 */
export type { GraphtyErrorCode };


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
] as const;

/** A layout id: a built-in name, or a plugin's. */
export type LayoutId = (typeof KNOWN_LAYOUT_IDS)[number] | (string & {});

/** The built-in file formats. */
export const KNOWN_FORMAT_IDS = ["json", "csv", "graphml", "gexf", "gml", "dot", "pajek", "sif", "cx2"] as const;

/** A format id: a built-in name, or a plugin's. */
export type FormatId = (typeof KNOWN_FORMAT_IDS)[number] | (string & {});

/** The built-in palettes. */
export const KNOWN_PALETTE_IDS = ["viridis", "plasma", "okabe-ito", "blue-orange"] as const;

/** A palette id: a built-in name, or a plugin's. */
export type PaletteId = (typeof KNOWN_PALETTE_IDS)[number] | (string & {});

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
    | "node.opacity"
    | "node.outline"
    | "node.glow"
    | "node.wireframe"
    | "node.flat"
    | "node.marker"
    | "edge.color"
    | "edge.width"
    | "edge.opacity"
    | "edge.style"
    | "edge.curvature"
    | "edge.arrowHead"
    | "edge.arrowTail"
    | "edge.animationSpeed"
    | "edge.label"
    | "edge.labelStyle"
    | "edge.tooltip";

/** The values the "edge.style" channel accepts. */
export type EdgeLinePattern =
    | "solid"
    | "dashed"
    | "dotted"
    | "dash-dot"
    | "dash-dot-dot"
    | "long-dash"
    | "short-dash"
    | "double"
    | "wave";

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

/** How a label is drawn. */
export interface LabelStyle {
    font?: string;
    sizePx?: number;
    weight?: number | "normal" | "bold";
    color?: string;
    background?: string;
    outline?: string;
    padding?: number;
    maxWidth?: number;
    wrap?: boolean;
}

/** A literal value written to a channel. */
export type ChannelValue = string | number | boolean | LabelStyle | Rgba;

/** Literal values, one per channel. */
export type StaticStyle = Partial<Record<Channel, ChannelValue>>;

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
}

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

/** One scale, mapping a domain of values onto a channel's range. */
export interface ScaleDescriptor {
    name: string;
    plainName: string;
    domainKind: "numeric" | "categorical" | "boolean";
    options: readonly OptionDescriptor[];
}

/** One named style document, offered as a whole look. */
export interface ThemeDescriptor {
    name: string;
    plainName: string;
    document: StyleDocument;
}

/** One function the expression grammar accepts. */
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

/** The catalogue: everything the element can offer, as data. */
export interface CatalogApi {
    algorithms(): readonly AlgorithmDescriptor[];
    layouts(): readonly LayoutDescriptor[];
    formats(): readonly FormatDescriptor[];
    palettes(): readonly PaletteDescriptor[];
    scales(): readonly ScaleDescriptor[];
    themes(): readonly ThemeDescriptor[];
    functions(): readonly FunctionDescriptor[];
    timeAttributes(): readonly AttributeDescriptor[];
    metrics(): readonly MetricAvailability[];
    /** The metrics that can run on this graph. A runtime query, not a static list. */
    applicable(): readonly MetricAvailability[];
    validate(query: Query, o?: { kind?: "selector" | "filter" | "formula" }): QueryValidation;
    /** The options for one algorithm or layout, with data-dependent bounds resolved. */
    optionsFor(key: AlgorithmKey | LayoutId, scope?: Scope): Promise<readonly OptionDescriptor[]>;
}

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
