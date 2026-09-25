/**
 * The `dedupe-filter` kernel body (spec 6 row 4; P8-T3): the second of `dedupe`'s two dispatches, a SEPARATE
 * dispatch because a plain store read back in the same one is a data race (WGSL 6.5.7). An entry survives iff
 * `owner[queue[i]]` still holds its own index; the survivors are packed by a Hillis-Steele inclusive scan of the keep
 * bits in workgroup memory (scan-block's rounds and barrier placement, verbatim) and ONE `atomicAdd` per workgroup on
 * `outCount[P.outIndex]` for the block's aggregate, so the output is set-deterministic: the surviving SET is fixed,
 * the order inside `out` follows the schedule. The entry count is `P.count` or the device word
 * `outCount[P.countIndex]` clamped to it -- the same block and the same word `dedupe-claim` read. Every lane reaches
 * every barrier: the guarded work goes into locals (spec 3.5 rule 1). Body only (spec 3.5, D9); normative text.
 */
export const dedupeFilterWgsl = /* wgsl */ `
var<workgroup> sh: array<u32, WG>;
var<workgroup> base: u32;

@compute @workgroup_size(WG)
fn dedupe_filter(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    var count = P.count;
    if (P.countIndex != U32_MAX) { count = min(atomicLoad(&outCount[P.countIndex]), P.count); }   // the same count source as the claim
    var keep = 0u;
    var v = 0u;
    if (i < count) { v = queue[i]; keep = select(0u, 1u, atomicLoad(&owner[v]) == i); }   // guarded work into locals
    sh[lid.x] = keep;
    workgroupBarrier();                                                                   // every lane, unconditionally (3.5 rule 1)
    for (var s = 1u; s < WG; s = s * 2u) {                                                // Hillis-Steele inclusive scan of keep
        var t = 0u;
        if (lid.x >= s) { t = sh[lid.x - s]; }
        workgroupBarrier();
        sh[lid.x] = sh[lid.x] + t;
        workgroupBarrier();
    }
    let inclusive = sh[lid.x];
    if (lid.x == WG - 1u) { base = atomicAdd(&outCount[P.outIndex], inclusive); }         // ONE atomic per workgroup: the block's aggregate
    workgroupBarrier();
    if (keep == 1u) { out[base + inclusive - 1u] = v; }
}
`;
