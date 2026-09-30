/**
 * @file `defineAlgorithm`: the simple tier's algorithm verb.
 *
 * One plain definition -- an id, options in short form, and ONE function (`node`, `edge`, `nodes`
 * or `groups`) -- becomes an ordinary `DeclaredAlgorithm` subclass registered through
 * `DeclaredAlgorithm.register`. Everything the element does for an advanced algorithm (the
 * catalogue entry, option validation, the run record, derived rankings and styles, progress,
 * cancellation, the cost estimate) it therefore does for this one, and parity holds by
 * construction.
 *
 * What the element fills in: the descriptor (key, names, category "custom", shape and fields from
 * the function), the loop over the nodes or edges with progress, yielding and cancellation, the
 * id mapping, the output, unmeasured values, caveats and the cost model.
 */

import { communityFields, edgeMetricFields, nodeMetricFields } from "../algorithms/metrics/fields";
import { DeclaredAlgorithm } from "../algorithms/results/DeclaredAlgorithm";
import { communityFieldSpecs, metricFieldSpecs } from "../algorithms/results/fields";
import {
    type AlgorithmOutput,
    type AlgorithmRunContext,
    declaredCaveats,
    forEachChunked,
    YIELD_BUDGET_MS,
} from "../algorithms/results/types";
import type { RegisterOptions } from "../catalog/pluginRegistry";
import type { AlgorithmDescriptor, OptionDescriptor, ResultShape } from "../catalog/types";
import { GraphtyError, isGraphtyError } from "../errors";
import type { Graph } from "../Graph";
import type { ResultElementValues } from "../session/results";
import {
    badDefinition,
    callAuthor,
    checkDefinition,
    describeValue,
    displayName,
    extensionFailed,
    optionalOneOf,
    requireFunction,
} from "./definition";
import { checkViewOptions, expandOptions } from "./options";
import { viewSourceOf } from "./source";
import type { AlgorithmContext, AlgorithmDefinition, GraphView, NodeId, OptionsShorthand } from "./types";
import { createGraphView, quoteId, viewInputs, viewWarnings, viewWeightPaths } from "./view";

/** The four functions a definition may carry, one of which it must. */
const MEMBERS = ["node", "edge", "nodes", "groups"] as const;
type Member = (typeof MEMBERS)[number];

/** A definition after the checks: its own members, typed loosely for the generated class. */
interface CheckedAlgorithm {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly member: Member;
    readonly compute: (subject: unknown, context: AlgorithmContext<unknown>) => unknown;
    readonly directed: boolean;
    readonly options: readonly OptionDescriptor[];
    readonly weights?: { readonly option: string; readonly meaning: "distance" | "strength" };
    readonly passes?: string;
    readonly version?: string;
}

/** A class `defineAlgorithm` generates: a concrete `DeclaredAlgorithm` the element constructs. */
type GeneratedClass = (new (graph: Graph, options?: Record<string, unknown>) => DeclaredAlgorithm) & {
    readonly type: string;
};

/** The shape each function publishes. */
const SHAPES: Readonly<Record<Member, ResultShape>> = {
    node: "node-metric",
    edge: "edge-metric",
    nodes: "node-metric",
    groups: "community",
};

/**
 * The classes already generated, by the author's function, with the definition they came from:
 * registering the same definition again (or a fresh object carrying the same function and the
 * same members) files the same class, which the registry treats as a re-import. A changed member
 * -- options, name, direction, weights, passes -- generates a new class, which replaces the old.
 */
const generated = new WeakMap<object, { readonly cls: GeneratedClass; readonly signature: string }>();

/** A function that holds the page longer than this at a time gets a warning. */
const LONG_TASK_MS = 200;

/** The algorithm ids already warned about on the console for blocking the page. */
const warnedLongTask = new Set<string>();

/** A definition with no options, the default of the verb's generic. */
type NoOptions = Readonly<Record<never, never>>;

