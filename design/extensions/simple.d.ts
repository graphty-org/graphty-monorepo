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
 * SELF-CONTAINED: this file imports only common, camera and palette, none of which reaches
 * @graphty/graph-format, so a plugin that uses only the simple tier type-checks with the element
 * installed and nothing else, under any lib from ES2020 up. The whole ./extend entry point, both
 * tiers, is extend.d.ts.
 *
 * Type-check with: pnpm exec tsc -p design/extensions
 */
import type { OptionDescriptor, OptionType, RegisterOptions } from "./common";
import type { CameraState, DrawingMode, Vec3 } from "./camera";
import type { ColorVisionDeficiency, PaletteDescriptor } from "./palette";

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
 * generic written by the author. An option with a default is always present; one with no default,
 * or with `default: null`, may be undefined. A "node-id" or "node-set" option naming a node the
 * graph lacks is refused before the code runs (E_OPTION_RANGE). For an "attribute" option that is the way to say
 * "optional": it is NOT BOUND unless the reader picks an attribute, the run-start existence check
 * skips it, and passing its undefined value to attr() or number() returns undefined
 * (simple-tier.md section 2.2).
 */
export type OptionValuesOf<O extends OptionsShorthand> = {
    readonly [K in keyof O]: O[K] extends number | string | boolean | { readonly default: {} }
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
 * author never sees a row, a mask or a typed array. Iteration order is stable: numeric ids
 * ascending, then string ids in code-unit order (edges likewise by edge id), the order
 * compareNodeIds defines, so a result does not depend on the order records were loaded in.
 *
 * Every array a view hands back (nodes(), edges(), and each node's neighbors(), edges() and
 * directed forms) is frozen, built once per run and cached, so calling a method again inside a
 * loop costs nothing.
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
    /**
     * The nodes grouped by the value at `path`, each group in the view's order. Groups come in
     * readable order: numbers ascending, then text in natural order ("2" before "10"). A node
     * without the attribute is in no group; an undefined `path` gives an empty map.
     */
    groupBy(path: string | undefined): ReadonlyMap<string | number | boolean, readonly NodeView[]>;
}

export interface NodeView {
    readonly id: NodeId;
    /**
     * edges().length: a self-loop counts ONCE, as the element's built-in degree counts it
     * (NetworkX and igraph count it twice; add edgesTo(node).length to match them).
     */
    readonly degree: number;
    /** Every adjacent node once, whichever way the edge points. Never the node itself: a self-loop is in edges() only. */
    neighbors(): readonly NodeView[];
    /**
     * The directed forms. They throw unless the definition declares `direction: "directed"`
     * ("acme-pr: outEdges() needs direction: \"directed\" in the definition"), so a plugin never
     * reads direction the view was not built with. With `direction: "directed"`, an undirected edge
     * counts both ways: it is in both outEdges() and inEdges() of each end.
     */
    outNeighbors(): readonly NodeView[];
    inNeighbors(): readonly NodeView[];
    /** Every edge touching this node, parallel edges included. Use edge.other(node) for the far end. */
    edges(): readonly EdgeView[];
    outEdges(): readonly EdgeView[];
    inEdges(): readonly EdgeView[];
    /**
     * Every edge between this node and `other`, parallel edges included; empty when they are not
     * adjacent. `node.edgesTo(node)` is the node's self-loops. In a directed view, only the edges
     * from this node to `other`.
     */
    edgesTo(other: NodeView): readonly EdgeView[];
    /**
     * The sum of edge.weight(path) over edgesTo(other) -- w_ij, with parallel edges added together
     * -- or undefined when there is no such edge. The weight rule is EdgeView.weight's.
     */
    weightTo(other: NodeView, path: string | undefined): number | undefined;
    /**
     * The weighted degree: the sum of edge.weight(path) over edges() (default "all"), or over
     * outEdges() / inEdges() (which need `direction: "directed"`). With `path` undefined it is the
     * degree. An edge with no number at `path` is left out and counted in the run record's warning.
     * Computed once per node, path and direction per run, so calling it from edge() is cheap.
     */
    strength(path: string | undefined, direction?: "all" | "out" | "in"): number;
    /**
     * An attribute or a published result, by path, resolved exactly as a style selector resolves
     * it ("tier", "location.lat", "results.clusters.group"). undefined when absent, or when `path`
     * is undefined (an unbound optional "attribute" option). Pass an "attribute" option's value
     * here to let the reader choose the attribute.
     */
    attr(path: string | undefined): unknown;
    /**
     * attr(path) when it is a finite number; undefined otherwise. A numeric string is NOT parsed
     * here: columns are typed when the data is loaded (simple-tier.md section 2.6), so both tiers
     * read the same values.
     */
    number(path: string | undefined): number | undefined;
}

