/**
 * The CPU reference of triangle counting (design 8.5, 9.7; the P11 plan's P11-T2): for every vertex, every pair of
 * its neighbours is tested for adjacency with a Set per row -- the slow and obviously correct form, written apart
 * from the kernel's oriented sorted merge so a bug shared by both is unlikely. It works on the simple symmetric graph
 * (`simpleSymmetricOracle`), counts every triangle three times (once per corner) and returns the coefficient and the
 * transitivity in f64.
 */

import { type U32 } from "@graphty/graph-format";

import { type HostCsr } from "./coo.js";

/**
 * The reference result: the counts exactly, the coefficient and the transitivity in f64.
 * @public
 */
export interface TriangleOracleResult {
    readonly perNode: U32;
    readonly total: number;
    readonly coefficient: Float64Array;
    readonly transitivity: number;
}

/**
 * Triangles per node, the total, the local clustering coefficient and the transitivity of a simple symmetric CSR.
 * @param csr - the simple symmetric graph
 * @returns the reference result
 */
export function triangleOracle(csr: HostCsr): TriangleOracleResult {
    const { n, rowPtr, colIdx } = csr;
    const sets = Array.from({ length: n }, (_, v) => new Set(colIdx.subarray(rowPtr[v], rowPtr[v + 1])));
    const perNode = new Uint32Array(n);
    const coefficient = new Float64Array(n);
    let corners = 0;
    let triples = 0;
    for (let v = 0; v < n; v++) {
        const nbrs = colIdx.subarray(rowPtr[v], rowPtr[v + 1]);
        let t = 0;
        for (let i = 0; i < nbrs.length; i++) {
            for (let j = i + 1; j < nbrs.length; j++) {
                if (sets[nbrs[i]].has(nbrs[j])) {
                    t++;
                }
            }
        }
        perNode[v] = t;
        corners += t;
        const d = nbrs.length;
        if (d >= 2) {
            triples += (d * (d - 1)) / 2;
            coefficient[v] = t / ((d * (d - 1)) / 2);
        }
    }
    return { perNode, total: corners / 3, coefficient, transitivity: triples === 0 ? 0 : corners / triples };
}
