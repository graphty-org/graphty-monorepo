import { accelerated, type AcceleratedAlgorithms, type Graph as AlgorithmGraph } from "@graphty/algorithms";
import { type GraphSnapshot, INVALID_INDEX, type U32 } from "@graphty/graph-format";

import { narrowAlgorithms } from "../acceleration/narrow";
import { type AccelerationPrecision, CPU_PRECISION } from "../acceleration/types";
import { publishAlgorithmDescriptor } from "../catalog/registry";
import type { AlgorithmDescriptor, FieldDescriptor, NodeId } from "../catalog/types";
import { type OptionsSchema as ZodOptionsSchema } from "../config";
import { GraphtyError } from "../errors";
import { Graph } from "../Graph";
import type { RunResult } from "../session/results";
import type { AlgorithmRunContext } from "./results/types";
import { type OptionsFromSchema, type OptionsSchema, resolveOptions } from "./types/OptionSchema";
import { type AlgorithmGraphMode, toAlgorithmGraph } from "./utils/snapshotGraph";

/**
 * Type for algorithm class constructor
 * Uses any for options to allow flexibility with different algorithm option types
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AlgorithmClass = new (g: Graph, options?: any) => Algorithm;

/**
 * Interface for Algorithm class static members
 * Exported for use in type annotations when referencing algorithm classes
 */
export interface AlgorithmStatics {
    type: string;
    namespace: string;
    /**
     * What the catalogue publishes about this algorithm, for a plugin that wants to be one.
     *
     * DECLARING IT IS WHAT MAKES A PLUGIN A FIRST-CLASS ALGORITHM. Without it a class can be
     * registered and called, and that is all: the run machinery resolves a key through the
     * catalogue, so a class the catalogue does not carry cannot be started as a run, and
     * everything hanging off a run is out of reach -- progress, cancellation, a cost estimate
     * before the click, a ranking, a histogram, a summary, a plain-language reading, and the
     * styling the element derives from a result's shape.
     *
     * The `shape` is the load-bearing field: field NAMES are fixed by the shape rather than by
     * the algorithm, which is what lets any consumer read `results.<runId>.value` without
     * opening the catalogue first. `checkShapeContract` will tell you whether your fields match
     * the shape you declared.
     *
     * Absent, the class stays exactly as capable as it was: registered, callable through the
     * 1.10 address, and invisible to the catalogue.
     */
    descriptor?: AlgorithmDescriptor;
    /**
     * A cost model in seconds over a graph of n nodes and m edges.
     *
     * HERE RATHER THAN ON THE DESCRIPTOR, because a function is not plain JSON and the composed
     * catalogue has to survive `JSON.stringify` and a `postMessage` to a worker. The registry
     * keeps the model beside the class reference, and the estimator reads it from there, so a
     * plugin supplies real arithmetic for "what would this cost before I click" without a
     * descriptor ever carrying something unserialisable.
     *
     * Absent, the element estimates from the `costClass` the descriptor declares, which is what
     * every algorithm this package ships does.
     */
    cost?: (n: number, m: number) => number;
    /**
     * The plugin's own version, recorded on every run this algorithm produces.
     *
     * A saved run records the versions of the code that produced its numbers. Without this a run
     * of a third party's algorithm recorded the element's version and the two sibling packages'
     * and nothing at all identifying the code that actually did the work.
     */
    version?: string;
    optionsSchema: OptionsSchema;
    /** @deprecated Use getZodOptionsSchema() instead */
    getOptionsSchema(): OptionsSchema;
    /** @deprecated Use hasZodOptions() instead */
    hasOptions(): boolean;
    /** NEW: Zod-based options schema for unified validation and UI metadata */
    zodOptionsSchema?: ZodOptionsSchema;
    /** Get the Zod-based options schema for this algorithm */
    getZodOptionsSchema(): ZodOptionsSchema;
    /** Check if this algorithm has a Zod-based options schema */
    hasZodOptions(): boolean;
}

