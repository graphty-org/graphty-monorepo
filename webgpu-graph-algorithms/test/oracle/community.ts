/**
 * The CPU references of label propagation (design 8.6, 9.7; the P11 plan's P11-T2) and the modularity function the
 * label-propagation floor on karate uses. `labelPropagationOracle` is synchronous label propagation with the rules
 * the device follows: the weighted mode of the neighbours' labels (the lowest label on a tie, through
 * `groupByKeyOracle`), the alternating direction rule (even passes move labels down only, odd passes up only), and a
 * stop after two consecutive passes that move nothing or after `maxIterations` passes; labels renumbered first-seen.
 */

import { type U32 } from "@graphty/graph-format";

import { type HostCsr } from "./coo.js";
import { groupByKeyOracle } from "./group-by-key.js";

/**
 * Relabels in first-seen index order (the order `renumberPartition` produces).
 * @param raw - the labels
 * @returns the dense labels and their count
 */
function firstSeen(raw: ArrayLike<number>): { readonly labels: U32; readonly count: number } {
    const map = new Map<number, number>();
    const labels = new Uint32Array(raw.length);
    for (let v = 0; v < raw.length; v++) {
        let k = map.get(raw[v]);
        if (k === undefined) {
            k = map.size;
            map.set(raw[v], k);
        }
        labels[v] = k;
    }
    return { labels, count: map.size };
}

/**
 * Synchronous label propagation with the lowest-label tie-break and the alternating direction rule.
 * @param csr - the simple symmetric graph
 * @param options - the pass cap and whether the weights count
 * @param options.maxIterations - the pass cap
 * @param options.weighted - sum the arc weights (else every arc weighs 1)
 * @returns the renumbered labels, the community count and the passes run
 */
export function labelPropagationOracle(
    csr: HostCsr,
    options: { readonly maxIterations: number; readonly weighted: boolean },
): { readonly labels: U32; readonly count: number; readonly passes: number } {
    const { n } = csr;
    let labels = new Uint32Array(n);
    for (let v = 0; v < n; v++) {
        labels[v] = v;
    }
    let passes = 0;
    let quiet = 0;
    while (passes < options.maxIterations && quiet < 2) {
        const { bestKey } = groupByKeyOracle(csr.rowPtr, csr.colIdx, options.weighted ? csr.weights : null, labels);
        const next = labels.slice();
        const down = passes % 2 === 0;
        let moved = 0;
        for (let v = 0; v < n; v++) {
            const best = bestKey[v];
            if (best !== 0xffffffff && best !== labels[v] && best < labels[v] === down) {
                next[v] = best;
                moved++;
            }
        }
        labels = next;
        passes++;
        quiet = moved === 0 ? quiet + 1 : 0;
    }
    return { ...firstSeen(labels), passes };
}

/**
 * Newman's modularity of a partition of a simple symmetric graph, every arc weighing 1:
 * `sum over communities of (intra / m - (degreeSum / 2m)^2)`, in f64.
 * @param csr - the simple symmetric graph
 * @param labels - one community per node
 * @returns the modularity (0 for a graph without arcs)
 */
export function modularityOf(csr: HostCsr, labels: ArrayLike<number>): number {
    const arcs = csr.rowPtr[csr.n];
    if (arcs === 0) {
        return 0;
    }
    const intra = new Map<number, number>();
    const degree = new Map<number, number>();
    for (let u = 0; u < csr.n; u++) {
        const c = labels[u];
        degree.set(c, (degree.get(c) ?? 0) + csr.rowPtr[u + 1] - csr.rowPtr[u]);
        for (let a = csr.rowPtr[u]; a < csr.rowPtr[u + 1]; a++) {
            if (labels[csr.colIdx[a]] === c) {
                intra.set(c, (intra.get(c) ?? 0) + 1);
            }
        }
    }
    let q = 0;
    for (const [c, d] of degree) {
        q += (intra.get(c) ?? 0) / arcs - (d / arcs) ** 2;
    }
    return q;
}
