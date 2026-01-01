import type { Graph } from "../core/graph.js";

/**
 * Common interface for algorithm options with optimization support
 */
export interface OptimizableOptions {
    /**
     * Whether to use optimized implementations
     * - true: Force use of optimizations
     * - false: Disable optimizations
     * - "auto": Automatically decide based on graph size (default)
     */
    optimized?: boolean | "auto";
}

/**
 * Check if a graph should use optimizations based on its size
 * @param nodeCount - The number of nodes in the graph
 * @param edgeCount - The number of edges in the graph
 * @returns True if the graph is large enough to benefit from optimizations
 */
function shouldUseOptimizations(nodeCount: number, edgeCount: number): boolean {
    // Use optimizations for graphs with more than 10k nodes or 100k edges
    return nodeCount > 10000 || edgeCount > 100000;
}

/**
 * Determine if optimizations should be used for a given graph
 * @param graph - The graph to check for optimization eligibility
 * @param options - Options containing the optimization preference
 * @returns True if optimizations should be used for this graph
 */
export function shouldOptimize(graph: Graph, options: OptimizableOptions = {}): boolean {
    const { optimized = "auto" } = options;

    if (optimized === "auto") {
        // Check graph size
        return shouldUseOptimizations(graph.nodeCount, graph.totalEdgeCount);
    }

    return optimized;
}

/**
 * Merge optimization options with algorithm-specific options
 * @param graph - The graph to determine optimization settings for
 * @param options - Algorithm options that may include optimization settings
 * @returns The options with resolved optimization boolean flag
 */
export function mergeOptimizationOptions<T extends Record<string, unknown>>(
    graph: Graph,
    options: T & OptimizableOptions,
): T & { optimized?: boolean } {
    const { optimized: userOptimized, ...rest } = options;

    return {
        ...rest,
        optimized: shouldOptimize(graph, userOptimized !== undefined ? { optimized: userOptimized } : {}),
    } as T & { optimized?: boolean };
}

/**
 * Create an optimized version of an algorithm
 * @param algorithm - The algorithm function to wrap with optimization support
 * @param optionsTransformer - Optional function to transform options before passing to the algorithm
 * @returns A wrapped version of the algorithm that applies optimization transformations
 * @example
 * const optimizedBetweenness = createOptimizedAlgorithm(
 *     betweennessCentrality,
 *     (graph, options) => ({...options, optimized: true})
 * );
 */
export function createOptimizedAlgorithm<TArgs extends [Graph, ...unknown[]], TResult>(
    algorithm: (...args: TArgs) => TResult,
    optionsTransformer?: (graph: Graph, options: unknown) => unknown,
): (...args: TArgs) => TResult {
    return (...args: TArgs): TResult => {
        const [graph, options, ...rest] = args;

        if (optionsTransformer && options !== undefined) {
            const transformedOptions = optionsTransformer(graph, options);
            return algorithm(...([graph, transformedOptions, ...rest] as unknown as TArgs));
        }

        return algorithm(...args);
    };
}
