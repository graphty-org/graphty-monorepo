/**
 * The simple tier of every graphty-element extension point. NORMATIVE for shapes; behaviour in
 * design/extensions/simple-tier.md. Entry point: @graphty/graphty-element/extend.
 *
 * PROPOSED: nothing here is built in graphty-element 2.6.1. Having a simple tier is decided; the
 * names and shapes below are the recommendation of README.md section 12, item 33, and are
 * normative once that item is taken.
 *
 * Every define* function below builds an ordinary advanced-tier registration and files it through
 * the point's published registration verb. There is no second registry and no private path: a
 * simple-tier extension IS an advanced-tier extension once registered (simple-tier.md section 3).
 *
 * Type-check with: pnpm exec tsc -p design/extensions
 */
import type { OptionDescriptor, OptionType, RegisterOptions } from "./common";
import type { CameraState, DrawingMode, Vec3 } from "./camera";
import type { ColorVisionDeficiency, PaletteDescriptor } from "./palette";
import type { FieldDescriptor } from "./algorithm";

// =============================================================================================
// Shared by every point
// =============================================================================================

/** A node id as the data spelled it. */
export type NodeId = string | number;

/**
 * One option in short form. A bare number, string or boolean is an option of that type with that
 * default. An object is an OptionDescriptor without `name` (the key is the name) and with
 * `plainName` optional (derived from the key: "tierAttribute" reads "Tier attribute").
 */
export type OptionShorthand =
    | number
    | string
    | boolean
    | (Readonly<Partial<Omit<OptionDescriptor, "name" | "type">>> & {
          readonly type: Exclude<OptionType, "unknown">;
          /**
           * For type "attribute" or "partition": whether the attribute is read from nodes (the
           * default) or from edges. Carried into the generated OptionDescriptor as `on`.
           */
          readonly on?: "node" | "edge";
      });

/** The options of one simple-tier extension, keyed by name. Order is the order a form shows. */
export type OptionsShorthand = Readonly<Record<string, OptionShorthand>>;

type ShorthandValue<S> = S extends number
    ? number
    : S extends boolean
      ? boolean
      : S extends string
        ? string
        : S extends { readonly type: "number" | "integer" | "seed" }
          ? number
          : S extends { readonly type: "boolean" }
            ? boolean
            : S extends { readonly type: "node-id" }
              ? NodeId
              : S extends { readonly type: "node-set" }
                ? readonly NodeId[]
                : S extends { readonly type: "enum"; readonly values: readonly { readonly value: infer V }[] }
                  ? V
                  : string;

/**
 * The resolved option values an extension's functions receive, typed from the declaration with no
 * generic written by the author. An option with a default is always present; one without may be
 * undefined.
 */
export type OptionValuesOf<O extends OptionsShorthand> = {
    readonly [K in keyof O]: O[K] extends number | string | boolean | { readonly default: {} | null }
        ? ShorthandValue<O[K]>
        : ShorthandValue<O[K]> | undefined;
};

/** Members every definition has. Only `id` is required. */
export interface DefinitionBase<O extends OptionsShorthand> {
    /** Permanent id (README section 4.3). Kept unchanged when the extension graduates. */
    readonly id: string;
    /** What pickers show. Default: the id in sentence case ("acme-hop-reach" reads "Acme hop reach"). */
    readonly name?: string;
    /** One sentence for pickers and the catalogue. Default: "". */
    readonly description?: string;
    readonly options?: O;
    /** The extension's own semver version, recorded as provenance. */
    readonly version?: string;
}

// =============================================================================================
// The friendly graph view (algorithms and layouts)
// =============================================================================================

/**
 * The whole graph, as nodes and edges with real ids. Built by the element from the snapshot; an
 * author never sees a row, a mask or a typed array. Iteration order is stable: nodes by id, edges
 * by id, so a result does not depend on the order records were loaded in.
 */
