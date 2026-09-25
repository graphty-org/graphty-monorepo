/**
 * The invariant checks every P8 differential test calls (P8-T2 Step 3). Design 6's determinism policy fixes what is
 * bitwise and what is a set, and PD-14 makes every PUBLIC array bitwise; these helpers check the properties a CPU
 * oracle cannot supply by equality: the level rule and the smallest-predecessor rule of `parent` (PD-24), the
 * grouping of `order` (PD-14), the triangle inequality of `dist` (design 11.3), and the PD-27 predecessor rule of
 * `predArc` together with the bounded chain walk that never hangs -- the difference between
 * `expectPredChainReachesSource` and the seam's unbounded `walkPredArcs`. Every failure throws an `Error` naming the
 * node or arc; the whole-array comparison of `expectPredArcAttains` is vitest's `toEqual`. Imports nothing from
 * `src/` and nothing from the package under test; `arcSourceIn` is the binary search of
 * `algorithms/src/indexed/structures/arc-source.ts`, copied.
 */

import { type GraphSnapshot, INVALID_INDEX, type NumericVector, type U32 } from "@graphty/graph-format";
import { expect } from "vitest";

/** The BFS arrays the level checks read. */
interface LevelResult {
    readonly depth: U32;
    readonly parent: U32;
}

/** The BFS arrays the order check reads. */
interface OrderResult {
    readonly depth: U32;
    readonly order: U32;
    readonly visitedCount: number;
}

/** Which key `expectPredArcAttains` recomputes (PD-27): `"plateau"` for `sssp`, `"tight"` for `bellmanFord`. */
type PredRule = "plateau" | "tight";

/**
 * The source node of an arc, by binary search on `rowPtr` (`algorithms/src/indexed/structures/arc-source.ts`).
 * @param rowPtr - the nodeCount + 1 row offsets
 * @param arc - an arc index in `[0, arcCount)`
 * @returns the node whose row contains the arc
 */
function arcSourceIn(rowPtr: U32, arc: number): number {
    let lo = 0;
    let hi = rowPtr.length - 1;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (rowPtr[mid + 1] <= arc) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }
    return lo;
}

/**
 * The weight of arc `a` under an optional override: 1 on an unweighted snapshot.
 * @param s - the snapshot
 * @param weights - a per-arc override, `arcCount` long
 * @returns the weight lookup
 */
function weightOf(s: GraphSnapshot, weights: NumericVector | undefined): (a: number) => number {
    const column = weights ?? s.weights;
    if (column === null) {
        return () => 1;
    }
    if (column.length !== s.arcCount) {
        throw new Error(`weights has ${column.length} entries, arcCount is ${s.arcCount}`);
    }
    return (a) => column[a];
}

/**
 * Whether the CSR holds an arc `u -> v`.
 * @param s - the snapshot
 * @param u - the source
 * @param v - the target
 * @returns true when some arc of row `u` points at `v`
 */
function hasArc(s: GraphSnapshot, u: number, v: number): boolean {
    for (let a = s.rowPtr[u]; a < s.rowPtr[u + 1]; a++) {
        if (s.colIdx[a] === v) {
            return true;
        }
    }
    return false;
}

/**
 * The level rule: for every reached `v` that is not the source, `depth[parent[v]] === depth[v] - 1` and an arc
 * `parent[v] -> v` exists; the source's parent is `INVALID_INDEX`; an unreached node carries both sentinels.
 * @param result - the depth and parent arrays
 * @param s - the snapshot
 * @param source - the source node index
 */
export function expectLevelConsistent(result: LevelResult, s: GraphSnapshot, source: number): void {
    const { depth, parent } = result;
    const n = s.nodeCount;
    if (depth.length !== n || parent.length !== n) {
        throw new Error(`depth (${depth.length}) and parent (${parent.length}) must both be nodeCount (${n}) long`);
    }
    if (depth[source] !== 0) {
        throw new Error(`depth[source ${source}] is ${depth[source]}, expected 0`);
    }
    for (let v = 0; v < n; v++) {
        if (v === source || depth[v] === INVALID_INDEX) {
            if (parent[v] !== INVALID_INDEX) {
                throw new Error(`parent[${v}] is ${parent[v]}, expected INVALID_INDEX (${v === source ? "the source" : "unreached"})`);
            }
            continue;
        }
        const p = parent[v];
        if (p >= n) {
            throw new Error(`parent[${v}] is ${p}, not a node of a ${n}-node graph (reached at depth ${depth[v]})`);
        }
        if (depth[p] !== depth[v] - 1) {
            throw new Error(`depth[parent[${v}] = ${p}] is ${depth[p]}, expected depth[${v}] - 1 = ${depth[v] - 1}`);
        }
        if (!hasArc(s, p, v)) {
            throw new Error(`no arc ${p} -> ${v}, yet parent[${v}] is ${p}`);
        }
    }
}

