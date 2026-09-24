import { Algorithm } from "../algorithms/Algorithm";
import { mergedParallelEdges } from "../algorithms/utils/snapshotGraph";
import type { BuiltInAlgorithmDescriptor, LegacyAlgorithmKey } from "../catalog/algorithms";
import { registeredAlgorithmByKey } from "../catalog/registry";
import type { AlgorithmDescriptor } from "../catalog/types";
import { GraphtyError } from "../errors";
import type { Graph } from "../Graph";
import { createRunResult, resultPath, type RunResult } from "../session/results";
import type { RunExecutionContext, RunOutcome, RunProgressReport } from "../session/runs";
import type { AlgorithmSpecificOptions } from "../utils/queue-migration";
import type { EventManager } from "./EventManager";
import type { Manager } from "./interfaces";

/** The namespace every algorithm this package ships is registered under. */
const BUILT_IN_NAMESPACE = "graphty";

/** Which registered class one run should build, and what to build it with. */
interface AlgorithmTarget {
    /** The registry namespace. */
    readonly namespace: string;
    /** The registry type, which is the 1.10 key. */
    readonly type: string;
    /** What to construct the class with. */
    readonly options: Record<string, unknown>;
}

/**
 * Whether every parameter a 1.10 key stands for is present in what the caller asked for.
 * @param required - The parameters that key reproduces.
 * @param given - What the caller asked for.
 * @returns True when the key is the one that answers this call.
 */
function satisfies(required: Readonly<Record<string, unknown>>, given: Readonly<Record<string, unknown>>): boolean {
    return Object.entries(required).every(([name, value]) => given[name] === value);
}

/**
 * Which registered class answers one 2.0 algorithm key at one set of parameters.
 *
 * Two 2.0 keys fold several 1.10 classes together and the fold is a PARAMETER, not a rename:
 * `components` at `{ strength: "strong" }` is the strongly-connected class and `components` with
 * nothing said is the connected one; `shortest-path` picks its engine the same way. The catalogue
 * already states both halves, so this reads them rather than restating them -- a shim that
 * remembered the rename and forgot the parameters would silently compute the wrong answer.
 * @param descriptor - The algorithm's catalogue entry.
 * @param params - The parameters the run is starting with.
 * @returns The 1.10 key to build.
 */
function legacyKeyFor(
    descriptor: BuiltInAlgorithmDescriptor,
    params: Readonly<Record<string, unknown>>,
): LegacyAlgorithmKey {
    const matched = descriptor.legacyKeys.find(
        (candidate) => candidate.params !== undefined && satisfies(candidate.params, params),
    );

    if (matched !== undefined) {
        return matched;
    }

    // Nothing selected an engine, so the key that needs no parameters is the one that was meant.
    // Where every key names one -- shortest-path, whose three engines are all parameterised -- the
    // first is the catalogue's declared default.
    return descriptor.legacyKeys.find((candidate) => candidate.params === undefined) ?? descriptor.legacyKeys[0];
}

/**
 * Manages algorithm execution and coordination
 * Handles running algorithms from templates and individual algorithm execution
 */
export class AlgorithmManager implements Manager {
    /**
     * Creates an instance of AlgorithmManager
     * @param eventManager - Event manager for emitting algorithm events
     * @param graph - Graph instance to run algorithms on
     */
    constructor(
        private eventManager: EventManager,
        private graph: Graph,
    ) {}

    /**
     * Initializes the algorithm manager
     * @returns Promise that resolves when initialization is complete
     */
    async init(): Promise<void> {
        // AlgorithmManager doesn't need async initialization
        return Promise.resolve();
    }

    /**
     * Disposes of the algorithm manager and cleans up resources
     */
    dispose(): void {
        // No cleanup needed for algorithms
    }

