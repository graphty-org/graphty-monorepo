/**
 * Algorithm extension point. NORMATIVE for shapes; behaviour in design/extensions/algorithm.md.
 * Entry point: @graphty/graphty-element/extend. Serialised form of the descriptor:
 * design/extensions/descriptors.schema.json#/$defs/AlgorithmDescriptor.
 */
import type { Column, EdgeMask, GraphSnapshot, GraphSnapshotContract, NodeMask } from "./extend-snapshot";
import type { OptionDescriptor } from "./common";

// =============================================================================================
// Published (graphty-element 2.6.1)
// =============================================================================================

/** An algorithm key: a built-in name or a registered one. OPEN UNION. */
export type AlgorithmKey = string;

/** The result shapes. OPEN UNION for readers; CLOSED for writers (use one the element publishes). */
export type ResultShape =
    | "node-metric"
    | "edge-metric"
    | "community"
    | "layered-grouping"
    | "category-table"
    | "path"
    | "node-set"
    | "edge-set"
    | "pair-list"
    | "temporal"
    | "fact";

/** NOT EXPORTED BY NAME. OPEN (README 6.3). */
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

/** How parallel edges merge in the compact subgraph; "none" keeps every parallel edge as its own row. NOT EXPORTED BY NAME. */
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

/** A progress report. Every member optional; an absent member is unchanged. Exported from ./session, not ./extend. */
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
    /**
     * Hand the frame back. Await it between chunks of work. It never rejects, cancelled or not:
     * check `signal` (signal.throwIfAborted()) beside it. The simple tier's progress() does both.
     */
    yieldNow(): Promise<void>;
    input(orientation: "declared" | "undirected", options?: ScopedInputOptions): ScopedInput;
}

/** One field a run actually filled. */
export interface ResultFieldSpec {
    readonly name: string;
    readonly kind: "node" | "edge" | "graph";
    readonly type: "number" | "integer" | "boolean" | "string" | "table";
    readonly normalization?: string;
    /** PROPOSED -- open decision 31. Which end is notable; drives rank, percentile and the ramp. Default "descending". */
    readonly order?: "descending" | "ascending";
}

/** A node or edge and the values published for it. Edge ids are the element's Edge.id. */
export interface ResultElementValues<Id extends string | number = string | number> {
    readonly id: Id;
    readonly values: Readonly<Record<string, unknown>>;
}

/** Exported from ./session (with WeightMeaning), not ./extend. */
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
    /*
     * NOT DECLARED ON THE CLASS: version, cost and costUnits. register() reads them from the class
     * as AlgorithmStatics (below); a subclass declares them WITHOUT `override`.
     */

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

    /*
     * NOT DECLARED HERE: the protected accelerated(capability, mode) route the built-ins use. Its
     * return type is internal and its capability names are unpublished, so a plugin cannot use it
     * without a cast (algorithm.md section 5.1 item 4).
     */

    /** Register the class. Returns it. NOTE: takes no RegisterOptions in 2.6.1 (README decision 6). */
    static register<T extends abstract new (...args: never[]) => Algorithm>(cls: T): T;
}

/** The statics register() reads from an algorithm class. Exported from ./extend. IMPLEMENTED BY EXTENSIONS. */
export interface AlgorithmStatics {
    descriptor?: AlgorithmDescriptor;
    /** Estimated seconds over n nodes and m edges. Prefer costUnits. Lives on the class, never in the descriptor. */
    cost?: (n: number, m: number) => number;
    /**
     * Work units of the descriptor's costClass over n nodes and m edges, for the whole run:
     * elements for instant and iterative, source-edge pairs for heavy, operations for cubic.
     * Wins over cost.
     */
    costUnits?: (n: number, m: number) => number;
    /** The algorithm's own semver version; recorded on every run as provenance. */
    version?: string;
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

/**
 * PROPOSED (simple-tier.md section 6): the fields of an edge-metric result, beside nodeMetricFields,
 * so neither tier writes the shape contract's field list by hand.
 */
export declare function edgeMetricFields(value: {
    readonly plainName: string;
    readonly technicalName: string;
    readonly type?: "number" | "integer";
}): readonly FieldDescriptor[];

/**
 * PROPOSED (simple-tier.md section 6): the fields of a community result -- group, groupSize,
 * groupCount and sizes, and modularity when asked for -- with the derived ones marked, so an author
 * declares them with one call and publishes only what communityFieldSpecs lists.
 */
export declare function communityFields(value: {
    readonly plainName: string;
    readonly technicalName: string;
    readonly modularity?: boolean;
}): readonly FieldDescriptor[];

/** PROPOSED: the ResultFieldSpec list a community run fills (group, and modularity when declared). */
export declare function communityFieldSpecs(options?: { readonly modularity?: boolean }): readonly ResultFieldSpec[];

/** The ResultFieldSpec list a node-metric or edge-metric run fills. */
export declare function metricFieldSpecs(
    kind: "node" | "edge",
    valueType?: "number" | "integer",
): readonly ResultFieldSpec[];

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
    /** Structural, so a snapshot built by the plugin's own graph-format copy is accepted. */
    snapshot: GraphSnapshotContract,
    options?: {
        readonly params?: Readonly<Record<string, unknown>>;
        readonly scope?: NodeMask;
        /** An edge scope (a time window over events). */
        readonly edges?: EdgeMask;
        /** Rows computed WITHOUT (open decision 23), for a held-out or what-if run. */
        readonly exclude?: { readonly nodes?: NodeMask; readonly edges?: EdgeMask };
        readonly signal?: AbortSignal;
        readonly onProgress?: (report: RunProgressReport) => void;
        /**
         * The element's Edge.id by row of `snapshot`. When omitted, the host applies the element's
         * own deterministic assignment (open decision 19), never an invented numbering.
         */
        readonly edgeIds?: readonly string[];
    },
): Promise<AlgorithmOutput | null>;

