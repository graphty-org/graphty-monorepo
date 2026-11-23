/**
 * @file The two graphs a reader can be handed, as types the compiler tells apart
 * (design/working-graph/design.md section 9, "Fences").
 *
 * - A {@link WorkingSnapshot} is what a reader reads: the working graph's compact snapshot, the
 *   nodes and edges the filters leave shown, with hidden nodes absent. It is the whole graph only
 *   when nothing is hidden, or when the whole graph was asked for by name ("Full graph", scope
 *   `"graph"` or `"all"`). Only the working graph (`./view.ts`) and a run's scoped input
 *   (`algorithms/input/ScopedInput.ts`) make one.
 * - A {@link WholeSnapshot} is the original graph, hidden nodes included. The one way to get it is
 *   {@link wholeGraph}, and the `local/whole-graph-by-name` lint rule allows that call only in the
 *   functions `working-graph-whole-readers.json` lists under `accessors`, each with its agreed case.
 *
 * Layouts, algorithms and the definition helpers take a `WorkingSnapshot`, so handing one the
 * whole graph is a compile error, and the whole graph cannot be read without naming it.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

declare const workingBrand: unique symbol;
declare const wholeBrand: unique symbol;

/** What a reader reads: the working graph's snapshot, hidden nodes absent. */
export type WorkingSnapshot = GraphSnapshot & { readonly [workingBrand]: true };

/** The original graph, hidden nodes included: read only by name, through {@link wholeGraph}. */
export type WholeSnapshot = GraphSnapshot & { readonly [wholeBrand]: true };

/** What holds the original graph: the store, or the data manager in front of it. */
export interface WholeGraphSource {
    getSnapshot(): GraphSnapshot;
}

/**
 * The whole graph, hidden nodes included, by name. Lint allows this call only in the functions
 * `working-graph-whole-readers.json` lists under `accessors`; every other reader reads the working
 * graph.
 * @param source - The store or the data manager.
 * @returns The original snapshot.
 */
export function wholeGraph(source: WholeGraphSource): WholeSnapshot {
    return source.getSnapshot() as WholeSnapshot;
}

/**
 * Mark a snapshot as what a reader reads. Only the working graph and a run's scoped input call it:
 * lint allows it nowhere else.
 * @param snapshot - The view's compact snapshot, or the whole graph when nothing is hidden or the
 *   whole graph was asked for by name.
 * @returns The same snapshot, typed as a working graph.
 */
export function asWorkingSnapshot(snapshot: GraphSnapshot): WorkingSnapshot {
    return snapshot as WorkingSnapshot;
}