export interface GraphView {
    /** True when the definition asked for `direction: "directed"` and the graph has directed edges. */
    readonly directed: boolean;
    readonly nodeCount: number;
    readonly edgeCount: number;
    nodes(): readonly NodeView[];
    /** Every edge; parallel edges are separate edges, each with its own id. */
    edges(): readonly EdgeView[];
    node(id: NodeId): NodeView | undefined;
    edge(id: string): EdgeView | undefined;
}

export interface NodeView {
    readonly id: NodeId;
    /** edges().length. */
    readonly degree: number;
    /** Every adjacent node once, whichever way the edge points. */
    neighbors(): readonly NodeView[];
    /** In an undirected view, the same as neighbors(). */
    outNeighbors(): readonly NodeView[];
    inNeighbors(): readonly NodeView[];
    /** Every edge touching this node, parallel edges included. */
    edges(): readonly EdgeView[];
    outEdges(): readonly EdgeView[];
    inEdges(): readonly EdgeView[];
    /**
     * An attribute or a published result, by path, resolved exactly as a style selector resolves
     * it ("tier", "location.lat", "results.clusters.group"). undefined when absent. Pass an
     * "attribute" option's value here to let the reader choose the attribute.
     */
    attr(path: string): unknown;
    /** attr(path) when it is a finite number (or a numeric string); undefined otherwise. */
    number(path: string): number | undefined;
}

export interface EdgeView {
    /** The element's edge id: the same id a selection, a style and an export use. */
    readonly id: string;
    readonly source: NodeView;
    readonly target: NodeView;
    attr(path: string): unknown;
    number(path: string): number | undefined;
}

// =============================================================================================
// Algorithm -- simple-tier.md section 4.1
// =============================================================================================

export interface AlgorithmContext<V> {
    readonly options: V;
    readonly graph: GraphView;
    /** Aborted when the run is cancelled. Only a whole-graph function needs it. */
    readonly signal: AbortSignal;
    /** Only a whole-graph function needs it: the share of the work done, 0 to 1. */
    progress(fraction: number): void;
}

/** A score. undefined, null, NaN or an infinity means "not measured": the element publishes nothing for it. */
export type Score = number | null | undefined;

interface AlgorithmDefinitionBase<O extends OptionsShorthand> extends DefinitionBase<O> {
    /** "undirected" (the default) ignores edge direction; "directed" keeps it. */
    readonly direction?: "undirected" | "directed";
}

/** A score per node, computed one node at a time. Published as a node-metric result, field "value". */
export interface NodeScoreDefinition<O extends OptionsShorthand> extends AlgorithmDefinitionBase<O> {
    readonly node: (node: NodeView, context: AlgorithmContext<OptionValuesOf<O>>) => Score;
    readonly edge?: never;
    readonly nodes?: never;
    readonly groups?: never;
}

/** A score per edge, computed one edge at a time. Published as an edge-metric result, field "value". */
export interface EdgeScoreDefinition<O extends OptionsShorthand> extends AlgorithmDefinitionBase<O> {
    readonly edge: (edge: EdgeView, context: AlgorithmContext<OptionValuesOf<O>>) => Score;
    readonly node?: never;
    readonly nodes?: never;
    readonly groups?: never;
}

/** A score per node computed over the whole graph at once (an iteration, a propagation). */
export interface WholeGraphScoreDefinition<O extends OptionsShorthand> extends AlgorithmDefinitionBase<O> {
    readonly nodes: (
        graph: GraphView,
        context: AlgorithmContext<OptionValuesOf<O>>,
    ) => ReadonlyMap<NodeId, Score> | Promise<ReadonlyMap<NodeId, Score>>;
    readonly node?: never;
    readonly edge?: never;
    readonly groups?: never;
}