/**
 * PD-24: `parent[v]` is the SMALLEST `u` over all arcs `u -> v` with `depth[u] + 1 === depth[v]`, computed by a
 * plain loop over every arc. Assumes `expectLevelConsistent` holds (the sentinels are not re-checked).
 * @param result - the depth and parent arrays
 * @param s - the snapshot
 */
export function expectSmallestPredecessor(result: LevelResult, s: GraphSnapshot): void {
    const { depth, parent } = result;
    const n = s.nodeCount;
    const smallest = new Uint32Array(n).fill(INVALID_INDEX);
    for (let u = 0; u < n; u++) {
        if (depth[u] === INVALID_INDEX) {
            continue;
        }
        for (let a = s.rowPtr[u]; a < s.rowPtr[u + 1]; a++) {
            const v = s.colIdx[a];
            if (depth[v] === depth[u] + 1 && u < smallest[v]) {
                smallest[v] = u;
            }
        }
    }
    for (let v = 0; v < n; v++) {
        if (depth[v] === INVALID_INDEX || depth[v] === 0) {
            continue;
        }
        if (parent[v] !== smallest[v]) {
            throw new Error(`parent[${v}] is ${parent[v]}, but the smallest depth-${depth[v] - 1} predecessor is ${smallest[v]}`);
        }
    }
}

/**
 * PD-14: `depth[order[i]]` is non-decreasing, `order[i] < order[i + 1]` within one depth, `order` is a permutation of
 * the reached set, and its length is `visitedCount`.
 * @param result - the depth and order arrays and the visited count
 */
export function expectOrderGroupedByLevel(result: OrderResult): void {
    const { depth, order, visitedCount } = result;
    if (order.length !== visitedCount) {
        throw new Error(`order has ${order.length} entries, visitedCount is ${visitedCount}`);
    }
    let reached = 0;
    for (let v = 0; v < depth.length; v++) {
        if (depth[v] !== INVALID_INDEX) {
            reached += 1;
        }
    }
    if (reached !== visitedCount) {
        throw new Error(`${reached} nodes have a depth, visitedCount is ${visitedCount}`);
    }
    const seen = new Uint8Array(depth.length);
    for (let i = 0; i < order.length; i++) {
        const v = order[i];
        if (v >= depth.length || depth[v] === INVALID_INDEX) {
            throw new Error(`order[${i}] = ${v} is not a reached node`);
        }
        if (seen[v] === 1) {
            throw new Error(`order[${i}] = ${v} appears twice`);
        }
        seen[v] = 1;
        if (i === 0) {
            continue;
        }
        const prev = order[i - 1];
        if (depth[v] < depth[prev]) {
            throw new Error(`order[${i}] = ${v} at depth ${depth[v]} follows order[${i - 1}] = ${prev} at depth ${depth[prev]}`);
        }
        if (depth[v] === depth[prev] && v <= prev) {
            throw new Error(`order[${i}] = ${v} is not above order[${i - 1}] = ${prev} within depth ${depth[v]}`);
        }
    }
}

/**
 * Design 11.3's invariant: over every arc `(u, v, w)` with a finite `dist[u]`, `dist[v] <= fround(dist[u] + w)`.
 * Catches a relaxation the kernel dropped without needing an oracle at all.
 * @param dist - the distances (`+Infinity` = unreached)
 * @param s - the snapshot
 * @param weights - a per-arc override, `arcCount` long
 */
export function expectTriangleInequality(dist: ArrayLike<number>, s: GraphSnapshot, weights?: NumericVector): void {
    const w = weightOf(s, weights);
    for (let u = 0; u < s.nodeCount; u++) {
        const du = dist[u];
        if (du === Infinity) {
            continue;
        }
        for (let a = s.rowPtr[u]; a < s.rowPtr[u + 1]; a++) {
            const v = s.colIdx[a];
            const bound = Math.fround(du + w(a));
            if (!(dist[v] <= bound)) {
                throw new Error(`arc ${a} (${u} -> ${v}, w ${w(a)}) violates dist[${v}] = ${dist[v]} <= fround(${du} + w) = ${bound}`);
            }
        }
    }
}

/**
 * For every reached `v`, walk `v = arcSourceIn(rowPtr, predArc[v])` until the source, with a step bound of
 * `nodeCount`. A walk that meets `INVALID_INDEX` before the source, or takes more than `nodeCount` steps, throws
 * `predArc chain from node <v> did not reach source <source> within <nodeCount> steps` -- it never hangs.
 * @param predArc - the predecessor arcs
 * @param s - the snapshot
 * @param source - the source node index
 * @param reached - the reached mask (a finite `dist`, or a `depth` that is not `INVALID_INDEX`)
 */
