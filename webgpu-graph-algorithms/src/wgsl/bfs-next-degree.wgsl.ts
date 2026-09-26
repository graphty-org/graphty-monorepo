/**
 * The `bfs-next-degree` kernel body (design 8.4; issue #391, the amendment to P8-T8's PD-21): Beamer's m_f measured
 * EXACTLY, at the end of every level, as the out-degree sum of the vertices the level just claimed -- the next
 * frontier, which is what the next boundary decides the direction FOR. It grid-strides over the output vertex
 * queue (`nextFrontierCount`, word 1, the claim kernels' append span; `P.stride` the plan's stride), reads each
 * entry's out-degree from the `outDegree` view, reduces the lane sums with the prelude's `wg_reduce_u32` and lands
 * ONE `atomicAdd` per workgroup in `nextDegreeSum` (word 25), which `frontier-finalize` role 0 reads for the
 * switch-into-bottom-up test, subtracts from `unvisitedDegreeSum` and zeroes for the next level. It runs on every
 * path that claims (the path word 24 non-zero: two-phase, fused, bottom-up, the retry) and does nothing on a level
 * past the end.
 *
 * Why a kernel of its own: before it, the test used `frontierDegreeSum` (word 2), which the EXPANSION of the
 * previous frontier accumulates, so the boundary compared the degree of the frontier it had just finished with the
 * unvisited set, one level stale, and a bottom-up level (which expands nothing) left it at 0. On the 1M / 10M R-MAT
 * that misses the switch at the level that matters: the frontier of 46,524 hubs at level 1 has 13.6M out-arcs, the
 * unvisited set 7.3M, and the boundary saw the source's 86,405 instead -- top-down wrote 13.6M edge-queue entries
 * where the bottom-up sweep reads 0.6M. Measuring the next frontier's degree at claim time is Beamer's own m_f, and
 * the same word makes `unvisitedDegreeSum` exact after a bottom-up level too. Uniformity (spec 3.5 rule 1): the
 * loop holds no barrier (its trip count is per lane), and the reduction runs unconditionally after it. Body only
 * (spec 3.5, D9); the text is normative: the sabotage rows of test/helpers/sabotage.ts are textual edits of it.
 */
export const bfsNextDegreeWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn bfs_next_degree(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let count = select(0u, atomicLoad(&counters[1]), atomicLoad(&counters[24]) != 0u);   // nextFrontierCount, on a level that claimed (the path word)
    var sum = 0u;
    for (var i = linear_id(wid, lid.x); i < count; i = i + P.stride) {   // no barrier inside: the trip count is per lane
        sum = sum + outDegree[frontier[i]];
    }
    let total = wg_reduce_u32(sum, lid.x, 0u);                       // the prelude's workgroup sum; uniform: after the loop
    if (lid.x == 0u) { atomicAdd(&counters[25], total); }            // nextDegreeSum: ONE atomic per workgroup
}
`;