export interface EdgeView {
    /** The element's edge id: the same id a selection, a style and an export use. */
    readonly id: string;
    /**
     * The endpoints as the data stored them. In a directed view `source` is where the edge starts.
     * In an undirected view the two are just the two ends: `source` is NOT the node the edge was
     * reached from. Use other(node).
     */
    readonly source: NodeView;
    readonly target: NodeView;
    /** The end that is not `node` (a self-loop returns `node`). Throws when `node` is not an end. */
    other(node: NodeView): NodeView;
    /**
     * The edge's weight at `path`: 1 when `path` is undefined (an unbound optional weight), the
     * number when there is one, undefined when the value is missing or is not a number. One rule
     * for weight, strength and weightTo (simple-tier.md section 2.3 rule 10). A read that finds no
     * number is counted in the run record's warning, never read as 0.
     */
    weight(path: string | undefined): number | undefined;
    attr(path: string | undefined): unknown;
    number(path: string | undefined): number | undefined;
}

/**
 * The order every graph view iterates in: numbers ascending, then strings in code-unit order.
 * Published for the advanced tier, so an order-dependent method (label propagation, a greedy
 * colouring) that graduates can sort its rows the same way and give the same result
 * (simple-tier.md section 5).
 */
export declare function compareNodeIds(a: NodeId, b: NodeId): number;

// =============================================================================================
// Algorithm -- simple-tier.md section 4.1
// =============================================================================================

export interface AlgorithmContext<V> {
    readonly options: V;
    readonly graph: GraphView;
    /** Aborted when the run is cancelled. Only a whole-graph function needs it. */
    readonly signal: AbortSignal;
    /**
     * Only a whole-graph function needs it: the share of the work done, 0 to 1. AWAIT it inside a
     * loop: the promise lets the page draw a frame when the frame's time is spent, and rejects with
     * the abort reason when the run was cancelled, so `await progress(i / n)` once per pass is the
     * whole of keeping the page responsive.
     */
    progress(fraction: number): Promise<void>;
    /** A sentence for the run record's caveats ("Dangling mass returns to the seeds."). */
    note(text: string): void;
    /**
     * Record how an iterative method ended; a run that did not converge says so in its caveats.
     * When it is never called, the run record says nothing about convergence.
     */
    converged(converged: boolean, iterations: number): void;
}

/** A score. undefined, null, NaN or an infinity means "not measured": the element publishes nothing for it. */
export type Score = number | null | undefined;

interface AlgorithmDefinitionBase<O extends OptionsShorthand> extends DefinitionBase<O> {
    /**
     * "undirected" (the default) ignores edge direction, and the directed accessors of the view
     * throw; "directed" keeps it.
     */
    readonly direction?: "undirected" | "directed";
    /** The edge "attribute" option that holds weights, and what they mean. Recorded in the caveats. */
    readonly weights?: { readonly option: keyof O & string; readonly meaning: "distance" | "strength" };
    /**
     * For a whole-graph function that walks the graph repeatedly: the integer option that caps the
     * number of passes (maxIterations). The cost estimate is multiplied by it.
     */
    readonly passes?: keyof O & string;
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
    /** As AlgorithmContext.progress: await it inside a loop to keep the page responsive. */
    progress(fraction: number): Promise<void>;
}