const algorithmRegistry = new Map<string, AlgorithmClass>();

/**
 * One piece of accelerable work, with the decision "accelerator or CPU" already taken.
 *
 * An adapter reads the snapshot it is over, runs the work through {@link run}, and writes ONE
 * loop over an index-aligned result whichever path produced it. The precision that comes back is
 * what the run publishes as `caveats.precision`: a result computed on an accelerator says `f32`
 * and one computed on the CPU port says `f64`, and a reader comparing two numbers has the
 * qualification that explains the difference.
 *
 * Exported only because it is the return type of a protected member, which declaration emit
 * requires to be nameable. An adapter receives one from `Algorithm.accelerated`; nothing outside
 * this module constructs one or needs to name it.
 * @internal
 */
export interface AcceleratedAlgorithmRun {
    /**
     * The snapshot the work runs over: the declared one for `"directed"`, the undirected view for
     * `"undirected"`, in either case with every group of parallel edges collapsed to one edge
     * carrying the group's summed weight. Its `ids` map is how a node id becomes the index every
     * result is keyed by, and the node space is the declared one either way.
     */
    readonly snapshot: GraphSnapshot;
    /**
     * Declared edge index -> edge index in {@link snapshot}, or null when the edge space is the
     * declared one.
     *
     * This is the direction an edge-carrying result is read in: an adapter walks the element's own
     * edges, maps each one's `Edge.index` through this, and asks whether that index is in the
     * result. Read the other way (`edgeOrigin`) a merged group names only its survivor, so every
     * edge the reader declared but one would silently go unflagged -- both halves of a reciprocal
     * pair the undirected view collapsed, and every member of a group of parallel edges.
     */
    readonly edgeRemap: U32 | null;
    /**
     * Runs the work, on the accelerator when the controller said so and on the CPU port when it
     * did not.
     *
     * A property rather than a method, so an adapter may take it out of the object it came in --
     * `const { run } = this.accelerated(...)` -- which is how every one of them reads.
     * @param fn - The work, written once against the dispatcher.
     * @returns What the work produced, and the arithmetic it was produced in.
     * @throws Whatever the accelerator threw, with its code. A failure after the work started is
     * the run's failure: nothing is recomputed on the CPU.
     */
    readonly run: <T>(
        fn: (dispatch: AcceleratedAlgorithms, snapshot: GraphSnapshot) => Promise<T>,
    ) => Promise<{
        /** What `fn` returned. */
        readonly value: T;
        /** The arithmetic it was computed in. */
        readonly precision: AccelerationPrecision;
    }>;
}

// algorithmResults layout:
// {
//     node: {
//         id: {
//             namespace: {
//                 algorithm: {
//                     result: unknown
//                 }
//             }
//         }
//     },
//     edge: {
//         id: {
//             namespace: {
//                 algorithm: {
//                     result: unknown
//                 }
//             }
//         }
//     },
//     graph: {
//         namespace: {
//             algorithm: {
//                 result: unknown
//             }
//         }
//     }
// }

/**
 * One map from the declared edge space onto the space a run's result is keyed by.
 *
 * Two derivations can stand between the two -- the undirected view, which collapses a reciprocal
 * pair, and the simplification, which collapses a group of parallel edges -- and each publishes a
 * map from ITS input. An adapter has one edge index to look up, `Edge.index`, so the two are
 * composed here rather than at every call site. A step that changed nothing publishes no map,
 * which is why either argument may be null.
 * @param first - Declared edge index -> index in the undirected view, or null.
 * @param second - Index in that view -> index in the simplified snapshot, or null.
 * @returns The composed map, or null when neither step renumbered anything.
 */