/** A group per node (a clustering). Published as a community result, field "group". */
export interface GroupingDefinition<O extends OptionsShorthand> extends AlgorithmDefinitionBase<O> {
    readonly groups: (
        graph: GraphView,
        context: AlgorithmContext<OptionValuesOf<O>>,
    ) =>
        | ReadonlyMap<NodeId, string | number | null | undefined>
        | Promise<ReadonlyMap<NodeId, string | number | null | undefined>>;
    readonly node?: never;
    readonly edge?: never;
    readonly nodes?: never;
}

export type AlgorithmDefinition<O extends OptionsShorthand> =
    | NodeScoreDefinition<O>
    | EdgeScoreDefinition<O>
    | WholeGraphScoreDefinition<O>
    | GroupingDefinition<O>;

/** Build a DeclaredAlgorithm subclass from the definition and register it. Synchronous. */
export declare function defineAlgorithm<const O extends OptionsShorthand = {}>(
    definition: AlgorithmDefinition<O>,
    options?: RegisterOptions,
): void;

// =============================================================================================
// Layout -- simple-tier.md section 4.2
// =============================================================================================

/** A position in scene units: [x, y] or [x, y, z]. A 2D position in a 3D view gets z = 0. */
export type Point = readonly [number, number] | readonly [number, number, number];

export interface LayoutContext<V> {
    readonly options: V;
    /** The view's dimensions. In 2D the element drops any z returned. */
    readonly dimensions: 2 | 3;
    /** Where a pinned or held node is, or null for a node the layout may place. */
    fixed(id: NodeId): Point | null;
    /** Seeded random numbers in [0, 1). Deterministic unless the definition sets `random: true`. */
    random(): number;
    readonly signal: AbortSignal;
    progress(fraction: number): void;
}

export interface LayoutDefinition<O extends OptionsShorthand> extends DefinitionBase<O> {
    /** The most dimensions the layout uses. Default 3. */
    readonly dimensions?: 2 | 3;
    /** True when the result should change from run to run; the element then draws and records a seed. */
    readonly random?: boolean;
    /**
     * Where each node goes. A node missing from the map, or mapped to null or to a non-finite
     * number, is UNPLACED: drawn the one way the element draws unplaced nodes and listed in the
     * settled report. A value for a pinned or held node is ignored.
     */
    readonly place: (
        graph: GraphView,
        context: LayoutContext<OptionValuesOf<O>>,
    ) => ReadonlyMap<NodeId, Point | null> | Promise<ReadonlyMap<NodeId, Point | null>>;
}

/** Build a snapshot layout registration from the definition and register it. Synchronous. */
export declare function defineLayout<const O extends OptionsShorthand = {}>(
    definition: LayoutDefinition<O>,
    options?: RegisterOptions,
): void;

// =============================================================================================
// File format -- simple-tier.md section 4.3
// =============================================================================================

/** A node record ({ id, ...attributes }) or an edge record ({ source, target, ...attributes }). */
export type PlainRecord = Readonly<Record<string, unknown>>;

/** What a reader or a data source hands back: plain records, in one batch or many. */
export interface Records {
    readonly nodes?: readonly PlainRecord[];
    readonly edges?: readonly PlainRecord[];
    /** What the source says about edge direction, when it says anything. */
    readonly directed?: boolean;
}

export interface ReadContext<V> {
    readonly options: V;
    readonly signal: AbortSignal;
    /** Keep the record but tell the reader about a problem; lands in the load report. */
    warn(message: string, line?: number): void;
}

/** The graph as a writer receives it: plain records with ids already resolved. */
export interface WritableGraph {
    readonly directed: boolean;
    /** { id, ...attributes }; internal columns removed, unmeasured values absent. */
    readonly nodes: readonly PlainRecord[];
    /** { id, source, target, ...attributes }; mixed-direction pairs already folded. */
    readonly edges: readonly PlainRecord[];
    /** Every attribute name that appears on at least one node, in a stable order. */
    readonly nodeColumns: readonly string[];
    readonly edgeColumns: readonly string[];
}

