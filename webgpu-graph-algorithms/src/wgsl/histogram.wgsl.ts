/**
 * The `histogram` kernel body (spec 6 row 5; P4-T3): one atomicAdd per key into the global `hist` (zeroed by a fill
 * dispatch earlier in the pass, PD-4). Order-independent, hence deterministic. A key >= P.bins is not counted (the
 * caller's contract; the grid's keys are always < cells + 2^dim). Body only; normative text.
 */
export const histogramWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn histogram(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    if (i >= P.count) { return; }                                  // no barrier follows
    let k = keys[i];
    if (k < P.bins) { atomicAdd(&hist[k], 1u); }                   // order-independent: the count is the same whatever the schedule
}
`;
