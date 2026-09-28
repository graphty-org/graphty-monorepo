/**
 * Link prediction over a snapshot: common-neighbour and Adamic-Adar scores for one pair, a list of
 * pairs, every pair, or one node's candidates, and the ranking metrics of a held-out evaluation.
 *
 * Every score is a merge of two sorted rows with simple-graph semantics: a neighbour reached by
 * parallel arcs counts once, and a self-loop makes a node its own neighbour. With
 * `{ directed: true }` a pair (u, v) intersects out(u) with in(v) -- the nodes on a path u -> z -> v
 * -- and otherwise the two out rows (the two rows of an undirected snapshot).
 *
 * A node index at or beyond `nodeCount`, `INVALID_INDEX` included, is an absent node: its pairs
 * score 0 and it has no candidates.
 * @module
 */

import type { AdjacencyView, F64, GraphSnapshot, U32 } from "@graphty/graph-format";

import { type CommonNeighborsOptions, sortedRowMerge } from "./common-neighbors.js";

/** Options of the link prediction functions. @public */
export interface LinkPredictionOptions extends CommonNeighborsOptions {
    /** Also score pairs already joined by an arc u -> v. Default false. */
    readonly includeExisting?: boolean | undefined;
    /**
     * Keep only the first `topK` ranked pairs. For the whole-graph predictions a value that is not
     * positive keeps them all; for a node's candidates the default is 10 and the value is a slice
     * end, so 0 keeps none and -2 drops the last two.
     */
    readonly topK?: number | undefined;
}

/** Options of the per-node candidate functions. @public */
export interface CandidateOptions extends LinkPredictionOptions {
    /** The node indices to consider, in this order; default every node in index order. */
    readonly candidates?: ArrayLike<number> | undefined;
}

/** Node pairs as two parallel index lists: pair k is (sources[k], targets[k]). @public */
export interface NodePairs {
    readonly sources: ArrayLike<number>;
    readonly targets: ArrayLike<number>;
}

/** Ranked pairs, highest score first, ties in enumeration order. @public */
export interface LinkPredictionResult extends NodePairs {
    readonly sources: U32;
    readonly targets: U32;
    readonly scores: F64;
}

/** The best-F1 threshold's precision and recall, that F1, and the ranking AUC. @public */
export interface LinkPredictionMetrics {
    readonly precision: number;
    readonly recall: number;
    readonly f1Score: number;
    readonly auc: number;
}

type PairScore = (u: number, v: number) => number;

/**
 * The number of distinct entries of each row of a sorted adjacency, added into `into`.
 * @param view - The adjacency
 * @param into - One count per node
 */
function addDistinctDegrees(view: AdjacencyView, into: F64): void {
    for (let z = 0; z < into.length; z++) {
        const end = view.rowPtr[z + 1];
        for (let a = view.rowPtr[z]; a < end; a++) {
            if (a === view.rowPtr[z] || view.colIdx[a] !== view.colIdx[a - 1]) {
                into[z]++;
            }
        }
    }
}

/**
 * The Adamic-Adar weight of each node as a common neighbour: 1 / ln(degree), and 1 for degree 1
 * (ln 1 is 0). The degree counts distinct neighbours: out-neighbours for `{ directed: true }` or an
 * undirected snapshot, else out- plus in-neighbours, a self-loop in both.
 * @param s - The snapshot
 * @param directed - The `directed` option
 * @returns One weight per node
 */
function adamicAdarWeights(s: GraphSnapshot, directed: boolean): F64 {
    const w = new Float64Array(s.nodeCount);
    addDistinctDegrees(s, w);
    if (s.directed && !directed) {
        addDistinctDegrees(s.reverse(), w);
    }
    for (let z = 0; z < w.length; z++) {
        // ln 1 is 0, so a degree-1 neighbour weighs 1; a degree above 1 weighs 1 / ln(degree).
        if (w[z] > 1) {
            w[z] = 1 / Math.log(w[z]);
        }
    }
    return w;
}

function scorer(s: GraphSnapshot, o: CommonNeighborsOptions, adamicAdar: boolean): PairScore {
    const directed = o.directed === true;
    const bwd = directed ? s.reverse() : s;
    const weight = adamicAdar ? adamicAdarWeights(s, directed) : undefined;
    const n = s.nodeCount;
    return (u, v) => (u < n && v < n ? sortedRowMerge(s, bwd, u, v, weight) : 0);
}

