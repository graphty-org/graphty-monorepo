/**
 * The `bfs-unvisited-flags` kernel body (design 8.4; P8-T8, the P8 plan's PD-18): the producer of the unvisited set
 * Beamer's test is against, run ONCE per submit before the levels. It grid-strides over the vertices
 * (`planGridStride(n)`, `P.stride` the plan's stride) and, per lane, counts the vertices still at `INVALID_INDEX`
 * (`unvisitedCount`, word 5), sums their OUT-degrees (`unvisitedDegreeSum`, word 6: Beamer's m_u counts the edges
 * top-down would examine), and flags the unvisited vertices with a non-zero IN-degree (`unvisitedListLen`, word 7:
 * what the bottom-up sweep iterates, since a vertex nobody points at can never be claimed by it); the three lane
 * sums are reduced by the prelude's `wg_reduce_u32` (its sum code) and ONE `atomicAdd` per word per workgroup lands
 * them in the counters block. `compact` over an iota queue then turns `flags` into the unvisited list. The list is
 * up to `MAX_LEVELS_PER_SUBMIT` levels stale by the time the sweep reads it: it holds vertices claimed since the
 * rebuild, which the sweep skips on the `depth == INVALID_INDEX` test it makes anyway, so staleness costs a few
 * wasted reads and never a wrong depth. Between rebuilds `frontier-finalize` maintains words 5 and 6 by subtraction
 * (its JSDoc states the boundary rule). Uniformity (spec 3.5 rule 1): the loop holds no barrier, and the three
 * reductions run unconditionally after it. Body only (spec 3.5, D9); the text is normative: the sabotage rows of
 * test/helpers/sabotage.ts are textual edits of it.
 */
export const bfsUnvisitedFlagsWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn bfs_unvisited_flags(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let first = linear_id(wid, lid.x);
    var cnt = 0u;
    var degSum = 0u;
    var len = 0u;
    for (var v = first; v < P.n; v = v + P.stride) {                 // no barrier inside: the trip count is per lane
        let unv = depth[v] == INVALID_INDEX;
        let listed = unv && (inDegree[v] != 0u);
        flags[v] = select(0u, 1u, listed);
        cnt = cnt + select(0u, 1u, unv);
        degSum = degSum + select(0u, outDegree[v], unv);             // the OUT-degree: Beamer's m_u counts the edges top-down would examine
        len = len + select(0u, 1u, listed);
    }
    let c = wg_reduce_u32(cnt, lid.x, 0u);                           // the prelude's workgroup sum (combine_u's sum code); uniform: after the loop
    let d = wg_reduce_u32(degSum, lid.x, 0u);
    let l = wg_reduce_u32(len, lid.x, 0u);
    if (lid.x == 0u) {                                               // ONE atomic per word per workgroup
        atomicAdd(&counters[5], c);
        atomicAdd(&counters[6], d);
        atomicAdd(&counters[7], l);
    }
}
`;
