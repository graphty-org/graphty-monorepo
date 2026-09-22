/**
 * The `radix-hist` kernel body (spec 6 row 6; P4-T4): the RADIX_BINS-bin (2^8) digit histogram of one WG-wide block
 * of keys, privatised in workgroup memory (atomics on workgroup memory are order-independent) and written
 * DIGIT-MAJOR, `hist[digit * P.groups + group]`, so one exclusiveScan over the table yields, per digit, the offsets
 * of the workgroups in workgroup order -- what a stable LSD scatter needs. The bitwise operators act on a KEY and a
 * DIGIT, never on an arc index (house rule). Body only; normative text.
 */
export const radixHistWgsl = /* wgsl */ `
var<workgroup> local: array<atomic<u32>, RADIX_BINS>;
var<workgroup> blockId: u32;

@compute @workgroup_size(WG)
fn radix_hist(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    if (lid.x == 0u) { blockId = group_id(wid); }
    for (var b = lid.x; b < RADIX_BINS; b = b + WG) { atomicStore(&local[b], 0u); }
    workgroupBarrier();
    let i = group_id(wid) * WG + lid.x;
    if (i < P.count) {
        let d = (keys[i] >> P.shift) & RADIX_DIGIT_MASK;                 // the pass's digit
        atomicAdd(&local[d], 1u);
    }
    workgroupBarrier();
    // Above MAX_1D_ITEMS plan1d pads the 2D grid to x * y >= P.groups workgroups; a padding workgroup (g >= P.groups)
    // holds an all-zero table and its digit-major slot b * P.groups + g is digit b + 1's slot of a REAL group, so it
    // must not store. Uniform per workgroup, no barrier inside. Every test size fits 1D (the ladder tops at 2^22); no
    // case reaches this branch, so the guard is proved by reading, not by a run.
    // Dawn's D3D12 backend compiles through FXC on this runner (the published dawn-node carries d3dcompiler_47.dll
    // and neither dxcompiler.dll nor dxil.dll), and over the Microsoft Basic Render Driver it loses a store index
    // derived from workgroup_id when that index is carried across a workgroupBarrier: every workgroup then stores
    // as if its id were zero. A single-block block is right because its one workgroup really is zero, and every
    // later block's counts collapse into the first group's slots. The id therefore travels through workgroup memory, which
    // that compiler cannot fold back into the pre-barrier read. It costs one word and one broadcast everywhere
    // else, and the Windows leg of .github/workflows/hosts.yml is what says whether it is still needed (G4-F15).
    let g = blockId;
    if (g < P.groups) {
        for (var b = lid.x; b < RADIX_BINS; b = b + WG) { hist[b * P.groups + g] = atomicLoad(&local[b]); }   // digit-major
    }
}
`;
