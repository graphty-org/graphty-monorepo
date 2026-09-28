/**
 * Algorithm extension point. NORMATIVE for shapes; behaviour in design/extensions/algorithm.md.
 * Entry point: @graphty/graphty-element/extend. Serialised form of the descriptor:
 * design/extensions/descriptors.schema.json#/$defs/AlgorithmDescriptor.
 */
import type { EdgeMask, GraphSnapshot, NodeMask } from "@graphty/graph-format";
import type { OptionDescriptor } from "./common";

// =============================================================================================
// Published (graphty-element 2.6.1)
// =============================================================================================

/** An algorithm key: a built-in name or a registered one. OPEN UNION. */
export type AlgorithmKey = string;

/** The result shapes. OPEN UNION for readers; CLOSED for writers (use one the element publishes). */
export type ResultShape =
    | "node-metric" | "edge-metric" | "community" | "layered-grouping" | "category-table"
    | "path" | "node-set" | "edge-set" | "pair-list" | "temporal" | "fact";

export type CostClass = "instant" | "iterative" | "heavy" | "cubic" | "unbounded";

/** One field a result publishes. Build it with metricField or a field-spec builder, not by hand. */
export interface FieldDescriptor {
    name: string;
    plainName: string;
    technicalName: string;
    kind: "node" | "edge" | "graph";
    type: "number" | "integer" | "boolean" | "string" | "table";
    unit?: string;
    normalization?: string;
    /** The result path. Derived by the builders; an author SHOULD NOT write it. */
    path: string;
}

/** One algorithm, as the catalogue publishes it. IMPLEMENTED BY EXTENSIONS (as static descriptor). */
export interface AlgorithmDescriptor {
    /** MUST equal the class's static type. */
    key: AlgorithmKey;
    plainName: string;
    technicalName: string;
    description: string;
    category: "centrality" | "community" | "path" | "flow" | "structure" | "prediction" | (string & {});
    shape: ResultShape;
    /** MUST satisfy checkShapeContract(shape, fields). No field may be named "runs". */
    fields: readonly FieldDescriptor[];
    options: readonly OptionDescriptor[];
    costClass: CostClass;
    /** Big-O in words, e.g. "O(n + m)". */
    complexity: string;
    approximable?: { method: string; plainName: string; defaultSample: number; seeded: boolean };
    /** Preconditions. The element refuses a run whose graph does not meet them. */
    requires?: { directed?: boolean; weighted?: boolean; accelerator?: boolean; connected?: boolean };
    /** DERIVED from static scopeInput; an author leaves it out. OPEN UNION; unknown reads as "none". */
    scopeInput?: "none" | "subgraph";
}

/** How parallel edges merge in the compact subgraph. */
export type SimplifyPolicy = "sum" | "min" | "max" | "none";

export interface ScopedInputOptions {
    readonly simplify?: SimplifyPolicy;
}

/** What a run computes over. CALLED BY EXTENSIONS. OPEN: may gain members in a minor release. */
export interface ScopedInput {
    /** The full graph, declared orientation. */
    readonly graph: GraphSnapshot;
    /** The scope's nodes over `graph`. */
    readonly nodes: NodeMask;
    /** The scope's edges over the declared `graph`. */
    readonly edges: EdgeMask;
    /** True when the scope is the whole graph. */
    readonly whole: boolean;
    readonly nodeCount: number;
    readonly edgeCount: number;
    /** The compact snapshot of the scope in the asked orientation. Lazy, cached, shared. */
    subgraph(): GraphSnapshot;
}

/** A progress report. Every member optional; an absent member is unchanged. */
export interface RunProgressReport {
    readonly phase?: string;
    readonly completed?: number;
    readonly total?: number | null;
    readonly message?: string;
}

/** What a run gives compute. CALLED BY EXTENSIONS. */
export interface AlgorithmRunContext {
    /** Aborted when the run is cancelled. Throw its reason; never swallow it. */
    readonly signal: AbortSignal;
    report(progress: RunProgressReport): void;
    /** Hand the frame back. Await it between chunks of work. */
    yieldNow(): Promise<void>;
    input(orientation: "declared" | "undirected", options?: ScopedInputOptions): ScopedInput;
}

/** One field a run actually filled. */
export interface ResultFieldSpec {
    readonly name: string;
    readonly kind: "node" | "edge" | "graph";
    readonly type: "number" | "integer" | "boolean" | "string" | "table";
    readonly normalization?: string;
}

/** A node or edge and the values published for it. Edge ids are the element's Edge.id. */
export interface ResultElementValues<Id extends string | number = string | number> {
    readonly id: Id;
    readonly values: Readonly<Record<string, unknown>>;
}

export type RunDirection = "directed" | "undirected" | "as-loaded";
export interface WeightMeaning {
    readonly attribute: string;
    readonly meaning: "distance" | "strength";
}

/** What qualifies the numbers. Build with declaredCaveats. */
export interface Caveats {
    readonly exact: boolean;
    readonly sampleSize?: number;
    readonly seed?: number | null;
    readonly converged?: boolean;
    readonly iterations?: number;
    readonly componentScope?: "all" | "largest";
    readonly filterScope?: boolean;
    readonly windowScope?: boolean;
    readonly direction: RunDirection;
    readonly weight?: WeightMeaning | null;
    readonly precision: "f32" | "f64";
    readonly method: string;
    readonly partialReason?: string;
    readonly notes: readonly string[];
}

/** What compute returns. IMPLEMENTED BY EXTENSIONS (as a return value). */
export interface AlgorithmOutput {
    readonly shape: ResultShape;
    readonly fields: readonly ResultFieldSpec[];
    readonly nodes?: readonly ResultElementValues[];
    readonly edges?: readonly ResultElementValues<string>[];
    readonly graph?: Readonly<Record<string, unknown>>;
    readonly caveats: Caveats;
}

