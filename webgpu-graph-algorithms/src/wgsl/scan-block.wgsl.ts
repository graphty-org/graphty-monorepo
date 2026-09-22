/**
 * The `scan-block` kernel body (spec 6 row 2; P4-T2): an exclusive prefix sum of one WG-wide block of `src` in
 * workgroup memory (Hillis-Steele, log2(WG) rounds of two barriers each, every lane in uniform control flow) into
 * `out`, and the block's inclusive total into `blockSums[group]`. u32 addition is exact in any order, so the
 * output is bitwise the same on every adapter (PD-3). Body only (spec 3.5, D9); normative text.
 */
export const scanBlockWgsl = /* wgsl */ `
var<workgroup> sh: array<u32, WG>;

@compute @workgroup_size(WG)
fn scan_block(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let readAt = group_id(wid) * WG + lid.x;
    var v = 0u;
    if (readAt < P.count) { v = src[readAt]; }
    sh[lid.x] = v;
    workgroupBarrier();
    for (var s = 1u; s < WG; s = s * 2u) {                       // Hillis-Steele inclusive scan; uniform: every lane runs every round
        var t = 0u;
        if (lid.x >= s) { t = sh[lid.x - s]; }
        workgroupBarrier();
        sh[lid.x] = sh[lid.x] + t;
        workgroupBarrier();
    }
    let inclusive = sh[lid.x];
    // Dawn's D3D12 backend compiles through FXC on the Windows runner (the published dawn-node carries
    // d3dcompiler_47.dll and neither dxcompiler.dll nor dxil.dll), and over the Microsoft Basic Render Driver it
    // loses a store index derived from workgroup_id when that index is CARRIED ACROSS a workgroupBarrier: the
    // workgroup then stores as if its id were zero, so one block is right and every further block collapses into
    // block zero's range. The id is therefore read here, after the loop, never before it -- the shape the reduce kernel has
    // always had, which is bitwise right on that same backend over 1311 workgroups. A workgroup-memory broadcast was
    // tried first and is worse there: the scalar does not reach the other lanes, and the block sums come back zero.
    // The Windows leg of .github/workflows/hosts.yml is what says whether this is still needed (G4-F15).
    let g = group_id(wid);
    let i = g * WG + lid.x;
    if (i < P.count) { out[i] = inclusive - v; }                  // exclusive = inclusive - own value
    if (lid.x == WG - 1u) { blockSums[g] = inclusive; }           // the block total (the last lane's inclusive sum)
}
`;
