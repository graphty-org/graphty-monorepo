/**
 * Edge weights for any graph: the `weights` option every generator takes, and `withWeights` for a
 * graph that already exists (a dataset, a hand-built graph).
 */

import { type TypedArrayData } from "@graphty/graph-format";

import { detLog } from "../random/log.js";
import { RandomStream, resolveSeed } from "../random/stream.js";
import { type SampleGraph } from "../types.js";

/** How to combine the two endpoint values of a node column into an edge weight. */
export type ColumnCombine = "source" | "target" | "sum" | "mean" | "product" | "min" | "max" | "difference";

/**
 * A weight distribution. Random kinds draw one value per edge, in edge order, from stream
 * (seed, "weights", 0).
 *
 * - `uniform`: a real in [min, max) (default [0, 1)).
 * - `integer`: an integer in [min, max], both ends included -- capacities, Dijkstra demos.
 * - `exponential`: -mean ln(1 - u), mean default 1.
 * - `euclidean`: the distance between the endpoints' `x`, `y` (and `z`, when present) node columns;
 *   for the generators that emit positions.
 * - `column`: from a numeric node column: the source's value, the target's, their sum, mean,
 *   product, min, max, or the absolute difference.
 */
export type WeightSpec =
    | { readonly kind: "uniform"; readonly min?: number | undefined; readonly max?: number | undefined }
    | { readonly kind: "integer"; readonly min: number; readonly max: number }
    | { readonly kind: "exponential"; readonly mean?: number | undefined }
    | { readonly kind: "euclidean" }
    | { readonly kind: "column"; readonly column: string; readonly combine?: ColumnCombine | undefined };

/** The options every generator accepts on top of its own. */
export interface WeightOptions {
    /** Give every edge a weight from this distribution; absent means unweighted. */
    weights?: WeightSpec | undefined;
    /**
     * The seed of the weight draws, an integer in [0, 2^53); default 0. Random generators share it
     * with their structure (the weights use their own stream domain, so adding weights never changes
     * the edges).
     */
    seed?: number | undefined;
}

/**
 * A numeric node column of the graph, or a RangeError naming it.
 * @param graph - the graph
 * @param name - the column name
 * @returns the column's values
 */
function numericColumn(graph: SampleGraph, name: string): TypedArrayData {
    const column = graph.nodeColumns?.[name];
    if (column === undefined || !ArrayBuffer.isView(column)) {
        throw new RangeError(`weights: the graph has no numeric node column "${name}"`);
    }
    return column;
}

/**
 * The weight of every edge under `spec`.
 * @param graph - the graph
 * @param spec - the distribution
 * @param seed - the seed (already resolved)
 * @returns one weight per edge
 */
function drawWeights(graph: SampleGraph, spec: WeightSpec, seed: number): Float32Array<ArrayBuffer> {
    const m = graph.src.length;
    const out = new Float32Array(m);
    const { src, dst } = graph;
    const stream = new RandomStream(seed, "weights", 0);
    switch (spec.kind) {
        case "uniform": {
            const min = spec.min ?? 0;
            const max = spec.max ?? 1;
            if (!(Number.isFinite(min) && Number.isFinite(max) && min <= max)) {
                throw new RangeError(`weights: uniform needs finite min <= max, got ${min} and ${max}`);
            }
            for (let e = 0; e < m; e++) {
                out[e] = min + (max - min) * stream.nextFloat();
            }
            break;
        }
        case "integer": {
            const { min, max } = spec;
            if (!(Number.isSafeInteger(min) && Number.isSafeInteger(max) && min <= max)) {
                throw new RangeError(`weights: integer needs integers min <= max, got ${min} and ${max}`);
            }
            for (let e = 0; e < m; e++) {
                out[e] = min + stream.nextBelow(max - min + 1);
            }
            break;
        }
        case "exponential": {
            const mean = spec.mean ?? 1;
            if (!(mean > 0 && Number.isFinite(mean))) {
                throw new RangeError(`weights: exponential needs a positive mean, got ${mean}`);
            }
            for (let e = 0; e < m; e++) {
                out[e] = -mean * detLog(1 - stream.nextFloat());
            }
            break;
        }
        case "euclidean": {
            const x = numericColumn(graph, "x");
            const y = numericColumn(graph, "y");
            const z = graph.nodeColumns?.z === undefined ? null : numericColumn(graph, "z");
            for (let e = 0; e < m; e++) {
                const dx = x[src[e]] - x[dst[e]];
                const dy = y[src[e]] - y[dst[e]];
                const dz = z === null ? 0 : z[src[e]] - z[dst[e]];
                out[e] = Math.sqrt(dx * dx + dy * dy + dz * dz);
            }
            break;
        }
        default: {
            const values = numericColumn(graph, spec.column);
            const combine = spec.combine ?? "sum";
            for (let e = 0; e < m; e++) {
                const a = values[src[e]];
                const b = values[dst[e]];
                out[e] = combineValues(combine, a, b);
            }
        }
    }
    return out;
}

/**
 * Combine two endpoint values.
 * @param combine - the rule
 * @param a - the source value
 * @param b - the target value
 * @returns the weight
 */
function combineValues(combine: ColumnCombine, a: number, b: number): number {
    switch (combine) {
        case "source":
            return a;
        case "target":
            return b;
        case "sum":
            return a + b;
        case "mean":
            return (a + b) / 2;
        case "product":
            return a * b;
        case "min":
            return Math.min(a, b);
        case "max":
            return Math.max(a, b);
        default:
            return Math.abs(a - b);
    }
}

/**
 * A copy of `graph` (sharing its arrays) with edge weights drawn from `spec`. Any graph works: a
 * generator's output, a dataset, a hand-built SampleGraph. Existing weights are replaced.
 * @param graph - the graph
 * @param spec - the distribution
 * @param seed - the seed of the draws, default 0
 * @returns the weighted graph
 */
export function withWeights(graph: SampleGraph, spec: WeightSpec, seed?: number): SampleGraph {
    return { ...graph, weights: drawWeights(graph, spec, resolveSeed(seed)) };
}

/**
 * Apply the common `weights` option, if set: the last step of every generator.
 * @param graph - the generated graph
 * @param options - the generator's options
 * @returns the graph, weighted when asked
 */
export function applyWeights(graph: SampleGraph, options: WeightOptions): SampleGraph {
    return options.weights === undefined ? graph : withWeights(graph, options.weights, options.seed);
}
