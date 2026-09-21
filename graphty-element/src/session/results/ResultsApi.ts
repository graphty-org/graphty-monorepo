/**
 * @file Addressing results: the path, the lookup, and the "did you mean".
 *
 * A result is published at `results.<runId>.<field>` and that string is what a style selector
 * matches on, what a filter reads and what an expression editor completes. Nobody types it by
 * hand: {@link ResultsApi.path} builds it from the run, and the field defaults to the one the
 * run's shape declares primary, because a caller holding a `Run` should not have to open the
 * catalogue to learn that a centrality's number is called `value`.
 *
 * The other half is the one an editor needs. `roots` publishes every run that has a result
 * together with the fields it carries, so an unknown `results.*` path can be answered with the
 * nearest candidates instead of matching nothing in silence -- which is the difference between a
 * typo a person fixes in a second and a selector that quietly paints nothing.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM: addressing is string work over plain data,
 * published from the Node-safe `./session` entry point.
 */

import type { FieldDescriptor, Path, ResultShape, RunId } from "../../catalog/types";
import {
    RESULT_ROOT,
    resultPath,
    type ResultRoot,
    type ResultsApi,
    resultShapeContract,
    type RunRef,
    type RunResult,
} from "./types";

/** How many "did you mean" candidates an unknown name is reported with. */
const NEAREST_NAME_LIMIT = 3;

// ---------------------------------------------------------------------------------------------
// Did you mean
// ---------------------------------------------------------------------------------------------

/**
 * How many single-character edits turn one string into another.
 * @param left - One string.
 * @param right - The other.
 * @returns The edit distance.
 */
function editDistance(left: string, right: string): number {
    if (left === right) {
        return 0;
    }

    const previous = new Uint32Array(right.length + 1);
    const current = new Uint32Array(right.length + 1);

    for (let column = 0; column <= right.length; column++) {
        previous[column] = column;
    }

    for (let row = 1; row <= left.length; row++) {
        current[0] = row;

        for (let column = 1; column <= right.length; column++) {
            const substitution = previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1);
            current[column] = Math.min(current[column - 1] + 1, previous[column] + 1, substitution);
        }

        previous.set(current);
    }

    return previous[right.length];
}

/**
 * The few candidates closest to a name somebody got wrong.
 *
 * Case is ignored, because "PageRank" for "pagerank" is a spelling a person can fix rather than a
 * different word, and an exact-but-for-case match should come back first.
 * @param name - The name that did not resolve.
 * @param candidates - The names that would have resolved.
 * @param limit - How many to return.
 * @returns The nearest candidates, closest first.
 */
export function nearestNames(
    name: string,
    candidates: readonly string[],
    limit: number = NEAREST_NAME_LIMIT,
): readonly string[] {
    const wanted = name.toLowerCase();
    const scored = candidates.map((candidate) => ({
        candidate,
        distance: editDistance(wanted, candidate.toLowerCase()),
    }));

    scored.sort((left, right) => left.distance - right.distance || left.candidate.localeCompare(right.candidate));

    return Object.freeze(scored.slice(0, Math.max(limit, 0)).map((entry) => entry.candidate));
}

/**
 * The published paths closest to a `results.*` path that resolved to nothing.
 *
 * This is what turns "the selector matched no elements" into "there is no run called `betwenness`
 * -- did you mean `betweenness`?". A path that is not under the results root has no candidates at
 * all, because suggesting result paths for an attribute path would send the reader the wrong way.
 * @param path - The path that did not resolve.
 * @param roots - Every run that has published a result.
 * @param limit - How many to return.
 * @returns The nearest published paths, closest first.
 */
export function suggestResultPaths(
    path: Path,
    roots: readonly ResultRoot[],
    limit: number = NEAREST_NAME_LIMIT,
): readonly Path[] {
    if (path !== RESULT_ROOT && !path.startsWith(`${RESULT_ROOT}.`)) {
        return Object.freeze([]);
    }

    const published: Path[] = [];

    for (const root of roots) {
        if (root.fields.length === 0) {
            published.push(resultPath(root.runId));
            continue;
        }

        for (const field of root.fields) {
            published.push(resultPath(root.runId, field.name));
        }
    }

    return nearestNames(path, published, limit);
}

// ---------------------------------------------------------------------------------------------
// The registry the API reads
// ---------------------------------------------------------------------------------------------