export function expectPredChainReachesSource(
    predArc: U32,
    s: GraphSnapshot,
    source: number,
    reached: ArrayLike<boolean>,
): void {
    const n = s.nodeCount;
    for (let v = 0; v < n; v++) {
        if (!reached[v] || v === source) {
            continue;
        }
        let cur = v;
        let steps = 0;
        while (cur !== source) {
            const arc = predArc[cur];
            if (steps >= n || arc === INVALID_INDEX || arc >= s.arcCount) {
                throw new Error(`predArc chain from node ${v} did not reach source ${source} within ${n} steps`);
            }
            cur = arcSourceIn(s.rowPtr, arc);
            steps += 1;
        }
    }
}

/**
 * PD-27's predecessor, recomputed on the host from `dist` and the CSR: the tight arcs first
 * (`fround(dist[u] + w) === dist[v]`); then the key -- under `"plateau"` the roots (the source, and every node with a
 * tight in-arc from a strictly smaller `dist`) at `hops` 0 and a breadth-first walk over the tight EQUAL-distance arcs
 * from them, under `"tight"` a breadth-first walk over every tight arc from the source; then, per reached non-source
 * node, the smallest tight in-arc whose source is one key step below (a strictly smaller `dist` into a root, else
 * the same `dist` and `hops - 1`; under `"tight"`, `hops - 1`). The source and the unreached carry `INVALID_INDEX`.
 * @param dist - the settled distances
 * @param s - the snapshot
 * @param source - the source node index
 * @param rule - which key to follow
 * @param weights - a per-arc override, `arcCount` long
 * @returns the expected `predArc`
 */
function predArcByRule(
    dist: ArrayLike<number>,
    s: GraphSnapshot,
    source: number,
    rule: PredRule,
    weights: NumericVector | undefined,
): Uint32Array {
    const n = s.nodeCount;
    const { rowPtr, colIdx } = s;
    const w = weightOf(s, weights);
    const tight = new Uint8Array(s.arcCount);
    const isRoot = new Uint8Array(n);
    isRoot[source] = 1;
    for (let u = 0; u < n; u++) {
        if (dist[u] === Infinity) {
            continue;
        }
        for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
            const v = colIdx[a];
            if (dist[v] !== Infinity && Math.fround(dist[u] + w(a)) === dist[v]) {
                tight[a] = 1;
                if (dist[u] < dist[v]) {
                    isRoot[v] = 1;
                }
            }
        }
    }
    // hops: breadth-first over the tight arcs the rule admits, from the rule's roots.
    const hops = new Uint32Array(n).fill(INVALID_INDEX);
    const queue = new Uint32Array(n);
    let head = 0;
    let tail = 0;
    for (let v = 0; v < n; v++) {
        if (rule === "tight" ? v === source : isRoot[v] === 1) {
            hops[v] = 0;
            queue[tail++] = v;
        }
    }
    while (head < tail) {
        const u = queue[head++];
        for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
            const v = colIdx[a];
            if (tight[a] === 0 || hops[v] !== INVALID_INDEX) {
                continue;
            }
            if (rule === "plateau" && dist[u] !== dist[v]) {
                continue;
            }
            hops[v] = hops[u] + 1;
            queue[tail++] = v;
        }
    }
    const expected = new Uint32Array(n).fill(INVALID_INDEX);
    for (let u = 0; u < n; u++) {
        if (dist[u] === Infinity || hops[u] === INVALID_INDEX) {
            continue;
        }
        for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
            const v = colIdx[a];
            if (tight[a] === 0 || v === source || a >= expected[v]) {
                continue;
            }
            let oneBelow: boolean;
            if (rule === "tight") {
                oneBelow = hops[u] === hops[v] - 1;
            } else if (isRoot[v] === 1) {
                oneBelow = dist[u] < dist[v];
            } else {
                oneBelow = dist[u] === dist[v] && hops[u] === hops[v] - 1;
            }
            if (oneBelow) {
                expected[v] = a;
            }
        }
    }
    return expected;
}

/**
 * `predArc[v]` for every reached non-source `v` is a TIGHT arc into `v` and EXACTLY the arc PD-27's rule picks
 * (recomputed by `predArcByRule` and compared with `toEqual` on the whole array); the source and the unreached
 * carry `INVALID_INDEX`. Calls `expectPredChainReachesSource` last, so a wrong chain is reported as a chain and not
 * only as an array difference.
 * @param dist - the settled distances (`+Infinity` = unreached)
 * @param predArc - the predecessor arcs under test
 * @param s - the snapshot
 * @param source - the source node index
 * @param rule - `"plateau"` (`sssp`) or `"tight"` (`bellmanFord`)
 * @param weights - a per-arc override, `arcCount` long
 */
export function expectPredArcAttains(
    dist: ArrayLike<number>,
    predArc: U32,
    s: GraphSnapshot,
    source: number,
    rule: PredRule,
    weights?: NumericVector,
): void {
    const expected = predArcByRule(dist, s, source, rule, weights);
    expect(Array.from(predArc), `predArc under the ${rule} rule`).toEqual(Array.from(expected));
    expectPredChainReachesSource(
        predArc,
        s,
        source,
        Array.from({ length: s.nodeCount }, (_, v) => dist[v] !== Infinity),
    );
}
