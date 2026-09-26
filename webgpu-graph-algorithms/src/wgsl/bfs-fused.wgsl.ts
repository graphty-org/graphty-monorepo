/**
 * The `bfs-fused` kernel body (design 8.4 "the fused variant", 6 row 8 "the workgroup-per-row tier", 8.10 "BFS
 * fused expand-contract"; P8-T7, the P8 plan's PD-23 / PD-24): the expansion and the contraction of one level in
 * ONE dispatch, chosen by `frontier-finalize` for a frontier below `P.fusedMax` entries (`path` 2) and for the retry
 * of a level whose edge queue overflowed (`path` 4, PD-23). One WORKGROUP per frontier entry, the workgroups striding
 * the entries by the dispatch's group count (`P.stride`): lane 0 reads the entry's row clipped
 * to the bound arc window, adds its degree to `frontierDegreeSum` (so the inspect seam's per-level expansion count
 * covers fused levels too), and every lane strips the row `WG` arcs at a time, applying `bfs-contract`'s claim
 * inline -- `atomicMin(&depth[v], level + 1)`, the invocation that observes `INVALID_INDEX` the unique winner (PD-6) -- and
 * packing the strip's winners into the output vertex queue by the same Hillis-Steele scan and one `atomicAdd` per
 * strip on `nextFrontierCount`. No edge queue is written or read, which is the whole win for a tiny frontier
 * (Merrill's fleeting iterations) and what makes the overflow retry exact: the partial edge queue is never consulted.
 * On a retry level `advance-expand` has already added the frontier's degree to `frontierDegreeSum`, so that word
 * holds twice the level's expanded degree; since issue #391 no decision reads it (Beamer's m_f is `nextDegreeSum`
 * and the boundary subtracts that), so the doubling only reaches the inspect seam's `prevDegreeSum`. Nothing here
 * writes a parent (PD-24: the post-pass does), which is what keeps the kernel at the eight-storage-buffer budget
 * with the four graph slots. Uniformity (spec 3.5 rule 1): the strip loop's bound and the row start are
 * `workgroupUniformLoad`s, so every barrier of the per-strip append is in uniform control flow; the guarded claim
 * writes locals; a trailing barrier protects `sh` and `base` before the next strip reuses them. The claim line and
 * the scan are `bfs-contract`'s verbatim so a reader can diff the two bodies; the scan's comment differs on purpose
 * (the sabotage rows need distinct find strings). Body only (spec 3.5, D9); the text is normative: the sabotage rows
 * of test/helpers/sabotage.ts are textual edits of it.
 */
export const bfsFusedWgsl = /* wgsl */ `
var<workgroup> sh: array<u32, WG>;
var<workgroup> wdeg: u32;
var<workgroup> wstart: u32;
var<workgroup> base: u32;
var<workgroup> wcount: u32;                                          // the frontier's length on a fused or retry level, 0 on any other

@compute @workgroup_size(WG)
fn bfs_fused(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let claim = atomicLoad(&counters[11]) + 1u;
    if (lid.x == 0u) {
        let path = atomicLoad(&counters[24]);                        // 2 the fused level, 4 the overflow retry (PD-23)
        wcount = select(0u, atomicLoad(&counters[0]), path == 2u || path == 4u);
    }
    let count = workgroupUniformLoad(&wcount);                       // uniform: the entry loop below holds barriers
    for (var g = group_id(wid); g < count; g = g + P.stride) {       // one workgroup per frontier entry; P.stride is the dispatch's GROUP count
        if (lid.x == 0u) {
            let u = frontierIn[g];
            let a0 = max(rowPtr[u], P.arcBase);
            let a1 = min(rowPtr[u + 1u], P.arcEnd);
            let d = select(0u, a1 - a0, a1 > a0);
            wdeg = d;
            wstart = a0;
            atomicAdd(&counters[2], d);                                  // frontierDegreeSum, so the inspect seam sees fused levels too
        }
        let deg = workgroupUniformLoad(&wdeg);                           // uniform: the loop below may hold barriers
        let start = workgroupUniformLoad(&wstart);
        for (var p0 = 0u; p0 < deg; p0 = p0 + WG) {                      // strip the row WG arcs at a time
            let p = p0 + lid.x;
            var won = 0u;
            var v = 0u;
            if (p < deg) {                                               // guarded claim into locals
                v = colIdx[start + p - P.arcBase];
                let old = atomicMin(&depth[v], claim);
                won = select(0u, 1u, old == INVALID_INDEX);
            }
            sh[lid.x] = won;
            workgroupBarrier();
            for (var s = 1u; s < WG; s = s * 2u) {                       // Hillis-Steele inclusive scan of won (bfs-contract's, verbatim)
                var t = 0u;
                if (lid.x >= s) { t = sh[lid.x - s]; }
                workgroupBarrier();
                sh[lid.x] = sh[lid.x] + t;
                workgroupBarrier();
            }
            let inclusive = sh[lid.x];
            if (lid.x == WG - 1u) { base = atomicAdd(&counters[1], inclusive); }
            workgroupBarrier();
            if (won == 1u) { frontierOut[base + inclusive - 1u] = v; }
            workgroupBarrier();                                          // sh and base are reused by the next strip
        }
    }
}
`;
