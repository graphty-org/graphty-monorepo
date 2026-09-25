/**
 * The `bfs-bottom-up` kernel body (design 8.4 "the bottom-up sweep"; P8-T8, the P8 plan's PD-18 / PD-21): one
 * invocation per entry of the unvisited list (`unvisitedListLen`, word 7; the list is the first region of the
 * read-only `sweepIn` buffer, the frontier bitset its second at `P.bitsBase`), over the REVERSE core bound in group 0
 * (`coreOfView(residency.view(s, "reverse"))`: the forward arrays on an undirected snapshot, which P7's residency
 * aliases at zero upload cost). A lane whose vertex is still at `INVALID_INDEX` -- the list is up to 32 levels
 * stale, and an entry claimed since the rebuild is skipped on that test -- walks its in-neighbours until the FIRST
 * one whose bit is set and breaks: that early exit is the whole point of the direction (a vertex with one frontier
 * neighbour among thousands costs one read), and `arcsScanned` (word 16, one `atomicAdd` per workgroup of the lanes'
 * reads through `wg_reduce_u32`) is the counter the sabotage row that removes the exit is pinned to, never a timing.
 * The winners are packed into the output vertex queue by `bfs-contract`'s workgroup scan and one `atomicAdd` per
 * workgroup on `nextFrontierCount`, and claim with a plain `atomicStore`: the list holds every vertex once and the
 * sweep is vertex-parallel, so no two lanes claim one vertex. It adds nothing to `frontierDegreeSum` (a bottom-up
 * level expands nothing), which is why `unvisitedDegreeSum` stops falling while bottom-up runs (the selector's
 * JSDoc). Uniformity (spec 3.5 rule 1): the guarded walk writes locals, the scan and the reduction run
 * unconditionally after it. Body only (spec 3.5, D9); the text is normative: the sabotage rows of
 * test/helpers/sabotage.ts are textual edits of it.
 */
export const bfsBottomUpWgsl = /* wgsl */ `
var<workgroup> sh: array<u32, WG>;
var<workgroup> base: u32;
var<workgroup> wcount: u32;                                          // the unvisited list's length on a bottom-up level, 0 on any other

@compute @workgroup_size(WG)
fn bfs_bottom_up(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let claim = atomicLoad(&counters[11]) + 1u;
    if (lid.x == 0u) { wcount = select(0u, atomicLoad(&counters[7]), atomicLoad(&counters[24]) == 3u); }   // unvisitedListLen, on the bottom-up path only (the path word)
    let len = workgroupUniformLoad(&wcount);                         // uniform: the block loop below holds barriers
    for (var b0 = group_id(wid) * WG; b0 < len; b0 = b0 + P.stride) {   // grid-stride over blocks of WG entries
        let i = b0 + lid.x;
        var won = 0u;
        var v = 0u;
        var reads = 0u;
        if (i < len) {                                                   // guarded work into locals
            v = sweepIn[i];
            if (atomicLoad(&depth[v]) == INVALID_INDEX) {                // a stale entry, claimed since the rebuild, is skipped
                let end = min(rowPtr[v + 1u], P.arcEnd);
                for (var a = max(rowPtr[v], P.arcBase); a < end; a = a + 1u) {   // in-neighbours through the reverse core
                    reads = reads + 1u;
                    let u = colIdx[a - P.arcBase];
                    if (mask_bit(sweepIn[P.bitsBase + (u >> 5u)], u)) { won = 1u; break; }   // the early exit: a real break, never a flag
                }
            }
        }
        sh[lid.x] = won;
        workgroupBarrier();
        for (var s = 1u; s < WG; s = s * 2u) {                           // Hillis-Steele inclusive scan of won (bfs-contract's)
            var t = 0u;
            if (lid.x >= s) { t = sh[lid.x - s]; }
            workgroupBarrier();
            sh[lid.x] = sh[lid.x] + t;
            workgroupBarrier();
        }
        let inclusive = sh[lid.x];
        let readsTotal = wg_reduce_u32(reads, lid.x, 0u);                // arcsScanned, one atomic per workgroup (the sabotage witness, Step 6)
        if (lid.x == WG - 1u) { base = atomicAdd(&counters[1], inclusive); }
        if (lid.x == 0u) { atomicAdd(&counters[16], readsTotal); }
        workgroupBarrier();
        if (won == 1u) {
            atomicStore(&depth[v], claim);                               // no claim race: the list holds v once and the sweep is vertex-parallel
            frontierOut[base + inclusive - 1u] = v;
        }
        workgroupBarrier();                                              // sh and base are reused by the next block
    }
}
`;
