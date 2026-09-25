/**
 * The `closeness-sweep` kernel body (design 8.4 "32 sources per u32 word"; P8-T11, the P8 plan's PD-13 / DEP-P8-E):
 * one level of the bit-parallel multi-source breadth-first search. The batch's state is one `bits` buffer of four
 * regions of `P.bitsBase` words each -- `visited` at 0, the two frontier regions at `P.bitsBase` and `2 x P.bitsBase`
 * (which one is the frontier and which the next swaps by the level's parity, `P.mode`, so nothing is copied between
 * levels), `flags` at `3 x P.bitsBase` -- with bit `s` of word `v` meaning "source `s` has reached / is at / is next
 * at `v`". The expansion is `advance-expand`'s block-mapped strip (P8-T5): each workgroup loads up to `WG` entries of
 * the frontier LIST (the vertices any source is at, compacted from the flags by the host's `compact`), scans their
 * degrees with the inlined Hillis-Steele scan of `bfs-contract` (this is not a twin kernel: `needs: []`), and every
 * invocation strips the aggregate by binary search. The claim is inline: for the arc `(u, x)` the mask is the sources
 * at `u` that have not reached `x`; `atomicOr` on `visited[x]` returns the bits this lane won (`fresh`), which go into
 * the next region, set `flags[x]` (the flags region is part of the one atomic binding, so a plain store is a compile
 * error), and are tallied per source in WORKGROUP memory -- one global `atomicAdd` per source per workgroup after the
 * strip loop, never one per arc. Uniformity (spec 3.5 rule 1): the guarded loads write locals, the scan and the
 * `workgroupUniformLoad` sit unconditionally after the guard, the strip loop is bounded by the uniform aggregate, and
 * the flush's barrier follows it in uniform control flow. Body only (spec 3.5, D9); the text is normative: the
 * sabotage rows of test/helpers/sabotage.ts are textual edits of it.
 */
export const closenessSweepWgsl = /* wgsl */ `
var<workgroup> sh: array<u32, WG>;                // the block's degrees, then their inclusive scan
var<workgroup> rowStart: array<u32, WG>;          // the first bound arc of each entry's row
var<workgroup> rowOf: array<u32, WG>;             // the frontier vertex of each entry (the source end of its arcs)
var<workgroup> local: array<atomic<u32>, 32>;     // this workgroup's fresh claims per source
var<workgroup> wcount: u32;                       // the frontier list's length

@compute @workgroup_size(WG)
fn closeness_sweep(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    if (lid.x == 0u) { wcount = atomicLoad(&counters[0]); }          // the frontier list's length (compact's total)
    let count = workgroupUniformLoad(&wcount);                       // uniform: the block loop below holds barriers
    let nextBase = select(2u * P.bitsBase, P.bitsBase, P.mode == 1u);   // the region that is next this level
    let frontierBase = 3u * P.bitsBase - nextBase;                   // the other one: the region that is the frontier
    for (var b0 = group_id(wid) * WG; b0 < count; b0 = b0 + P.stride) {   // grid-stride over blocks of WG entries
        let i = b0 + lid.x;                                          // this lane's frontier entry
        var deg = 0u;
        var start = 0u;
        var u = 0u;
        if (i < count) {                                                 // guarded loads into locals (3.5 rule 1)
            u = frontierList[i];
            let lo = max(rowPtr[u], P.arcBase);
            let hi = min(rowPtr[u + 1u], P.arcEnd);
            start = lo;
            deg = select(0u, hi - lo, hi > lo);
        }
        if (lid.x < 32u) { atomicStore(&local[lid.x], 0u); }            // zeroed before the strip loop (WebGPU zero-initialises workgroup memory; said anyway)
        sh[lid.x] = deg;
        rowStart[lid.x] = start;
        rowOf[lid.x] = u;
        workgroupBarrier();
        for (var s = 1u; s < WG; s = s * 2u) {                           // Hillis-Steele inclusive scan of the degrees (bfs-contract's, inlined)
            var t = 0u;
            if (lid.x >= s) { t = sh[lid.x - s]; }
            workgroupBarrier();
            sh[lid.x] = sh[lid.x] + t;
            workgroupBarrier();
        }
        let aggregate = workgroupUniformLoad(&sh[WG - 1u]);              // uniform; includes a barrier
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
            let x = colIdx[arc - P.arcBase];
            let mask = atomicLoad(&bits[frontierBase + rowOf[k]]) & ~atomicLoad(&bits[x]);   // the sources at u that have not reached x
            if (mask != 0u) {
                let old = atomicOr(&bits[x], mask);                      // visited: the claim, one read-modify-write
                let fresh = mask & ~old;                                 // the sources whose claim this lane won
                if (fresh != 0u) {
                    atomicOr(&bits[nextBase + x], fresh);
                    atomicStore(&bits[3u * P.bitsBase + x], 1u);         // flags: x is in the next frontier list (compact reads it)
                    var b = fresh;
                    loop {                                               // one tally per set bit of fresh
                        if (b == 0u) { break; }
                        let s = firstTrailingBit(b);
                        atomicAdd(&local[s], 1u);
                        b = b & (b - 1u);
                    }
                }
            }
        }
        workgroupBarrier();                                              // uniform: the loop's bound is the uniform aggregate
        if (lid.x < 32u) {                                               // ONE global atomic per source per workgroup
            let c = atomicLoad(&local[lid.x]);
            if (c != 0u) { atomicAdd(&perSource[lid.x], c); }            // newCount[s]
        }
        workgroupBarrier();                                              // sh, rowStart, rowOf and local are reused by the next block
    }
}
`;
