/**
 * The `bc-backward` kernel body (design 8.4 "each (w, s) PULLS over its successors", 8.10 "BC backward (successor
 * pull)"): one level of a betweenness batch's dependency accumulation, one invocation per log entry `(w, s)` of the
 * level's range `S[P.start .. P.start + P.count)`, which the host planned from the `ends` it read back. Each entry
 * walks the out-arcs of `w` -- the rows the forward pass expanded -- and sums `sigma[s][w] / sigma[s][v] * (1 +
 * delta[s][v])` over the successors `v` (`depth[s][v] == depth[s][w] + 1`), whose dependencies the previous (deeper)
 * dispatch wrote, then writes `delta[s][w]` ONCE. No float is ever accumulated through an atomic, so the result is
 * bitwise reproducible. The sources (depth 0) are never dispatched: their dependency stays 0, which is what keeps a
 * source's own dependency out of its score. Grid-stride loop (`P.stride`). ponytail: one lane walks one row, so a
 * vertex of degree above 65,535 exceeds llvmpipe's per-invocation loop cap (CLAUDE.md, Verified Platform Facts) and
 * would need a workgroup-per-row form there; hardware adapters have no such cap. Body only; the sabotage rows of
 * test/helpers/sabotage.ts are textual edits of it.
 */
export const bcBackwardWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn bc_backward(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    for (var i = linear_id(wid, lid.x); i < P.count; i = i + P.stride) {
        let t = S[P.start + i];                                      // s * n + w
        let w = t % P.n;
        let base = t - w;                                            // s * n
        let succ = depthK[t] + 1u;
        let sw = f32(sigmaK[t]);
        var acc = 0.0;
        for (var a = rowPtr[w]; a < rowPtr[w + 1u]; a = a + 1u) {
            let v = base + colIdx[a];
            if (depthK[v] == succ) {                                 // v is a successor of w for source s
                acc = acc + (sw / f32(sigmaK[v])) * (1.0 + deltaK[v]);
            }
        }
        deltaK[t] = acc;                                             // written once per (w, s)
    }
}
`;
