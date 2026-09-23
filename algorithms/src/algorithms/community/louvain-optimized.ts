import type { Graph } from "../../core/graph.js";
import type { CommunityResult, NodeId } from "../../types/index.js";

/**
 * Optimized Louvain community detection algorithm with early pruning and threshold cycling
 *
 * Runs the full multilevel method of Blondel et al. (local moving, then aggregating each community
 * into one node, repeated until nothing moves) over typed arrays indexed 0..n-1.
 *
 * Key optimizations:
 * - Typed-array adjacency (CSR) instead of per-edge map lookups
 * - Leaf node pruning: skip a degree-1 node already in its neighbour's community
 * - Importance ordering: Process high-impact nodes first
 * - Threshold cycling: Adaptive move thresholds, relative to each node's largest possible gain
 * - Early termination: Stop when changes become insignificant
 *
 * The graph is treated as undirected: a directed edge counts as an undirected edge of its weight.
 * A self-loop of weight w adds 2w to its node's degree, the standard convention (NetworkX too).
 */

interface OptimizedLouvainOptions {
    /**
     * Resolution parameter (default: 1.0)
     */
    resolution?: number;
    /**
     * Maximum local-moving sweeps per level (default: 100)
     */
    maxIterations?: number;
    /**
     * Convergence tolerance on a sweep's modularity gain (default: 1e-6)
     */
    tolerance?: number;
    /**
     * Enable leaf node pruning (default: true)
     */
    pruneLeaves?: boolean;
    /**
     * Enable importance-based node ordering (default: true)
     */
    importanceOrdering?: boolean;
    /**
     * Base move threshold, as a fraction of a node's largest possible modularity gain (default: 0.01)
     */
    pruningThreshold?: number;
    /**
     * Enable adaptive threshold cycling (default: true)
     */
    thresholdCycling?: boolean;
}

interface PruningStats {
    leafNodesPruned: number;
    lowDegreeNodesPruned: number;
    stableNodesPruned: number;
}

/** One level of the multilevel method: an undirected weighted graph in CSR form. */
interface Level {
    n: number;
    /** Row offsets into `targets` / `weights`, length n + 1. Each edge appears in both rows. */
    offsets: Int32Array;
    targets: Int32Array;
    weights: Float64Array;
    /** Weight of the edges inside each node (self-loops), each edge counted once. */
    self: Float64Array;
    /** Weighted degree of each node (a self-loop counts twice). */
    degree: Float64Array;
}

interface LocalMovingOptions {
    resolution: number;
    maxIterations: number;
    tolerance: number;
    pruneLeaves: boolean;
    importanceOrdering: boolean;
    pruningThreshold: number;
    thresholdCycling: boolean;
}

/**
 * Optimized Louvain implementation with early pruning and threshold cycling
 */
export class OptimizedLouvain {
    private graph: Graph;
    private pruningStats: PruningStats;

    /**
     * Create an optimized Louvain detector for the given graph
     * @param graph - The input graph to detect communities in
     */
    constructor(graph: Graph) {
        this.graph = graph;
        this.pruningStats = {
            leafNodesPruned: 0,
            lowDegreeNodesPruned: 0,
            stableNodesPruned: 0,
        };
    }

    /**
     * Run optimized Louvain algorithm
     * @param options - Algorithm configuration options
     * @returns Community detection result with communities, modularity, and iterations (levels)
     */
    public detectCommunities(options: OptimizedLouvainOptions = {}): CommunityResult {
        const settings: LocalMovingOptions = {
            resolution: options.resolution ?? 1.0,
            maxIterations: options.maxIterations ?? 100,
            tolerance: options.tolerance ?? 1e-6,
            pruneLeaves: options.pruneLeaves ?? true,
            importanceOrdering: options.importanceOrdering ?? true,
            pruningThreshold: options.pruningThreshold ?? 0.01,
            thresholdCycling: options.thresholdCycling ?? true,
        };

        const { level: base, ids } = this.buildLevel();
        // membership[i] = the current level's node that original node i has been folded into
        const membership = new Int32Array(base.n);
        for (let i = 0; i < base.n; i++) {
            membership[i] = i;
        }

        let level = base;
        let iterations = 0;
        while (level.n > 1) {
            const { community, count, moved } = this.localMoving(level, settings);
            if (!moved) {
                break;
            }

            iterations++;
            for (let i = 0; i < membership.length; i++) {
                membership[i] = community[membership[i]];
            }

            level = aggregate(level, community, count);
        }

        const groups: NodeId[][] = Array.from({ length: level.n }, () => []);
        for (let i = 0; i < membership.length; i++) {
            groups[membership[i]].push(ids[i]);
        }

        return {
            communities: groups.filter((group) => group.length > 0),
            modularity: levelModularity(level, settings.resolution),
            iterations,
        };
    }

