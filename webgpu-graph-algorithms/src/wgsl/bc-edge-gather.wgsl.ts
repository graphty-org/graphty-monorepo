/**
 * The `bc-edge-gather` kernel body (design 8.4 "edge BC accumulates per arc from the same n x k deltas"): the per-arc
 * twin of `bc-gather`, run once per batch after the backward sweep. One invocation per ARC (`P.count` arcs,
 * grid-stride): it finds the row `w` that owns the arc by an upper-bound search over `rowPtr`, then adds over the
 * batch's sources in order the term the backward pass summed -- `sigma[s][w] / sigma[s][v] * (1 + delta[s][v])`
 * whenever `w` was reached and `depth[s][v] == depth[s][w] + 1`, with `bc-backward`'s depth scale step under `SCALED` -- into
 * `arcScores[arc]`. Each arc is written by one
 * invocation: no atomic, a fixed order. Arc-parallel rather than row-parallel so a hub row is not one lane's loop
 * (llvmpipe caps a shader loop at 65,535 iterations, and a 1,000-arc hub times 64 sources passed it). Body only;
 * the sabotage rows of test/helpers/sabotage.ts are textual edits of it.
 */
export const bcEdgeGatherWgsl = /* wgsl */ `
fn sigma_of(word: u32) -> f32 {                                     // a stored count: u32, or f32 bits when SCALED
    if (SCALED) { return bitcast<f32>(word); }
    return f32(word);
}

@compute @workgroup_size(WG)
fn bc_edge_gather(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    for (var a = linear_id(wid, lid.x); a < P.count; a = a + P.stride) {
        var lo = 0u;                                                 // the row w with rowPtr[w] <= a < rowPtr[w + 1]
        var hi = P.n;
        loop {
            if (lo >= hi) { break; }
            let mid = (lo + hi) / 2u;
            if (rowPtr[mid + 1u] <= a) { lo = mid + 1u; } else { hi = mid; }
        }
        let w = lo;
        let nbr = colIdx[a];
        var acc = arcScores[a];
        for (var s = 0u; s < P.k; s = s + 1u) {
            let base = s * P.n;
            let dw = depthK[base + w];
            if (dw != INVALID_INDEX && depthK[base + nbr] == dw + 1u) {   // (w, nbr) is on a shortest path from s
                let shift = select(0i, sigma_shift(levelMax[dw]), SCALED);
                let ratio = ldexp(sigma_of(sigmaK[base + w]) / sigma_of(sigmaK[base + nbr]), -shift);
                acc = acc + ratio * (1.0 + deltaK[base + nbr]);
            }
        }
        arcScores[a] = acc;
    }
}
`;