/**
 * PROPOSED -- open decision "Forwarding run options to compute" (README.md 12, item 16).
 * Reached through AlgorithmRunContextParameters.parameters.
 */
export interface AlgorithmRunParameters {
    /**
     * The seed actually used. When the caller passed none and the algorithm declares a "seed"
     * option, the element draws one and records it; the run's seed fills that option, and passing
     * both is E_BAD_COMMAND.
     */
    readonly seed?: number;
    readonly exact?: boolean;
    readonly sample?: number;
    /**
     * Milliseconds. When exceeded, compute MAY return what it has with caveats.exact false and
     * caveats.partialReason set; the element records the run as partial (algorithm.md 2.2 item 9).
     */
    readonly timeBox?: number;
}

/** PROPOSED -- the member of AlgorithmRunContext that carries the forwarded run options. */
export interface AlgorithmRunContextParameters {
    readonly parameters: AlgorithmRunParameters;
}

/** PROPOSED -- open decision 16. A read-only accelerator verdict on the run context. */
export interface AlgorithmRunContextAcceleration {
    readonly acceleration: {
        readonly available: boolean;
        readonly policy: "auto" | "require" | "off";
        readonly precision: "f32" | "f64" | null;
    };
}

/**
 * PROPOSED -- open decision 16. The cost model sees the resolved options, so an option that
 * multiplies the work cannot pass under the cost cap. Additive: a two-parameter function still fits.
 */
export type CostModel = (n: number, m: number, options: Readonly<Record<string, unknown>>) => number;

/**
 * PROPOSED -- open decision "Attribute, weight and result columns in the algorithm input"
 * (README.md 12, item 17). Added to ScopedInput.
 */
export interface ScopedInputColumns {
    /**
     * The column behind a declared "attribute" or "partition" option, over the rows of `graph`.
     * An option naming a result path (results.<run>.<field>) resolves to that run's published
     * values; the run record lists it as an input. E_OPTION_RANGE when the name resolves to nothing.
     */
    column(optionName: string): Column;
    /**
     * PROPOSED (simple-tier.md section 6). The column at a literal attribute or result path, for a
     * read the plugin does not let the reader rebind. Checked (E_OPTION_RANGE when nothing
     * carries it) and recorded as an input exactly as column() is.
     */
    columnAt(path: string, on?: "node" | "edge"): Column;
}

/** PROPOSED -- open decision 17. Added to ScopedInputOptions. */
export interface ScopedInputWeightOption {
    /**
     * The edge attribute that fills the snapshot's weights, and what it means. The element fills
     * caveats.weight from it; subgraph() merges it by the simplify policy. null for unweighted.
     */
    readonly weight?: WeightMeaning | null;
}

/**
 * PROPOSED -- open decision "The run record and replay" (README.md 12, item 26). What the element
 * records for every run, so a methods section can cite it and a replay can detect drift.
 */
export interface RunRecord {
    /** The run id its results live under (results.<runId>.<field>), and the caller's `as` name when one was given. */
    readonly runId: string;
    readonly name: string | null;
    readonly key: AlgorithmKey;
    /** The npm package the registration CLAIMED; absent for a built-in. Provenance, not identity. */
    readonly package?: string;
    /**
     * The algorithm's own semver version. For a built-in, the built-in's OWN version, bumped at a
     * major whenever its output changes for the same input and seed -- not the element version.
     * null for a plugin that declares none (read as unresolved on replay).
     */
    readonly version: string | null;
    readonly elementVersion: string;
    /**
     * Every option after defaults were filled, not only what the caller passed. The declared
     * "seed" option and parameters.seed carry the same value; replaying both is accepted.
     */
    readonly options: Readonly<Record<string, unknown>>;
    readonly parameters: AlgorithmRunParameters;
    /** The orientation and simplify policy the run's input used. */
    readonly orientation: "declared" | "undirected";
    readonly simplify: SimplifyPolicy;
    /** Where it ran. A replay on another route or precision reads as a different computation. */
    readonly route: "cpu" | "accelerator";
    /** The accelerator package whose kernel produced the numbers, when route is "accelerator". */
    readonly accelerator?: { readonly package: string; readonly version: string };
    /** The scope as DEFINED at run time (the set or rule, its definition copied), and a digest of the resolved member ids. */
    readonly scope: { readonly definition: unknown; readonly membersDigest: string } | null;
    /** What the run computed WITHOUT (open decision 23); part of the derived run id when present. */
    readonly exclude: { readonly definition: unknown; readonly membersDigest: string } | null;
    /** The loads the input graph was built from (LoadReport.loadId), in order. */
    readonly loadIds: readonly number[];
    /** Result paths the run read as input (ScopedInputColumns). */
    readonly inputs: readonly string[];
    /**
     * An order-independent digest over node ids, edge endpoints and ids, and every column the run
     * read (the weight column included), so two graphs with equal topology but different weights
     * differ, and a permuted load of the same file does not.
     */
    readonly inputIdentity: string;
    readonly caveats: Caveats;
    readonly partial: boolean;
}
