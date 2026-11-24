import { type AdjacencyView, type NodeRef } from "@graphty/graph-format";

import { checkNumber } from "../errors.js";
import { checkStart } from "./bfs.js";
import { refuseWeights } from "./weights.js";

/** The most paths `allSimplePaths` returns when `maxPaths` is not set. */
export const SIMPLE_PATHS_DEFAULT_MAX_PATHS = 1000;

/** The most arcs `allSimplePaths` follows when `maxSteps` is not set. */
export const SIMPLE_PATHS_DEFAULT_MAX_STEPS = 1_000_000;

/** Options of {@link allSimplePaths}. @public */
export interface SimplePathsOptions {
    /**
     * The longest path to return, in edges; a non-negative integer. Default: no limit (`nodeCount - 1`, the longest a
     * simple path can be), as networkx's `cutoff`.
     */
    readonly maxLength?: number | undefined;
    /** The most paths to return; a non-negative integer. Default {@link SIMPLE_PATHS_DEFAULT_MAX_PATHS}. */
    readonly maxPaths?: number | undefined;
    /**
     * The most arcs the search follows before it gives up, so a dense graph cannot run away even when few of the
     * paths it tries reach the target; a non-negative integer. Default {@link SIMPLE_PATHS_DEFAULT_MAX_STEPS}.
     */
    readonly maxSteps?: number | undefined;
}

/** Result of {@link allSimplePaths}. @public */
export interface SimplePathsResult {
    /** Each path's node indices, from the source to the target inclusive, in the order the search found them. */
    readonly paths: readonly Uint32Array[];
    /** Each path's LOGICAL EDGE indices, one fewer than its nodes; of parallel edges, the first in the row. */
    readonly edges: readonly Uint32Array[];
    /**
     * Why the search stopped before it had found every path: `"maxPaths"` or `"maxSteps"`; null when `paths` holds
     * every simple path within `maxLength`.
     */
    readonly stoppedBy: "maxPaths" | "maxSteps" | null;
}

/**
 * Read one cap option: a non-negative integer, or the default when unset.
 * @param name - The option's name
 * @param value - Its value
 * @param fallback - The default
 * @returns The cap
 */
function cap(name: string, value: number | undefined, fallback: number): number {
    if (value === undefined) {
        return fallback;
    }
    checkNumber("allSimplePaths", name, value, { min: 0, integer: true });
    return value;
}

/**
 * Whether an arc repeats the one before it: rows are sorted, so a parallel edge sits right after the first, and a
 * path is one per neighbor, not one per edge.
 * @param g - The adjacency
 * @param u - The arc's row
 * @param a - The arc
 * @returns True for the second and later of parallel arcs
 */
function isParallel(g: AdjacencyView, u: number, a: number): boolean {
    return a > g.rowPtr[u] && g.colIdx[a - 1] === g.colIdx[a];
}

/**
 * Every simple path (no node twice) from `source` to `target`, by depth-first search, as networkx's
 * `all_simple_paths`. A path ends at the target: it never runs through it and on. Parallel edges give one path, not
 * one per edge, and a path from a node to itself is not a path (none is returned).
 *
 * The number of simple paths grows exponentially with the graph, so three caps bound the work: `maxLength` (edges per
 * path), `maxPaths` (paths returned) and `maxSteps` (arcs followed). `stoppedBy` says when a cap other than the length
 * left paths unfound.
 * @param g - The adjacency to search; an undirected snapshot is walked both ways along every edge
 * @param sourceNode - The node every path starts at: its index, or `{ id }`
 * @param targetNode - The node every path ends at: its index, or `{ id }`
 * @param options - The caps
 * @returns The paths, as node and edge indices
 * @throws RangeError with code `E_BAD_NODE` for a node that is not in the graph, `E_BAD_OPTION` for a bad cap or
 *   `weighted: true` (paths are counted in edges, so weights make no difference)
 * @public
 */
export function allSimplePaths(
    g: AdjacencyView,
    sourceNode: NodeRef,
    targetNode: NodeRef,
    options: SimplePathsOptions = {},
): SimplePathsResult {
    refuseWeights("allSimplePaths", options);
    const source = checkStart(g, sourceNode, "source");
    const target = checkStart(g, targetNode, "target");
    const maxLength = Math.min(cap("maxLength", options.maxLength, g.nodeCount), g.nodeCount - 1);
    const maxPaths = cap("maxPaths", options.maxPaths, SIMPLE_PATHS_DEFAULT_MAX_PATHS);
    const maxSteps = cap("maxSteps", options.maxSteps, SIMPLE_PATHS_DEFAULT_MAX_STEPS);
    const paths: Uint32Array[] = [];
    const edges: Uint32Array[] = [];
    if (source === target || maxLength === 0) {
        return { paths, edges, stoppedBy: null };
    }

    const { rowPtr, colIdx, arcToEdge } = g;
    const onPath = new Uint8Array(g.nodeCount);
    // stack[i] is the i-th node of the current path, cursor[i] its next untried arc, via[i] the arc that reached it.
    const stack = new Uint32Array(maxLength + 1);
    const cursor = new Uint32Array(maxLength + 1);
    const via = new Uint32Array(maxLength + 1);
    let top = 0;
    stack[0] = source;
    cursor[0] = rowPtr[source];
    onPath[source] = 1;
    let steps = 0;
    while (top >= 0) {
        const u = stack[top];
        const a = cursor[top];
        if (a >= rowPtr[u + 1]) {
            onPath[u] = 0;
            top--;
            continue;
        }
        if (steps >= maxSteps) {
            return { paths, edges, stoppedBy: "maxSteps" };
        }
        steps++;
        cursor[top] = a + 1;
        const v = colIdx[a];
        if (onPath[v] === 1 || isParallel(g, u, a)) {
            continue;
        }
        if (v === target) {
            // One more path than allowed: only now is it known that the cap left a path out.
            if (paths.length === maxPaths) {
                return { paths, edges, stoppedBy: "maxPaths" };
            }
            via[top + 1] = a;
            stack[top + 1] = v;
            paths.push(stack.slice(0, top + 2));
            edges.push(Uint32Array.from(via.subarray(1, top + 2), (arc) => arcToEdge[arc]));
            continue;
        }
        // A node one edge short of the length cap can only go on to the target, which the arcs above already tried.
        if (top + 1 < maxLength) {
            top++;
            stack[top] = v;
            cursor[top] = rowPtr[v];
            via[top] = a;
            onPath[v] = 1;
        }
    }
    return { paths, edges, stoppedBy: null };
}