/**
 * The published base. A third-party algorithm EXTENDS DeclaredAlgorithm and implements compute.
 * The constructor takes the element's renderer-backed Graph; a plugin never calls it.
 */
export declare abstract class Algorithm<TOptions extends Record<string, unknown> = Record<string, unknown>> {
    static type: string;
    /** The legacy address is `${namespace}:${type}`; a plugin uses its vendor name. */
    static namespace: string;
    /** "subgraph" to be handed the scope; absent or "none" to be handed the whole graph. */
    static scopeInput?: "none" | "subgraph";
    static parallelEdges?: SimplifyPolicy;
    /** The algorithm's own version; recorded on every run as provenance. */
    static version?: string;
    /** Estimated seconds over n nodes and m edges. Lives on the class, never in the descriptor. */
    static cost?: (n: number, m: number) => number;
    static costUnits?: (n: number, m: number) => number;

    protected get schemaOptions(): TOptions;

    /**
     * @deprecated Owner decision 2026-09-28: deprecated in a 3.x minor, removed in
     * graphty-element 4.0 together with @graphty/algorithms 3.0. Use context.input(...).
     */
    protected algorithmGraph(mode: "directed" | "undirected"): unknown;

    /** Row of a node id in a snapshot; E_OPTION_RANGE naming the option when the graph has no such node. */
    protected nodeIndex(snapshot: GraphSnapshot, option: string, id: string | number): number;

    get type(): string;
    get namespace(): string;

    /** Register the class. Returns it. NOTE: takes no RegisterOptions in 2.6.1 (README decision 6). */
    static register<T extends abstract new (...args: never[]) => Algorithm>(cls: T): T;
}

export declare abstract class DeclaredAlgorithm<
    TOptions extends Record<string, unknown> = Record<string, unknown>,
> extends Algorithm<TOptions> {
    /** REQUIRED for catalogue parity. Without it the class is callable only by its legacy address. */
    static descriptor?: AlgorithmDescriptor;
    /** Compute and RETURN the result; never write it anywhere. Null when there was nothing to compute. */
    abstract compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null>;
}

/** Field helpers: build fields and their paths so an author never writes a path. */
export declare function metricField(spec: Omit<FieldDescriptor, "path">): FieldDescriptor;
export declare function nodeMetricFields(value: {
    readonly plainName: string;
    readonly technicalName: string;
    readonly type?: "number" | "integer";
}): readonly FieldDescriptor[];

/** The ResultFieldSpec list a node-metric or edge-metric run fills. */
export declare function metricFieldSpecs(kind: "node" | "edge", valueType?: "number" | "integer"): readonly ResultFieldSpec[];

/** Fill the caveats every exact double-precision run shares. */
export declare function declaredCaveats(init: Partial<Caveats> & { method: string; direction: RunDirection }): Caveats;

/** Walk items in frame-sized chunks, reporting progress and yielding. Honours the signal. */
export declare function forEachChunked<T>(
    context: Pick<AlgorithmRunContext, "signal" | "report" | "yieldNow">,
    phase: string,
    items: readonly T[],
    step: (item: T, index: number) => void,
): Promise<void>;

/** Check fields against the contract of a shape. Empty when they conform. */
export declare function checkShapeContract(
    shape: ResultShape,
    fields: readonly FieldDescriptor[],
): readonly { readonly field: string | null; readonly kind: "node" | "edge" | "graph"; readonly reason: string }[];

export declare function registeredAlgorithmDescriptors(): readonly AlgorithmDescriptor[];
export declare function clearRegisteredAlgorithmsForTesting(): void;

// =============================================================================================
// Proposed (NOT built)
// =============================================================================================

/**
 * PROPOSED -- open decision "The public edge identity accessor" (README.md 12, item 5).
 * Added to ScopedInput. Without it, a plugin that reads only the snapshot cannot publish an
 * edge-shaped result once algorithmGraph is removed.
 */
export interface ScopedInputEdgeIdentity {
    /** The element's Edge.id of row `row` of `graph` (declared orientation). */
    edgeId(row: number): string;
    /**
     * The element's Edge.id(s) behind row `row` of `subgraph()`. More than one when parallel
     * edges were merged by the simplify policy; in the undirected view, both directions.
     */
    subgraphEdgeIds(row: number): readonly string[];
}

/**
 * PROPOSED -- the headless algorithm host (algorithm.md section 10). Runs a DeclaredAlgorithm
 * class over a snapshot with no renderer, in Node or a worker, and returns what compute returned
 * after the element's own checks (shape contract, option resolution, caveat defaults).
 */
export declare function runAlgorithmHeadless(
    cls: abstract new (...args: never[]) => DeclaredAlgorithm,
    snapshot: GraphSnapshot,
    options?: {
        readonly params?: Readonly<Record<string, unknown>>;
        readonly scope?: NodeMask;
        readonly signal?: AbortSignal;
        readonly onProgress?: (report: RunProgressReport) => void;
        /** Edge ids by row of `snapshot`; generated as "e<row>" when absent. */
        readonly edgeIds?: readonly string[];
    },
): Promise<AlgorithmOutput | null>;

/** PROPOSED -- open decision "Forwarding run options to compute" (README.md 12, item 16). */
export interface AlgorithmRunParameters {
    readonly seed?: number;
    readonly exact?: boolean;
    readonly sample?: number;
    /** Milliseconds; compute SHOULD return a partial result with caveats.partialReason when exceeded. */
    readonly timeBox?: number;
}