function composeEdgeRemap(first: U32 | null, second: U32 | null): U32 | null {
    if (second === null) {
        return first;
    }

    if (first === null) {
        return second;
    }

    const composed = new Uint32Array(first.length);
    for (let edge = 0; edge < first.length; edge++) {
        const middle = first[edge];
        // A dropped edge has nowhere to land in the second space, and INVALID_INDEX is how it says
        // so -- indexing with it would read a neighbour's answer.
        composed[edge] = middle === INVALID_INDEX ? INVALID_INDEX : second[middle];
    }

    return composed;
}

/**
 * Base class for all graph algorithms
 * @template TOptions - The options type for this algorithm (defaults to empty object)
 * @example
 * ```typescript
 * // Algorithm with options
 * interface PageRankOptions {
 *     dampingFactor: number;
 *     maxIterations: number;
 * }
 *
 * class PageRankAlgorithm extends Algorithm<PageRankOptions> {
 *     static optionsSchema: OptionsSchema = {
 *         dampingFactor: { type: 'number', default: 0.85, ... },
 *         maxIterations: { type: 'integer', default: 100, ... }
 *     };
 *
 *     async run(): Promise<void> {
 *         const { dampingFactor, maxIterations } = this.options;
 *         // ... use options
 *     }
 * }
 * ```
 */
export abstract class Algorithm<TOptions extends Record<string, unknown> = Record<string, unknown>> {
    static type: string;
    static namespace: string;

    /**
     * Options schema for this algorithm
     *
     * Subclasses should override this to define their configurable options.
     * An empty schema means the algorithm has no configurable options.
     * @deprecated Use zodOptionsSchema instead for new implementations
     */
    static optionsSchema: OptionsSchema = {};

    /**
     * NEW: Zod-based options schema with rich metadata for UI generation.
     *
     * Override in subclasses to define algorithm-specific options.
     * This is the new unified system that provides both validation and UI metadata.
     */
    static zodOptionsSchema?: ZodOptionsSchema;

    protected graph: Graph;

    /**
     * Resolved options for this algorithm instance
     *
     * Options are resolved at construction time by:
     * 1. Starting with schema defaults
     * 2. Overriding with any provided options
     * 3. Validating all values against the schema
     *
     * Note: Named with underscore prefix to avoid conflicts with
     * existing algorithm implementations that have their own
     * options properties (will be removed in future refactoring).
     */
    protected _schemaOptions: TOptions;

    /**
     * Getter for schema options
     *
     * Algorithms that use the new schema-based options should access
     * options via this getter.
     * @returns The resolved schema options
     */
    protected get schemaOptions(): TOptions {
        return this._schemaOptions;
    }

    /**
     * Creates a new algorithm instance
     * @param g - The graph to run the algorithm on
     * @param options - Optional configuration options (uses schema defaults if not provided)
     */
    constructor(g: Graph, options?: Partial<TOptions>) {
        this.graph = g;
        this._schemaOptions = this.resolveOptions(options);
    }

    /**
     * The `@graphty/algorithms` Graph this run reads, built from the element's graph snapshot.
     *
     * This is the ONLY way an algorithm should obtain its input. The `Node` and `Edge` objects the
     * data manager also holds are render objects -- each `Node` builds a Babylon mesh in its
     * constructor -- and reading the graph out of them ties every algorithm to a renderer and to
     * whatever part of a data load the scene has caught up with.
     * @param mode - the shape this algorithm needs; see {@link AlgorithmGraphMode}
     * @returns a freshly built Graph for the algorithm package
     */
    protected algorithmGraph(mode: AlgorithmGraphMode): AlgorithmGraph {
        return toAlgorithmGraph(this.graph.getDataManager(), mode);
    }