/** What the results API needs to know about one run in order to answer for it. */
export interface ResultsRunEntry {
    /** The run id, which is the path segment under `results`. */
    readonly id: RunId;
    /** What to call the run in a completion list. */
    readonly label: string;
    /** The shape, which is what settles the primary field before a result exists. */
    readonly shape: ResultShape;
    /** The result, once the run has published one. */
    readonly result?: RunResult;
}

/**
 * Where the results API looks runs up.
 *
 * A small interface rather than the run store itself, so that addressing a result does not drag
 * the queue, the abort controllers and the progress machinery in behind it.
 */
export interface ResultsRegistry {
    /**
     * One run, by id.
     * @param id - The run id.
     * @returns The entry, or undefined when this session holds no run with that id.
     */
    entry(id: RunId): ResultsRunEntry | undefined;
    /**
     * Every run this session holds, in the order they were started.
     * @returns The entries.
     */
    entries(): readonly ResultsRunEntry[];
}

// ---------------------------------------------------------------------------------------------
// Addressing
// ---------------------------------------------------------------------------------------------

/**
 * The run id behind any of the three ways a caller names a run.
 * @param ref - The run, its result, or its id.
 * @returns The run id.
 */
function runIdOf(ref: RunRef): RunId {
    if (typeof ref === "string") {
        return ref;
    }

    return "runId" in ref ? ref.runId : ref.id;
}

/**
 * The shape a reference already carries, when it carries one.
 * @param ref - The run, its result, or its id.
 * @returns The shape, or undefined when the reference is a bare id.
 */
function shapeOf(ref: RunRef): ResultShape | undefined {
    return typeof ref === "string" ? undefined : ref.shape;
}

/**
 * Tell whether a result published a field under a given name.
 * @param result - The result to ask.
 * @param field - The field name.
 * @returns True when the name is one of its fields or one of its graph-level keys.
 */
function publishes(result: RunResult, field: string): boolean {
    return result.fields.some((candidate: FieldDescriptor) => candidate.name === field) || field in result.graph;
}

/** Addressing results over one registry of runs. */
class Results implements ResultsApi {
    readonly #registry: ResultsRegistry;

    /**
     * Build the API over a registry.
     * @param registry - Where runs are looked up.
     */
    constructor(registry: ResultsRegistry) {
        this.#registry = registry;
    }

    /**
     * The published path of a run's field.
     *
     * With no field the path names the run's primary field -- `value` for a metric, `group` for a
     * partition, `onPath` for a route -- so a caller binds an encoding to a run without knowing
     * what that algorithm calls its number. A `fact` result has no primary field and addresses
     * its whole result object instead.
     * @param run - The run, its result, or its id.
     * @param field - The field name; the shape's primary field when absent.
     * @returns The path.
     */
    path(run: RunRef, field?: string): Path {
        const id = runIdOf(run);
        if (field !== undefined) {
            return resultPath(id, field);
        }

        const shape = shapeOf(run) ?? this.#registry.entry(id)?.shape;
        const primary = shape === undefined ? null : resultShapeContract(shape).primaryField;

        return primary === null ? resultPath(id) : resultPath(id, primary);
    }

    /**
     * One run's result.
     *
     * The answer always comes from the registry, even when the caller passed a result object: the
     * question is what this session holds, and a result the session never registered is not it.
     * @param run - The run, its result, or its id.
     * @returns The result, or undefined when the session holds no such run or it has not
     *   finished.
     */
    get(run: RunRef): RunResult | undefined {
        return this.#registry.entry(runIdOf(run))?.result;
    }

    /**
     * Whether a run, or one of its fields, is available to read.
     * @param run - The run, its result, or its id.
     * @param field - The field name; asks only about the run itself when absent.
     * @returns True when the path would resolve.
     */
    has(run: RunRef, field?: string): boolean {
        const result = this.get(run);
        if (result === undefined) {
            return false;
        }

        return field === undefined || publishes(result, field);
    }

    /**
     * Every run that has published a result, as an expression editor reads them.
     * @returns One root per finished run, in the order the runs were started.
     */
    get roots(): readonly ResultRoot[] {
        const roots: ResultRoot[] = [];

        for (const entry of this.#registry.entries()) {
            if (entry.result !== undefined) {
                roots.push(Object.freeze({ runId: entry.id, label: entry.label, fields: entry.result.fields }));
            }
        }

        return Object.freeze(roots);
    }
}

/**
 * Build the results API over a registry of runs.
 * @param registry - Where runs are looked up.
 * @returns The API.
 */
export function createResultsApi(registry: ResultsRegistry): ResultsApi {
    return new Results(registry);
}
