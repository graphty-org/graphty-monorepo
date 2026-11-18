/**
 * The `counting-scatter` kernel body: the scatter of a counting sort. `start[k]` is the
 * exclusive scan of the histogram, `cursor[k]` a zeroed per-bin atomic; an element takes the slot `start[k] +
 * atomicAdd(&cursor[k], 1u)`. The order inside a bin depends on the schedule (set-deterministic). Body
 * only; normative text.
 */
export const countingScatterWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn counting_scatter(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    if (i >= P.count) { return; }                                  // no barrier follows
    let k = keys[i];
    let slot = atomicAdd(&cursor[k], 1u);                          // the per-bin cursor (6 row 5)
    outIndex[start[k] + slot] = i;
}
`;