    /**
     * The route an algorithm with an accelerated implementation takes.
     *
     * It is the counterpart of {@link algorithmGraph} for the algorithms `@graphty/algorithms`
     * can dispatch: instead of copying the snapshot into an object graph, the work runs over the
     * snapshot itself, on the attached accelerator or on the index-based CPU port, and the adapter
     * writes one loop over an index-aligned result either way.
     *
     * THE DECISION IS TAKEN ONCE, HERE, BEFORE ANY WORK STARTS. The controller answers "the policy
     * is off", "no accelerator", "below `acceleration.minNodes`" or "this accelerator does not
     * implement that" up front, and under `acceleration="required"` it throws `E_NO_ACCELERATOR`
     * rather than answering quietly. After the work has started there is no second decision: a
     * failure from the accelerator propagates with its code and fails the run, because a number
     * that silently came from somewhere else is worse than no number.
     * @param capability - The accelerator member this work would use, such as `"pageRank"`.
     * @param mode - The shape this algorithm needs; see {@link AlgorithmGraphMode}. `"undirected"`
     *   takes the snapshot's undirected view, which is what collapses a reciprocal pair into one
     *   edge.
     * @returns The snapshot, the edge map onto it, and the runner.
     * @example
     * ```ts
     * const { snapshot, run } = this.accelerated("connectedComponents", "undirected");
     * const { value, precision } = await run((dispatch, s) => dispatch.connectedComponents(s));
     * const group = value.labels[snapshot.ids.indexOf(nodeId)];
     * ```
     */
    protected accelerated(capability: string, mode: AlgorithmGraphMode): AcceleratedAlgorithmRun {
        const data = this.graph.getDataManager();
        const declared = data.getSnapshot();
        /* The undirected view is derived once per snapshot and cached by the store, and it leaves
           the NODE space alone -- so a node result indexes the declared snapshot's nodes directly
           and only an EDGE result needs the map. */
        const derived = mode === "undirected" ? data.undirected(declared) : null;
        const oriented = derived === null ? declared : derived.snapshot;
        /* THE ELEMENT SIMPLIFIES BEFORE IT DISPATCHES, the same step `toAlgorithmGraph` takes for
           the object-graph route, and for a reason that outlives that route's inability to hold
           two edges between one pair: a group of parallel edges becomes ONE edge carrying the
           group's summed weight, because a repeated edge between two nodes is MORE connection
           rather than the same connection -- the reading a weighted layout gives the same data.
           Two things depend on it. The run agrees with the caveat `AlgorithmManager` appends over
           a multigraph ("N parallel edges were merged, with weights summed"), and EVERY member of
           a merged group carries the merged value, because they all map to the survivor through
           the remap below. Without it a spanning tree or a route would flag one of two coincident
           edges and leave its twin unpainted, which reads as a rendering glitch. */
        const collapsed = oriented.flags.multigraph ? oriented.simplified({ weights: "sum" }) : null;
        const snapshot = collapsed === null ? oriented : collapsed.snapshot;
        const controller = this.graph.acceleration;
        const work = { capability, nodeCount: snapshot.nodeCount };

        return {
            snapshot,
            edgeRemap: composeEdgeRemap(derived?.edgeRemap ?? null, collapsed?.edgeRemap ?? null),
            run: async <T>(
                fn: (dispatch: AcceleratedAlgorithms, s: GraphSnapshot) => Promise<T>,
            ): Promise<{ value: T; precision: AccelerationPrecision }> => {
                const outcome = await controller.run(work, (accelerator) =>
                    fn(accelerated(narrowAlgorithms(accelerator)), snapshot),
                );

                if (outcome.accelerated) {
                    return { value: outcome.value, precision: outcome.precision };
                }

                // The CPU port, through the SAME dispatcher: one call site, one result shape, one
                // loop in the adapter above.
                return { value: await fn(accelerated(null), snapshot), precision: CPU_PRECISION };
            },
        };
    }

