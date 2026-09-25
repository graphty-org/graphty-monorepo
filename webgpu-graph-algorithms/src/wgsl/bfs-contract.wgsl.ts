/**
 * The `bfs-contract` kernel body (design 8.4, 8.10 "BFS contract"; P8-T6, the P8 plan's PD-5 / PD-6 / PD-24 /
 * DEP-P8-B): the contraction phase of the two-phase top-down level. One invocation per edge-queue entry (the target
 * vertex `advance-expand` wrote), dispatched INDIRECTLY from the level's contract slot, which `frontier-finalize`
 * role 1 sized from the clamped `edgeCount`. The claim is `atomicMin(&depth[v], level + 1)` and the invocation that
 * observes `INVALID_INDEX` is the unique winner (PD-6): `atomicMin` is one read-modify-write, so only the first
 * claimant of this level can see the sentinel; a second claimant of the same level observes `claim`, and a vertex
 * already at a smaller depth returns that depth and keeps it. Design 8.4 says why this is not
 * `atomicCompareExchangeWeak`: WGSL 17.8.5 lets it fail spuriously, so a compare-exchange claim needs a retry loop
 * and a bounded loop could leave a vertex unclaimed for its level; `atomicMin` has no such failure mode. The winners
 * are packed by a Hillis-Steele inclusive scan of the workgroup's `won` flags and ONE `atomicAdd` per workgroup on
 * `nextFrontierCount` reserves the block's span in the output vertex queue. The edge queue holds duplicates (a vertex
 * with three frontier neighbours appears three times); exactly one claimant wins, exactly one appends, so the next
 * frontier is duplicate-free by construction and no ownership dedupe follows (DEP-P8-B). Nothing here writes a
 * parent (PD-24: the post-pass does). Uniformity (spec 3.5 rule 1): the guarded work writes locals, every barrier is
 * reached unconditionally. Body only (spec 3.5, D9); the text is normative: the sabotage rows of
 * test/helpers/sabotage.ts are textual edits of it.
 */
export const bfsContractWgsl = /* wgsl */ `
var<workgroup> sh: array<u32, WG>;
var<workgroup> base: u32;

@compute @workgroup_size(WG)
fn bfs_contract(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    let count = atomicLoad(&counters[8]);                            // edgeCount, clamped by role 1
    let claim = atomicLoad(&counters[11]) + 1u;                      // the depth this level assigns
    var won = 0u;
    var v = 0u;
    if (i < count) {                                                 // guarded work into locals
        v = edgeQueue[i];
        let old = atomicMin(&depth[v], claim);
        won = select(0u, 1u, old == INVALID_INDEX);                  // PD-6: the unique winner
    }
    sh[lid.x] = won;
    workgroupBarrier();
    for (var s = 1u; s < WG; s = s * 2u) {                           // Hillis-Steele inclusive scan of won
        var t = 0u;
        if (lid.x >= s) { t = sh[lid.x - s]; }
        workgroupBarrier();
        sh[lid.x] = sh[lid.x] + t;
        workgroupBarrier();
    }
    let inclusive = sh[lid.x];
    if (lid.x == WG - 1u) { base = atomicAdd(&counters[1], inclusive); }   // nextFrontierCount: one reservation per workgroup
    workgroupBarrier();
    if (won == 1u) { frontierOut[base + inclusive - 1u] = v; }
}
`;