/**
 * Sort pairs by score, highest first and stable, and keep `order.slice(0, end)`.
 * @param sources - Pair sources in enumeration order
 * @param targets - Pair targets
 * @param scores - Pair scores
 * @param end - The slice end
 * @returns The ranked pairs
 */
function ranked(sources: number[], targets: number[], scores: number[], end: number): LinkPredictionResult {
    const order = Array.from(scores, (_, k) => k)
        .sort((a, b) => scores[b] - scores[a])
        .slice(0, end);
    return {
        sources: Uint32Array.from(order, (k) => sources[k]),
        targets: Uint32Array.from(order, (k) => targets[k]),
        scores: Float64Array.from(order, (k) => scores[k]),
    };
}

function predict(s: GraphSnapshot, o: LinkPredictionOptions, score: PairScore): LinkPredictionResult {
    const sources: number[] = [];
    const targets: number[] = [];
    const scores: number[] = [];
    // Each unordered pair is scored once as (u, v), u < v; without `directed` the reverse pair is
    // listed too with the same score. Existence is tested on the arc u -> v only.
    const mirror = o.directed !== true;
    for (let u = 0; u < s.nodeCount; u++) {
        for (let v = u + 1; v < s.nodeCount; v++) {
            if (o.includeExisting !== true && s.hasArc(u, v)) {
                continue;
            }
            const x = score(u, v);
            if (x > 0) {
                sources.push(u);
                targets.push(v);
                scores.push(x);
                if (mirror) {
                    sources.push(v);
                    targets.push(u);
                    scores.push(x);
                }
            }
        }
    }
    const { topK } = o;
    return ranked(sources, targets, scores, topK !== undefined && topK > 0 ? topK : scores.length);
}

function forPairs(pairs: NodePairs, score: PairScore): F64 {
    return Float64Array.from(pairs.sources, (u, k) => score(u, pairs.targets[k]));
}

function candidatesOf(s: GraphSnapshot, u: number, o: CandidateOptions, score: PairScore): LinkPredictionResult {
    const n = s.nodeCount;
    const sources: number[] = [];
    const targets: number[] = [];
    const scores: number[] = [];
    if (u < n) {
        const list = o.candidates ?? Array.from({ length: n }, (_, i) => i);
        for (let k = 0; k < list.length; k++) {
            const v = list[k];
            if (v === u || (o.includeExisting !== true && v < n && s.hasArc(u, v))) {
                continue;
            }
            const x = score(u, v);
            if (x > 0) {
                sources.push(u);
                targets.push(v);
                scores.push(x);
            }
        }
    }
    return ranked(sources, targets, scores, o.topK ?? 10);
}

/**
 * Rank held-out edges against non-edges by score (stable, edges first among equal scores), then
 * report the threshold with the best F1 and the AUC; the AUC is 0.5 when either side is empty.
 * @param edges - The scores of the held-out edges
 * @param nonEdges - The scores of the non-edges
 * @returns The metrics
 */
function rankingMetrics(edges: F64, nonEdges: F64): LinkPredictionMetrics {
    const all = [...edges, ...nonEdges];
    const order = Array.from(all, (_, k) => k).sort((a, b) => all[b] - all[a]);
    let tp = 0;
    let fp = 0;
    let bestF1 = 0;
    let bestPrecision = 0;
    let bestRecall = 0;
    let auc = 0;
    for (const k of order) {
        if (k < edges.length) {
            tp++;
        } else {
            auc += tp;
            fp++;
        }
        const precision = tp / (tp + fp);
        const recall = tp / edges.length;
        const f1 = precision + recall > 0 ? (2 * (precision * recall)) / (precision + recall) : 0;
        if (f1 > bestF1) {
            bestF1 = f1;
            bestPrecision = precision;
            bestRecall = recall;
        }
    }
    auc = tp > 0 && fp > 0 ? auc / (tp * fp) : 0.5;
    return { precision: bestPrecision, recall: bestRecall, f1Score: bestF1, auc };
}

/**
 * Common-neighbour scores of every pair not already joined, ranked.
 * @param s - The snapshot
 * @param o - Options
 * @returns The pairs with a positive score, highest first
 * @public
 */
export function commonNeighborsPrediction(s: GraphSnapshot, o: LinkPredictionOptions = {}): LinkPredictionResult {
    return predict(s, o, scorer(s, o, false));
}

/**
 * Common-neighbour scores of the given pairs, in order.
 * @param s - The snapshot
 * @param pairs - The pairs
 * @param o - Options
 * @returns One score per pair
 * @public
 */
