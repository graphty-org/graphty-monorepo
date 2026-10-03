/**
 * The `bc-count` kernel body (design 8.4, issue #719): the shortest-path counts of the depth a betweenness forward
 * level has just claimed, PULLED once the claims are complete. It runs only in a batch rerun because its u32 counts
 * wrapped (the forward bodies then run with `SCALED` and count nothing); `sigmaK` holds f32 bits throughout. One invocation per entry `t = s * n + x` of the range
 * `S[ends[level + 1] .. stackTop)` (the entries the forward dispatch appended), each summing `sigma[s][v]` over the
 * in-arcs `(v, x)` with `depth[s][v] == level` in CSR order -- the reverse adjacency, which on an undirected snapshot
 * is the forward one. No atomic touches a count, so the sums are bitwise reproducible, and both forward bodies leave
 * the same counts.
 *
 * The counts are f32 and rescaled per depth, because a lattice outgrows any fixed width (a 40 x 40 grid has C(78, 39),
 * about 2.6e22, corner-to-corner paths): each sum is multiplied by `2^-sigma_shift(levelMax[level])`, the power of
 * two that brings the previous depth's largest count down to 2^BC_SIGMA_EXPONENT_CAP, and the result's bits go into
 * `levelMax[level + 1]` by `atomicMax` (positive f32 bits order like the values). Every count of one (depth, batch)
 * shares that scale, and Brandes' backward pass reads only ratios of a count to its successors', so `bc-backward`
 * undoes the one step between two depths and nothing else. A count that leaves f32's normal range anyway -- zero,
 * subnormal, infinite -- raises `sigmaOverflow` (counters word 27): the counts at one depth spread wider than f32 can
 * hold, and the scores are wrong. Grid-stride loop (`P.stride`); the range is read from the device, so the host
 * dispatches for the largest possible level. Body only; the sabotage rows of test/helpers/sabotage.ts are textual
 * edits of it.
 */
export const bcCountWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn bc_count(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let level = atomicLoad(&counters[11]);
    let start = ends[level + 1u];                                    // the boundary closed the claim-from level here
    let count = atomicLoad(&counters[26]) - start;                   // stackTop: what the forward dispatch appended
    let shift = sigma_shift(atomicLoad(&levelMax[level]));
    for (var i = linear_id(wid, lid.x); i < count; i = i + P.stride) {
        let t = S[start + i];                                        // s * n + x, at depth level + 1
        let x = t % P.n;
        let base = t - x;                                            // s * n
        var acc = 0.0;
        for (var a = rowPtr[x]; a < rowPtr[x + 1u]; a = a + 1u) {    // the in-arcs (v, x)
            let v = base + colIdx[a];
            if (depthK[v] == level) { acc = acc + bitcast<f32>(sigmaK[v]); }   // every predecessor's paths, CSR order
        }
        let sigma = ldexp(acc, -shift);
        let bits = bitcast<u32>(sigma);
        sigmaK[t] = bits;
        let exponent = (bits >> 23u) & 0xffu;
        if (exponent == 0u || exponent == 0xffu) { atomicOr(&counters[27], 1u); }   // out of f32's normal range
        atomicMax(&levelMax[level + 1u], bits);
    }
}
`;