/**
 * Check a definition and expand it, refusing a malformed one with E_BAD_COMMAND.
 * @param definition - What the author passed.
 * @returns The checked definition.
 */
function checkAlgorithm(definition: unknown): CheckedAlgorithm {
    const verb = "defineAlgorithm";
    const checked = checkDefinition(verb, definition);
    const { id } = checked;

    const present = MEMBERS.filter((member) => checked[member] !== undefined);
    if (present.length === 0) {
        throw badDefinition(
            verb,
            id,
            "node",
            'a definition needs one function that computes the result: "node", "edge", "nodes" or "groups"; it has none.',
        );
    }

    if (present.length > 1) {
        throw badDefinition(
            verb,
            id,
            present[1],
            `a definition carries exactly one of "node", "edge", "nodes" and "groups"; it has ` +
                `${present.map((member) => `"${member}"`).join(" and ")}.`,
        );
    }

    const member = present[0];
    requireFunction(verb, checked, member);
    optionalOneOf(verb, checked, "direction", ["undirected", "directed"]);
    const options = expandOptions(verb, id, checked.options);
    const byName = new Map(options.map((option) => [option.name, option]));

    const { passes } = checked;
    if (passes !== undefined && (typeof passes !== "string" || byName.get(passes)?.type !== "integer")) {
        const found = typeof passes === "string" ? byName.get(passes) : undefined;
        let why = ", which is not declared.";
        if (typeof passes !== "string") {
            why = ".";
        } else if (found !== undefined) {
            why = `, a "${found.type}" option.`;
        }

        throw badDefinition(
            verb,
            id,
            "passes",
            `"passes" must name a declared "integer" option; got ${describeValue(passes)}${why}`,
        );
    }

    const weights = checked.weights as { option?: unknown; meaning?: unknown } | undefined;
    if (weights !== undefined) {
        const option = typeof weights.option === "string" ? byName.get(weights.option) : undefined;
        if (option?.type !== "attribute" || option.on !== "edge") {
            throw badDefinition(
                verb,
                id,
                "weights.option",
                `"weights.option" must name a declared "attribute" option with on: "edge"; got ${describeValue(weights.option)}.`,
            );
        }

        if (weights.meaning !== "distance" && weights.meaning !== "strength") {
            throw badDefinition(
                verb,
                id,
                "weights.meaning",
                `"weights.meaning" must be "distance" or "strength"; got ${describeValue(weights.meaning)}.`,
            );
        }
    }

    const name = displayName(checked);
    return {
        id,
        name,
        description: typeof checked.description === "string" ? checked.description : "",
        member,
        compute: checked[member] as CheckedAlgorithm["compute"],
        directed: checked.direction === "directed",
        options,
        ...(weights === undefined ? {} : { weights: weights as CheckedAlgorithm["weights"] }),
        ...(passes === undefined ? {} : { passes }),
        ...(typeof checked.version === "string" ? { version: checked.version } : {}),
    };
}

/**
 * The catalogue entry the element fills in for a definition.
 * @param algorithm - The checked definition.
 * @returns The descriptor.
 */
function descriptorOf(algorithm: CheckedAlgorithm): AlgorithmDescriptor {
    const names = { plainName: algorithm.name, technicalName: algorithm.name };
    const shape = SHAPES[algorithm.member];
    const perElement = algorithm.member === "node" || algorithm.member === "edge";
    return {
        key: algorithm.id,
        ...names,
        description: algorithm.description,
        category: "custom",
        shape,
        fields:
            shape === "community"
                ? communityFields(names)
                : (shape === "edge-metric" ? edgeMetricFields : nodeMetricFields)(names),
        options: algorithm.options,
        costClass: perElement ? "instant" : "iterative",
        complexity: "O(n + m)",
    };
}

/**
 * Whether the author's score measured something: a finite number.
 * @param score - What the function returned.
 * @returns True when it is published.
 */
