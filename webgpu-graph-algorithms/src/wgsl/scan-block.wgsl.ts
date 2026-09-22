/**
 * The `scan-block` kernel body (spec 6 row 2; P4-T2): an exclusive prefix sum of one WG-wide block of `src` in
 * workgroup memory (Hillis-Steele, log2(WG) rounds of two barriers each, every lane in uniform control flow) into
 * `out`, and the block's inclusive total into `blockSums[group]`. u32 addition is exact in any order, so the
 * output is bitwise the same on every adapter (PD-3). Body only (spec 3.5, D9); normative text.
 */
export const scanBlockWgsl = /* wgsl */ `
var<workgroup> sh: array<u32, WG>;
var<workgroup> blockId: u32;

@compute @workgroup_size(WG)
fn scan_block(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    if (lid.x == 0u) { blockId = group_id(wid); }
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
    // Dawn's D3D12 backend compiles through FXC on this runner (the published dawn-node carries d3dcompiler_47.dll
    // and neither dxcompiler.dll nor dxil.dll), and over the Microsoft Basic Render Driver it loses a store index
    // derived from workgroup_id when that index is carried across a workgroupBarrier: every workgroup then stores
    // as if its id were zero. A single-block scan is right because its one workgroup really is zero, and every
    // multi-block scan collapses into block zero's range. The id therefore travels through workgroup memory, which
    // that compiler cannot fold back into the pre-barrier read. It costs one word and one broadcast everywhere
    // else, and the Windows leg of .github/workflows/hosts.yml is what says whether it is still needed (G4-F15).
    let g = blockId;
    let i = g * WG + lid.x;
    if (i < P.count) { out[i] = inclusive - v; }                  // exclusive = inclusive - own value
    if (lid.x == WG - 1u) { blockSums[g] = inclusive; }           // the block total (the last lane's inclusive sum)
}
`;