export function commonNeighborsForPairs(s: GraphSnapshot, pairs: NodePairs, o: CommonNeighborsOptions = {}): F64 {
    return forPairs(pairs, scorer(s, o, false));
}

/**
 * One node's best common-neighbour candidates, ranked.
 * @param s - The snapshot
 * @param u - The node index
 * @param o - Options
 * @returns (u, v) pairs with a positive score, highest first
 * @public
 */
export function getTopCandidatesForNode(s: GraphSnapshot, u: number, o: CandidateOptions = {}): LinkPredictionResult {
    return candidatesOf(s, u, o, scorer(s, o, false));
}

/**
 * Ranking metrics of the common-neighbour score on held-out edges against non-edges.
 * @param s - The training snapshot
 * @param edges - The held-out edges
 * @param nonEdges - The non-edges
 * @param o - Options
 * @returns The metrics
 * @public
 */
export function evaluateCommonNeighbors(
    s: GraphSnapshot,
    edges: NodePairs,
    nonEdges: NodePairs,
    o: CommonNeighborsOptions = {},
): LinkPredictionMetrics {
    const score = scorer(s, o, false);
    return rankingMetrics(forPairs(edges, score), forPairs(nonEdges, score));
}

/**
 * The Adamic-Adar index of two nodes: the sum over distinct common neighbours z of 1 / ln(degree(z)).
 * @param s - The snapshot
 * @param u - A node index
 * @param v - A node index
 * @param o - Options
 * @returns The score
 * @public
 */
export function adamicAdarScore(s: GraphSnapshot, u: number, v: number, o: CommonNeighborsOptions = {}): number {
    return scorer(s, o, true)(u, v);
}

/**
 * Adamic-Adar scores of every pair not already joined, ranked.
 * @param s - The snapshot
 * @param o - Options
 * @returns The pairs with a positive score, highest first
 * @public
 */
export function adamicAdarPrediction(s: GraphSnapshot, o: LinkPredictionOptions = {}): LinkPredictionResult {
    return predict(s, o, scorer(s, o, true));
}

/**
 * Adamic-Adar scores of the given pairs, in order.
 * @param s - The snapshot
 * @param pairs - The pairs
 * @param o - Options
 * @returns One score per pair
 * @public
 */
export function adamicAdarForPairs(s: GraphSnapshot, pairs: NodePairs, o: CommonNeighborsOptions = {}): F64 {
    return forPairs(pairs, scorer(s, o, true));
}

/**
 * One node's best Adamic-Adar candidates, ranked.
 * @param s - The snapshot
 * @param u - The node index
 * @param o - Options
 * @returns (u, v) pairs with a positive score, highest first
 * @public
 */
export function getTopAdamicAdarCandidatesForNode(
    s: GraphSnapshot,
    u: number,
    o: CandidateOptions = {},
): LinkPredictionResult {
    return candidatesOf(s, u, o, scorer(s, o, true));
}

/**
 * Ranking metrics of the Adamic-Adar score on held-out edges against non-edges.
 * @param s - The training snapshot
 * @param edges - The held-out edges
 * @param nonEdges - The non-edges
 * @param o - Options
 * @returns The metrics
 * @public
 */
export function evaluateAdamicAdar(
    s: GraphSnapshot,
    edges: NodePairs,
    nonEdges: NodePairs,
    o: CommonNeighborsOptions = {},
): LinkPredictionMetrics {
    const score = scorer(s, o, true);
    return rankingMetrics(forPairs(edges, score), forPairs(nonEdges, score));
}

/**
 * Both evaluations on the same held-out sets. The common-neighbour side always intersects the two
 * OUT rows, whatever `directed` says, as the legacy function of this name does; the Adamic-Adar side
 * honours `directed`.
 * @param s - The training snapshot
 * @param edges - The held-out edges
 * @param nonEdges - The non-edges
 * @param o - Options
 * @returns The two sets of metrics
 * @public
 */
export function compareAdamicAdarWithCommonNeighbors(
    s: GraphSnapshot,
    edges: NodePairs,
    nonEdges: NodePairs,
    o: CommonNeighborsOptions = {},
): { adamicAdar: LinkPredictionMetrics; commonNeighbors: LinkPredictionMetrics } {
    return {
        adamicAdar: evaluateAdamicAdar(s, edges, nonEdges, o),
        commonNeighbors: evaluateCommonNeighbors(s, edges, nonEdges),
    };
}