    /**
     * The dense row of a node the reader named in an option.
     *
     * A search takes its source as an id and the snapshot answers in indices, so this is where the
     * two meet -- and where an id that names no node in the graph is reported as what it is: an
     * option whose value is outside the permitted range, carrying the option's name and what was
     * passed, rather than a silent empty result or a search from row zero.
     * @param snapshot - The graph the work runs over.
     * @param option - The option the id came from, named in the error.
     * @param id - The node id the reader gave.
     * @returns The node's dense row.
     * @throws A `GraphtyError` with `E_OPTION_RANGE` when the graph has no such node.
     */
    protected nodeIndex(snapshot: GraphSnapshot, option: string, id: NodeId): number {
        const index = snapshot.ids.indexOf(id);

        if (index === INVALID_INDEX) {
            throw new GraphtyError({
                code: "E_OPTION_RANGE",
                message: `the graph has no node "${String(id)}", so "${option}" names nothing to run from`,
                source: "run",
                details: { option, value: id },
            });
        }

        return index;
    }

    /**
     * Resolves and validates options against the schema
     * @param options - User-provided options (partial)
     * @returns Fully resolved options with defaults applied
     */
    protected resolveOptions(options?: Partial<TOptions>): TOptions {
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- Supporting backward compatibility
        const schema = (this.constructor as typeof Algorithm).optionsSchema;

        // If no schema defined, return empty object (backward compatible)
        if (Object.keys(schema).length === 0) {
            return {} as TOptions;
        }

        return resolveOptions(schema, options as Partial<OptionsFromSchema<typeof schema>>) as TOptions;
    }

    /**
     * Gets the algorithm type
     * @returns The algorithm type identifier
     */
    get type(): string {
        return (this.constructor as typeof Algorithm).type;
    }

    /**
     * Gets the algorithm namespace
     * @returns The algorithm namespace identifier
     */
    get namespace(): string {
        return (this.constructor as typeof Algorithm).namespace;
    }

    abstract run(g: Graph): Promise<void>;

    /**
     * Compute this algorithm and publish what it produced as a result object.
     *
     * This is the entry point the run machinery calls, and it is the one that makes an algorithm
     * startable as a `Run`: it takes a signal it must throw from, a progress channel, a yield, and
     * the run id the result is published under -- and it RETURNS the result rather than writing it
     * somewhere a caller has to go looking for. `run()` is the 1.10 entry point beside it, which
     * returns nothing and can be neither watched nor stopped.
     *
     * The default refuses, because an algorithm that has not been migrated genuinely cannot answer
     * a run: it publishes through side effects under its own names and has no result object to
     * hand back. Both shipped families -- a metric and a declared algorithm -- override it.
     * @param _context - A signal, a progress channel and a yield.
     * @param runId - The id the result is published under.
     * @param _fields - The catalogue's descriptors for this algorithm's fields, when the caller
     *   holds them.
     * @returns The result, or undefined when there was nothing to compute.
     * @throws A `GraphtyError` with code `E_UNSUPPORTED` when this algorithm has no result to
     *   publish.
     */
    publishResult(
        _context: AlgorithmRunContext,
        runId: string,
        _fields?: readonly FieldDescriptor[],
    ): Promise<RunResult | undefined> {
        return Promise.reject(
            new GraphtyError({
                code: "E_UNSUPPORTED",
                message: `The "${this.namespace}:${this.type}" algorithm writes its result through side effects and cannot be started as a run.`,
                source: "run",
                target: { kind: "run", id: runId },
                details: { algorithm: `${this.namespace}:${this.type}` },
            }),
        );
    }