function measured(score: unknown): score is number {
    return typeof score === "number" && Number.isFinite(score);
}

/**
 * Hold a whole-graph function's map against the graph: refuse one whose keys match no node (the
 * `String(id)` mistake), and note the keys that are not nodes.
 * @param algorithm - The checked definition.
 * @param view - The view the function read.
 * @param returned - What it returned.
 * @param notes - Where a warning goes.
 * @returns The entries whose key is a node.
 */
function knownEntries(
    algorithm: CheckedAlgorithm,
    view: GraphView,
    returned: unknown,
    notes: string[],
): [NodeId, unknown][] {
    const call = `${algorithm.member}()`;
    if (!(returned instanceof Map)) {
        throw extensionFailed(
            { id: algorithm.id, member: algorithm.member, source: "run" },
            new TypeError(`${call} must return a Map from node id to value; got ${describeValue(returned)}`),
        );
    }

    const entries = [...(returned as Map<NodeId, unknown>).entries()];
    const known = entries.filter(([key]) => view.node(key) !== undefined);
    const unknown = entries.filter(([key]) => view.node(key) === undefined).map(([key]) => quoteId(key));
    if (entries.length > 0 && known.length === 0) {
        const kind = typeof view.nodes()[0]?.id === "number" ? "numbers" : "strings";
        throw extensionFailed(
            { id: algorithm.id, member: algorithm.member, source: "run" },
            new TypeError(
                `${call} returned ${String(entries.length)} values but no key matches a node id ` +
                    `(got ${unknown[0]}; node ids here are ${kind})`,
            ),
        );
    }

    if (unknown.length > 0) {
        notes.push(
            `${algorithm.id}: ${call} returned values for ${String(unknown.length)} keys that are not nodes ` +
                `(${unknown.slice(0, 5).join(", ")}); they were left out.`,
        );
    }

    return known;
}

/**
 * One run of a definition: the view, the up-front option checks, the author's function, and the
 * output the advanced tier publishes.
 * @param algorithm - The checked definition.
 * @param view - The graph view the run reads.
 * @param options - The resolved option values.
 * @param run - What the element gave the run.
 * @returns The output, or null when the graph has no nodes.
 */
