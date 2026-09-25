/**
 * The `advance-expand` kernel body (design 6 row 8, 8.10 "BFS expand"; P8-T5, the P8 plan's PD-23): Gunrock's
 * block-mapped expansion of a vertex frontier into the edge queue. Each workgroup loads up to `WG` frontier entries,
 * reads their degrees clipped to the bound arc window `[P.arcBase, P.arcEnd)` (so the window-aware form of P8-T12
 * changes nothing here), runs the prelude's INCLUSIVE workgroup scan `wg_scan_u32` over those degrees -- the subgroup
 * form when the device has the feature, the Hillis-Steele form otherwise, which is the ONLY text that differs between
 * the twin's two compilations -- and then every invocation strips the range `[0, aggregate)` with a binary search
 * (`upper_bound`) over the scanned degrees to find which entry its arc belongs to. One `atomicAdd` per WORKGROUP
 * reserves the block's span in the queue (`edgeCount`), the same aggregate lands in `edgeCountUnclamped` (the overflow
 * detector, never clamped) and in `frontierDegreeSum` (Beamer's m_f); a lane whose queue position is at or past
 * `P.edgeCapacity` writes nothing (the clamp). The queue holds the TARGET vertex of each arc only (PD-24: `parent`
 * comes from the post-pass). Uniformity (spec 3.5 rule 1): the guarded loads write locals, the scan call and the
 * `workgroupUniformLoad` sit unconditionally after the guard, and the strip loop is bounded by a uniform value.
 * There is no `TIER` override: a hub row is balanced over all `WG` lanes inside its block, and the small-frontier
 * workgroup-per-row structure is `bfs-fused` (P8-T7). Body only (spec 3.5, D9); the text is normative: the
 * sabotage rows of test/helpers/sabotage.ts are textual edits of it.
 */
export const advanceExpandWgsl = /* wgsl */ `
var<workgroup> sh: array<u32, WG>;          // the block's degrees, then their inclusive scan
var<workgroup> rowStart: array<u32, WG>;    // the first bound arc of each entry's row
var<workgroup> base: u32;                   // the block's reserved span in the edge queue

@compute @workgroup_size(WG)
fn advance_expand(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let g = group_id(wid);
    let i = g * WG + lid.x;                                          // this lane's frontier entry
    let count = atomicLoad(&counters[0]);                            // frontierCount
    var deg = 0u;
    var start = 0u;
    if (i < count) {                                                 // guarded loads into locals (3.5 rule 1)
        let v = frontierIn[i];
        let lo = max(rowPtr[v], P.arcBase);                          // the row clipped to the bound window (P8-T12)
        let hi = min(rowPtr[v + 1u], P.arcEnd);
        start = lo;
        deg = select(0u, hi - lo, hi > lo);
    }
    let inclusive = wg_scan_u32(deg, lid.x);                         // the prelude's inclusive scan in LANE order (P8-T1 Step 5); the twin
    sh[lid.x] = inclusive;                                           // sh is monotone in lid.x, the index the binary search walks
    rowStart[lid.x] = start;
    workgroupBarrier();
    let aggregate = workgroupUniformLoad(&sh[WG - 1u]);              // uniform; includes a barrier
    if (lid.x == 0u) {
        base = atomicAdd(&counters[8], aggregate);                   // edgeCount: ONE reservation per workgroup, not one per arc
        atomicAdd(&counters[9], aggregate);                          // edgeCountUnclamped: the overflow detector (PD-23)
        atomicAdd(&counters[2], aggregate);                          // frontierDegreeSum: Beamer's m_f (P8-T8)
    }
    workgroupBarrier();
    for (var p = lid.x; p < aggregate; p = p + WG) {                 // strip [0, aggregate): lane j takes j, j + WG, ...
        var lo = 0u;                                                 // upper_bound: the first k with sh[k] > p owns arc p
        var hi = WG;
        loop {
            if (lo >= hi) { break; }
            let mid = (lo + hi) / 2u;
            if (sh[mid] > p) { hi = mid; } else { lo = mid + 1u; }
        }
        let k = lo;
        var exclusive = 0u;
        if (k > 0u) { exclusive = sh[k - 1u]; }
        let arc = rowStart[k] + (p - exclusive);
        let q = base + p;
        if (q < P.edgeCapacity) { edgeQueue[q] = colIdx[arc - P.arcBase]; }   // the clamp of PD-23; the queue holds the target vertex only (PD-24)
    }
}
`;
