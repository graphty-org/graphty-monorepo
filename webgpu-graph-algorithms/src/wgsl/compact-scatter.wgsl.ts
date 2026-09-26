/**
 * The `compact-scatter` kernel body (spec 6 row 4; P8-T3): the scatter step of `compact`, after the caller's flags
 * have been exclusive-scanned into `offsets`. Every flagged entry lands at its offset, in queue order, so the output
 * is bitwise reproducible; lane 0 writes the total -- the last offset plus the last flag -- into `outCount[P.outIndex]`
 * (the block is bound whole and indexed because a four-byte word is never 256-aligned). The planner never dispatches
 * this body for count 0, so `P.count - 1u` never wraps. Body only (spec 3.5, D9); normative text.
 */
export const compactScatterWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn compact_scatter(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    if (i == 0u) { outCount[P.outIndex] = offsets[P.count - 1u] + flags[P.count - 1u]; }   // the exclusive scan's total; the planner never dispatches for count 0
    if (i >= P.count) { return; }                                                          // no barrier follows
    if (flags[i] != 0u) { out[offsets[i]] = queue[i]; }
}
`;