    /**
     * Run one algorithm on behalf of the session's run machinery.
     *
     * This is the seam that keeps the session free of the renderer. Every algorithm this package
     * ships is constructed from a `Graph` and reads the graph through its data manager, so the
     * session -- which must resolve in Node with no Babylon.js, Lit or DOM anywhere in its import
     * graph -- cannot build one. It is handed this function instead, and what comes back is a
     * plain result object.
     *
     * What it does NOT do is write `algorithmResults`. The algorithm's own entry point publishes
     * the result and projects the 1.10 view from it, in the one place that projection lives.
     *
     * The catalogue entry arrives as an argument rather than being looked up here, because the
     * run machinery has already resolved it -- that is what validated the parameters -- and
     * looking it up a second time is how two parts of one package come to disagree about what an
     * algorithm is.
     * @param context - The run id, the algorithm, its parameters, the signal and the progress
     *   channel.
     * @param descriptor - What the catalogue says about this algorithm, or undefined when the
     *   catalogue carries no entry for it.
     * @returns What the run produced.
     * @throws A `GraphtyError` when nothing registers the key, or whatever the work threw.
     */
    async execute(context: RunExecutionContext, descriptor?: BuiltInAlgorithmDescriptor): Promise<RunOutcome> {
        /* A REGISTERED PLUGIN IS RESOLVED THE SAME WAY A BUILT-IN IS, and that is the whole point
           of it being in the catalogue. The built-in table is a compile-time constant, so the
           caller that hands a descriptor in looks it up there; a plugin arrives when somebody
           imports it, so its address is looked up here instead. Everything after this line is
           identical for both, which is what makes a plugin startable as a run rather than
           something the element treats as a lesser kind of algorithm. */
        const registered = descriptor === undefined ? registeredAlgorithmByKey(context.algorithm) : undefined;
        const published: AlgorithmDescriptor | undefined = descriptor ?? registered?.descriptor;

        if (published === undefined) {
            throw new GraphtyError({
                code: "E_UNKNOWN_ALGORITHM",
                message: `No algorithm is registered under "${context.algorithm}".`,
                source: "run",
                target: { kind: "run", id: context.runId },
                details: { algorithm: context.algorithm },
            });
        }

        const target =
            descriptor === undefined && registered !== undefined
                ? { namespace: registered.namespace, type: registered.type, options: context.params }
                : this.targetFor(descriptor as BuiltInAlgorithmDescriptor, context.params);
        const algorithm = Algorithm.get(this.graph, target.namespace, target.type, target.options);

        if (algorithm === null) {
            throw new GraphtyError({
                code: "E_UNKNOWN_ALGORITHM",
                message: `The "${context.algorithm}" algorithm resolves to "${target.namespace}:${target.type}", which nothing registers.`,
                source: "run",
                target: { kind: "run", id: context.runId },
                details: { algorithm: context.algorithm, registryKey: `${target.namespace}:${target.type}` },
            });
        }

        const result = await this.compute(algorithm, context, published);

        // NO REPAINT IS FORCED HERE, and that is the point. A run used to have to walk every node
        // and every edge itself, because a 1.x selector read `algorithmResults.<namespace>.<type>`
        // off the element and only a re-resolution could make the new value visible. A session
        // selector reads `results.<runId>.<field>`, so painting the new values is the style
        // stack's work, scheduled from the run finishing: the `algorithm-run` trigger Graph
        // registers repaints from the session's stack once the run leaves the queue.

        // A run over a multigraph is a run over the SIMPLIFIED graph -- `@graphty/algorithms`
        // cannot hold two edges between one pair -- and a reader has no other way to learn that.
        // The note is appended here rather than in each algorithm because the merge is the
        // element's doing, not any one algorithm's.
        const { caveats } = result.summary();
        const merged = mergedParallelEdges(this.graph.getDataManager());
        const noted =
            merged === 0
                ? caveats
                : {
                      ...caveats,
                      notes: [
                          ...caveats.notes,
                          `${String(merged)} parallel ${merged === 1 ? "edge was" : "edges were"} merged, with weights summed, ` +
                              `because this algorithm runs over a graph that holds one edge per pair. Every member of a merged ` +
                              `group carries the merged value.`,
                      ],
                  };

        return {
            result,
            fields: result.fields,
            summary: result.summary(),
            caveats: noted,
        };
    }

