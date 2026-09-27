/**
 * @file Central mask-back of a scoped run's published values, the caveat that says what the run
 * computed on, and the check of node options against the scope (design/sets/sets-design.md
 * section 10.1).
 *
 * MASK-BACK IS CENTRAL so that it holds whatever path computed a value: an algorithm that fills a
 * default for every element it did not index (Dijkstra's `Infinity` and `onPath: false`), an edge
 * remap that writes every declared edge of a merged group, and an algorithm that computed on the
 * whole graph because it does not declare a scoped input. Every node value outside the scope's
 * node bitmap and every edge value outside its edge bitmap is dropped before the result is built,
 * so it reads missing and is left out of every ranking, histogram and summary.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { INVALID_INDEX, maskTest, type U32 } from "@graphty/graph-format";

import type { EdgeId, NodeId, OptionDescriptor } from "../../catalog/types";
import { edgeRowOf } from "../../data/edgeIdentity";
import { GraphtyError } from "../../errors/GraphtyError";
import type { ResultElementValues, RunResultInit } from "../../session/results/RunResult";
import { declaresScopedInput, type ResolvedInputScope, runScopeOf } from "./ScopedInput";

/** The note a run carries when its algorithm computed on the whole graph and was masked back. */
export const WHOLE_GRAPH_CAVEAT = "Computed on the whole graph; values kept for the scope only.";

/**
 * Whether a scope covers every node and every edge of its snapshot.
 * @param scope - The scope.
 * @returns True for the whole graph.
 */
function isWhole(scope: ResolvedInputScope): boolean {
    const { graph, resolution } = scope;

    return resolution.nodeCount === graph.nodeCount && resolution.edgeCount === graph.edgeCount;
}

/**
 * Whether a row's bit is set.
 * @param mask - The bitmap.
 * @param row - The row, or `INVALID_INDEX`.
 * @param length - How many rows the bitmap covers.
 * @returns True when the row is in the bitmap.
 */
function has(mask: U32, row: number, length: number): boolean {
    return row !== INVALID_INDEX && row < length && maskTest(mask, row);
}

/**
 * Plural "node" or "edge".
 * @param count - How many.
 * @param noun - The singular.
 * @returns The phrase.
 */
function counted(count: number, noun: string): string {
    return `${String(count)} ${noun}${count === 1 ? "" : "s"}`;
}

/**
 * The sentence a scoped run carries about what it computed on, worded from the scope's reading so
 * the run can be reproduced.
 * @param declared - Whether the algorithm computes over its scope.
 * @param scope - The scope, not the whole graph.
 * @returns The note.
 */
function scopeCaveat(declared: boolean, scope: ResolvedInputScope): string {
    if (!declared) {
        return WHOLE_GRAPH_CAVEAT;
    }

    const { nodeCount, edgeCount } = scope.resolution;
    if (scope.reading === "induced") {
        return `Computed on the induced subgraph of ${counted(nodeCount, "node")}.`;
    }

    return `Computed on the subgraph of ${counted(nodeCount, "node")} and the ${counted(edgeCount, "edge")} in scope.`;
}

/**
 * A result's inputs with every value outside the run's scope dropped and the scope caveat added.
 * A run over the whole graph, or no run at all, passes unchanged.
 * @param algorithm - The algorithm instance publishing the result.
 * @param init - What it would build the result from.
 * @returns What to build the result from.
 */
export function maskBack(algorithm: object, init: RunResultInit): RunResultInit {
    const scope = runScopeOf(algorithm);
    if (scope === null || isWhole(scope)) {
        return init;
    }

    const { graph, resolution } = scope;
    const keepNode = (entry: ResultElementValues): boolean =>
        has(resolution.nodes, graph.ids.indexOf(entry.id), graph.nodeCount);
    const keepEdge = (entry: ResultElementValues<EdgeId>): boolean =>
        has(resolution.edges, edgeRowOf(graph, entry.id), graph.edgeCount);

    return {
        ...init,
        ...(init.nodes === undefined ? {} : { nodes: init.nodes.filter(keepNode) }),
        ...(init.edges === undefined ? {} : { edges: init.edges.filter(keepEdge) }),
        caveats: {
            ...init.caveats,
            notes: [...init.caveats.notes, scopeCaveat(declaresScopedInput(algorithm), scope)],
        },
    };
}

/**
 * Refuse a node option that names a node of the graph outside the run's scope, before any work
 * starts. An id the graph does not hold at all is left to the algorithm, which says so in its own
 * words.
 * @param options - The algorithm's declared options.
 * @param params - The values the run starts with.
 * @param scope - The run's scope, or null for the whole graph.
 * @throws A `GraphtyError` with `E_OPTION_RANGE` and `details.reason: "outside-scope"`.
 */
export function checkNodeOptions(
    options: readonly OptionDescriptor[],
    params: Readonly<Record<string, unknown>>,
    scope: ResolvedInputScope | null,
): void {
    if (scope === null || isWhole(scope)) {
        return;
    }

    const { graph, resolution } = scope;
    for (const option of options) {
        if (option.type !== "node-id" && option.type !== "node-set") {
            continue;
        }

        const given = params[option.name];
        const values: readonly unknown[] = Array.isArray(given) ? given : [given];
        for (const value of values) {
            if (typeof value !== "string" && typeof value !== "number") {
                continue;
            }

            const row = graph.ids.indexOf(value as NodeId);
            if (row !== INVALID_INDEX && !has(resolution.nodes, row, graph.nodeCount)) {
                throw new GraphtyError({
                    code: "E_OPTION_RANGE",
                    message: `"${option.name}" names node "${String(value)}", which is outside the run's scope`,
                    source: "run",
                    details: { option: option.name, value, reason: "outside-scope" },
                });
            }
        }
    }
}