async function execute(
    algorithm: CheckedAlgorithm,
    view: GraphView,
    options: Readonly<Record<string, unknown>>,
    run: AlgorithmRunContext,
): Promise<AlgorithmOutput | null> {
    if (view.nodeCount === 0) {
        return null;
    }

    const { id, member, name } = algorithm;
    checkViewOptions(view, id, algorithm.options, options);

    const notes: string[] = [];
    /** The longest the author's code held the page without handing it back. */
    let longest = 0;
    let resumed = performance.now();
    let convergence: { converged: boolean; iterations: number } | undefined;
    let lastYield = performance.now();
    const context: AlgorithmContext<unknown> = {
        options,
        graph: view,
        signal: run.signal,
        async progress(fraction) {
            longest = Math.max(longest, performance.now() - resumed);
            run.signal.throwIfAborted();
            run.report({ phase: name, completed: Number.isFinite(fraction) ? fraction : 0, total: 1 });
            if (performance.now() - lastYield >= YIELD_BUDGET_MS) {
                await run.yieldNow();
                lastYield = performance.now();
            }

            run.signal.throwIfAborted();
            resumed = performance.now();
        },
        note(text) {
            notes.push(text);
        },
        converged(converged, iterations) {
            convergence = { converged, iterations };
        },
    };

    const nodes: ResultElementValues[] = [];
    const edges: ResultElementValues<string>[] = [];
    let groupType: "integer" | "string" = "integer";
    let total = view.nodeCount;

    /**
     * One call of a per-element function, timed, with a promise refused: the element owns the
     * loop, so the function must answer at once.
     * @param subject - What it was called for, as a message names it.
     * @param element - The node or edge.
     * @returns The score.
     */
    const perElement = (subject: string, element: unknown): unknown => {
        const call = { id, member, subject, source: "run" as const };
        const started = performance.now();
        const score = callAuthor(call, () => algorithm.compute(element, context));
        longest = Math.max(longest, performance.now() - started);
        if (score instanceof Promise) {
            // Its outcome is never used; a later rejection must not surface as an unhandled one.
            score.catch(() => undefined);
            throw new GraphtyError({
                code: "E_EXTENSION_FAILED",
                message:
                    `${id}: ${member}() returned a Promise for ${subject}; it must return the score itself. ` +
                    'Remove "async", or write a "nodes" function for work that has to wait.',
                source: "run",
                details: { extension: id, member, subject },
            });
        }

        return score;
    };

    if (member === "node") {
        await forEachChunked(run, name, view.nodes(), (node) => {
            const score = perElement(`node ${quoteId(node.id)}`, node);
            if (measured(score)) {
                nodes.push({ id: node.id, values: { value: score } });
            }
        });
    } else if (member === "edge") {
        total = view.edgeCount;
        await forEachChunked(run, name, view.edges(), (edge) => {
            const score = perElement(`edge ${JSON.stringify(edge.id)}`, edge);
            if (measured(score)) {
                edges.push({ id: edge.id, values: { value: score } });
            }
        });
    } else {
        let returned: unknown;
        try {
            resumed = performance.now();
            const pending = algorithm.compute(view, context);
            longest = Math.max(longest, performance.now() - resumed);
            returned = await pending;
        } catch (error) {
            // A cancelled run's abort passes through as it is: it is not the author's failure.
            if (run.signal.aborted || isGraphtyError(error)) {
                throw error;
            }

            throw extensionFailed({ id, member, source: "run" }, error);
        }

        let booleans = 0;
        for (const [node, value] of knownEntries(algorithm, view, returned, notes)) {
            if (typeof value === "boolean") {
                booleans++;
            }

            if (member === "nodes" && measured(value)) {
                nodes.push({ id: node, values: { value } });
            } else if (member === "groups" && (typeof value === "string" || measured(value))) {
                if (typeof value === "string" || !Number.isInteger(value)) {
                    groupType = "string";
                }

                nodes.push({ id: node, values: { group: value } });
            }
        }

        if (booleans > 0) {
            const wanted = member === "groups" ? "a group is a number or a string" : "a score is a number";
            notes.push(
                `${id}: ${member}() returned true or false for ${String(booleans)} ${booleans === 1 ? "node" : "nodes"}; ` +
                    `${wanted}, so they were left out.`,
            );
        }
    }

    const kind = member === "edge" ? "edge" : "node";
    if (total > 0 && nodes.length + edges.length === 0) {
        notes.push(`${id}: no ${kind} was measured -- did the function return NaN or undefined for every ${kind}?`);
    }

    notes.push(...viewWarnings(view));
    if (longest > LONG_TASK_MS) {
        const fix =
            member === "node" || member === "edge"
                ? "each call should take a moment, with the slow work moved to a whole-graph function."
                : "await context.progress(i / n) inside its loop.";
        const advice = `${id}: ${member}() held the page for over ${String(LONG_TASK_MS)} ms at a time; ${fix}`;
        notes.push(advice);
        if (!warnedLongTask.has(id)) {
            warnedLongTask.add(id);
            console.warn(advice);
        }
    }

    // The paths the run read, listed as its inputs; the weight it records is the path it READ as
    // a weight, not the one it declared (simple-tier.md 2.3 rule 13). ponytail: a note until the
    // run record grows an inputs list with the advanced contract's input.columnAt (section 6).
    const inputs = viewInputs(view);
    if (inputs.length > 0) {
        notes.push(`${id} read: ${inputs.map(({ target, path }) => `${target} ${JSON.stringify(path)}`).join(", ")}.`);
    }

    const [weight] = viewWeightPaths(view);
    const fields =
        member === "groups"
            ? communityFieldSpecs(false).map((spec) => (spec.name === "group" ? { ...spec, type: groupType } : spec))
            : metricFieldSpecs(kind);

    return {
        shape: SHAPES[member],
        fields,
        ...(member === "edge" ? { edges } : { nodes }),
        ...(member === "groups" ? {} : { graph: { normalization: "none" } }),
        caveats: declaredCaveats({
            method: name,
            direction: view.directed ? "directed" : "undirected",
            weight:
                weight === undefined ? null : { attribute: weight, meaning: algorithm.weights?.meaning ?? "strength" },
            notes,
            ...(convergence ?? {}),
            // Stopping at a cap the caller set publishes what the run has, marked inexact
            // (algorithm.md section 2.2 item 9).
            ...(convergence?.converged === false ? { exact: false, partialReason: "iteration cap reached" } : {}),
        }),
    };
}