    /**
     * Run algorithms specified in the template configuration
     * Called during initialization if runAlgorithmsOnLoad is true
     * @param algorithms - Array of algorithm names in "namespace:type" format
     */
    async runAlgorithmsFromTemplate(algorithms: string[]): Promise<void> {
        const errors: Error[] = [];

        for (const algName of algorithms) {
            try {
                const trimmedName = algName.trim();
                const [namespace, type] = trimmedName.split(":");
                if (!namespace || !type) {
                    throw new Error(`invalid algorithm name format: ${trimmedName}. Expected format: namespace:type`);
                }

                await this.runAlgorithm(namespace.trim(), type.trim());
            } catch (error) {
                const algorithmError = error instanceof Error ? error : new Error(String(error));
                errors.push(algorithmError);
                // Individual error already emitted by runAlgorithm
            }
        }

        // If there were any errors, throw a summary error
        if (errors.length > 0) {
            const summaryError = new Error(
                `${errors.length} algorithm(s) failed during template execution: ${errors
                    .map((e) => e.message)
                    .join(", ")}`,
            );

            this.eventManager.emitGraphError(this.graph, summaryError, "algorithm", {
                errorCount: errors.length,
                component: "AlgorithmManager",
            });

            throw summaryError;
        }
    }

    /**
     * Run a specific algorithm by its 1.10 registry address, publishing the result through side
     * effects and returning nothing.
     *
     * This is the path a PLUGIN algorithm takes. A plugin registers itself under a
     * `namespace:type` and publishes no catalogue descriptor, so it cannot be started by key and
     * the run machinery -- which agrees with the catalogue rather than restating it -- has nothing
     * to agree with. Everything this package ships goes through {@link AlgorithmManager.execute}
     * instead, reached from `graph.run` and `session.runs.start`.
     *
     * It goes when plugin algorithms publish descriptors of their own.
     * @param namespace - Algorithm namespace (e.g., "graphty")
     * @param type - Algorithm type (e.g., "dijkstra")
     * @param algorithmOptions - Optional algorithm-specific options (source, target, etc.)
     */
    async runAlgorithm(namespace: string, type: string, algorithmOptions?: AlgorithmSpecificOptions): Promise<void> {
        try {
            // Pass options to constructor for new-style algorithms with zodOptionsSchema
            const alg = Algorithm.get(this.graph, namespace, type, algorithmOptions);
            if (!alg) {
                throw new Error(`algorithm not found: ${namespace}:${type}`);
            }

            // Also call configure for backward compatibility with legacy algorithms
            // that use the deprecated configure() method instead of constructor options
            if (algorithmOptions && "configure" in alg && typeof alg.configure === "function") {
                alg.configure(algorithmOptions);
            }

            await alg.run(this.graph);

            // As in `execute`: the repaint belongs to the style stack and is scheduled from the
            // run finishing, not forced from here. A plugin algorithm writes its results onto the
            // element's own node and edge records, which the session reads as attributes, so a
            // layer selecting on one of those paths is repainted by the same trigger.
        } catch (error) {
            // Emit error event for any error (not found or execution)
            const algorithmError = error instanceof Error ? error : new Error(String(error));

            this.eventManager.emitGraphError(this.graph, algorithmError, "algorithm", {
                algorithm: `${namespace}:${type}`,
                component: "AlgorithmManager",
            });

            throw algorithmError;
        }
    }