    /**
     * Registers an algorithm class in the global registry
     * @param cls - The algorithm class to register
     * @returns The registered algorithm class
     */
    static register<T extends AlgorithmClass>(cls: T): T {
        const statics = cls as unknown as Partial<AlgorithmStatics>;
        const t = String(statics.type);
        const ns = String(statics.namespace);

        /* THE CATALOGUE IS PUBLISHED BEFORE THE CLASS IS FILED, and the order is the whole
           point. Filing first meant a registration the catalogue refused -- a descriptor whose
           key disagrees with `static type`, a key a built-in already holds -- still left a
           runnable class behind under the address the refusal was about, so `graph.runAlgorithm`
           reached an algorithm that no catalogue listed and no consumer could have chosen.
           Published here rather than by the plugin author, so a descriptor and the class it
           describes cannot be registered separately: a catalogue entry whose class nothing
           registered is an algorithm a consumer can see, start, and then be told does not
           exist. */
        const { descriptor, cost, version } = statics;

        if (descriptor !== undefined) {
            publishAlgorithmDescriptor({
                descriptor,
                namespace: ns,
                type: t,
                ...(cost === undefined ? {} : { cost }),
                ...(version === undefined ? {} : { version }),
            });
        }

        algorithmRegistry.set(`${ns}:${t}`, cls);

        return cls;
    }

    /**
     * Gets an algorithm instance from the registry
     * @param g - The graph to run the algorithm on
     * @param namespace - The algorithm namespace
     * @param type - The algorithm type
     * @param options - Optional algorithm-specific options to pass to constructor
     * @returns A new instance of the algorithm, or null if not found
     */
    static get(g: Graph, namespace: string, type: string, options?: Record<string, unknown>): Algorithm | null {
        const SourceClass = algorithmRegistry.get(`${namespace}:${type}`);
        if (SourceClass) {
            return new SourceClass(g, options);
        }

        return null;
    }

    /**
     * Gets an algorithm class from the registry
     * @param namespace - The algorithm namespace
     * @param type - The algorithm type
     * @returns The algorithm class, or null if not found
     */
    static getClass(namespace: string, type: string): (AlgorithmClass & AlgorithmStatics) | null {
        return (algorithmRegistry.get(`${namespace}:${type}`) as (AlgorithmClass & AlgorithmStatics) | null) ?? null;
    }

    /**
     * Get the options schema for this algorithm
     * @returns The options schema, or an empty object if no options defined
     * @deprecated Use getZodOptionsSchema() instead
     */
    static getOptionsSchema(): OptionsSchema {
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- Implementation of deprecated method
        return this.optionsSchema;
    }

    /**
     * Check if this algorithm has configurable options
     * @returns true if the algorithm has at least one option defined
     * @deprecated Use hasZodOptions() instead
     */
    static hasOptions(): boolean {
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- Implementation of deprecated method
        return Object.keys(this.optionsSchema).length > 0;
    }

    /**
     * Get the Zod-based options schema for this algorithm.
     * @returns The Zod options schema, or an empty object if no schema defined
     */
    static getZodOptionsSchema(): ZodOptionsSchema {
        return this.zodOptionsSchema ?? {};
    }

    /**
     * Check if this algorithm has a Zod-based options schema.
     * @returns true if the algorithm has a Zod options schema defined
     */
    static hasZodOptions(): boolean {
        return this.zodOptionsSchema !== undefined && Object.keys(this.zodOptionsSchema).length > 0;
    }

    /**
     * Get all registered algorithm names.
     * @param namespace - Optional namespace to filter by
     * @returns Array of algorithm names in "namespace:type" format
     */
    static getRegisteredAlgorithms(namespace?: string): string[] {
        const algorithms: string[] = [];
        for (const key of algorithmRegistry.keys()) {
            if (!namespace || key.startsWith(`${namespace}:`)) {
                algorithms.push(key);
            }
        }

        return algorithms.sort();
    }

    /**
     * Get all registered algorithm types.
     * This method is provided for API consistency with DataSource.
     * @returns Array of algorithm keys in "namespace:type" format
     * @since 1.5.0
     * @example
     * ```typescript
     * const types = Algorithm.getRegisteredTypes();
     * console.log('Available algorithms:', types);
     * // ['graphty:betweenness', 'graphty:closeness', 'graphty:degree', ...]
     * ```
     */
    static getRegisteredTypes(): string[] {
        return this.getRegisteredAlgorithms();
    }
}
