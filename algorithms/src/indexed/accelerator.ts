/**
 * The accelerator seam of `@graphty/algorithms` (WebGPU design section 9.2). It contains NO
 * WebGPU types: an accelerator is anything that satisfies `AlgorithmAccelerator` structurally,
 * and this package never imports the GPU package (design section 9.1, the dependency direction).
 *
 * `accelerated(acc)` is the ONE dispatcher object (design section 9.2, the dispatcher rule); the
 * spelling is `accelerated(acc).pageRank(s, options)`, never
 * `runAlgorithm(snapshot, { accelerator })`. There is no try/catch anywhere below: an accelerator
 * method that throws propagates its throw unchanged, because a silent CPU fallback would hide a
 * broken device behind a slow answer.
 * @module
 */

import type { F32, F64, GraphSnapshot, NumericVector, U32 } from "@graphty/graph-format";

import type { BfsOptions } from "./bfs.js";
import { type SsspOptions, type SsspResult, walkPredArcs, walkPredEdges } from "./dijkstra.js";
import * as indexed from "./index.js";
import type { MstOptions } from "./mst.js";
import type { PageRankOptions } from "./pagerank.js";

// ============================================================ result shapes (design 9.2 lines 2909-2922)
// Scores may be f32 (an accelerator) or f64 (the CPU ports), so every score field is NumericVector.

/** A score vector with its convergence report. @public */
export interface ScoresResultLike {
    readonly scores: NumericVector;
    readonly iterations: number;
    readonly converged: boolean;
}
/** ScoresResultLike plus the mass held by dangling nodes. @public */
export interface PageRankResultLike extends ScoresResultLike {
    readonly danglingMass?: number | undefined;
}
/** The two HITS vectors with their convergence report. @public */
export interface HitsResultLike {
    readonly hubs: NumericVector;
    readonly authorities: NumericVector;
    readonly iterations: number;
    readonly converged: boolean;
}
/** A partition: dense labels, a count, and the grouped node indices. @public */
export interface LabelResultLike {
    readonly labels: U32;
    readonly count: number;
    groups(): U32[];
}
/** A breadth-first traversal. @public */
export interface BfsResultLike {
    readonly depth: U32;
    readonly parent: U32;
    readonly order: U32;
    readonly visitedCount: number;
}
/** Single-source distances plus the relaxing arc per node. @public */
export interface SsspResultLike {
    readonly dist: NumericVector;
    readonly predArc: U32;
}
/** SsspResultLike plus the negative-cycle flag. @public */
export interface BellmanFordResultLike extends SsspResultLike {
    readonly hasNegativeCycle: boolean;
}
/** A per-logical-edge score vector. @public */
export interface EdgeScoresResultLike {
    readonly scores: NumericVector;
}
/** An all-pairs distance matrix, row-major, n by n. @public */
export interface ApspResultLike {
    readonly dist: NumericVector;
    readonly n: number;
}
/** Per-node coreness. @public */
export interface CorenessResultLike {
    readonly coreness: U32;
}
/** A spanning forest as logical edge indices. @public */
export interface MstResultLike {
    readonly edges: U32;
    readonly totalWeight: number;
}
/** A partition with its modularity. @public */
export interface CommunityResultLike extends LabelResultLike {
    readonly modularity: number;
}

// ============================================================ the injected object (design 9.2 lines 2925-2948)

/**
 * The structural contract an injected accelerator satisfies. EVERY member except `kind` is
 * optional: an accelerator declares only what it implements, and the dispatcher runs the CPU port
 * for everything else. The list is the design's, in full, so that an accelerator written against
 * it needs no change as the ports land.
 * @public
 */
export interface AlgorithmAccelerator {
    readonly kind: string;
    pageRank?(s: GraphSnapshot, options?: PageRankOptions): Promise<PageRankResultLike>;
    personalizedPageRank?(
        s: GraphSnapshot,
        personalization: F32 | F64,
        options?: PageRankOptions,
    ): Promise<PageRankResultLike>;
    hits?(s: GraphSnapshot, options?: HitsOptionsLike): Promise<HitsResultLike>;
    eigenvectorCentrality?(s: GraphSnapshot, options?: HitsOptionsLike): Promise<ScoresResultLike>;
    katzCentrality?(s: GraphSnapshot, options?: HitsOptionsLike): Promise<ScoresResultLike>;
    connectedComponents?(s: GraphSnapshot): Promise<LabelResultLike>;
    weaklyConnectedComponents?(s: GraphSnapshot): Promise<LabelResultLike>;
    breadthFirstSearch?(s: GraphSnapshot, source: number, options?: BfsOptions): Promise<BfsResultLike>;
    sssp?(s: GraphSnapshot, source: number, options?: SsspOptions): Promise<SsspResultLike>;
    bellmanFord?(s: GraphSnapshot, source: number, options?: SsspOptions): Promise<BellmanFordResultLike>;
    closenessCentrality?(s: GraphSnapshot, options?: HitsOptionsLike): Promise<ScoresResultLike>;
    betweennessCentrality?(s: GraphSnapshot, options?: BetweennessAcceleratorOptions): Promise<ScoresResultLike>;
    edgeBetweennessCentrality?(
        s: GraphSnapshot,
        options?: BetweennessAcceleratorOptions,
    ): Promise<EdgeScoresResultLike>;
    allPairsShortestPath?(s: GraphSnapshot, options?: SsspOptions): Promise<ApspResultLike>;
    kCoreDecomposition?(s: GraphSnapshot): Promise<CorenessResultLike>;
    triangleCount?(s: GraphSnapshot): Promise<{ readonly perNode: U32; readonly total: number }>;
    labelPropagation?(s: GraphSnapshot, options?: HitsOptionsLike): Promise<LabelResultLike>;
    minimumSpanningTree?(s: GraphSnapshot, options?: MstOptions): Promise<MstResultLike>;
    louvain?(s: GraphSnapshot, options?: HitsOptionsLike): Promise<CommunityResultLike>;
    release?(s: GraphSnapshot): void;
    dispose?(): void;
}