export interface LayoutDefinition<O extends OptionsShorthand> extends DefinitionBase<O> {
    /** The most dimensions the layout uses. Default 3. */
    readonly dimensions?: 2 | 3;
    /** True when the result should change from run to run; the element then draws and records a seed. */
    readonly random?: boolean;
    /**
     * Where each node goes, in scene units (a node at the default size is 1 unit across). A plain
     * `new Map()` filled with `positions.set(node.id, [x, y])` is enough; no type is written. A
     * node missing from the map, or mapped to null or to a non-finite number, is UNPLACED: drawn
     * the one way the element draws unplaced nodes and listed in the settled report. A value for a
     * pinned or held node is ignored.
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

/**
 * A node record ({ id, ...attributes }) or an edge record ({ source, target, ...attributes }).
 * `weight` is the edge strength algorithms and styles read by default; `position` ({ x, y, z })
 * places a node; `id` on an edge is its edge id. Reserved, never ordinary attributes: `src`/`dst`,
 * `from`/`to` (read as endpoints) and every key beginning with `graphty`. An edge may name a node
 * no record declared; the element creates it. String values that are all numbers in a column are
 * typed as numbers on load (simple-tier.md section 2.6).
 */
export type PlainRecord = Readonly<Record<string, unknown>>;

/** What a reader or a data source hands back: plain records, in one batch or many. */
export interface Records {
    readonly nodes?: readonly PlainRecord[];
    readonly edges?: readonly PlainRecord[];
    /**
     * What the source says about edge direction. Absent: it says nothing, and the element's own
     * direction setting applies, as for any file that does not state one.
     */
    readonly directed?: boolean;
}

/**
 * How a column is typed on load, overriding the element's number check (simple-tier.md section
 * 2.6): `columns: { zip: "string" }` keeps a column as text even when every value looks numeric.
 */
export type ColumnTypes = Readonly<Record<string, "string" | "number" | "boolean">>;

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
    /** Every attribute name that appears on at least one node, in a stable order; never `id`. */
    readonly nodeColumns: readonly string[];
    /** The same for edges; never `id`, `source` or `target`. */
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
    /** Column typing that overrides the number check on load. Default: none. */
    readonly columns?: ColumnTypes;
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
     * What `write` carries, so the element can report what an export loses. Default: edge
     * attributes only -- what an edge list provably carries. A writer that also writes node
     * records says so (`nodeAttributes`, `isolatedNodes`); positions are handed over only when
     * `positions` is true. The conformance kit checks the claim by a read-write-read round trip.
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
     * The element's fetch. A URL on `hosts` is fetched without a prompt: the embedder chose the
     * source when it installed it. A URL off `hosts` (from an option the reader edited) is fetched
     * only after the reader confirms it, or when the embedder allowed its origin
     * (DataSourceControls.allowSourceHosts); with no reader to ask it is refused. The fetch also
     * attaches the credential, retries with backoff, applies a 30-second timeout per request, sends
     * one request at a time and waits out an HTTP 429's Retry-After, honours the signal, and turns a failed response into E_FETCH_FAILED. It refuses the same URL
     * twice in one load and more than `maxRequests` requests (E_FETCH_FAILED, details.reason
     * "repeated" or "limit"), so a pager whose API repeats its `next` link stops.
     *
     * The credential is attached ONLY to a URL whose origin is on `hosts`: never to an origin the
     * reader confirmed or the embedder allowed with allowSourceHosts, and never across a redirect
     * to another origin. The URL is passed through unchanged, as the platform fetch passes it, so
     * a query string the author built (`%0d` separators included) arrives as written.
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
    /** Any unit (pages, records); the element shows done / total, or a count when total is absent. */
    progress(done: number, total?: number): void;
    warn(message: string): void;
}

