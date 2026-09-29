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

import type { AdjacencyView, F32, F64, GraphSnapshot, NumericVector, U32 } from "@graphty/graph-format";

import { ConvergenceError } from "../errors.js";
import { APSP_DEFAULT_MAX_NODES, type ApspOptions } from "./all-pairs.js";
import type { BellmanFordResult } from "./bellman-ford.js";
import { type BetweennessOptions, type EdgeBetweennessOptions, resolveSources } from "./betweenness.js";
import type { ArcOrderOption, BfsOptions } from "./bfs.js";
import type { ClosenessOptions } from "./closeness.js";
import type { LabelResult } from "./components.js";
import type { DegreesResult } from "./degree.js";
import type { DfsOptions, DfsResult } from "./dfs.js";
import { type SsspOptions, type SsspResult, walkPredArcs, walkPredEdges } from "./dijkstra.js";
import { type EigenvectorOptions, minMaxRescale } from "./eigenvector.js";
import type { MaxFlowOptions, MaxFlowResult, MinCutResult } from "./flow.js";
import type { GirvanNewmanOptions, GirvanNewmanResult } from "./girvan-newman.js";
import type { HitsOptions } from "./hits.js";
import * as indexed from "./index.js";
import type { KatzOptions } from "./katz.js";
import type { LabelPropagationOptions } from "./label-propagation.js";
import type { LeidenOptions, LeidenResult } from "./leiden.js";
import type { LinkPredictionOptions, LinkPredictionResult } from "./link-prediction.js";
import type { LouvainOptions } from "./louvain.js";
import type { BipartiteMatchingOptions, BipartiteMatchingResult } from "./matching.js";
import type { KargerOptions, StoerWagnerOptions } from "./min-cut.js";
import type { MstOptions, PrimOptions, PrimResult } from "./mst.js";
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
/** ApspResultLike plus the negative-cycle flag. @public */
export interface ApspCycleResultLike extends ApspResultLike {
    readonly hasNegativeCycle: boolean;
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
    pageRank?(s: GraphSnapshot, options?: PageRankOptionsLike): Promise<PageRankResultLike>;
    personalizedPageRank?(
        s: GraphSnapshot,
        personalization: F32 | F64,
        options?: PageRankOptionsLike,
    ): Promise<PageRankResultLike>;
    hits?(s: GraphSnapshot, options?: HitsOptionsLike): Promise<HitsResultLike>;
    eigenvectorCentrality?(s: GraphSnapshot, options?: HitsOptionsLike): Promise<ScoresResultLike>;
    katzCentrality?(s: GraphSnapshot, options?: KatzOptionsLike): Promise<ScoresResultLike>;
    connectedComponents?(s: GraphSnapshot): Promise<LabelResultLike>;
    weaklyConnectedComponents?(s: GraphSnapshot): Promise<LabelResultLike>;
    // Only maxDepth: a GPU BFS expands whole levels in index order, so it can neither stop early at a
    // target nor try arcs in a caller's order.
    breadthFirstSearch?(
        s: GraphSnapshot,
        source: number,
        options?: Pick<BfsOptions, "maxDepth">,
    ): Promise<BfsResultLike>;
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
 * Katz options as the accelerator sees them: the power-iteration trio plus the two coefficients
 * that define the recurrence `x = alpha * A^T x + beta`.
 * @public
 */
export interface KatzOptionsLike extends HitsOptionsLike {
    readonly alpha?: number | undefined;
    readonly beta?: number | undefined;
}

/**
 * PageRank options as the accelerator sees them: the port's `PageRankOptions` without
 * `initialRanks` and `convergenceNorm`, which the dispatcher keeps on the CPU port.
 * @public
 */
export interface PageRankOptionsLike {
    readonly dampingFactor?: number | undefined;
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
 * The list GROWS with the A2 ports -- each port PR adds its method (plan departure DEP-8A-E).
 *
 * `louvain` and `kCoreDecomposition` pass their port's options through unchanged; Louvain's
 * `resolution` is wider than the `HitsOptionsLike` the accelerator side declares, and narrowing that
 * member belongs to the pull request that lands a GPU Louvain.
 *
 * `katzCentrality` and `hits` hand the accelerator only what it reads -- `{ alpha, beta,
 * maxIterations, tolerance, weighted }` and `{ maxIterations, tolerance, weighted }` -- with
 * `weighted` resolved to the port's default (false), since an accelerator may default it the
 * other way, and give its result the port's scale: an accelerator may end its iterate on any
 * positive scale (webgpu-graph-algorithms divides Katz by its L2 norm and HITS by its sum), so
 * Katz is min-max rescaled to [0, 1] as the port rescales its own, and each HITS vector is
 * rescaled to unit length, or to a largest entry of 1 under `normalized: false`, as the port does.
 * Katz runs the CPU port under `normalized: false` (the raw sums cannot be recovered from a
 * rescaled vector), with `alpha` 0, and when every node has the same in-degree (or in-weight):
 * there every score is equal, and the port leaves an equal vector unscaled. It also runs the CPU
 * port unless `alpha` times a bound on the spectral radius is below 1, where the series is certain
 * to converge: past that an f32 accelerator can overflow to Infinity. The iteration counts
 * of the two paths differ.
 *
 * `labelPropagation` passes its options through the same way, except that a call with `randomSeed`
 * set runs the CPU port: the partition depends on the seed, and a GPU kernel has none to honour. An
 * accelerator's result carries no `iterations` or `converged`; call `indexed.labelPropagation`
 * directly for those. webgpu-graph-algorithms does not implement `labelPropagation` yet, so with its
 * accelerator this method runs the CPU port.
 *
 * `breadthFirstSearch` with a `target` or an `arcOrder` runs the CPU port: a GPU BFS expands whole
 * levels and has no early stop and no neighbour order, so it would give a different result.
 *
 * `pageRank` and `personalizedPageRank` run the CPU port when `initialRanks` or
 * `convergenceNorm: "max"` is set: the accelerator members take neither. The accelerator is
 * handed `{ dampingFactor, maxIterations, tolerance, weighted }` with `weighted` resolved to the
 * port's default (false), since an accelerator may default it the other way. Its stopping rule
 * may differ from the port's (webgpu-graph-algorithms stops at an L1 change below
 * `tolerance * n`, as networkx does), so the two paths can stop at different iterations.
 * `personalizedPageRank` also runs the CPU port when the personalization is all zero (the port
 * then answers plain PageRank, as the legacy function does for no personal nodes) or when a node
 * is dangling: the port spreads dangling mass as legacy does, `d * dangling / n` scaled by the
 * personalization, and the accelerator spreads `d * dangling` by the personalization, as networkx
 * does. The two agree when no node is dangling.
 *
 * `eigenvectorCentrality` goes to the accelerator only for the question its kernel answers the
 * same way: an undirected snapshot with no parallel edges and no bipartite component, unweighted,
 * from the uniform start. The kernel iterates on `A` where the port iterates on `A + I`, and walks
 * every parallel arc where the port counts a neighbour once; on a bipartite component the
 * iteration on `A` oscillates forever. A directed snapshot always runs the port, since a
 * periodic strongly connected component oscillates the same way and is not cheap to rule out.
 * The accelerator is called with `{ maxIterations, tolerance, weighted: false }` and its
 * unit-length vector is rescaled to [0, 1] exactly as the port rescales its own unless
 * `normalized: false`. A result with `converged: false` raises `ConvergenceError`, as the port
 * does. The iteration counts of the two paths differ.
 *
 * `allPairsShortestPath` is the reverse case: the accelerator member reads none of the port's
 * options and has no negative-cycle flag, so the dispatcher calls it, without options, only when it
 * answers the port's question -- no options that change the result, at most the port's default
 * 5,792 nodes, and non-negative finite snapshot weights -- and runs the CPU port otherwise. That is
 * routing decided from the inputs, not a fallback: an error the accelerator raises still propagates.
 * Same question is not same bits: both read the snapshot's f32 arc weights, but a GPU member sums
 * them in f32 and returns an f32 `dist`, where the port sums in f64. The two agree exactly while
 * every path sum is an integer below 2^24, and otherwise may differ by f32 rounding.
 *
 * `bellmanFord` goes to the accelerator unless the call carries a `weights` override that is not a
 * `Float32Array`: an accelerator narrows the override to f32, so an f64 one -- the exact weights a
 * legacy facade passes -- would be answered for different weights. Its result gets the same
 * `pathTo` / `pathEdges` decoration as `sssp`.
 *
 * The three path centralities route the same way. `betweennessCentrality` and
 * `edgeBetweennessCentrality` go to the accelerator unless the snapshot is a multigraph (the port
 * counts a pair's parallel edges as one path, the WebGPU kernel as several), `endpoints` is set, or an
 * `alive` edge mask is given. The accelerator is always handed the sources the port would run -- the
 * caller's, the port's `k` draw, or every node -- so it never substitutes a draw or a sampling default of
 * its own. `closenessCentrality` goes only for the plain score -- no `normalized`,
 * `harmonic`, `cutoff` or `weights` override -- and hands the accelerator an explicit `weighted`,
 * because the WebGPU member otherwise defaults it from the snapshot where the port defaults it off.
 *
 * `depthFirstSearch`, `degrees`, `stronglyConnectedComponents`, `leiden`, `girvanNewman`, `maxFlow`,
 * `minSTCut`, `stoerWagner`, `kargerMinCut`, `commonNeighborsPrediction`, `adamicAdarPrediction`,
 * `primMST` and `maximumBipartiteMatching` always run the CPU port: `AlgorithmAccelerator` declares no member for
 * them, since no GPU kernel exists. They are here so graphty-element runs every algorithm through
 * one object, and each gains an accelerator branch when a kernel lands. `depthFirstSearch` takes any
 * `AdjacencyView`, as its port does, so a walk can run over a reverse or an edited view. A port's throw becomes a
 * rejection.
 * @public
 */
export interface AcceleratedAlgorithms {
    readonly accelerator: AlgorithmAccelerator | null;
    pageRank(s: GraphSnapshot, options?: PageRankOptions): Promise<PageRankResultLike>;
    personalizedPageRank(
        s: GraphSnapshot,
        personalization: F32 | F64,
        options?: PageRankOptions,
    ): Promise<PageRankResultLike>;
    eigenvectorCentrality(s: GraphSnapshot, options?: EigenvectorOptions): Promise<ScoresResultLike>;
    sssp(s: GraphSnapshot, source: number, options?: SsspOptions): Promise<SsspResult>;
    bellmanFord(s: GraphSnapshot, source: number, options?: SsspOptions): Promise<BellmanFordResult>;
    breadthFirstSearch(s: GraphSnapshot, source: number, options?: BfsOptions): Promise<BfsResultLike>;
    connectedComponents(s: GraphSnapshot): Promise<LabelResultLike>;
    weaklyConnectedComponents(s: GraphSnapshot): Promise<LabelResultLike>;
    minimumSpanningTree(s: GraphSnapshot, options?: MstOptions): Promise<MstResultLike>;
    kCoreDecomposition(s: GraphSnapshot): Promise<CorenessResultLike>;
    katzCentrality(s: GraphSnapshot, options?: KatzOptions): Promise<ScoresResultLike>;
    hits(s: GraphSnapshot, options?: HitsOptions): Promise<HitsResultLike>;
    louvain(s: GraphSnapshot, options?: LouvainOptions): Promise<CommunityResultLike>;
    labelPropagation(s: GraphSnapshot, options?: LabelPropagationOptions): Promise<LabelResultLike>;
    allPairsShortestPath(s: GraphSnapshot, options?: ApspOptions): Promise<ApspCycleResultLike>;
    betweennessCentrality(s: GraphSnapshot, options?: BetweennessOptions): Promise<ScoresResultLike>;
    edgeBetweennessCentrality(s: GraphSnapshot, options?: EdgeBetweennessOptions): Promise<EdgeScoresResultLike>;
    closenessCentrality(s: GraphSnapshot, options?: ClosenessOptions): Promise<ScoresResultLike>;
    depthFirstSearch(g: AdjacencyView, start: number, options?: DfsOptions): Promise<DfsResult>;
    degrees(s: GraphSnapshot): Promise<DegreesResult>;
    stronglyConnectedComponents(s: GraphSnapshot, options?: ArcOrderOption): Promise<LabelResult>;
    leiden(s: GraphSnapshot, options?: LeidenOptions): Promise<LeidenResult>;
    girvanNewman(s: GraphSnapshot, options?: GirvanNewmanOptions): Promise<GirvanNewmanResult>;
    maxFlow(s: GraphSnapshot, source: number, sink: number, options?: MaxFlowOptions): Promise<MaxFlowResult>;
    minSTCut(s: GraphSnapshot, source: number, sink: number, options?: MaxFlowOptions): Promise<MinCutResult>;
    stoerWagner(s: GraphSnapshot, options?: StoerWagnerOptions): Promise<MinCutResult>;
    kargerMinCut(s: GraphSnapshot, options?: KargerOptions): Promise<MinCutResult>;
    commonNeighborsPrediction(s: GraphSnapshot, options?: LinkPredictionOptions): Promise<LinkPredictionResult>;
    adamicAdarPrediction(s: GraphSnapshot, options?: LinkPredictionOptions): Promise<LinkPredictionResult>;
    primMST(s: GraphSnapshot, options?: PrimOptions): Promise<PrimResult>;
    maximumBipartiteMatching(s: GraphSnapshot, options?: BipartiteMatchingOptions): Promise<BipartiteMatchingResult>;
}

/**
 * Run a CPU port inside a promise, so a throw becomes a rejection.
 * @param run - The port call
 * @returns Its result
 */
function onCpu<T>(run: () => T): Promise<T> {
    return new Promise((resolve) => {
        resolve(run());
    });
}

/**
 * Betweenness options with the sources the port would run spelled out, and no `k`. `endpoints` is never
 * forwarded: a call that sets it runs the port.
 * @param s - The snapshot
 * @param options - The caller's port options
 * @returns The options for the accelerator
 */
function explicitSources(
    s: GraphSnapshot,
    options: BetweennessOptions | EdgeBetweennessOptions | undefined,
): BetweennessAcceleratorOptions {
    return {
        normalized: options?.normalized,
        sources: resolveSources(s.nodeCount, options?.sources, options?.k),
    };
}

/**
 * Whether the accelerator's closeness member answers the port's question: only the plain
 * `1 / sum(distance)` score over the snapshot's own weights.
 * @param options - The caller's port options
 * @returns True when the call may go to the accelerator
 */
function acceleratorAnswersCloseness(options: ClosenessOptions | undefined): boolean {
    return (
        options?.normalized !== true &&
        options?.harmonic !== true &&
        options?.cutoff === undefined &&
        options?.weights === undefined
    );
}

/**
 * Whether the accelerator's all-pairs member, called with the snapshot alone, answers the question
 * the CPU port would (at its own precision; see `AcceleratedAlgorithms`): no option that changes the answer, a size the port accepts by default, and
 * weights under which no negative cycle can exist, so `hasNegativeCycle: false` is true.
 * @param s - The snapshot
 * @param options - The caller's port options
 * @returns True when the call may go to the accelerator
 */
function acceleratorAnswersApsp(s: GraphSnapshot, options: ApspOptions | undefined): boolean {
    return (
        options?.weights === undefined &&
        (options?.method ?? "auto") === "auto" &&
        options?.maxNodes === undefined &&
        options?.paths !== true &&
        options?.weighted !== false &&
        s.nodeCount <= APSP_DEFAULT_MAX_NODES &&
        s.flags.nonNegativeWeights &&
        s.flags.finiteWeights
    );
}

/**
 * Whether a PageRank call asks for something the accelerator members do not take.
 * @param options - The caller's port options
 * @returns True when the call must run the CPU port
 */
function pageRankNeedsCpu(options: PageRankOptions | undefined): boolean {
    return options?.initialRanks !== undefined || options?.convergenceNorm === "max";
}

/**
 * The PageRank options an accelerator is handed: only the members it takes, with `weighted`
 * resolved to the port's default.
 * @param options - The caller's port options
 * @returns The accelerator's options
 */
function pageRankOptionsLike(options: PageRankOptions | undefined): PageRankOptionsLike {
    return {
        dampingFactor: options?.dampingFactor,
        maxIterations: options?.maxIterations,
        tolerance: options?.tolerance,
        weighted: options?.weighted === true,
    };
}

/**
 * Whether a personalized PageRank call must run the port: an all-zero personalization (plain
 * PageRank in the port, an error in the accelerator) or a dangling node (the two spread its mass
 * differently).
 * @param s - The snapshot
 * @param personalization - The caller's personalization
 * @param options - The caller's port options
 * @returns True when the call must run the CPU port
 */
function personalizedNeedsCpu(
    s: GraphSnapshot,
    personalization: F32 | F64,
    options: PageRankOptions | undefined,
): boolean {
    const outW = options?.weighted === true && s.weights !== null ? s.weightedOutDegree() : s.outDegree();
    return pageRankNeedsCpu(options) || !personalization.some((mass) => mass > 0) || outW.some((w) => w === 0);
}

/**
 * Whether the accelerator's eigenvector member answers the port's question: an undirected
 * snapshot with no parallel edges and no bipartite component, from the uniform start.
 * @param s - The snapshot
 * @param options - The caller's port options
 * @returns True when the call may go to the accelerator
 */
function acceleratorAnswersEigenvector(s: GraphSnapshot, options: EigenvectorOptions | undefined): boolean {
    return options?.startVector === undefined && !s.directed && !s.flags.multigraph && !hasBipartiteComponent(s);
}

/**
 * Whether some connected component with at least one edge is bipartite, by two-colouring each
 * component breadth first. A self-loop is an odd cycle.
 * @param s - An undirected snapshot
 * @returns True when a component with an edge has no odd cycle
 */
function hasBipartiteComponent(s: GraphSnapshot): boolean {
    const n = s.nodeCount;
    const colour = new Int8Array(n).fill(-1);
    const queue = new Uint32Array(n);
    for (let root = 0; root < n; root++) {
        if (colour[root] !== -1 || s.rowPtr[root] === s.rowPtr[root + 1]) {
            continue;
        }
        colour[root] = 0;
        let tail = 0;
        queue[tail++] = root;
        let odd = false;
        for (let head = 0; head < tail; head++) {
            const u = queue[head];
            for (let a = s.rowPtr[u]; a < s.rowPtr[u + 1]; a++) {
                const v = s.colIdx[a];
                if (colour[v] === -1) {
                    colour[v] = 1 - colour[u];
                    queue[tail++] = v;
                } else if (colour[v] === colour[u]) {
                    odd = true;
                }
            }
        }
        if (!odd) {
            return true;
        }
    }
    return false;
}

/**
 * Give an accelerator's eigenvector result the port's contract: an unconverged run throws, and the
 * unit-length vector is rescaled to [0, 1] unless `normalized: false`.
 * @param like - The accelerator's result
 * @param options - The caller's port options
 * @returns The result, rescaled into a new vector when asked
 */
function finishEigenvector(like: ScoresResultLike, options: EigenvectorOptions | undefined): ScoresResultLike {
    if (!like.converged) {
        throw new ConvergenceError("eigenvectorCentrality", options?.maxIterations ?? 100, options?.tolerance ?? 1e-6);
    }
    if (options?.normalized === false) {
        return like;
    }
    const scores = Float64Array.from(like.scores);
    minMaxRescale(scores);
    return { scores, iterations: like.iterations, converged: true };
}

/**
 * Whether the accelerator's Katz member answers the port's question: the min-max rescaled score
 * of a vector that is not constant, from a series certain to converge. Raw sums (`normalized:
 * false`) are lost to the accelerator's own rescaling, and a constant vector -- `alpha` 0, or the
 * same in-degree (in-weight) everywhere -- is one the port leaves unscaled. The series converges
 * when `alpha` times the spectral radius is below 1; past that an accelerator iterating in f32 with
 * no per-iteration normaliser can overflow to Infinity where the f64 port stays finite and reports
 * `converged: false`. The radius is bounded, in one pass over the arcs, by the largest
 * `sqrt(r_u * r_v)` over the arcs u -> v, where `r` is a node's in-arc total (absolute weights):
 * scale the in-arc matrix by `diag(sqrt(r))` and each row sum is at most that, by Cauchy-Schwarz.
 * It is never above the largest in-arc total, and it is tight on a star -- a hub of degree d has
 * radius sqrt(d), not d -- so one busy node does not keep a graph off the accelerator.
 * @param s - The snapshot
 * @param options - The caller's port options
 * @returns True when the call may go to the accelerator
 */
function acceleratorAnswersKatz(s: GraphSnapshot, options: KatzOptions | undefined): boolean {
    if (options?.normalized === false || options?.alpha === 0) {
        return false;
    }
    const rev = s.reverse();
    const weights = options?.weighted === true ? rev.weights : null;
    const totals = new Float64Array(s.nodeCount);
    let first: number | undefined;
    let uneven = false;
    for (let v = 0; v < s.nodeCount; v++) {
        let inWeight = 0;
        for (let a = rev.rowPtr[v]; a < rev.rowPtr[v + 1]; a++) {
            inWeight += weights === null ? 1 : weights[a];
            totals[v] += weights === null ? 1 : Math.abs(weights[a]);
        }
        first ??= inWeight;
        uneven ||= inWeight !== first;
    }
    if (!uneven) {
        return false;
    }
    let largest = 0;
    for (let v = 0; v < s.nodeCount; v++) {
        for (let a = rev.rowPtr[v]; a < rev.rowPtr[v + 1]; a++) {
            largest = Math.max(largest, totals[v] * totals[rev.colIdx[a]]);
        }
    }
    const alpha = options?.alpha ?? 0.1;
    return alpha * alpha * largest < 1;
}

/**
 * Rescale a vector in place to [0, 1] by min-max, leaving a constant vector alone -- the Katz
 * port's own rescaling.
 * @param x - The vector
 */
function katzRescale(x: F64): void {
    let min = Infinity;
    let max = -Infinity;
    for (const value of x) {
        min = Math.min(min, value);
        max = Math.max(max, value);
    }
    const range = max - min;
    if (range > 0) {
        for (let v = 0; v < x.length; v++) {
            x[v] = (x[v] - min) / range;
        }
    }
}

/**
 * Give an accelerator's Katz result the port's scale: min-max rescaled to [0, 1], into a new vector.
 * @param like - The accelerator's result
 * @returns The rescaled result
 */
function finishKatz(like: ScoresResultLike): ScoresResultLike {
    const scores = Float64Array.from(like.scores);
    katzRescale(scores);
    return { scores, iterations: like.iterations, converged: like.converged };
}

/**
 * Rescale a vector in place to unit L2 length, or to a largest entry of 1; a vector with no
 * positive scale is left alone, as the port leaves it.
 * @param x - The vector
 * @param norm - Which scale the port gives it
 */
function hitsRescale(x: F64, norm: "l2" | "max"): void {
    let scale = 0;
    for (const value of x) {
        scale = norm === "l2" ? scale + value * value : Math.max(scale, value);
    }
    scale = norm === "l2" ? Math.sqrt(scale) : scale;
    if (scale > 0) {
        for (let v = 0; v < x.length; v++) {
            x[v] /= scale;
        }
    }
}

/**
 * Give an accelerator's HITS result the port's scale: each vector at unit length, or at a largest
 * entry of 1 under `normalized: false`, into new vectors.
 * @param like - The accelerator's result
 * @param options - The caller's port options
 * @returns The rescaled result
 */
function finishHits(like: HitsResultLike, options: HitsOptions | undefined): HitsResultLike {
    const norm = options?.normalized === false ? "max" : "l2";
    const hubs = Float64Array.from(like.hubs);
    const authorities = Float64Array.from(like.authorities);
    hitsRescale(hubs, norm);
    hitsRescale(authorities, norm);
    return { hubs, authorities, iterations: like.iterations, converged: like.converged };
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
            acc?.pageRank !== undefined && !pageRankNeedsCpu(options)
                ? acc.pageRank(s, pageRankOptionsLike(options))
                : Promise.resolve(indexed.pageRank(s, options)),
        personalizedPageRank: (s, personalization, options) =>
            acc?.personalizedPageRank !== undefined && !personalizedNeedsCpu(s, personalization, options)
                ? acc.personalizedPageRank(s, personalization, pageRankOptionsLike(options))
                : Promise.resolve(indexed.personalizedPageRank(s, personalization, options)),
        eigenvectorCentrality: (s, options) =>
            acc?.eigenvectorCentrality !== undefined && acceleratorAnswersEigenvector(s, options)
                ? acc
                      .eigenvectorCentrality(s, {
                          maxIterations: options?.maxIterations,
                          tolerance: options?.tolerance,
                          weighted: false,
                      })
                      .then((like) => finishEigenvector(like, options))
                : // The executor turns the port's ConvergenceError into a rejection, as on the accelerator path.
                  new Promise((resolve) => {
                      resolve(indexed.eigenvectorCentrality(s, options));
                  }),
        sssp: (s, source, options) =>
            acc?.sssp !== undefined
                ? acc.sssp(s, source, options).then((like) => decorateSssp(s, source, like))
                : Promise.resolve(indexed.dijkstra(s, source, options)),
        bellmanFord: (s, source, options) =>
            acc?.bellmanFord !== undefined &&
            (options?.weights === undefined || options.weights instanceof Float32Array)
                ? acc.bellmanFord(s, source, options).then((like) => ({
                      ...decorateSssp(s, source, like),
                      hasNegativeCycle: like.hasNegativeCycle,
                  }))
                : Promise.resolve(indexed.bellmanFord(s, source, options)),
        breadthFirstSearch: (s, source, options) =>
            acc?.breadthFirstSearch !== undefined && options?.target === undefined && options?.arcOrder === undefined
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
        kCoreDecomposition: (s) =>
            acc?.kCoreDecomposition !== undefined
                ? acc.kCoreDecomposition(s)
                : Promise.resolve(indexed.kCoreDecomposition(s)),
        katzCentrality: (s, options) =>
            acc?.katzCentrality !== undefined && acceleratorAnswersKatz(s, options)
                ? acc
                      .katzCentrality(s, {
                          alpha: options?.alpha,
                          beta: options?.beta,
                          maxIterations: options?.maxIterations,
                          tolerance: options?.tolerance,
                          weighted: options?.weighted === true,
                      })
                      .then(finishKatz)
                : Promise.resolve(indexed.katzCentrality(s, options)),
        hits: (s, options) =>
            acc?.hits !== undefined
                ? acc
                      .hits(s, {
                          maxIterations: options?.maxIterations,
                          tolerance: options?.tolerance,
                          weighted: options?.weighted === true,
                      })
                      .then((like) => finishHits(like, options))
                : Promise.resolve(indexed.hits(s, options)),
        louvain: (s, options) =>
            acc?.louvain !== undefined ? acc.louvain(s, options) : Promise.resolve(indexed.louvain(s, options)),
        allPairsShortestPath: (s, options) =>
            acc?.allPairsShortestPath !== undefined && acceleratorAnswersApsp(s, options)
                ? acc.allPairsShortestPath(s).then(({ dist, n }) => ({ dist, n, hasNegativeCycle: false }))
                : Promise.resolve(indexed.allPairsShortestPath(s, options)),
        betweennessCentrality: (s, options) =>
            acc?.betweennessCentrality !== undefined && !s.flags.multigraph && options?.endpoints !== true
                ? acc.betweennessCentrality(s, explicitSources(s, options))
                : Promise.resolve(indexed.betweennessCentrality(s, options)),
        edgeBetweennessCentrality: (s, options) =>
            acc?.edgeBetweennessCentrality !== undefined && !s.flags.multigraph && options?.alive === undefined
                ? acc.edgeBetweennessCentrality(s, explicitSources(s, options))
                : Promise.resolve(indexed.edgeBetweennessCentrality(s, options)),
        closenessCentrality: (s, options) =>
            acc?.closenessCentrality !== undefined && acceleratorAnswersCloseness(options)
                ? acc.closenessCentrality(s, { weighted: options?.weighted === true })
                : Promise.resolve(indexed.closenessCentrality(s, options)),
        labelPropagation: (s, options) =>
            acc?.labelPropagation !== undefined && options?.randomSeed === undefined
                ? acc.labelPropagation(s, options)
                : Promise.resolve(indexed.labelPropagation(s, options)),
        depthFirstSearch: (g, start, options) => onCpu(() => indexed.depthFirstSearch(g, start, options)),
        degrees: (s) => onCpu(() => indexed.degrees(s)),
        stronglyConnectedComponents: (s, options) => onCpu(() => indexed.stronglyConnectedComponents(s, options)),
        leiden: (s, options) => onCpu(() => indexed.leiden(s, options)),
        girvanNewman: (s, options) => onCpu(() => indexed.girvanNewman(s, options)),
        maxFlow: (s, source, sink, options) => onCpu(() => indexed.maxFlow(s, source, sink, options)),
        minSTCut: (s, source, sink, options) => onCpu(() => indexed.minSTCut(s, source, sink, options)),
        stoerWagner: (s, options) => onCpu(() => indexed.stoerWagner(s, options)),
        kargerMinCut: (s, options) => onCpu(() => indexed.kargerMinCut(s, options)),
        commonNeighborsPrediction: (s, options) => onCpu(() => indexed.commonNeighborsPrediction(s, options)),
        adamicAdarPrediction: (s, options) => onCpu(() => indexed.adamicAdarPrediction(s, options)),
        primMST: (s, options) => onCpu(() => indexed.primMST(s, options)),
        maximumBipartiteMatching: (s, options) => onCpu(() => indexed.maximumBipartiteMatching(s, options)),
    };
}