    /**
     * Check if an algorithm exists
     * @param namespace - Algorithm namespace
     * @param type - Algorithm type
     * @returns True if the algorithm exists, false otherwise
     */
    hasAlgorithm(namespace: string, type: string): boolean {
        try {
            const alg = Algorithm.get(this.graph, namespace, type);
            return alg !== null;
        } catch {
            return false;
        }
    }

    /**
     * Get list of available algorithms
     * TODO: This depends on the Algorithm registry implementation
     * @returns Array of available algorithm names
     */
    getAvailableAlgorithms(): string[] {
        // This would need to be implemented in the Algorithm class
        // For now, return empty array
        return [];
    }

    /**
     * Which registered class to build for one run, and with what.
     * @param descriptor - The algorithm's catalogue entry.
     * @param params - The parameters the run is starting with.
     * @returns The target.
     */
    private targetFor(
        descriptor: BuiltInAlgorithmDescriptor,
        params: Readonly<Record<string, unknown>>,
    ): AlgorithmTarget {
        const legacy = legacyKeyFor(descriptor, params);

        // The engine-selecting parameters go through with the rest: a class resolves its options
        // against its own schema and drops what it does not declare, so a parameter that only
        // chose the class costs nothing on the way in.
        return { namespace: BUILT_IN_NAMESPACE, type: legacy.key, options: { ...legacy.params, ...params } };
    }

    /**
     * Do the work.
     *
     * One call, whichever family the algorithm belongs to: `publishResult` is the name every
     * algorithm answers to, and an algorithm that has not been migrated refuses through it rather
     * than being detected here. An empty graph gives back an empty result rather than nothing,
     * because a run that resolved with no result at all would leave a caller awaiting it with
     * `undefined` and no way to tell "nothing to measure" from "never ran".
     * @param algorithm - The instance to run.
     * @param context - What the run handed the work.
     * @param descriptor - The algorithm's catalogue entry, whose field descriptors name what a
     *   reader sees.
     * @returns The result.
     */
    private async compute(
        algorithm: Algorithm,
        context: RunExecutionContext,
        descriptor: AlgorithmDescriptor,
    ): Promise<RunResult> {
        const published = await algorithm.publishResult(
            {
                signal: context.signal,
                report: (progress: RunProgressReport) => {
                    context.report(progress);
                },
                yieldNow: yieldToHost,
            },
            context.runId,
            descriptor.fields,
        );

        return published ?? emptyResult(context, descriptor);
    }
}

/**
 * Give the host a turn before the next chunk of work.
 *
 * A timeout rather than a microtask: a microtask runs before the browser paints, so yielding to
 * one hands the frame back to nobody. The element's own history is the argument -- a 70,000-node
 * graph estimated at 2.10 seconds held the frame for 10.4, and nothing could be drawn or
 * cancelled while it did.
 * @returns A promise that settles once the host has had a chance to paint.
 */
function yieldToHost(): Promise<void> {
    return new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
    });
}

/**
 * The result a run publishes when there was nothing to measure.
 *
 * It declares the algorithm's fields even though it filled none of them, so that
 * `results.<runId>.value` is an empty column rather than an unknown name: a consumer asking a
 * finished run for its ranking wants an empty list, not a thrown error about a field the
 * catalogue told it to expect.
 * @param context - What the run handed the work.
 * @param descriptor - The algorithm's catalogue entry.
 * @returns An empty result of the right shape.
 */
function emptyResult(context: RunExecutionContext, descriptor: AlgorithmDescriptor): RunResult {
    return createRunResult({
        runId: context.runId,
        shape: descriptor.shape,
        fields: descriptor.fields.map((field) => ({ ...field, path: resultPath(context.runId, field.name) })),
        measured: { nodes: 0, edges: 0 },
        caveats: {
            exact: true,
            seed: context.seed,
            direction: "as-loaded",
            weight: null,
            precision: "f64",
            method: descriptor.technicalName,
            notes: ["The graph had nothing for this algorithm to measure."],
        },
        durationMs: 0,
    });
}
