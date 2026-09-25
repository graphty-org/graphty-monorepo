/**
 * The `dedupe-claim` kernel body (spec 6 row 4; P8-T3): the first of `dedupe`'s two dispatches. Every entry stores
 * its own index into `owner[queue[i]]` (relaxed atomics: between two dispatches last-writer-wins is well defined, so
 * exactly one index per distinct vertex is the owner). The entry count is `P.count`, or the device word
 * `counters[P.countIndex]` clamped to `P.count` when `P.countIndex` is not `U32_MAX` (the SSSP piles only know their
 * count on the device). `owner` needs no reset between calls: a stale or garbage word is only ever read by an entry
 * whose vertex a current entry has just overwritten. Body only (spec 3.5, D9); normative text.
 */
export const dedupeClaimWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn dedupe_claim(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    var count = P.count;
    if (P.countIndex != U32_MAX) { count = min(atomicLoad(&counters[P.countIndex]), P.count); }   // a device-side count, clamped to the capacity
    if (i >= count) { return; }
    atomicStore(&owner[queue[i]], i);
}
`;