/**
 * The advanced registration a definition becomes: a `DeclaredAlgorithm` subclass carrying the
 * filled-in descriptor, the cost model and the run.
 * @param algorithm - The checked definition.
 * @returns The class.
 */
function generateClass(algorithm: CheckedAlgorithm): GeneratedClass {
    const { id, passes } = algorithm;
    const perElement = algorithm.member === "node" || algorithm.member === "edge";

    /** The generated class. */
    class SimpleAlgorithm extends DeclaredAlgorithm {
        static override namespace = id;
        static override type = id;
        static override descriptor = descriptorOf(algorithm);
        // The view keeps parallel edges separate, so no merge happens and none is reported.
        static override parallelEdges = "none" as const;
        static version = algorithm.version;

        /**
         * Work units: one visit per node and two per edge for the per-element forms; one pass
         * over the graph, times the `passes` option, for the whole-graph forms.
         * @param n - Nodes.
         * @param m - Edges.
         * @param options - The run's option values.
         * @returns The units.
         */
        static costUnits = (n: number, m: number, options: Readonly<Record<string, unknown>>): number => {
            if (perElement) {
                return n + 2 * m;
            }

            const count = passes === undefined ? 1 : Number(options[passes]);
            return (n + m) * (Number.isFinite(count) && count > 0 ? count : 1);
        };

        /**
         * Run the definition over the graph as it stands.
         * @param context - What the element gave the run.
         * @returns The output.
         */
        override compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
            // ponytail: the view reads the session's snapshot and records directly -- the minimum
            // internal adapter until the advanced contract's snapshot layout, `input.column` and
            // `input.edgeId` (algorithm.md section 3) are built on master and replace it.
            const view = createGraphView(viewSourceOf(this.graph.getSession()), {
                id,
                directed: algorithm.directed,
            });
            return execute(algorithm, view, this.schemaOptions, context);
        }
    }

    Object.defineProperty(SimpleAlgorithm, "name", { value: `SimpleAlgorithm(${id})` });
    return SimpleAlgorithm;
}

/**
 * Register an algorithm from a plain definition object.
 * @param definition - The id, the options in short form and ONE of `node`, `edge`, `nodes` or
 *   `groups`.
 * @param options - Whether a different algorithm under an id already taken throws instead of
 *   replacing it.
 * @throws A GraphtyError E_BAD_COMMAND for a malformed definition, before anything is registered.
 */
export function defineAlgorithm<const O extends OptionsShorthand = NoOptions>(
    definition: AlgorithmDefinition<O>,
    options?: RegisterOptions,
): void {
    const algorithm = checkAlgorithm(definition);
    const { compute, ...members } = algorithm;
    const signature = JSON.stringify(members);
    let held = generated.get(compute);
    if (held?.signature !== signature) {
        held = { cls: generateClass(algorithm), signature };
        generated.set(compute, held);
    }

    DeclaredAlgorithm.register(held.cls, options);
}