    /**
     * Get pruning statistics
     * @returns Statistics about nodes pruned during optimization
     */
    public getPruningStats(): PruningStats {
        return { ...this.pruningStats };
    }

    /**
     * Index the graph's nodes 0..n-1 and build the level-0 CSR adjacency
     * @returns The level-0 graph and the node id at each index
     */
    private buildLevel(): { level: Level; ids: NodeId[] } {
        const ids: NodeId[] = [];
        const index = new Map<NodeId, number>();
        for (const node of this.graph.nodes()) {
            index.set(node.id, ids.length);
            ids.push(node.id);
        }

        const n = ids.length;
        const edges: [number, number, number][] = [];
        const counts = new Int32Array(n + 1);
        const self = new Float64Array(n);
        const degree = new Float64Array(n);

        for (const edge of this.graph.edges()) {
            const s = index.get(edge.source);
            const t = index.get(edge.target);
            if (s === undefined || t === undefined) {
                continue;
            }

            const w = edge.weight ?? 1;
            degree[s] += w;
            degree[t] += w;
            if (s === t) {
                self[s] += w;
                continue;
            }

            edges.push([s, t, w]);
            counts[s + 1]++;
            counts[t + 1]++;
        }

        return { level: buildCsr(n, counts, edges, self, degree), ids };
    }

    /**
     * Move each node to the neighbouring community with the best modularity gain, until no move
     * improves modularity
     * @param level - The graph at this level
     * @param options - Local moving options
     * @returns Each node's community (numbered 0..count-1), the count, and whether any node moved
     */
    private localMoving(
        level: Level,
        options: LocalMovingOptions,
    ): { community: Int32Array; count: number; moved: boolean } {
        const { n, offsets, targets, weights, degree } = level;
        const { resolution, maxIterations, tolerance, pruneLeaves } = options;

        const twoM = degree.reduce((sum, d) => sum + d, 0);
        const community = new Int32Array(n);
        const total = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            community[i] = i;
            total[i] = degree[i];
        }

        if (twoM === 0) {
            return { community, count: n, moved: false };
        }

        const order = this.nodeOrder(level, options.importanceOrdering);
        // Scratch: weight from the current node to each community, and the communities touched
        const toCommunity = new Float64Array(n);
        const touched = new Int32Array(n);

        let moved = false;
        let useThreshold = options.thresholdCycling;
        for (let sweep = 0; sweep < maxIterations; sweep++) {
            // The threshold is a fraction of the most node i could gain from any move (all of its
            // weight landing inside the target, k_i), so it scales with the graph
            const threshold = useThreshold ? options.pruningThreshold * Math.pow(0.5, sweep / 10) : 0;
            let sweepMoved = false;
            let sweepGain = 0;

            for (const i of order) {
                const start = offsets[i];
                const end = offsets[i + 1];
                if (pruneLeaves && end - start === 1 && community[targets[start]] === community[i]) {
                    // A leaf's only move is to its one neighbour's community, and it is there
                    this.pruningStats.leafNodesPruned++;
                    continue;
                }

                if (end === start) {
                    continue;
                }

                const current = community[i];
                let touchedCount = 0;
                for (let e = start; e < end; e++) {
                    const c = community[targets[e]];
                    if (toCommunity[c] === 0) {
                        touched[touchedCount++] = c;
                    }

                    toCommunity[c] += weights[e];
                }

                // Gains are in units of m * dQ: w(i, c) - resolution * tot(c) * k_i / 2m
                const k = degree[i];
                total[current] -= k;
                const stayGain = toCommunity[current] - (resolution * total[current] * k) / twoM;
                let best = current;
                let bestGain = stayGain;
                const minImprovement = threshold * k;

                for (let t = 0; t < touchedCount; t++) {
                    const c = touched[t];
                    if (c !== current) {
                        const gain = toCommunity[c] - (resolution * total[c] * k) / twoM;
                        if (gain > bestGain + minImprovement) {
                            bestGain = gain;
                            best = c;
                        }
                    }

                    toCommunity[c] = 0;
                }

                total[best] += k;
                if (best !== current) {
                    community[i] = best;
                    sweepMoved = true;
                    sweepGain += (bestGain - stayGain) / (twoM / 2);
                }
            }

            moved ||= sweepMoved;
            if (!sweepMoved || sweepGain < tolerance) {
                // A threshold can stall moves that are still worth making: finish without one
                if (useThreshold) {
                    useThreshold = false;
                    continue;
                }

                break;
            }
        }

