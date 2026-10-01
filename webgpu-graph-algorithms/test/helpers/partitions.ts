/**
 * Partition agreement and a planted-partition generator (the P11 plan's P11-T2 Step 2): a community label means
 * nothing on its own, only the partition it induces, so label propagation is judged by the adjusted Rand index
 * against a graph whose communities are known.
 */

import { type EdgeSpec, xorshift } from "./graphs.js";

/**
 * n choose 2.
 * @param x - the count
 * @returns x (x - 1) / 2
 */
function pairs(x: number): number {
    return (x * (x - 1)) / 2;
}

/**
 * The adjusted Rand index of two partitions of the same nodes (Hubert and Arabie 1985): 1 for identical partitions,
 * about 0 for independent ones.
 * @param a - one label per node
 * @param b - one label per node
 * @returns the index
 */
export function adjustedRandIndex(a: ArrayLike<number>, b: ArrayLike<number>): number {
    const n = a.length;
    const cells = new Map<string, number>();
    const rows = new Map<number, number>();
    const cols = new Map<number, number>();
    for (let v = 0; v < n; v++) {
        const key = `${a[v]}/${b[v]}`;
        cells.set(key, (cells.get(key) ?? 0) + 1);
        rows.set(a[v], (rows.get(a[v]) ?? 0) + 1);
        cols.set(b[v], (cols.get(b[v]) ?? 0) + 1);
    }
    let index = 0;
    for (const c of cells.values()) {
        index += pairs(c);
    }
    let sumA = 0;
    for (const c of rows.values()) {
        sumA += pairs(c);
    }
    let sumB = 0;
    for (const c of cols.values()) {
        sumB += pairs(c);
    }
    const expected = (sumA * sumB) / pairs(n);
    const max = (sumA + sumB) / 2;
    return max === expected ? 1 : (index - expected) / (max - expected);
}

/**
 * A planted-partition graph: `blocks` communities of `size` nodes each (node v in block floor(v / size)), every
 * pair inside a block an edge with probability `pIn` and every pair across blocks with probability `pOut`, from a
 * seeded generator.
 * @param blocks - the community count
 * @param size - the nodes per community
 * @param pIn - the probability of an edge inside a community
 * @param pOut - the probability of an edge between communities
 * @param seed - the generator seed
 * @returns the edges and the planted labels
 */
export function plantedPartition(
    blocks: number,
    size: number,
    pIn: number,
    pOut: number,
    seed: number,
): { readonly edges: EdgeSpec[]; readonly labels: Uint32Array } {
    const n = blocks * size;
    const random = xorshift(seed);
    const edges: EdgeSpec[] = [];
    const labels = new Uint32Array(n);
    for (let v = 0; v < n; v++) {
        labels[v] = Math.floor(v / size);
    }
    for (let u = 0; u < n; u++) {
        for (let v = u + 1; v < n; v++) {
            if (random() < (labels[u] === labels[v] ? pIn : pOut)) {
                edges.push([u, v]);
            }
        }
    }
    return { edges, labels };
}