export interface WriteContext<V> {
    readonly options: V;
    readonly signal: AbortSignal;
}

export interface FormatDefinition<O extends OptionsShorthand> extends DefinitionBase<O> {
    /** At least one, lower case, beginning with ".". */
    readonly extensions: readonly string[];
    /** Default: looked up from the extensions; "text/plain" when none is known. */
    readonly mediaTypes?: readonly string[];
    /** Whether a sample of the file (its first 4 KiB, as text) is this format. Optional. */
    readonly detect?: (sample: string) => boolean;
    /** Text in, plain records out. Omit for a write-only format. */
    readonly read?: (
        text: string,
        context: ReadContext<OptionValuesOf<O>>,
    ) => Records | Promise<Records> | AsyncIterable<Records>;
    /** Plain records in, text out. Omit for a read-only format. */
    readonly write?: (
        graph: WritableGraph,
        context: WriteContext<OptionValuesOf<O>>,
    ) => string | Promise<string> | AsyncIterable<string>;
    /**
     * What `write` carries, so the element can report what an export loses. Default: every node
     * and edge attribute and isolated nodes; no positions (positions are then not handed over).
     */
    readonly keeps?: {
        readonly nodeAttributes?: boolean;
        readonly edgeAttributes?: boolean;
        readonly isolatedNodes?: boolean;
        /** When true, node records carry `position: { x, y, z }`. */
        readonly positions?: boolean;
    };
}

/** Build a reader class and/or a writer registration from the definition and register them. */
export declare function defineFormat<const O extends OptionsShorthand = {}>(
    definition: FormatDefinition<O>,
    options?: RegisterOptions,
): void;

// =============================================================================================
// Data source -- simple-tier.md section 4.4
// =============================================================================================

export interface LoadContext<V> {
    /** The source's options, with the credential removed. */
    readonly options: V;
    /**
     * The element's fetch: checks the URL against `hosts`, confirms the host with the reader on
     * first use, attaches the credential, retries with backoff, applies the timeout and the rate
     * limit, honours the signal, and turns a failed response into E_FETCH_FAILED.
     */
    fetch(
        url: string,
        init?: {
            readonly method?: string;
            readonly headers?: Readonly<Record<string, string>>;
            readonly body?: string;
        },
    ): Promise<Response>;
    readonly signal: AbortSignal;
    progress(done: number, total?: number): void;
    warn(message: string): void;
}

export interface DataSourceDefinition<O extends OptionsShorthand> extends DefinitionBase<O> {
    /** The origins the source contacts ("https://api.example.org"). At least one. */
    readonly hosts: readonly string[];
    /**
     * A secret the element asks the reader for, keeps, and never logs, publishes or saves. The
     * element's fetch sends it as `<header>: <scheme> <secret>` (default "Authorization: Bearer").
     */
    readonly credential?: { readonly name?: string; readonly header?: string; readonly scheme?: string };
    /** One batch, a promise of one, or an async iterable of batches (a pager). */
    readonly load: (context: LoadContext<OptionValuesOf<O>>) => Records | Promise<Records> | AsyncIterable<Records>;
}

/** Build a data-source registration from the definition and register it. Synchronous. */
export declare function defineDataSource<const O extends OptionsShorthand = {}>(
    definition: DataSourceDefinition<O>,
    options?: RegisterOptions,
): void;

// =============================================================================================
// Palette -- simple-tier.md section 4.5
// =============================================================================================

/** Register a palette from a kind and a list of colours. Calls registerPalette. */
export declare function definePalette(
    id: string,
    kind: PaletteDescriptor["kind"],
    colors: readonly string[],
    extra?: {
        readonly name?: string;
        readonly description?: string;
        readonly colorblindSafe?: readonly ColorVisionDeficiency[];
    },
    options?: RegisterOptions,
): void;

// =============================================================================================
// Camera -- simple-tier.md section 4.6
// =============================================================================================