        // Renumber the communities 0..count-1
        const renumber = new Int32Array(n).fill(-1);
        let count = 0;
        for (let i = 0; i < n; i++) {
            const c = community[i];
            if (renumber[c] === -1) {
                renumber[c] = count++;
            }

            community[i] = renumber[c];
        }

        return { community, count, moved };
    }

    /**
     * Order nodes for local moving, by importance (degree * log(1 + weighted degree)) if asked
     * @param level - The graph at this level
     * @param importanceOrdering - Whether to sort by importance
     * @returns Node indices in processing order
     */
    private nodeOrder(level: Level, importanceOrdering: boolean): Int32Array {
        const order = new Int32Array(level.n);
        for (let i = 0; i < level.n; i++) {
            order[i] = i;
        }

        if (!importanceOrdering) {
            return order;
        }

        const importance = new Float64Array(level.n);
        for (let i = 0; i < level.n; i++) {
            importance[i] = (level.offsets[i + 1] - level.offsets[i]) * Math.log(1 + level.degree[i]);
        }

        return order.sort((a, b) => importance[b] - importance[a]);
    }
}

/**
 * Build a CSR level from an undirected edge list (each edge listed once, no self-loops)
 * @param n - Node count
 * @param counts - counts[i + 1] = number of edges incident to node i
 * @param edges - The edges as [source, target, weight]
 * @param self - Self-loop weight of each node
 * @param degree - Weighted degree of each node
 * @returns The level
 */
function buildCsr(
    n: number,
    counts: Int32Array,
    edges: [number, number, number][],
    self: Float64Array,
    degree: Float64Array,
): Level {
    const offsets = counts;
    for (let i = 0; i < n; i++) {
        offsets[i + 1] += offsets[i];
    }

    const targets = new Int32Array(offsets[n]);
    const weights = new Float64Array(offsets[n]);
    const fill = offsets.slice(0, n);
    for (const [s, t, w] of edges) {
        targets[fill[s]] = t;
        weights[fill[s]++] = w;
        targets[fill[t]] = s;
        weights[fill[t]++] = w;
    }

    return { n, offsets, targets, weights, self, degree };
}

/**
 * Fold each community into one node: edges between communities are summed, edges inside a
 * community become its self-loop
 * @param level - The graph at this level
 * @param community - Each node's community, numbered 0..count-1
 * @param count - Number of communities
 * @returns The next level
 */
function aggregate(level: Level, community: Int32Array, count: number): Level {
    const self = new Float64Array(count);
    const degree = new Float64Array(count);
    const members: number[][] = Array.from({ length: count }, () => []);
    for (let i = 0; i < level.n; i++) {
        const c = community[i];
        members[c].push(i);
        self[c] += level.self[i];
        degree[c] += level.degree[i];
    }

    const edges: [number, number, number][] = [];
    const counts = new Int32Array(count + 1);
    const toCommunity = new Float64Array(count);
    const touched: number[] = [];
    for (let c = 0; c < count; c++) {
        for (const i of members[c]) {
            for (let e = level.offsets[i]; e < level.offsets[i + 1]; e++) {
                const d = community[level.targets[e]];
                if (d === c) {
                    // Seen once from each endpoint
                    self[c] += level.weights[e] / 2;
                } else if (d > c) {
                    // Keep each inter-community edge once, from its lower-numbered side
                    if (toCommunity[d] === 0) {
                        touched.push(d);
                    }

                    toCommunity[d] += level.weights[e];
                }
            }
        }

        for (const d of touched) {
            edges.push([c, d, toCommunity[d]]);
            counts[c + 1]++;
            counts[d + 1]++;
            toCommunity[d] = 0;
        }

        touched.length = 0;
    }

    return buildCsr(count, counts, edges, self, degree);
}

/**
 * Modularity of the partition that puts each node of `level` in its own community
 * @param level - The graph at this level
 * @param resolution - Resolution parameter
 * @returns Q = sum over nodes c of [ self(c) / m - resolution * (k_c / 2m)^2 ]
 */
function levelModularity(level: Level, resolution: number): number {
    const twoM = level.degree.reduce((sum, d) => sum + d, 0);
    if (twoM === 0) {
        return 0;
    }

    let modularity = 0;
    for (let c = 0; c < level.n; c++) {
        const share = level.degree[c] / twoM;
        modularity += (2 * level.self[c]) / twoM - resolution * share * share;
    }

    return modularity;
}

/**
 * Optimized Louvain algorithm with automatic optimization selection
 * @param graph - The input graph to detect communities in
 * @param options - Algorithm configuration options
 * @returns Community detection result with communities, modularity, and iterations
 */
export function louvainOptimized(graph: Graph, options: OptimizedLouvainOptions = {}): CommunityResult {
    const optimizer = new OptimizedLouvain(graph);
    return optimizer.detectCommunities(options);
}
