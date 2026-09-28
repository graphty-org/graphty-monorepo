/**
 * @file The public types of the simple extension tier: one plain definition object per point,
 * the graph view an algorithm or a layout reads, and the option short form.
 *
 * The normative shapes are design/extensions/simple.d.ts. This file carries the part of it that
 * graphty-element builds today -- the shared members, the graph view, and the algorithm, layout,
 * palette and log destination definitions. File formats, data sources and camera motions have no
 * simple tier yet and none of their types is declared here.
 *
 * Every `define*` function builds an ordinary advanced registration from its definition and
 * files it through the point's published verb, so a simple-tier extension IS an advanced one once
 * registered.
 *
 * Types only: nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { RegisterOptions } from "../catalog/pluginRegistry";
import type { OptionDescriptor, OptionType, PaletteDescriptor } from "../catalog/types";

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
    | (Readonly<Partial<Omit<OptionDescriptor, "name" | "type" | "on">>> & {
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
 * or with `default: null`, may be undefined. An "attribute" option with no default is NOT BOUND
 * unless the reader picks an attribute, and passing its undefined value to attr() or number()
 * returns undefined.
 */
export type OptionValuesOf<O extends OptionsShorthand> = {
    // NonNullable<unknown> is "anything but null or undefined": a default of null leaves the
    // option unbound, which is exactly the case the `| undefined` branch describes.
    readonly [K in keyof O]: O[K] extends number | string | boolean | { readonly default: NonNullable<unknown> }
        ? ShorthandValue<O[K]>
        : ShorthandValue<O[K]> | undefined;
};

/** Members every definition has. Only `id` is required. */
export interface DefinitionBase<O extends OptionsShorthand> {
    /** Permanent id: lower case, hyphenated, vendor-prefixed ("acme-hop-reach"). Kept unchanged when the extension graduates. */
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
// The graph view (algorithms and layouts)
// =============================================================================================

/**
 * The whole graph, as nodes and edges with real ids. Iteration order is stable: numeric ids
 * ascending, then string ids in code-unit order (edges by edge id), the order compareNodeIds
 * defines, so a result does not depend on the order records were loaded in.
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
     * The directed forms. They throw unless the definition declares `direction: "directed"`, so a
     * plugin never reads direction the view was not built with. With `direction: "directed"`, an
     * undirected edge counts both ways: it is in both outEdges() and inEdges() of each end.
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
     */
    strength(path: string | undefined, direction?: "all" | "out" | "in"): number;
    /**
     * An attribute or a published result, by path, resolved exactly as a style selector resolves
     * it ("tier", "results.clusters.group"). undefined when absent, or when `path` is undefined
     * (an unbound optional "attribute" option).
     */
    attr(path: string | undefined): unknown;
    /** attr(path) when it is a finite number; undefined otherwise. A numeric string is NOT parsed. */
    number(path: string | undefined): number | undefined;
}

export interface EdgeView {
    /** The element's edge id: the same id a selection, a style and an export use. */
    readonly id: string;
    /**
     * The endpoints as the data stored them. In a directed view `source` is where the edge starts.
     * In an undirected view the two are just the two ends: use other(node).
     */
    readonly source: NodeView;
    readonly target: NodeView;
    /** The end that is not `node` (a self-loop returns `node`). Throws when `node` is not an end. */
    other(node: NodeView): NodeView;
    /**
     * The edge's weight at `path`: 1 when `path` is undefined (an unbound optional weight), the
     * number when there is one, undefined when the value is missing or is not a number. A read
     * that finds no number is counted in the run record's warning, never read as 0.
     */
    weight(path: string | undefined): number | undefined;
    attr(path: string | undefined): unknown;
    number(path: string | undefined): number | undefined;
}

// =============================================================================================
// Algorithm
// =============================================================================================

export interface AlgorithmContext<V> {
    readonly options: V;
    readonly graph: GraphView;
    /** Aborted when the run is cancelled. Only a whole-graph function needs it. */
    readonly signal: AbortSignal;
    /**
     * Only a whole-graph function needs it: the share of the work done, 0 to 1. AWAIT it inside a
     * loop: the promise lets the page draw a frame, and rejects with the abort reason when the run
     * was cancelled.
     */
    progress(fraction: number): Promise<void>;
    /** A sentence for the run record's caveats ("Dangling mass returns to the seeds."). */
    note(text: string): void;
    /** Record how an iterative method ended; a run that did not converge says so in its caveats. */
    converged(converged: boolean, iterations: number): void;
}

