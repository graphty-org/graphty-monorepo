/**
 * The `scan-block` kernel body (spec 6 row 2; P4-T2): an exclusive prefix sum of one WG-wide block of `src` in
 * workgroup memory (Hillis-Steele, log2(WG) rounds of two barriers each, every lane in uniform control flow) into
 * `out`, and the block's inclusive total into `blockSums[group]`. u32 addition is exact in any order, so the
 * output is bitwise the same on every adapter (PD-3). Body only (spec 3.5, D9); normative text.
 */
export const scanBlockWgsl = /* wgsl */ `
var<workgroup> sh: array<u32, WG>;
var<workgroup> handoff: array<u32, WG>;                          // the block total's ride to the lane that stores it (the note below)

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
    // Store-to-load forwarding is why the block total travels through a SECOND workgroup array AND is stored by a
    // lane that never wrote the slot it reads. Dawn's D3D12 backend compiles through FXC on the Windows runner
    // (the published dawn-node carries d3dcompiler_47.dll and neither dxcompiler.dll nor dxil.dll), and over the
    // Microsoft Basic Render Driver that compiler re-materialises a workgroup load inside a divergent branch and
    // forwards the branching lane's OWN nearest earlier store to the same address. The original line read
    // sh[lid.x] inside "if (lid.x == WG - 1u)" and got what that lane stored BEFORE the loop: a scan of 257 ones
    // wrote the correct 255 into out outside the branch, 1 -- the lane's own input element -- into blockSums
    // inside it, and the second block stored nothing at all. handoff is written once by every lane and read
    // across a single barrier by lane 0 at index WG - 1, a slot lane 0 never wrote, so no store of its own can be
    // forwarded in the load's place; that is the shape a device probe found intact there
    // (test/primitives/workgroup-id-probe.test.ts case 6). The Windows leg of .github/workflows/hosts.yml is what
    // says whether this is still needed (G4-F15).
    handoff[lid.x] = inclusive;
    workgroupBarrier();
    let g = group_id(wid);
    let i = g * WG + lid.x;
    if (i < P.count) { out[i] = inclusive - v; }                  // exclusive = inclusive - own value
    if (lid.x == 0u) { blockSums[g] = handoff[WG - 1u]; }         // the block total (the LAST lane's inclusive sum)
}
`;