export interface DataSourceDefinition<O extends OptionsShorthand> extends DefinitionBase<O> {
    /**
     * The origins the source contacts ("https://api.example.org"). At least one. A string option
     * whose default is an http(s) URL off these origins is refused by defineDataSource
     * (E_BAD_COMMAND, details.field = the option), so the two cannot drift apart.
     */
    readonly hosts: readonly string[];
    /**
     * A secret the element asks the reader for, keeps, and never logs, publishes or saves. The
     * element's fetch sends it as `<header>: <scheme> <secret>` (default "Authorization: Bearer").
     */
    readonly credential?: { readonly name?: string; readonly header?: string; readonly scheme?: string };
    /** The most requests one load may make. Default 1000. */
    readonly maxRequests?: number;
    /** Column typing that overrides the number check on load. Default: none. */
    readonly columns?: ColumnTypes;
    /** One batch, a promise of one, or an async iterable of batches (a pager). */
    readonly load: (context: LoadContext<OptionValuesOf<O>>) => Records | Promise<Records> | AsyncIterable<Records>;
}

/** Build a data-source registration from the definition and register it. Synchronous. */
export declare function defineDataSource<const O extends OptionsShorthand = {}>(
    definition: DataSourceDefinition<O>,
    options?: RegisterOptions,
): void;

/**
 * Added to the element (a consumer API, not an extension verb). addDataFromSource(id, options)
 * already exists on it.
 */
export interface DataSourceControls {
    /** Supply a source's credential in code, for an embedder that already holds a token. Never saved. */
    setSourceCredential(sourceId: string, secret: string): void;
    /**
     * Origins a source may fetch from without asking the reader, beyond the hosts it declared. The
     * credential is never sent to them.
     */
    allowSourceHosts(sourceId: string, origins: readonly string[]): void;
}

// =============================================================================================
// Palette -- simple-tier.md section 4.5
// =============================================================================================

export interface PaletteDefinition {
    readonly id: string;
    readonly kind: PaletteDescriptor["kind"];
    /**
     * Any colour CSS can parse EXCEPT var(), which definePalette refuses (E_BAD_COMMAND) with the
     * fix in the message: read the token first with
     * getComputedStyle(document.documentElement).getPropertyValue("--brand-navy").trim(), after
     * its stylesheet has loaded. An empty string is refused the same way. Normalised to six-digit
     * hex. A categorical palette has one colour per group; the element never wraps, so
     * groups past the last colour are left in the base colour and reported (E_CAP_EXCEEDED).
     */
    readonly colors: readonly string[];
    readonly name?: string;
    readonly description?: string;
    /** A claim the element takes on trust. Default: no claim. */
    readonly colorblindSafe?: readonly ColorVisionDeficiency[];
}

/** Register a palette from a kind and a list of colours. Calls registerPalette. */
export declare function definePalette(definition: PaletteDefinition, options?: RegisterOptions): void;

/**
 * Added to the element and to session.styles (a consumer API). The palette a colour binding uses
 * when it names none, one per kind. Resolved when a layer is written, so a saved document always
 * names a concrete palette.
 */
export interface DefaultPaletteControls {
    /**
     * A call made after layers took the OLD default writes a warning naming them; with
     * `reapply: true` it re-resolves those layers instead. A layer that names its palette is never
     * touched.
     */
    setDefaultPalettes(
        palettes: {
            readonly categorical?: string;
            readonly sequential?: string;
            readonly diverging?: string;
        },
        options?: { readonly reapply?: boolean },
    ): void;
}

// =============================================================================================
// Camera -- simple-tier.md section 4.6
// =============================================================================================

/** What a simple view or motion is computed from. */
export interface ViewFrame {
    /** The scene's up direction. A view that uses orbit() never needs it. */
    readonly up: Vec3;
    /**
     * The camera's angle round `up`, and above the horizontal, both in radians. For a motion,
     * `azimuth`, `elevation` and `current` are captured ONCE, when the motion starts or resumes,
     * and stay fixed while it plays; a re-measure when the layout settles refreshes only `center`,
     * `size`, `radius` and `fitDistance`. So `frame.azimuth + angle(t)` never counts an angle
     * twice.
     */
    readonly azimuth: number;
    readonly elevation: number;
    /**
     * The camera on a sphere of `fitDistance` round `center`, at `azimuth` radians round the up
     * axis and `elevation` radians above the horizontal (default: the current elevation), looking
     * at the centre. So `orbit(frame.azimuth + angle)` turns from wherever the camera is now.
     */
    orbit(azimuth: number, elevation?: number): CameraState;
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
    readonly view: (frame: ViewFrame, context: { readonly options: OptionValuesOf<O> }) => CameraState;
}

