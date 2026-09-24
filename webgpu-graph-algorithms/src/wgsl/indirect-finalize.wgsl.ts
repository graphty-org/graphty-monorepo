/**
 * The `indirect-finalize` kernel body (spec 5.4; P4-T1): one lane turns the device-side count `counters[P.countIndex]`
 * into the `(x, y, 1)` of an indirect dispatch by plan1d's rule (spec 5.2) and writes it with the count into the
 * 16-byte slot `P.slot` of `args` (PD-2). No barrier follows the early return of the other lanes. Body only (spec 3.5,
 * D9); the text is normative: the P4 sabotage rows are textual edits of it.
 */
export const indirectFinalizeWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn indirect_finalize(@builtin(local_invocation_id) lid: vec3<u32>) {
    if (lid.x != 0u) { return; }                                   // one lane; no barrier follows (3.5 rule 1)
    let count = counters[P.countIndex];
    let groups = count / P.wg + select(0u, 1u, count % P.wg != 0u);   // ceil(count / wg) without the u32 wrap of (count + wg - 1) above 2^32 - wg: plan1d's rule (5.2) for ANY u32 count
    var x = groups;
    var y = 1u;
    if (groups > MAX_WORKGROUPS_PER_DIM) {                         // the 2D split; y <= 1,025 for any u32 count
        x = MAX_WORKGROUPS_PER_DIM;
        y = (groups + MAX_WORKGROUPS_PER_DIM - 1u) / MAX_WORKGROUPS_PER_DIM;
    }
    let base = 4u * P.slot;                                        // 16-byte slots: (x, y, 1, count) (PD-2)
    args[base] = x;
    args[base + 1u] = y;
    args[base + 2u] = 1u;
    args[base + 3u] = count;
}
`;
