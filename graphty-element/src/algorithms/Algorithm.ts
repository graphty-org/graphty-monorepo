import type { Graph as AlgorithmGraph } from "@graphty/algorithms";

import { publishAlgorithmDescriptor } from "../catalog/registry";
import type { AlgorithmDescriptor, FieldDescriptor } from "../catalog/types";
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