/**
 * The option shape of the power-iteration family until each one's `indexed.*` port lands and
 * brings its real option type (plan decision PD-2's "NOT TOUCHED" rows). It is DELIBERATELY not
 * `Record<string, unknown>`: these three are the members every one of those algorithms takes, so
 * an accelerator can honour them today and the type narrows rather than widens as ports arrive.
 * @public
 */
export interface HitsOptionsLike {
    readonly maxIterations?: number | undefined;
    readonly tolerance?: number | undefined;
    readonly weighted?: boolean | undefined;
}

/**
 * Betweenness options as the accelerator sees them: node INDICES, which is the only form that
 * means anything on a snapshot (plan decision PD-5).
 * @public
 */
export interface BetweennessAcceleratorOptions {
    readonly normalized?: boolean | undefined;
    readonly endpoints?: boolean | undefined;
    readonly sources?: readonly number[] | undefined;
    readonly k?: number | undefined;
}

// ============================================================ the dispatcher (design 9.2 lines 2950-2957)

/**
 * The async dispatcher: one method per accelerable `indexed.*` function. Each delegates to the
 * accelerator when it has the method and runs the CPU port otherwise, wrapped in `Promise.resolve`
 * so both paths are async and graphty-element's `async run()` adapters treat them alike.
 *
 * The list GROWS with the A2 ports -- each port PR adds its method. Today it carries the six whose
 * ports exist (plan departure DEP-8A-E).
 * @public
 */
export interface AcceleratedAlgorithms {
    readonly accelerator: AlgorithmAccelerator | null;
    pageRank(s: GraphSnapshot, options?: PageRankOptions): Promise<PageRankResultLike>;
    sssp(s: GraphSnapshot, source: number, options?: SsspOptions): Promise<SsspResult>;
    breadthFirstSearch(s: GraphSnapshot, source: number, options?: BfsOptions): Promise<BfsResultLike>;
    connectedComponents(s: GraphSnapshot): Promise<LabelResultLike>;
    weaklyConnectedComponents(s: GraphSnapshot): Promise<LabelResultLike>;
    minimumSpanningTree(s: GraphSnapshot, options?: MstOptions): Promise<MstResultLike>;
}

/**
 * Attach `pathTo` / `pathEdges` to an accelerator's bare `{ dist, predArc }`, so both paths return
 * the design's `SsspResult` and the element keeps ONE result-writing loop. The GPU package cannot
 * attach them itself: it must not depend on the CPU package at runtime (design 9.2 line 2971, D3).
 * @param s - The snapshot the search ran on
 * @param source - The search's source node index
 * @param like - The accelerator's result
 * @returns The decorated result
 */
function decorateSssp(s: GraphSnapshot, source: number, like: SsspResultLike): SsspResult {
    const { predArc } = like;
    return {
        dist: like.dist,
        predArc,
        pathTo: (target: number): U32 => walkPredArcs(s, predArc, source, target),
        pathEdges: (target: number): U32 => walkPredEdges(s, predArc, source, target),
    };
}

/**
 * Build the dispatcher for an accelerator, or for none.
 * @param acc - The injected accelerator, or `null` / `undefined` for the CPU path
 * @returns A dispatcher whose methods delegate where they can and run the CPU port otherwise
 * @public
 */
export function accelerated(acc: AlgorithmAccelerator | null | undefined): AcceleratedAlgorithms {
    return {
        accelerator: acc ?? null,
        pageRank: (s, options) =>
            acc?.pageRank !== undefined ? acc.pageRank(s, options) : Promise.resolve(indexed.pageRank(s, options)),
        sssp: (s, source, options) =>
            acc?.sssp !== undefined
                ? acc.sssp(s, source, options).then((like) => decorateSssp(s, source, like))
                : Promise.resolve(indexed.dijkstra(s, source, options)),
        breadthFirstSearch: (s, source, options) =>
            acc?.breadthFirstSearch !== undefined
                ? acc.breadthFirstSearch(s, source, options)
                : Promise.resolve(indexed.breadthFirstSearch(s, source, options)),
        connectedComponents: (s) =>
            acc?.connectedComponents !== undefined
                ? acc.connectedComponents(s)
                : Promise.resolve(indexed.connectedComponents(s)),
        weaklyConnectedComponents: (s) =>
            acc?.weaklyConnectedComponents !== undefined
                ? acc.weaklyConnectedComponents(s)
                : Promise.resolve(indexed.weaklyConnectedComponents(s)),
        minimumSpanningTree: (s, options) =>
            acc?.minimumSpanningTree !== undefined
                ? acc.minimumSpanningTree(s, options)
                : Promise.resolve(indexed.kruskalMST(s, options)),
    };
}