/** A score. undefined, null, NaN or an infinity means "not measured": the element publishes nothing for it. */
export type Score = number | null | undefined;

interface AlgorithmDefinitionBase<O extends OptionsShorthand> extends DefinitionBase<O> {
    /** "undirected" (the default) ignores edge direction, and the directed accessors of the view throw. */
    readonly direction?: "undirected" | "directed";
    /** The edge "attribute" option that holds weights, and what they mean. Recorded in the caveats. */
    readonly weights?: { readonly option: keyof O & string; readonly meaning: "distance" | "strength" };
    /** For a whole-graph function that walks the graph repeatedly: the integer option that caps the passes. */
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

// =============================================================================================
// Layout
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
     * Where each node goes, in scene units (a node at the default size is 1 unit across). A node
     * missing from the map, or mapped to null or to a non-finite number, is UNPLACED. A value for a
     * pinned or held node is ignored.
     */
    readonly place: (
        graph: GraphView,
        context: LayoutContext<OptionValuesOf<O>>,
    ) => ReadonlyMap<NodeId, Point | null> | Promise<ReadonlyMap<NodeId, Point | null>>;
}

// =============================================================================================
// Palette
// =============================================================================================

/** A colour-vision deficiency a palette may claim to stay distinguishable under. */
export type ColorVisionDeficiency = PaletteDescriptor["colorblindSafe"][number];

export interface PaletteDefinition {
    readonly id: string;
    readonly kind: PaletteDescriptor["kind"];
    /**
     * Any colour CSS can parse EXCEPT var(), which definePalette refuses with the fix in the
     * message. Normalised to six-digit hex. A categorical palette has one colour per group; the
     * element never wraps.
     */
    readonly colors: readonly string[];
    readonly name?: string;
    readonly description?: string;
    /** A claim the element takes on trust. Default: no claim. */
    readonly colorblindSafe?: readonly ColorVisionDeficiency[];
}

/**
 * The consumer call the simple tier adds to the element and to session.styles: the palette a
 * colour binding uses when it names none, one per kind, resolved when a layer is written.
 */
export interface DefaultPaletteControls {
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
// Logging
// =============================================================================================

export type LogLevelName = "error" | "warn" | "info" | "debug" | "trace";

/** A log record as a simple destination receives it. Frozen. */
export interface PlainLogRecord {
    readonly time: Date;
    readonly level: LogLevelName;
    /** The category path joined with "." ("graphty.layout.ngraph"). */
    readonly category: string;
    readonly message: string;
    readonly data?: Readonly<Record<string, unknown>>;
    /** The failure as plain data, so JSON.stringify(record) keeps it. */
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
     * `Promise<unknown>` rather than `Promise<void>`, as simple.d.ts declares it, so `fetch(...)`
     * (a `Promise<Response>`) can be returned as it is.
     */
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- the spec's shape: void here means "any return, ignored"
    readonly write: (record: PlainLogRecord) => void | Promise<unknown>;
    /** Attach now (the default) or only register, for a configuration to turn on by id. */
    readonly attach?: boolean;
}

// =============================================================================================
// The define* signatures, declared once so the stubs and the builds agree
// =============================================================================================

/** A definition that declares no options. */
type NoOptions = Readonly<Record<never, never>>;

export type DefineAlgorithm = <const O extends OptionsShorthand = NoOptions>(
    definition: AlgorithmDefinition<O>,
    options?: RegisterOptions,
) => void;
export type DefineLayout = <const O extends OptionsShorthand = NoOptions>(
    definition: LayoutDefinition<O>,
    options?: RegisterOptions,
) => void;
export type DefinePalette = (definition: PaletteDefinition, options?: RegisterOptions) => void;
export type DefineLogDestination = (definition: LogDestinationDefinition, options?: RegisterOptions) => () => void;
