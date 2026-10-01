/**
 * The `bc-gather` kernel body (design 8.4 "one gather kernel after the batch's last backward level", 8.10 "BC
 * gather"): one invocation per vertex `w`, `bc[w] += delta[0][w] + ... + delta[k - 1][w]` in source order -- k reads,
 * one write, no atomic, a fixed summation order, so the scores are bitwise reproducible across runs and adapters.
 * A source's own dependency is 0 (the backward pass never visits depth 0), so nothing is skipped here. Grid-stride
 * loop (`P.stride`). Body only; the sabotage rows of test/helpers/sabotage.ts are textual edits of it.
 */
export const bcGatherWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn bc_gather(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    for (var w = linear_id(wid, lid.x); w < P.n; w = w + P.stride) {
        var acc = bc[w];
        for (var s = 0u; s < P.k; s = s + 1u) {
            acc = acc + deltaK[s * P.n + w];
        }
        bc[w] = acc;
    }
}
`;