export interface CameraMotionDefinition<O extends OptionsShorthand> extends DefinitionBase<O> {
    readonly modes?: readonly DrawingMode[];
    /**
     * Where the camera stands `t` milliseconds into the motion. Pure in `t`, `frame` and `options`.
     * When the motion resumes after the reader moved the camera, `t` starts again at 0 and `frame`
     * is measured afresh, so a motion written from frame.azimuth continues from where the reader
     * left the camera instead of jumping back.
     */
    readonly motion: (t: number, frame: ViewFrame, context: { readonly options: OptionValuesOf<O> }) => CameraState;
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
 * Added to the element (a consumer API, not an extension verb), so
 * document.querySelector("graphty-element") is typed with it (element.d.ts). "orbit" is a built-in
 * motion with two options: secondsPerTurn (default 60; negative turns the other way) and elevation
 * in degrees (default: the camera's current elevation). A motion pauses on any input the element
 * owns and resumes 3 seconds after it ends.
 */
export interface CameraMotionControls {
    /**
     * Starts the motion; settles when it stops. Rejects at once with E_UNKNOWN_OPTION for an option
     * the motion does not declare, E_UNKNOWN_CAMERA for an unknown id, and E_UNSUPPORTED when the
     * drawing mode is not in the motion's `modes`. When the reader's system asks for reduced
     * motion (prefers-reduced-motion) the motion does not start: the promise resolves at once and
     * the element writes one console line saying why, so a developer testing with that setting is
     * not left with a silent no-op.
     */
    playCameraMotion(id: string, options?: Readonly<Record<string, unknown>>): Promise<void>;
    stopCameraMotion(): void;
}

/**
 * The consumer calls the simple tier adds to the element. The element class (`Graphty`, which
 * HTMLElementTagNameMap already maps "graphty-element" to) gains all of them -- element.d.ts is
 * that addition -- so with the element installed `document.querySelector("graphty-element")` is
 * typed with them and needs no cast.
 */
export interface SimpleTierElementControls extends CameraMotionControls, DefaultPaletteControls, DataSourceControls {}

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
    /** The failure as plain data, so JSON.stringify(record) keeps it (an Error would become {}). `time` serialises as an ISO string. */
    readonly error?: { readonly name: string; readonly message: string; readonly stack?: string };
}

export interface LogDestinationDefinition {
    readonly id: string;
    readonly name?: string;
    readonly description?: string;
    /** The least severe level delivered. Default "warn". */
    readonly level?: LogLevelName;
    /** Only records whose category contains one of these segments. */
    readonly categories?: readonly string[];
    /**
     * May return a promise (a fetch); the element queues, orders, retries and flushes. A rejection,
     * or a promise that resolves to a fetch Response whose `ok` is false, counts as a failed send.
     * A failed send is retried three times, after 1, 2 and 4 seconds; a 4xx response other than
     * 408 and 429 is not retried. The queue holds at most 1000 records: past that the oldest is
     * dropped, and the next send starts with one "warn" record in category "graphty.logging" saying
     * how many were dropped, so an error storm against a slow endpoint cannot grow memory without
     * limit and the loss is still visible.
     * Context the page owns (a session id) comes from the author's own closure.
     */
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
// Additions the advanced tier needs so the simple tier can be built on it (additive). The field
// builders edgeMetricFields, communityFields and communityFieldSpecs are declared in algorithm.d.ts.
// =============================================================================================

/** Added to OptionDescriptor: which element an "attribute" or "partition" option reads. Default "node". */
export interface OptionDescriptorDomain {
    readonly on?: "node" | "edge";
}
