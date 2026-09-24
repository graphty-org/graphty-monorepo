/**
 * The narrow seam between the React shell and graphty-element's Graph object.
 *
 * WHY this module still exists: the app's own handle type (`Graphty.tsx`'s `Graph`)
 * carries an index signature, so every method on it reads as `unknown`. A cast is a
 * claim; this module makes a runtime check instead, so "the element is not ready yet"
 * becomes a branch the load path can take rather than a crash on the first method call.
 *
 * WHAT LEFT IT, and why nothing replaced it. Three functions used to live here --
 * `addStyleLayers`, `removeLayersFromSource` and `repaintStyles` -- and all three were
 * scaffolding around defects that no longer exist:
 *
 * - `addStyleLayers` wrapped every layer write in a repaint, because the old `addLayer`
 *   was a push with a "TODO: recalculate" comment beside it: a layer added after a run
 *   neither matched an `algorithmResults` selector nor ran its calculated value until
 *   something re-applied styles by hand. `session.styles.add()` validates, repaints and
 *   commits only when the paint succeeds, so there is nothing for a wrapper to add.
 * - `removeLayersFromSource` walked the stack for a metadata tag and deleted matches
 *   highest-index-first, because layers were addressed by position. `removeBySource` takes
 *   a predicate over the layer's own `source` and never exposes an index at all.
 * - `repaintStyles` existed only to make the other two take effect.
 *
 * So the shell now reaches the style stack through {@link elementSession}, and every layer
 * verb is `session.styles.*` at the call site.
 */

import type { GraphSession } from "@graphty/graphty-element/session";

/** One node, as this module needs to read it. @public */
export interface ElementNodeLike {
    /** The node's id. */
    readonly id: number | string;
    /** Nested `algorithmResults.<namespace>.<type>.<name>`. */
    readonly algorithmResults?: unknown;
}

/** The data manager doors this module uses. @public */
export interface ElementDataManagerLike {
    /** Nested `<namespace>.<type>.<name>`. */
    readonly graphResults?: unknown;
}

/** Exactly the graph surface this slice touches. @public */
export interface ElementGraph {
    /** Queues an algorithm run and resolves when it has finished. */
    runAlgorithm: (
        namespace: string,
        type: string,
        options?: {
            readonly algorithmOptions?: Readonly<Record<string, unknown>>;
        },
    ) => Promise<void>;
    /** Every node currently loaded. */
    getNodes: () => readonly ElementNodeLike[];
    /** The data manager. */
    getDataManager: () => ElementDataManagerLike;
    /** The headless model: runs, results, selection, visibility and the style stack. */
    getSession: () => GraphSession;
}

/** The four methods a candidate must carry to be an {@link ElementGraph}. */
const REQUIRED_GRAPH_METHODS = ["runAlgorithm", "getNodes", "getDataManager", "getSession"] as const;

/**
 * Reads a candidate as a plain string-keyed record, or null when it is not one.
 * Arrays are records too as far as property access goes, so they are not excluded
 * here; the method check below rejects them.
 * @param candidate - anything at all.
 * @returns the candidate viewed as a record, or null when it has no properties to read.
 */
function asRecord(candidate: unknown): Record<string, unknown> | null {
    if (typeof candidate !== "object" || candidate === null) {
        return null;
    }

    return candidate as Record<string, unknown>;
}

/**
 * Narrows the app's structurally-typed graph handle to {@link ElementGraph}, or null
 * when it is not ready. A runtime guard rather than a cast, so the caller needs no
 * assertion and a missing method is a branch instead of a crash.
 * @param candidate - the value behind `graphtyRef.current?.graph`, whatever it is.
 * @returns the graph, or null when the element has not finished coming up.
 */
export function asElementGraph(candidate: unknown): ElementGraph | null {
    const record = asRecord(candidate);
    if (record === null) {
        return null;
    }

    for (const method of REQUIRED_GRAPH_METHODS) {
        if (typeof record[method] !== "function") {
            return null;
        }
    }

    return record as unknown as ElementGraph;
}

/**
 * The element's session, or null when the element has not finished coming up.
 *
 * The one door to the style stack, the runs and the results. Every layer verb the shell
 * performs goes through `session.styles`, which validates, repaints and reports its own
 * refusals -- so there is no shell-side wrapper round any of them.
 * @param candidate - the value behind `graphtyRef.current?.graph`, whatever it is.
 * @returns the session, or null when the element is not ready.
 */
export function elementSession(candidate: unknown): GraphSession | null {
    return asElementGraph(candidate)?.getSession() ?? null;
}

/**
 * Reads a nested result path, e.g. ["graphty", "louvain", "modularity"].
 * @param root - the object the path starts at, typically a node's `algorithmResults`
 * or the data manager's `graphResults`.
 * @param path - the keys to walk, in order.
 * @returns the value at the path, or undefined when any step is missing.
 */
export function readResultPath(root: unknown, path: readonly string[]): unknown {
    let current: unknown = root;

    for (const key of path) {
        const record = asRecord(current);
        if (record === null) {
            return undefined;
        }

        current = record[key];
    }

    return current;
}
