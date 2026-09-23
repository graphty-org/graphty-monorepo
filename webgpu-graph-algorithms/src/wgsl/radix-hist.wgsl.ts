/**
 * The `radix-hist` kernel body (spec 6 row 6; P4-T4): the RADIX_BINS-bin (2^8) digit histogram of one WG-wide block
 * of keys, privatised in workgroup memory (atomics on workgroup memory are order-independent) and written
 * DIGIT-MAJOR, `hist[digit * P.groups + group]`, so one exclusiveScan over the table yields, per digit, the offsets
 * of the workgroups in workgroup order -- what a stable LSD scatter needs. The bitwise operators act on a KEY and a
 * DIGIT, never on an arc index (house rule). Body only; normative text.
 */
export const radixHistWgsl = /* wgsl */ `
var<workgroup> local: array<atomic<u32>, RADIX_BINS>;

@compute @workgroup_size(WG)
fn radix_hist(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    for (var b = lid.x; b < RADIX_BINS; b = b + WG) { atomicStore(&local[b], 0u); }
    workgroupBarrier();
    let g = group_id(wid);
    let i = g * WG + lid.x;
    if (i < P.count) {
        let d = (keys[i] >> P.shift) & RADIX_DIGIT_MASK;                 // the pass's digit
        atomicAdd(&local[d], 1u);
    }
    workgroupBarrier();
    // Above MAX_1D_ITEMS plan1d pads the 2D grid to x * y >= P.groups workgroups; a padding workgroup (g >= P.groups)
    // holds an all-zero table and its digit-major slot b * P.groups + g is digit b + 1's slot of a REAL group, so it
    // must not store. Uniform per workgroup, no barrier inside. Every test size fits 1D (the ladder tops at 2^22); no
    // case reaches this branch, so the guard is proved by reading, not by a run.
    if (g < P.groups) {
        for (var b = lid.x; b < RADIX_BINS; b = b + WG) { hist[b * P.groups + g] = atomicLoad(&local[b]); }   // digit-major
    }
}
`;
