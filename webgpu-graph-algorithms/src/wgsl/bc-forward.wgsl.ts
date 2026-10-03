/**
 * The `bc-forward` kernel body (design 8.4 "forward pass = BFS with sigma as array<atomic<u32>>", 8.10 "BC forward
 * (tagged)", 16.1): one level of the tagged multi-source breadth-first search of a betweenness batch. The level's
 * frontier is the range `S[ends[level] .. ends[level + 1])` of the claim log, every entry a packed `s * n + u`; the
 * expansion is `closeness-sweep`'s block-mapped strip (each workgroup loads up to `WG` entries, scans their degrees
 * in workgroup memory, and every lane strips the aggregate by an upper-bound binary search), fused with the claim, so
 * no edge queue exists.
 *
 * For the arc `(u, x)` of the entry `(u, s)`, with `t = s * n + x`: the CLAIM -- a relaxed pre-check that skips the
 * atomic when `t` is already claimed (design 16.1: a stale "unclaimed" costs one redundant atomic, a stale "claimed"
 * cannot happen because a claim is never revoked), then `atomicMin(&depthK[t], level + 1)`, the invocation that
 * observes INVALID_INDEX the unique winner, which appends `t` to the log; and, as a SEPARATE condition, the COUNT:
 * every arc that reaches `t` at `level + 1` adds `sigma[s][u]` into `sigma[s][x]`, winner or not, which is what makes
 * sigma the number of shortest paths rather than of claims. The add detects a u32 wrap from `atomicAdd`'s return
 * value (`old + add < old`) and raises `sigmaOverflow` (counters word 27); the count is never clamped. Under
 * `SCALED` (a batch rerun because the u32 counts wrapped) the count is skipped and `bc-count` pulls rescaled f32
 * counts after the level instead. The winners of
 * a strip are packed into the log with one workgroup-memory counter and ONE global `atomicAdd` on `stackTop` (word
 * 26) per strip. Uniformity (spec 3.5 rule 1): the range and the aggregate are `workgroupUniformLoad`s and the strip
 * loop steps a uniform `p0`, so every barrier is in uniform control flow. The order of the log inside a level is
 * not deterministic; nothing downstream depends on it (the counts are integers and every dependency is written by
 * index). Body only; the sabotage rows of test/helpers/sabotage.ts are textual edits of it.
 */
export const bcForwardWgsl = /* wgsl */ `
var<workgroup> sh: array<u32, WG>;                // the block's degrees, then their inclusive scan
var<workgroup> rowStart: array<u32, WG>;          // the first arc of each entry's row
var<workgroup> entryOf: array<u32, WG>;           // each entry, s * n + u
var<workgroup> wstart: u32;                       // the level's first log index
var<workgroup> wcount: u32;                       // the level's entry count
var<workgroup> wwon: atomic<u32>;                 // the strip's winners
var<workgroup> wbase: u32;                        // where the strip's winners go in the log

@compute @workgroup_size(WG)
fn bc_forward(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let level = atomicLoad(&counters[11]);
    if (lid.x == 0u) {
        let lo = ends[level];
        wstart = lo;
        wcount = ends[level + 1u] - lo;
    }
    let start = workgroupUniformLoad(&wstart);
    let count = workgroupUniformLoad(&wcount);                       // uniform: the block loop below holds barriers
    let next = level + 1u;
    for (var b0 = group_id(wid) * WG; b0 < count; b0 = b0 + P.stride) {   // grid-stride over blocks of WG entries
        let i = b0 + lid.x;
        var deg = 0u;
        var first = 0u;
        var entry = 0u;
        if (i < count) {                                             // guarded loads into locals (3.5 rule 1)
            entry = S[start + i];
            let u = entry % P.n;
            first = rowPtr[u];
            deg = rowPtr[u + 1u] - first;
        }
        sh[lid.x] = deg;
        rowStart[lid.x] = first;
        entryOf[lid.x] = entry;
        workgroupBarrier();
        for (var s = 1u; s < WG; s = s * 2u) {                       // Hillis-Steele inclusive scan of the degrees
            var t = 0u;
            if (lid.x >= s) { t = sh[lid.x - s]; }
            workgroupBarrier();
            sh[lid.x] = sh[lid.x] + t;
            workgroupBarrier();
        }
        let aggregate = workgroupUniformLoad(&sh[WG - 1u]);          // uniform; includes a barrier
        for (var p0 = 0u; p0 < aggregate; p0 = p0 + WG) {            // strip [0, aggregate) WG arcs at a time
            let p = p0 + lid.x;
            var won = false;
            var claimed = 0u;
            if (p < aggregate) {
                var lo = 0u;                                         // upper_bound: the first k with sh[k] > p owns arc p
                var hi = WG;
                loop {
                    if (lo >= hi) { break; }
                    let mid = (lo + hi) / 2u;
                    if (sh[mid] > p) { hi = mid; } else { lo = mid + 1u; }
                }
                let k = lo;
                var exclusive = 0u;
                if (k > 0u) { exclusive = sh[k - 1u]; }
                let origin = entryOf[k];                             // s * n + u
                let x = (origin - (origin % P.n)) + colIdx[rowStart[k] + (p - exclusive)];   // s * n + x
                if (atomicLoad(&depthK[x]) == INVALID_INDEX) {       // the pre-check of design 16.1
                    won = atomicMin(&depthK[x], next) == INVALID_INDEX;   // the claim: the one winner appends
                }
                if (!SCALED && atomicLoad(&depthK[x]) == next) {     // the count: EVERY arc on a shortest path adds
                    let add = atomicLoad(&sigmaK[origin]);
                    let old = atomicAdd(&sigmaK[x], add);
                    if (old + add < old) { atomicOr(&counters[27], 1u); }   // the u32 wrap, reported
                }
                claimed = x;
            }
            var slot = 0u;
            if (won) { slot = atomicAdd(&wwon, 1u); }
            workgroupBarrier();
            if (lid.x == 0u) {
                wbase = atomicAdd(&counters[26], atomicLoad(&wwon));   // stackTop: one global atomic per strip
                atomicStore(&wwon, 0u);
            }
            workgroupBarrier();
            if (won) { S[wbase + slot] = claimed; }
        }
        workgroupBarrier();                                          // sh, rowStart and entryOf are reused by the next block
    }
}
`;