/** What a simple view or motion is computed from. */
export interface ViewFrame {
    /** The centre of the box being framed. */
    readonly center: Vec3;
    readonly size: Vec3;
    /** Half the box's largest dimension. */
    readonly radius: number;
    /** How far from `center` a 3D camera stands for a sphere of `radius` to fill the view. */
    readonly fitDistance: number;
    readonly mode: DrawingMode;
    readonly aspect: number;
    readonly current: CameraState;
}

export interface CameraViewDefinition<O extends OptionsShorthand> extends DefinitionBase<O> {
    /** Default ["3d"]. */
    readonly modes?: readonly DrawingMode[];
    /** Where the camera stands. Pure: no clock, no DOM, no random numbers. */
    readonly view: (frame: ViewFrame, options: OptionValuesOf<O>) => CameraState;
}

export interface CameraMotionDefinition<O extends OptionsShorthand> extends DefinitionBase<O> {
    readonly modes?: readonly DrawingMode[];
    /** Where the camera stands `t` milliseconds into the motion. Pure in `t`, `frame` and `options`. */
    readonly motion: (t: number, frame: ViewFrame, options: OptionValuesOf<O>) => CameraState;
}

export declare function defineCameraView<const O extends OptionsShorthand = {}>(
    definition: CameraViewDefinition<O>,
    options?: RegisterOptions,
): void;

export declare function defineCameraMotion<const O extends OptionsShorthand = {}>(
    definition: CameraMotionDefinition<O>,
    options?: RegisterOptions,
): void;

/**
 * Added to the element (a consumer API, not an extension verb). "orbit" is a built-in motion.
 * A motion pauses on any input the element owns and resumes 3 seconds after it ends.
 */
export interface CameraMotionControls {
    playCameraMotion(id: string, options?: Readonly<Record<string, unknown>>): Promise<void>;
    stopCameraMotion(): void;
}

// =============================================================================================
// Logging -- simple-tier.md section 4.7
// =============================================================================================

export type LogLevelName = "error" | "warn" | "info" | "debug" | "trace";

/** A log record as a simple destination receives it. Frozen. */
export interface PlainLogRecord {
    readonly time: Date;
    readonly level: LogLevelName;
    /** The category path joined with "." ("graphty.layout.ngraph"). */
    readonly category: string;
    readonly message: string;
    /** Removed by the element's redaction unless the embedder turned it off (logging.md 7). */
    readonly data?: Readonly<Record<string, unknown>>;
    readonly error?: Error;
}

export interface LogDestinationDefinition {
    readonly id: string;
    readonly name?: string;
    readonly description?: string;
    /** The least severe level delivered. Default "warn". */
    readonly level?: LogLevelName;
    /** Only records whose category contains one of these segments. */
    readonly categories?: readonly string[];
    /** May return a promise (a fetch); the element queues, orders, retries and flushes. */
    readonly write: (record: PlainLogRecord) => void | Promise<unknown>;
    /** Attach now (the default) or only register, for a configuration to turn on by id. */
    readonly attach?: boolean;
}

/** Register a destination and, unless attach is false, attach it. Returns a function that detaches it. */
export declare function defineLogDestination(
    definition: LogDestinationDefinition,
    options?: RegisterOptions,
): () => void;

// =============================================================================================
// Additions the advanced tier needs so the simple tier can be built on it (additive)
// =============================================================================================

/** Added to OptionDescriptor: which element an "attribute" or "partition" option reads. Default "node". */
export interface OptionDescriptorDomain {
    readonly on?: "node" | "edge";
}

/**
 * Added to ./extend beside nodeMetricFields: the fields of an edge-metric result, so neither tier
 * writes the shape contract's field list by hand.
 */
export declare function edgeMetricFields(value: {
    readonly plainName: string;
    readonly technicalName: string;
    readonly type?: "number" | "integer";
}): readonly FieldDescriptor[];
